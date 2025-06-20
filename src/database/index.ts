import { mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * Ensure database directory exists
 */
export function ensureDatabaseDirectory(dbPath: string): void {
  try {
    const dir = dirname(dbPath);
    mkdirSync(dir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore EEXIST errors
    if (error instanceof Error && !error.message.includes('EEXIST')) {
      throw error;
    }
  }
}

export { FontDatabase } from './font-database.js';
export type { DatabaseFont, DatabaseFontStyle, SyncMetadata, FontSearchOptions, FontSearchResult } from './font-database.js';