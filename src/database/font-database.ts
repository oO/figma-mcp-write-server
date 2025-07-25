import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { FontResult, FontSource, SortOption } from '../types/font-operations.js';
import { logger } from "../utils/logger.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface DatabaseFont {
  id: number;
  family: string;
  source: FontSource;
  style_count: number;
  is_loaded: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseFontStyle {
  id: number;
  font_id: number;
  style: string;
  weight?: number;
  width?: string;
  slant?: string;
  full_name?: string;
  created_at: string;
}

export interface SyncMetadata {
  id: number;
  last_sync_time?: string | null;
  total_fonts_synced: number;
  sync_status: 'never' | 'in_progress' | 'completed' | 'failed';
  sync_error?: string | null;
  schema_version: number;
  created_at: string;
  updated_at: string;
}

export interface FontSearchOptions {
  query?: string;
  source?: FontSource;
  hasStyle?: string;
  minStyleCount?: number;
  limit?: number;
  sortBy?: SortOption;
}

export interface FontSearchResult {
  fonts: FontResult[];
  totalFound: number;
}

export class FontDatabase {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || join(process.cwd(), 'fonts.db');
    this.db = new Database(this.dbPath);
    this.initialize();
  }

  private initialize(): void {
    // Read and execute schema
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    this.db.exec(schema);

    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000'); // 64MB cache
    this.db.pragma('temp_store = MEMORY');
  }

  /**
   * Search fonts with flexible filtering options
   */
  searchFonts(options: FontSearchOptions = {}): FontSearchResult {
    const {
      query,
      source,
      hasStyle,
      minStyleCount,
      limit = 20,
      sortBy = SortOption.ALPHABETICAL
    } = options;

    let sql = `
      SELECT DISTINCT f.family, f.source, f.style_count, f.is_loaded
      FROM fonts f
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];

    // Handle text search using FTS
    if (query) {
      sql = `
        SELECT DISTINCT f.family, f.source, f.style_count, f.is_loaded
        FROM fonts f
        JOIN fonts_fts fts ON f.id = fts.rowid
      `;
      conditions.push('fonts_fts MATCH ?');
      params.push(query);
    }

    // Source filter
    if (source) {
      conditions.push('f.source = ?');
      params.push(source);
    }

    // Style requirement filter
    if (hasStyle) {
      sql += `
        JOIN font_styles fs ON f.id = fs.font_id
      `;
      conditions.push('fs.style = ?');
      params.push(hasStyle);
    }

    // Minimum style count filter
    if (minStyleCount) {
      conditions.push('f.style_count >= ?');
      params.push(minStyleCount);
    }

    // Add WHERE clause if there are conditions
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Add sorting
    switch (sortBy) {
      case SortOption.ALPHABETICAL:
        sql += ' ORDER BY f.family ASC';
        break;
      case SortOption.STYLE_COUNT:
        sql += ' ORDER BY f.style_count DESC, f.family ASC';
        break;
      case SortOption.SOURCE:
        sql += ' ORDER BY f.source ASC, f.family ASC';
        break;
    }

    // Get total count first (without limit)
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) as search_results`;
    const totalResult = this.db.prepare(countSql).get(params) as { total: number };
    const totalFound = totalResult.total;

    // Add limit for actual results
    sql += ' LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(params) as DatabaseFont[];

    // Get styles for each font
    const fonts: FontResult[] = rows.map(row => ({
      family: row.family,
      source: row.source,
      styleCount: row.style_count,
      availableStyles: this.getFontStyles(row.family),
      isLoaded: Boolean(row.is_loaded)
    }));

    return {
      fonts,
      totalFound
    };
  }

  /**
   * Get count of fonts matching criteria
   */
  getFontCount(source?: FontSource, hasStyle?: string): number {
    let sql = 'SELECT COUNT(DISTINCT f.id) as count FROM fonts f';
    const conditions: string[] = [];
    const params: any[] = [];

    if (hasStyle) {
      sql += ' JOIN font_styles fs ON f.id = fs.font_id';
      conditions.push('fs.style = ?');
      params.push(hasStyle);
    }

    if (source) {
      conditions.push('f.source = ?');
      params.push(source);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const result = this.db.prepare(sql).get(params) as { count: number };
    return result.count;
  }

  /**
   * Get styles for a specific font family
   */
  getFontStyles(family: string): string[] {
    const sql = `
      SELECT fs.style 
      FROM font_styles fs
      JOIN fonts f ON fs.font_id = f.id
      WHERE f.family = ?
      ORDER BY fs.style ASC
    `;
    
    const rows = this.db.prepare(sql).all(family) as { style: string }[];
    return rows.map(row => row.style);
  }

  /**
   * Check if specific font family/style combinations are available
   */
  checkFontAvailability(fontChecks: Array<{ family: string; style: string }>): Array<{
    family: string;
    style: string;
    available: boolean;
    source?: FontSource;
  }> {
    const results = [];
    
    for (const { family, style } of fontChecks) {
      const sql = `
        SELECT f.source
        FROM fonts f
        JOIN font_styles fs ON fs.font_id = f.id
        WHERE f.family = ? AND fs.style = ?
        LIMIT 1
      `;
      
      const result = this.db.prepare(sql).get(family, style) as { source: FontSource } | undefined;
      
      results.push({
        family,
        style,
        available: !!result,
        source: result?.source
      });
    }
    
    return results;
  }

  /**
   * Validate if a font family/style combination exists
   */
  validateFont(family: string, style: string): {
    isValid: boolean;
    family: string;
    style: string;
    source?: FontSource;
    styleCount?: number;
  } {
    const sql = `
      SELECT f.source, f.style_count
      FROM fonts f
      JOIN font_styles fs ON fs.font_id = f.id
      WHERE f.family = ? AND fs.style = ?
      LIMIT 1
    `;
    
    const result = this.db.prepare(sql).get(family, style) as { 
      source: FontSource; 
      style_count: number; 
    } | undefined;
    
    return {
      isValid: !!result,
      family,
      style,
      source: result?.source,
      styleCount: result?.style_count
    };
  }

  /**
   * Get detailed information about a specific font
   */
  getFontInfo(family: string, style: string): {
    family: string;
    style: string;
    available: boolean;
    source?: FontSource;
    styleCount?: number;
    allStyles?: string[];
  } {
    // First check if the specific font exists
    const checkSql = `
      SELECT f.source, f.style_count
      FROM fonts f
      JOIN font_styles fs ON fs.font_id = f.id
      WHERE f.family = ? AND fs.style = ?
      LIMIT 1
    `;
    
    const fontResult = this.db.prepare(checkSql).get(family, style) as { 
      source: FontSource; 
      style_count: number; 
    } | undefined;
    
    if (!fontResult) {
      return {
        family,
        style,
        available: false
      };
    }
    
    // Get all styles for the font family
    const allStyles = this.getFontStyles(family);
    
    return {
      family,
      style,
      available: true,
      source: fontResult.source,
      styleCount: fontResult.style_count,
      allStyles
    };
  }

  /**
   * Insert or update a font family with its styles
   */
  upsertFont(family: string, source: FontSource, styles: string[], isLoaded: boolean = true): void {
    // Validate inputs
    if (!family || typeof family !== 'string') {
      throw new Error(`Invalid font family: ${family}`);
    }
    if (!source || typeof source !== 'string') {
      throw new Error(`Invalid font source: ${source}`);
    }
    if (!Array.isArray(styles)) {
      throw new Error(`Invalid styles array: ${styles}`);
    }
    
    const transaction = this.db.transaction(() => {
      // Insert or update font
      const fontSql = `
        INSERT INTO fonts (family, source, is_loaded, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(family) DO UPDATE SET
          source = excluded.source,
          is_loaded = excluded.is_loaded,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      const fontResult = this.db.prepare(fontSql).run(family, source, isLoaded ? 1 : 0);
      
      // Get font ID
      const fontId = fontResult.lastInsertRowid || (this.db.prepare(
        'SELECT id FROM fonts WHERE family = ?'
      ).get(family) as { id: number } | undefined)?.id;

      if (!fontId) {
        throw new Error(`Failed to get font ID for family: ${family}`);
      }

      // Clear existing styles
      this.db.prepare('DELETE FROM font_styles WHERE font_id = ?').run(fontId);

      // Insert new styles
      const styleSql = `
        INSERT INTO font_styles (font_id, style, full_name)
        VALUES (?, ?, ?)
      `;
      const styleStmt = this.db.prepare(styleSql);

      for (const style of styles) {
        // Validate style
        if (!style || typeof style !== 'string') {
          logger.warn(`Skipping invalid style for ${family}:`, style);
          continue;
        }
        
        const fullName = `${family} ${style}`;
        styleStmt.run(fontId, style, fullName);
      }
    });

    transaction();
  }

  /**
   * Clear all font data (for full resync)
   */
  clearFonts(): void {
    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM font_styles').run();
      this.db.prepare('DELETE FROM fonts').run();
      this.db.prepare('DELETE FROM fonts_fts').run();
    });
    
    transaction();
  }

  /**
   * Get sync metadata
   */
  getSyncMetadata(): SyncMetadata | null {
    const sql = 'SELECT * FROM sync_metadata WHERE id = 1';
    return this.db.prepare(sql).get() as SyncMetadata | null;
  }

  /**
   * Update sync metadata
   */
  updateSyncMetadata(updates: Partial<SyncMetadata>): void {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => {
      const value = updates[field as keyof SyncMetadata];
      // Convert undefined to null for SQLite compatibility
      return value === undefined ? null : value;
    });
    
    const sql = `
      UPDATE sync_metadata 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `;
    
    this.db.prepare(sql).run(...values);
  }

  /**
   * Check if database is empty (needs initial sync)
   */
  isEmpty(): boolean {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM fonts').get() as { count: number };
    return result.count === 0;
  }

  /**
   * Check if database is stale (needs refresh)
   */
  isStale(maxAgeHours: number = 24): boolean {
    const metadata = this.getSyncMetadata();
    if (!metadata?.last_sync_time) {
      return true;
    }

    const lastSync = new Date(metadata.last_sync_time);
    const maxAge = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    return lastSync < maxAge;
  }

  /**
   * Get database statistics
   */
  getStats(): {
    totalFonts: number;
    totalStyles: number;
    bySource: Record<string, number>;
    lastSync: string | null;
  } {
    const totalFonts = this.db.prepare('SELECT COUNT(*) as count FROM fonts').get() as { count: number };
    const totalStyles = this.db.prepare('SELECT COUNT(*) as count FROM font_styles').get() as { count: number };
    
    const bySourceRows = this.db.prepare(`
      SELECT source, COUNT(*) as count 
      FROM fonts 
      GROUP BY source
    `).all() as { source: string; count: number }[];
    
    const bySource = bySourceRows.reduce((acc, row) => {
      acc[row.source] = row.count;
      return acc;
    }, {} as Record<string, number>);

    const metadata = this.getSyncMetadata();

    return {
      totalFonts: totalFonts.count,
      totalStyles: totalStyles.count,
      bySource,
      lastSync: metadata?.last_sync_time || null
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Get database path
   */
  getPath(): string {
    return this.dbPath;
  }
}