import { FontInfo, FontFamily, FontOperations, SearchFontsResponse, ProjectFontsResponse, FontCountResponse, FontSource, SortOption } from '../types/font-operations.js';
import { FontDatabase, ensureDatabaseDirectory } from '../database/index.js';
import { FontSyncService } from './font-sync-service.js';
import { logger } from "../utils/logger.js"

/**
 * Shared service for font operations that can be used by both
 * tool handlers and resource providers to avoid code duplication
 * 
 * Uses SQLite database for fast search with graceful fallback to Figma API
 */
export class FontService {
  private db: FontDatabase | null = null;
  private syncService: FontSyncService | null = null;
  private initializationPromise: Promise<void> | null = null;

  constructor(
    private sendToPlugin: (request: any) => Promise<any>,
    private config: { databasePath?: string; enableDatabase?: boolean } = {}
  ) {
    if (config.enableDatabase !== false) {
      this.initializationPromise = this.initializeDatabase();
    }
  }

  /**
   * Search fonts with intelligent filtering
   * Uses database if available, falls back to Figma API
   */
  async searchFonts(options: {
    query?: string;
    source?: 'system' | 'google' | 'custom';
    includeGoogle?: boolean;
    includeSystem?: boolean;
    includeCustom?: boolean;
    hasStyle?: string;
    minStyleCount?: number;
    limit?: number;
    sortBy?: 'alphabetical' | 'style_count' | 'source';
  } = {}): Promise<SearchFontsResponse> {
    // Try database first if available and ready
    if (await this.isDatabaseReady()) {
      try {
        return await this.searchFontsFromDatabase(options);
      } catch (error) {
        logger.error('Database search failed, falling back to API:', error);
      }
    }

    // Fallback to Figma API
    logger.warn('🔤⚠️ Using Figma API fallback for search_fonts (database not ready)');
    return await this.searchFontsFromAPI(options);
  }

  /**
   * Get fonts used in current project
   */
  async getProjectFonts(): Promise<ProjectFontsResponse> {
    const result = await this.sendToPlugin({
      type: 'MANAGE_FONTS',
      payload: {
        operation: 'get_project_fonts'
      }
    });
    // KISS: Direct data response (no success wrapper)
    return result;
  }
  
  /**
   * Get count of available fonts
   * Uses database if available, falls back to Figma API
   */
  async getFontCount(options: {
    countSource?: 'system' | 'google' | 'custom';
    countHasStyle?: string;
  } = {}): Promise<FontCountResponse> {
    // Try database first if available and ready
    if (await this.isDatabaseReady()) {
      try {
        return await this.getFontCountFromDatabase(options);
      } catch (error) {
        logger.error('Database count failed, falling back to API:', error);
      }
    }

    // Fallback to Figma API
    logger.warn('🔤⚠️ Using Figma API fallback for get_font_count (database not ready)');
    return await this.getFontCountFromAPI(options);
  }

  /**
   * Get missing fonts in the current document
   */
  async getMissingFonts(options: {
    fallbackSuggestions?: boolean;
  } = {}): Promise<{ missingFonts: FontInfo[], suggestions?: any[] }> {
    const result = await this.sendToPlugin({
      type: 'MANAGE_FONTS',
      payload: {
        operation: 'get_missing',
        ...options
      }
    });
    // KISS: Direct data response (no success wrapper)
    return result;
  }


  /**
   * Check availability of specific fonts
   * Uses database if available, falls back to Figma API
   */
  async checkFontAvailability(fontNames: Array<{ family: string; style: string }>, options: {
    fallbackSuggestions?: boolean;
  } = {}): Promise<FontInfo[]> {
    // Try database first if available and ready
    if (await this.isDatabaseReady()) {
      try {
        return await this.checkFontAvailabilityFromDatabase(fontNames, options);
      } catch (error) {
        logger.error('Database availability check failed, falling back to API:', error);
      }
    }

    // Fallback to Figma API
    logger.warn('🔤⚠️ Using Figma API fallback for check_availability (database not ready)');
    return await this.checkFontAvailabilityFromAPI(fontNames, options);
  }

  /**
   * Validate a specific font
   * Uses database if available, falls back to Figma API
   */
  async validateFont(fontFamily: string, fontStyle: string, options: {
    strict?: boolean;
    fallbackSuggestions?: boolean;
  } = {}): Promise<any> {
    // Try database first if available and ready
    if (await this.isDatabaseReady()) {
      try {
        return await this.validateFontFromDatabase(fontFamily, fontStyle, options);
      } catch (error) {
        logger.error('Database font validation failed, falling back to API:', error);
      }
    }

    // Fallback to Figma API
    logger.warn('🔤⚠️ Using Figma API fallback for validate_font (database not ready)');
    return await this.validateFontFromAPI(fontFamily, fontStyle, options);
  }

  /**
   * Get detailed information about a specific font
   * Uses database if available, falls back to Figma API
   */
  async getFontInfo(fontFamily: string, fontStyle: string): Promise<FontInfo> {
    // Try database first if available and ready
    if (await this.isDatabaseReady()) {
      try {
        return await this.getFontInfoFromDatabase(fontFamily, fontStyle);
      } catch (error) {
        logger.error('Database font info failed, falling back to API:', error);
      }
    }

    // Fallback to Figma API
    logger.warn('🔤⚠️ Using Figma API fallback for get_font_info (database not ready)');
    return await this.getFontInfoFromAPI(fontFamily, fontStyle);
  }

  /**
   * Get all styles for a specific font family
   * Uses database if available, falls back to Figma API
   */
  async getFontStyles(fontFamily: string): Promise<{
    family: string;
    styles: string[];
    styleCount: number;
    category: string;
  }> {
    // Try database first if available and ready
    if (await this.isDatabaseReady()) {
      try {
        return await this.getFontStylesFromDatabase(fontFamily);
      } catch (error) {
        logger.error('Database font styles failed, falling back to API:', error);
      }
    }

    // Fallback to Figma API
    logger.warn('🔤⚠️ Using Figma API fallback for get_font_styles (database not ready)');
    return await this.getFontStylesFromAPI(fontFamily);
  }

  /**
   * Preload fonts for performance optimization
   */
  async preloadFonts(fontNames: Array<{ family: string; style: string }>, options: {
    preloadCount?: number;
    priority?: 'high' | 'normal' | 'low';
  } = {}): Promise<any> {
    const result = await this.sendToPlugin({
      type: 'MANAGE_FONTS',
      payload: {
        operation: 'preload_fonts',
        fontNames,
        ...options
      }
    });
    // KISS: Direct data response (no success wrapper)
    return result;
  }

  /**
   * Execute any font operation with raw payload
   */
  async executeOperation(payload: FontOperations): Promise<any> {
    const result = await this.sendToPlugin({
      type: 'MANAGE_FONTS',
      payload
    });
    // KISS: Direct data response (no success wrapper)
    return result;
  }

  // Database initialization and management

  /**
   * Initialize database and sync service (without triggering sync)
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Ensure database directory exists
      if (this.config.databasePath) {
        ensureDatabaseDirectory(this.config.databasePath);
      }
      
      this.db = new FontDatabase(this.config.databasePath);
      this.syncService = new FontSyncService(this.db, this.sendToPlugin);
      
      // Database initialized, sync will be triggered only when plugin connects if needed
    } catch (error) {
      logger.warn('Failed to initialize font database:', error);
      this.db = null;
      this.syncService = null;
    }
  }

  /**
   * Check database state and sync only if needed (called when plugin connects)
   */
  async checkAndSyncIfNeeded(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    
    if (!this.syncService) {
      logger.warn('🔤 SyncService not available, database disabled');
      return; // Database not available
    }

    if (!this.db) {
      logger.warn('🔤 Database not available after initialization');
      return;
    }

    try {
      const syncNeeded = this.syncService.isSyncNeeded();
      
      // Only sync if database is empty or stale
      if (syncNeeded) {
        logger.log('🔤 Font database requires sync, updating...');
        await this.syncService.syncFonts();
        logger.log('🔤 Font database sync completed');
      }
    } catch (error) {
      logger.error('🔤 Font database sync failed:', error);
    }
  }

  /**
   * Check if database is ready for use
   */
  private async isDatabaseReady(): Promise<boolean> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    return this.db !== null && !this.db.isEmpty();
  }

  /**
   * Search fonts using database
   */
  private async searchFontsFromDatabase(options: any): Promise<SearchFontsResponse> {
    if (!this.db) throw new Error('Database not available');

    const {
      query,
      source,
      includeGoogle = true,
      includeSystem = true,
      includeCustom = true,
      hasStyle,
      minStyleCount,
      limit = 20,
      sortBy = 'alphabetical'
    } = options;

    // Convert include flags to source filter if needed
    let effectiveSource = source;
    if (!effectiveSource && (!includeGoogle || !includeSystem || !includeCustom)) {
      if (includeGoogle && !includeSystem && !includeCustom) effectiveSource = FontSource.GOOGLE;
      else if (includeSystem && !includeGoogle && !includeCustom) effectiveSource = FontSource.SYSTEM;
      else if (includeCustom && !includeGoogle && !includeSystem) effectiveSource = FontSource.CUSTOM;
    }

    const searchResult = this.db.searchFonts({
      query,
      source: effectiveSource,
      hasStyle,
      minStyleCount,
      limit,
      sortBy: sortBy as SortOption
    });

    // Build search summary and criteria
    const appliedFilters: string[] = [];
    if (query) appliedFilters.push(`Query: '${query}'`);
    if (effectiveSource) appliedFilters.push(`Source: ${effectiveSource}`);
    if (hasStyle) appliedFilters.push(`Has style: ${hasStyle}`);
    if (minStyleCount) appliedFilters.push(`Min styles: ${minStyleCount}`);
    appliedFilters.push(`Limit: ${limit}`);

    let searchSummary = `Found ${searchResult.totalFound} font${searchResult.totalFound !== 1 ? 's' : ''}`;
    if (query) searchSummary += ` matching '${query}'`;
    if (effectiveSource) searchSummary += ` from ${effectiveSource} fonts`;
    if (hasStyle) searchSummary += ` with ${hasStyle} style`;
    if (minStyleCount) searchSummary += ` with ${minStyleCount}+ styles`;

    const hasMore = searchResult.totalFound > searchResult.fonts.length;
    if (hasMore) {
      searchSummary += `, showing first ${searchResult.fonts.length}`;
    } else {
      searchSummary += searchResult.totalFound === searchResult.fonts.length ? ', showing all results' : `, showing ${searchResult.fonts.length}`;
    }

    return {
      fonts: searchResult.fonts,
      totalFound: searchResult.totalFound,
      totalReturned: searchResult.fonts.length,
      hasMore,
      searchSummary,
      searchCriteria: {
        appliedFilters,
        resultLimit: limit
      }
    };
  }

  /**
   * Search fonts using Figma API (fallback)
   */
  private async searchFontsFromAPI(options: any): Promise<SearchFontsResponse> {
    const result = await this.sendToPlugin({
      type: 'MANAGE_FONTS',
      payload: {
        operation: 'search_fonts',
        ...options
      }
    });
    return result;
  }

  /**
   * Get font count using database
   */
  private async getFontCountFromDatabase(options: any): Promise<FontCountResponse> {
    if (!this.db) throw new Error('Database not available');

    const { countSource, countHasStyle } = options;
    
    const count = this.db.getFontCount(
      countSource as FontSource | undefined,
      countHasStyle
    );

    let summary = `${count} font famil${count !== 1 ? 'ies' : 'y'} available`;
    if (countSource) summary += ` from ${countSource} fonts`;
    if (countHasStyle) summary += ` with ${countHasStyle} style`;

    return {
      count,
      source: countSource,
      hasStyle: countHasStyle,
      summary
    };
  }

  /**
   * Get font count using Figma API (fallback)
   */
  private async getFontCountFromAPI(options: any): Promise<FontCountResponse> {
    const result = await this.sendToPlugin({
      type: 'MANAGE_FONTS',
      payload: {
        operation: 'get_font_count',
        ...options
      }
    });
    return result;
  }


  /**
   * Get sync service for manual operations
   */
  getSyncService(): FontSyncService | null {
    return this.syncService;
  }

  /**
   * Get database instance
   */
  getDatabase(): FontDatabase | null {
    return this.db;
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<any> {
    if (await this.isDatabaseReady()) {
      return this.db!.getStats();
    }
    return null;
  }

  /**
   * Force font synchronization
   */
  async forceFontSync(): Promise<any> {
    if (this.syncService) {
      return await this.syncService.syncFonts(true);
    }
    throw new Error('Sync service not available');
  }

  // Private database-specific methods

  private async checkFontAvailabilityFromDatabase(fontNames: Array<{ family: string; style: string }>, options: any): Promise<FontInfo[]> {
    if (!this.db) throw new Error('Database not available');
    
    const checks = fontNames.map(f => ({ family: f.family, style: f.style }));
    const results = this.db.checkFontAvailability(checks);
    
    return results.map(result => ({
      family: result.family,
      style: result.style,
      status: result.available ? 'available' as const : 'missing' as const,
      category: result.source
    }));
  }

  private async checkFontAvailabilityFromAPI(fontNames: Array<{ family: string; style: string }>, options: any): Promise<FontInfo[]> {
    const result = await this.sendToPlugin({
      type: 'MANAGE_FONTS',
      payload: {
        operation: 'check_availability',
        fontFamily: fontNames.map(f => f.family),
        fontStyle: fontNames.map(f => f.style),
        ...options
      }
    });
    return result;
  }

  private async validateFontFromDatabase(fontFamily: string, fontStyle: string, options: any): Promise<any> {
    if (!this.db) throw new Error('Database not available');
    
    const result = this.db.validateFont(fontFamily, fontStyle);
    
    return {
      isValid: result.isValid,
      fontName: { family: result.family, style: result.style },
      category: result.source,
      message: result.isValid 
        ? `Font '${result.family}' ${result.style} is valid and available`
        : `Font '${result.family}' ${result.style} is not available`
    };
  }

  private async validateFontFromAPI(fontFamily: string, fontStyle: string, options: any): Promise<any> {
    const result = await this.sendToPlugin({
      type: 'MANAGE_FONTS',
      payload: {
        operation: 'validate_font',
        fontFamily,
        fontStyle,
        ...options
      }
    });
    return result;
  }

  private async getFontInfoFromDatabase(fontFamily: string, fontStyle: string): Promise<FontInfo> {
    if (!this.db) throw new Error('Database not available');
    
    const result = this.db.getFontInfo(fontFamily, fontStyle);
    
    return {
      family: result.family,
      style: result.style,
      status: result.available ? 'available' : 'missing',
      category: result.source
    };
  }

  private async getFontInfoFromAPI(fontFamily: string, fontStyle: string): Promise<FontInfo> {
    const result = await this.sendToPlugin({
      type: 'MANAGE_FONTS',
      payload: {
        operation: 'get_font_info',
        fontFamily,
        fontStyle
      }
    });
    return result;
  }

  private async getFontStylesFromDatabase(fontFamily: string): Promise<{
    family: string;
    styles: string[];
    styleCount: number;
    category: string;
  }> {
    if (!this.db) throw new Error('Database not available');
    
    const styles = this.db.getFontStyles(fontFamily);
    
    if (styles.length === 0) {
      throw new Error(`Font family '${fontFamily}' not found`);
    }
    
    // Get font info to determine category (use first style)
    const fontInfo = this.db.getFontInfo(fontFamily, styles[0] || 'Regular');
    
    return {
      family: fontFamily,
      styles,
      styleCount: styles.length,
      category: (fontInfo.source as string) || 'custom'
    };
  }

  private async getFontStylesFromAPI(fontFamily: string): Promise<{
    family: string;
    styles: string[];
    styleCount: number;
    category: string;
  }> {
    const result = await this.sendToPlugin({
      type: 'MANAGE_FONTS',
      payload: {
        operation: 'get_font_styles',
        fontFamily
      }
    });
    return result;
  }
}