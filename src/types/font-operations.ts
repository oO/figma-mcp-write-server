import { z } from 'zod';
import { FontName } from './figma-base.js';
import { caseInsensitiveEnum } from './enum-utils.js';

export const FontOperationsSchema = z.object({
  operation: caseInsensitiveEnum([
    'search_fonts',
    'check_availability', 
    'get_missing',
    'get_font_styles',
    'validate_font',
    'get_font_info',
    'preload_fonts',
    'get_project_fonts',
    'get_font_count'
  ]),
  
  // Flat parameters with bulk support - support both single values and arrays
  fontFamily: z.union([z.string(), z.array(z.string())]).optional(),
  fontStyle: z.union([z.string(), z.array(z.string())]).optional(),
  
  
  // Other parameters with bulk support
  preloadCount: z.union([z.number(), z.array(z.number())]).optional(),
  priority: z.union([caseInsensitiveEnum(['high', 'normal', 'low']), z.array(caseInsensitiveEnum(['high', 'normal', 'low']))]).optional(),
  strict: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  fallbackSuggestions: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  
  // Bulk operation control
  failFast: z.boolean().optional(), // Stop on first error in bulk operations
  
  // Search parameters for search_fonts
  query: z.string().optional(),
  source: caseInsensitiveEnum(['system', 'google', 'custom']).optional(),
  includeGoogle: z.boolean().optional(),
  includeSystem: z.boolean().optional(),
  includeCustom: z.boolean().optional(),
  hasStyle: z.string().optional(),
  minStyleCount: z.number().optional(),
  limit: z.number().min(1).max(100).optional(),
  sortBy: caseInsensitiveEnum(['alphabetical', 'style_count', 'source']).optional(),
  
  // Count parameters for get_font_count
  countSource: caseInsensitiveEnum(['system', 'google', 'custom']).optional(),
  countHasStyle: z.string().optional()
}).refine((data) => {
  // Validate required fields based on operation
  switch (data.operation) {
    case 'check_availability':
    case 'preload_fonts':
      if (!data.fontFamily || !data.fontStyle) {
        throw new Error(`${data.operation} requires both 'fontFamily' and 'fontStyle' parameters`);
      }
      return true;
    case 'get_font_styles':
      if (!data.fontFamily) {
        throw new Error(`${data.operation} requires 'fontFamily' parameter`);
      }
      return true;
    case 'validate_font':
    case 'get_font_info':
      if (!data.fontFamily || !data.fontStyle) {
        throw new Error(`${data.operation} requires both 'fontFamily' and 'fontStyle' parameters`);
      }
      return true;
    case 'search_fonts':
      // At least one search parameter is required
      if (!(data.query || data.source || data.includeGoogle || 
            data.includeSystem || data.includeCustom || data.hasStyle || 
            data.minStyleCount)) {
        throw new Error(`search_fonts requires at least one search parameter: query, source, includeGoogle, includeSystem, includeCustom, hasStyle, or minStyleCount`);
      }
      return true;
    default:
      return true;
  }
}, {
  message: "Missing required parameters for the selected operation"
});

export type FontOperations = z.infer<typeof FontOperationsSchema>;

export interface FontInfo {
  family: string;
  style: string;
  status: 'available' | 'missing' | 'loading' | 'error';
  category?: 'google' | 'system' | 'custom';
  metadata?: {
    weight?: number;
    width?: string;
    slant?: string;
    fullName?: string;
  };
}

export interface FontFamily {
  name: string;
  styles: string[];
  category: 'google' | 'system' | 'custom';
  isLoaded: boolean;
}

// New types for updated font operations
export enum FontSource {
  SYSTEM = "system",
  GOOGLE = "google", 
  CUSTOM = "custom"
}

export enum SortOption {
  ALPHABETICAL = "alphabetical",
  STYLE_COUNT = "style_count",
  SOURCE = "source"
}

export interface FontResult {
  family: string;
  source: FontSource;
  styleCount: number;
  availableStyles: string[];
  isLoaded: boolean;
}

export interface SearchCriteria {
  appliedFilters: string[];
  resultLimit: number;
}

export interface SearchFontsResponse {
  fonts: FontResult[];
  totalFound: number;
  totalReturned: number;
  hasMore: boolean;
  searchSummary: string;
  searchCriteria: SearchCriteria;
}

export interface FontCountResponse {
  count: number;
  source?: FontSource;
  hasStyle?: string;
  summary: string;
}

export interface ProjectFontsResponse {
  fonts: FontResult[];
  totalUsed: number;
  summary: string;
}

export interface FontValidationResult {
  isValid: boolean;
  fontName: FontName;
  status: 'available' | 'missing' | 'loading' | 'error';
  message?: string;
  suggestions?: FontName[];
}

export interface FontMissingResult {
  missingFonts: FontName[];
  suggestions?: Array<{
    missing: FontName;
    alternatives: FontName[];
  }>;
}

export interface FontPreloadResult {
  preloaded: FontName[];
  failed: Array<{
    font: FontName;
    reason: string;
  }>;
  priority: 'high' | 'normal' | 'low';
}