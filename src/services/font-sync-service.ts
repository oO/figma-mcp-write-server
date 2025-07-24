import { FontDatabase } from '../database/font-database.js';
import { FontSource } from '../types/font-operations.js';
import { debugLog } from "../utils/logger.js"

export interface SyncProgress {
  phase: 'starting' | 'fetching' | 'processing' | 'storing' | 'completed' | 'failed';
  processed: number;
  total: number;
  message: string;
  startTime: Date;
  endTime?: Date;
}

/**
 * KISS: SyncResult returns data directly, errors are thrown
 */
export interface SyncResult {
  totalFonts: number;
  totalStyles: number;
  duration: number;
}

export class FontSyncService {
  private db: FontDatabase;
  private sendToPlugin: (request: any) => Promise<any>;
  private currentSync: SyncProgress | null = null;

  constructor(db: FontDatabase, sendToPluginFn: (request: any) => Promise<any>) {
    this.db = db;
    this.sendToPlugin = sendToPluginFn;
  }

  /**
   * Perform full font synchronization from Figma API to database
   */
  async syncFonts(force: boolean = false): Promise<SyncResult> {
    // Check if sync is already in progress
    if (this.currentSync && this.currentSync.phase !== 'completed' && this.currentSync.phase !== 'failed') {
      throw new Error('Font synchronization already in progress');
    }

    // Check if sync is needed
    if (!force && !this.db.isEmpty() && !this.db.isStale()) {
      const stats = this.db.getStats();
      const metadata = this.db.getSyncMetadata();
      const lastSync = metadata?.last_sync_time ? new Date(metadata.last_sync_time) : null;
      const timeSinceSync = lastSync ? Math.round((Date.now() - lastSync.getTime()) / (1000 * 60 * 60)) : 0;
      
      debugLog(`📦 Font database is fresh (${stats.totalFonts} families, last sync ${timeSinceSync}h ago), skipping sync`);
      
      // KISS: Return data directly
      return {
        totalFonts: stats.totalFonts,
        totalStyles: stats.totalStyles,
        duration: 0
      };
    }

    const startTime = new Date();
    
    this.currentSync = {
      phase: 'starting',
      processed: 0,
      total: 0,
      message: 'Initializing font synchronization',
      startTime
    };

    try {
      // Update sync status in database
      this.db.updateSyncMetadata({
        sync_status: 'in_progress',
        sync_error: null
      });

      // Phase 1: Fetch fonts from Figma API
      this.updateProgress('fetching', 0, 0, 'Fetching fonts from Figma API');
      debugLog('FontSync: Fetching fonts from Figma API...');
      
      const figmaFonts = await this.fetchFontsFromFigma();
      debugLog(`FontSync: Retrieved ${figmaFonts.length} fonts from Figma API`);
      
      // Phase 2: Process and categorize fonts
      this.updateProgress('processing', 0, figmaFonts.length, 'Processing font data');
      debugLog(`FontSync: Processing ${figmaFonts.length} fonts...`);
      
      const processedFonts = this.processFigmaFonts(figmaFonts);
      debugLog(`FontSync: Processed ${processedFonts.length} font families`);
      
      // Phase 3: Store in database
      this.updateProgress('storing', 0, processedFonts.length, 'Storing fonts in database');
      debugLog(`FontSync: Storing ${processedFonts.length} font families in database...`);
      
      await this.storeFontsInDatabase(processedFonts);
      debugLog('FontSync: Database storage completed');
      
      // Complete sync
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      this.currentSync = {
        ...this.currentSync,
        phase: 'completed',
        endTime,
        message: 'Font synchronization completed successfully'
      };

      // Update sync metadata
      this.db.updateSyncMetadata({
        sync_status: 'completed',
        last_sync_time: endTime.toISOString(),
        total_fonts_synced: processedFonts.length,
        sync_error: null
      });

      const stats = this.db.getStats();
      debugLog(`FontSync: Sync completed successfully! ${stats.totalFonts} families, ${stats.totalStyles} styles (${duration}ms)`);
      
      // KISS: Return data directly
      return {
        totalFonts: stats.totalFonts,
        totalStyles: stats.totalStyles,
        duration
      };

    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const errorMessage = error instanceof Error ? error.toString() : 'Unknown error';
      
      debugLog(`FontSync: Sync failed after ${duration}ms:`, 'error', errorMessage);
      
      this.currentSync = {
        ...this.currentSync!,
        phase: 'failed',
        endTime,
        message: `Sync failed: ${errorMessage}`
      };

      // Update sync metadata
      this.db.updateSyncMetadata({
        sync_status: 'failed',
        sync_error: errorMessage
      });

      // KISS: Throw errors instead of returning them
      throw new Error(`Font sync failed after ${duration}ms: ${errorMessage}`);
    }
  }

  /**
   * Get current synchronization progress
   */
  getSyncProgress(): SyncProgress | null {
    return this.currentSync;
  }

  /**
   * Check if synchronization is needed
   */
  isSyncNeeded(maxAgeHours: number = 24): boolean {
    return this.db.isEmpty() || this.db.isStale(maxAgeHours);
  }

  /**
   * Fetch fonts from Figma Plugin API using direct figma.listAvailableFontsAsync()
   */
  private async fetchFontsFromFigma(): Promise<any[]> {
    let result: any;
    
    try {
      // Send a custom sync operation to get raw font data
      result = await this.sendToPlugin({
        type: 'SYNC_FONTS',
        payload: {}
      });
    } catch (error) {
      debugLog('FontSync: Error calling plugin:', 'error', error);
      throw error;
    }

    // Extract font data - result is returned directly
    let fonts: any[];
    if (result?.fonts) {
      fonts = result.fonts;
    } else if (Array.isArray(result)) {
      fonts = result;
    } else {
      debugLog('FontSync: Invalid result structure:', 'error', result);
      throw new Error('Invalid font data received from Figma API');
    }
    
    if (!Array.isArray(fonts)) {
      debugLog('FontSync: Fonts is not an array:', 'error', fonts);
      throw new Error('Invalid font data received from Figma API');
    }

    return fonts;
  }

  /**
   * Process raw Figma font data into structured format
   */
  private processFigmaFonts(figmaFonts: any[]): ProcessedFont[] {
    const fontFamilies = new Map<string, ProcessedFont>();

    let processed = 0;
    
    for (const font of figmaFonts) {
      const family = font.fontName?.family || font.family;
      const style = font.fontName?.style || font.style;
      
      if (!family || !style) {
        continue; // Skip invalid font entries
      }

      if (!fontFamilies.has(family)) {
        fontFamilies.set(family, {
          family,
          source: this.categorizeFontSource(family),
          styles: new Set(),
          isLoaded: true
        });
      }

      fontFamilies.get(family)!.styles.add(style);
      
      processed++;
      if (processed % 1000 === 0) {
        this.updateProgress('processing', processed, figmaFonts.length, 
          `Processed ${processed}/${figmaFonts.length} fonts`);
      }
    }

    return Array.from(fontFamilies.values());
  }

  /**
   * Store processed fonts in database
   */
  private async storeFontsInDatabase(fonts: ProcessedFont[]): Promise<void> {
    // Clear existing data for full resync
    this.db.clearFonts();

    let stored = 0;
    let errors = 0;
    
    for (const font of fonts) {
      try {
        const styles = Array.from(font.styles);
        this.db.upsertFont(font.family, font.source, styles, font.isLoaded);
        stored++;
      } catch (error) {
        errors++;
        debugLog(`Failed to store font "${font.family}":`, 'error', error);
        debugLog(`Font data:`, 'message', { 
          family: font.family, 
          source: font.source, 
          stylesCount: font.styles.size,
          isLoaded: font.isLoaded,
          styles: Array.from(font.styles).slice(0, 5) // Show first 5 styles for debugging
        });
        
        // Don't fail the entire sync for one bad font
        if (errors > 10) {
          throw new Error(`Too many font storage errors (${errors}), aborting sync`);
        }
      }
      
      if ((stored + errors) % 100 === 0) {
        this.updateProgress('storing', stored + errors, fonts.length, 
          `Stored ${stored}/${fonts.length} font families (${errors} errors)`);
      }
    }
    
    if (errors > 0) {
      debugLog(`FontSync: Storage completed with ${errors} errors out of ${fonts.length} fonts`, 'warning', undefined);
    }
  }

  /**
   * Categorize font family by source type
   */
  private categorizeFontSource(family: string): FontSource {
    // Common Google Fonts families (subset for performance)
    const googleFonts = new Set([
      'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Source Sans Pro',
      'Raleway', 'PT Sans', 'Lora', 'Nunito', 'Ubuntu', 'Playfair Display', 'Merriweather',
      'Poppins', 'Fira Sans', 'Work Sans', 'Crimson Text', 'Libre Baskerville', 'Source Code Pro',
      'Source Serif Pro', 'Noto Sans', 'Noto Serif', 'DM Sans', 'DM Serif Display'
    ]);

    // Common system fonts
    const systemFonts = new Set([
      'Arial', 'Helvetica', 'Times', 'Times New Roman', 'Courier', 'Courier New',
      'Verdana', 'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Tahoma',
      'Trebuchet MS', 'Arial Black', 'Impact', 'Comic Sans MS', 'Lucida',
      'Monaco', 'Consolas', 'Menlo', 'SF Pro Display', 'SF Pro Text', 'Segoe UI',
      'Helvetica Neue', 'Avenir', 'Futura', 'Gill Sans'
    ]);

    const lowerFamily = family.toLowerCase();

    // Check Google Fonts (exact match or contains)
    if (googleFonts.has(family) || 
        Array.from(googleFonts).some(gf => lowerFamily.includes(gf.toLowerCase()))) {
      return FontSource.GOOGLE;
    }

    // Check system fonts (exact match or contains)
    if (systemFonts.has(family) || 
        Array.from(systemFonts).some(sf => lowerFamily.includes(sf.toLowerCase()))) {
      return FontSource.SYSTEM;
    }

    // Everything else is custom
    return FontSource.CUSTOM;
  }

  /**
   * Update current sync progress
   */
  private updateProgress(
    phase: SyncProgress['phase'], 
    processed: number, 
    total: number, 
    message: string
  ): void {
    if (this.currentSync) {
      this.currentSync.phase = phase;
      this.currentSync.processed = processed;
      this.currentSync.total = total;
      this.currentSync.message = message;
    }
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    lastSync: string | null;
    status: string;
    totalFonts: number;
    isStale: boolean;
    isEmpty: boolean;
  } {
    const metadata = this.db.getSyncMetadata();
    const stats = this.db.getStats();
    
    return {
      lastSync: metadata?.last_sync_time || null,
      status: metadata?.sync_status || 'never',
      totalFonts: stats.totalFonts,
      isStale: this.db.isStale(),
      isEmpty: this.db.isEmpty()
    };
  }
}

interface ProcessedFont {
  family: string;
  source: FontSource;
  styles: Set<string>;
  isLoaded: boolean;
}