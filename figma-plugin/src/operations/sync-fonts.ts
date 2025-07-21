import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';

/**
 * Handle SYNC_FONTS operation - synchronize available fonts with database
 */
export async function handleSyncFonts(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('syncFonts', params, async () => {
    // Get all available fonts using Figma API
    const availableFonts = await figma.listAvailableFontsAsync();
    
    // Return raw font data for sync service processing
    return {
      count: availableFonts.length,
      fonts: availableFonts,
      timestamp: Date.now(),
      message: `Retrieved ${availableFonts.length} available fonts`
    };
  });
}