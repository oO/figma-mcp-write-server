import { FontInfo, FontFamily, FontOperations, SearchFontsResponse, ProjectFontsResponse, FontCountResponse, FontSource, SortOption } from '../types/font-operations.js';
import { FontDatabase, ensureDatabaseDirectory } from '../database/index.js';
import { FontSyncService } from './font-sync-service.js';

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
        console.warn('Database search failed, falling back to API:', error);
      }
    }

    // Fallback to Figma API
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
    // Unwrap plugin response format: { success: true, data: [...] }
    return result?.success ? result.data : result;
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
        console.warn('Database count failed, falling back to API:', error);
      }
    }

    // Fallback to Figma API
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
    // Unwrap plugin response format: { success: true, data: [...] }
    return result?.success ? result.data : result;
  }


  /**
   * Check availability of specific fonts
   */
  async checkFontAvailability(fontNames: Array<{ family: string; style: string }>, options: {
    fallbackSuggestions?: boolean;
  } = {}): Promise<FontInfo[]> {
    const result = await this.sendToPlugin({
      type: 'MANAGE_FONTS',
      payload: {
        operation: 'check_availability',
        fontNames,
        ...options
      }
    });
    // Unwrap plugin response format: { success: true, data: [...] }
    return result?.success ? result.data : result;
  }

  /**
   * Validate a specific font
   */
  async validateFont(fontFamily: string, fontStyle: string, options: {
    strict?: boolean;
    fallbackSuggestions?: boolean;
  } = {}): Promise<any> {
    const result = await this.sendToPlugin({
      type: 'MANAGE_FONTS',
      payload: {
        operation: 'validate_font',
        fontFamily,
        fontStyle,
        ...options
      }
    });
    // Unwrap plugin response format: { success: true, data: [...] }
    return result?.success ? result.data : result;
  }

  /**
   * Get detailed information about a specific font
   */
  async getFontInfo(fontFamily: string, fontStyle: string): Promise<FontInfo> {
    const result = await this.sendToPlugin({
      type: 'MANAGE_FONTS',
      payload: {
        operation: 'get_font_info',
        fontFamily,
        fontStyle
      }
    });
    // Unwrap plugin response format: { success: true, data: [...] }
    return result?.success ? result.data : result;
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
    // Unwrap plugin response format: { success: true, data: [...] }
    return result?.success ? result.data : result;
  }

  /**
   * Execute any font operation with raw payload
   */
  async executeOperation(payload: FontOperations): Promise<any> {
    const result = await this.sendToPlugin({
      type: 'MANAGE_FONTS',
      payload
    });
    // Unwrap plugin response format: { success: true, data: [...] }
    return result?.success ? result.data : result;
  }

  // Database initialization and management

  /**
   * Initialize database and sync service
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Ensure database directory exists
      if (this.config.databasePath) {
        ensureDatabaseDirectory(this.config.databasePath);
      }
      
      this.db = new FontDatabase(this.config.databasePath);
      this.syncService = new FontSyncService(this.db, this.sendToPlugin);
      
      // Trigger initial sync if database is empty or stale
      if (this.syncService.isSyncNeeded()) {
        // Don't await - let it run in background
        this.syncService.syncFonts().catch(error => {
          console.warn('Background font sync failed:', error);
        });
      }
    } catch (error) {
      console.warn('Failed to initialize font database:', error);
      this.db = null;
      this.syncService = null;
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
    return result?.success ? result.data : result;
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
    return result?.success ? result.data : result;
  }

  /**
   * Get font styles using database with fallback
   */
  async getFontStyles(fontFamily: string): Promise<string[]> {
    // Try database first
    if (await this.isDatabaseReady()) {
      try {
        return this.db!.getFontStyles(fontFamily);
      } catch (error) {
        console.warn('Database font styles failed, falling back to API:', error);
      }
    }

    // Fallback to API
    const result = await this.sendToPlugin({
      type: 'MANAGE_FONTS',
      payload: {
        operation: 'get_font_styles',
        fontFamily
      }
    });
    return result?.success ? result.data : result;
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
}