import { z } from 'zod';
import { FontName } from './figma-base.js';

export const FontOperationsSchema = z.object({
  operation: z.enum([
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
  // Common parameters
  fontFamily: z.string().optional(),
  fontStyle: z.string().optional(),
  fontNames: z.array(z.object({
    family: z.string(),
    style: z.string()
  })).optional(),
  preloadCount: z.number().optional(),
  priority: z.enum(['high', 'normal', 'low']).optional(),
  strict: z.boolean().optional(),
  fallbackSuggestions: z.boolean().optional(),
  
  // Search parameters for search_fonts
  query: z.string().optional(),
  source: z.enum(['system', 'google', 'custom']).optional(),
  includeGoogle: z.boolean().optional(),
  includeSystem: z.boolean().optional(),
  includeCustom: z.boolean().optional(),
  hasStyle: z.string().optional(),
  minStyleCount: z.number().optional(),
  limit: z.number().min(1).max(100).optional(),
  sortBy: z.enum(['alphabetical', 'style_count', 'source']).optional(),
  
  // Count parameters for get_font_count
  countSource: z.enum(['system', 'google', 'custom']).optional(),
  countHasStyle: z.string().optional()
}).refine((data) => {
  // Validate required fields based on operation
  switch (data.operation) {
    case 'check_availability':
      return data.fontNames && data.fontNames.length > 0;
    case 'get_font_styles':
      return !!data.fontFamily;
    case 'validate_font':
    case 'get_font_info':
      return !!data.fontFamily && !!data.fontStyle;
    case 'preload_fonts':
      return data.fontNames && data.fontNames.length > 0;
    case 'search_fonts':
      // At least one search parameter is required
      return !!(data.query || data.source || data.includeGoogle || 
               data.includeSystem || data.includeCustom || data.hasStyle || 
               data.minStyleCount);
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