import { BaseHandler } from './base-handler.js';
import { OperationResult } from '../types.js';
import { loadFont, loadFonts, createFontName, validateFontName, normalizeFontStyle, getFontKey } from '../utils/font-utils.js';

interface FontInfo {
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

interface FontFamily {
  name: string;
  styles: string[];
  category: 'google' | 'system' | 'custom';
  isLoaded: boolean;
}

export class FontHandler extends BaseHandler {
  private fontCache = new Map<string, FontInfo>();
  private familyCache = new Map<string, FontFamily>();

  getHandlerName(): string {
    return 'FontHandler';
  }

  getOperations(): Record<string, OperationHandler> {
    return {
      'MANAGE_FONTS': (payload) => this.manageFonts(payload)
    };
  }

  private async manageFonts(payload: any): Promise<OperationResult> {
    return this.executeOperation('manageFonts', payload, async () => {
      this.validateParams(payload, ['operation']);
      
      const { operation } = payload;
      
      switch (operation) {
        case 'search_fonts':
          return await this.searchFonts(payload);
        case 'check_availability':
          return await this.checkAvailability(payload);
        case 'get_missing':
          return await this.getMissing(payload);
        case 'get_font_styles':
          return await this.getFontStyles(payload);
        case 'validate_font':
          return await this.validateFont(payload);
        case 'get_font_info':
          return await this.getFontInfo(payload);
        case 'preload_fonts':
          return await this.preloadFonts(payload);
        case 'get_project_fonts':
          return await this.getProjectFonts(payload);
        case 'get_font_count':
          return await this.getFontCount(payload);
        default:
          throw new Error(`Unknown font operation: ${operation}`);
      }
    });
  }

  private async searchFonts(params: any): Promise<any> {
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
    } = params;
    
    // Validate that at least one search parameter is provided
    if (!query && !source && !includeGoogle && !includeSystem && !includeCustom && !hasStyle && !minStyleCount) {
      throw new Error('At least one search parameter is required');
    }
    
    const availableFonts = await figma.listAvailableFontsAsync();
    const familiesMap = new Map<string, { styles: Set<string>, category: string, loaded: boolean }>();
    
    // Group fonts by family and collect metadata
    for (const font of availableFonts) {
      const family = font.fontName.family;
      const category = this.categorizeFontFamily(family);
      
      if (!familiesMap.has(family)) {
        familiesMap.set(family, {
          styles: new Set(),
          category,
          loaded: true
        });
      }
      familiesMap.get(family)!.styles.add(font.fontName.style);
    }
    
    // Apply filters
    let filteredFamilies = Array.from(familiesMap.entries()).filter(([family, data]) => {
      // Text search filter
      if (query) {
        const regex = new RegExp(query, 'i');
        if (!regex.test(family)) return false;
      }
      
      // Source filter (single source or include flags)
      if (source) {
        if (data.category !== source) return false;
      } else {
        // Use include flags
        if (!includeGoogle && data.category === 'google') return false;
        if (!includeSystem && data.category === 'system') return false;
        if (!includeCustom && data.category === 'custom') return false;
      }
      
      // Style requirement filter
      if (hasStyle) {
        if (!data.styles.has(hasStyle)) return false;
      }
      
      // Minimum style count filter
      if (minStyleCount && data.styles.size < minStyleCount) {
        return false;
      }
      
      return true;
    });
    
    // Apply sorting
    switch (sortBy) {
      case 'alphabetical':
        filteredFamilies.sort(([a], [b]) => a.localeCompare(b));
        break;
      case 'style_count':
        filteredFamilies.sort(([, a], [, b]) => b.styles.size - a.styles.size);
        break;
      case 'source':
        filteredFamilies.sort(([, a], [, b]) => a.category.localeCompare(b.category));
        break;
    }
    
    const totalFound = filteredFamilies.length;
    const hasMore = totalFound > limit;
    const returnedFamilies = filteredFamilies.slice(0, limit);
    
    // Convert to FontResult format
    const fonts = returnedFamilies.map(([family, data]) => ({
      family,
      source: data.category as any,
      styleCount: data.styles.size,
      availableStyles: Array.from(data.styles).sort(),
      isLoaded: data.loaded
    }));
    
    // Build search summary and criteria
    const appliedFilters: string[] = [];
    if (query) appliedFilters.push(`Query: '${query}'`);
    if (source) appliedFilters.push(`Source: ${source}`);
    if (hasStyle) appliedFilters.push(`Has style: ${hasStyle}`);
    if (minStyleCount) appliedFilters.push(`Min styles: ${minStyleCount}`);
    appliedFilters.push(`Limit: ${limit}`);
    
    let searchSummary = `Found ${totalFound} font${totalFound !== 1 ? 's' : ''}`;
    if (query) searchSummary += ` matching '${query}'`;
    if (source) searchSummary += ` from ${source} fonts`;
    if (hasStyle) searchSummary += ` with ${hasStyle} style`;
    if (minStyleCount) searchSummary += ` with ${minStyleCount}+ styles`;
    
    if (hasMore) {
      searchSummary += `, showing first ${fonts.length}`;
    } else {
      searchSummary += totalFound === fonts.length ? ', showing all results' : `, showing ${fonts.length}`;
    }
    
    return {
      fonts,
      totalFound,
      totalReturned: fonts.length,
      hasMore,
      searchSummary,
      searchCriteria: {
        appliedFilters,
        resultLimit: limit
      }
    };
  }

  private async checkAvailability(params: any): Promise<FontInfo[]> {
    this.validateParams(params, ['fontNames']);
    const { fontNames, fallbackSuggestions = false } = params;
    
    const results: FontInfo[] = [];
    
    for (const font of fontNames) {
      const fontName = createFontName(font.family, font.style);
      let fontInfo: FontInfo;
      
      try {
        await figma.loadFontAsync(fontName);
        fontInfo = {
          family: fontName.family,
          style: fontName.style,
          status: 'available',
          category: this.categorizeFontFamily(fontName.family)
        };
      } catch (error) {
        fontInfo = {
          family: fontName.family,
          style: fontName.style,
          status: 'missing',
          category: this.categorizeFontFamily(fontName.family)
        };
        
        if (fallbackSuggestions) {
          // Add suggested alternatives
          const suggestions = await this.getSimilarFonts(fontName);
          if (suggestions.length > 0) {
            fontInfo.metadata = { suggestions };
          }
        }
      }
      
      results.push(fontInfo);
    }
    
    return results;
  }

  private async getMissing(params: any): Promise<{ missingFonts: FontInfo[], suggestions?: Array<{ missing: FontInfo, alternatives: FontInfo[] }> }> {
    const { fallbackSuggestions = false } = params;
    
    // Get all text nodes in the document
    const allNodes = this.getAllTextNodes(figma.root);
    const usedFonts = new Set<string>();
    const missingFonts: FontInfo[] = [];
    const suggestions: Array<{ missing: FontInfo, alternatives: FontInfo[] }> = [];
    
    // Collect all used fonts
    for (const node of allNodes) {
      if (node.type === 'TEXT') {
        const fontName = node.fontName as FontName;
        if (fontName && typeof fontName === 'object') {
          usedFonts.add(getFontKey(fontName));
        }
      }
    }
    
    // Check availability of each used font
    for (const fontKey of usedFonts) {
      const [family, style] = fontKey.split(':');
      const fontName = createFontName(family, style);
      
      try {
        await figma.loadFontAsync(fontName);
      } catch (error) {
        const missingFont: FontInfo = {
          family: fontName.family,
          style: fontName.style,
          status: 'missing',
          category: this.categorizeFontFamily(fontName.family)
        };
        
        missingFonts.push(missingFont);
        
        if (fallbackSuggestions) {
          const alternatives = await this.getSimilarFonts(fontName);
          if (alternatives.length > 0) {
            suggestions.push({
              missing: missingFont,
              alternatives: alternatives.map(alt => ({
                family: alt.family,
                style: alt.style,
                status: 'available' as const,
                category: this.categorizeFontFamily(alt.family)
              }))
            });
          }
        }
      }
    }
    
    return { 
      missingFonts,
      ...(fallbackSuggestions && suggestions.length > 0 && { suggestions })
    };
  }

  private async getProjectFonts(params: any): Promise<any> {
    // Get all text nodes in the current document
    const allNodes = this.getAllTextNodes(figma.root);
    const usedFontsMap = new Map<string, { styles: Set<string>, category: string }>();
    
    // Collect all fonts used in the document
    for (const node of allNodes) {
      if (node.type === 'TEXT') {
        const fontName = node.fontName as FontName;
        if (fontName && typeof fontName === 'object') {
          const family = fontName.family;
          const category = this.categorizeFontFamily(family);
          
          if (!usedFontsMap.has(family)) {
            usedFontsMap.set(family, {
              styles: new Set(),
              category
            });
          }
          usedFontsMap.get(family)!.styles.add(fontName.style);
        }
      }
    }
    
    // Convert to FontResult format
    const fonts = Array.from(usedFontsMap.entries()).map(([family, data]) => ({
      family,
      source: data.category as any,
      styleCount: data.styles.size,
      availableStyles: Array.from(data.styles).sort(),
      isLoaded: true
    })).sort((a, b) => a.family.localeCompare(b.family));
    
    return {
      fonts,
      totalUsed: fonts.length,
      summary: `Found ${fonts.length} font${fonts.length !== 1 ? 's' : ''} used in current document`
    };
  }
  
  private async getFontCount(params: any): Promise<any> {
    const { countSource, countHasStyle } = params;
    
    const availableFonts = await figma.listAvailableFontsAsync();
    const familiesSet = new Set<string>();
    
    for (const font of availableFonts) {
      const family = font.fontName.family;
      const category = this.categorizeFontFamily(family);
      
      // Apply source filter
      if (countSource && category !== countSource) continue;
      
      // Apply style filter
      if (countHasStyle && font.fontName.style !== countHasStyle) continue;
      
      familiesSet.add(family);
    }
    
    const count = familiesSet.size;
    let summary = `${count} font famil${count !== 1 ? 'ies' : 'y'} available`;
    
    if (countSource) {
      summary += ` from ${countSource} fonts`;
    }
    if (countHasStyle) {
      summary += ` with ${countHasStyle} style`;
    }
    
    return {
      count,
      source: countSource,
      hasStyle: countHasStyle,
      summary
    };
  }

  private async getFontStyles(params: any): Promise<string[]> {
    this.validateParams(params, ['fontFamily']);
    const { fontFamily } = params;
    
    // Check cache first
    if (this.familyCache.has(fontFamily)) {
      return this.familyCache.get(fontFamily)!.styles;
    }
    
    const availableFonts = await figma.listAvailableFontsAsync();
    const styles: string[] = [];
    
    for (const font of availableFonts) {
      if (font.fontName.family === fontFamily) {
        styles.push(font.fontName.style);
      }
    }
    
    return styles.sort();
  }

  private async validateFont(params: any): Promise<{ isValid: boolean, fontName: FontName, status: string, message?: string, suggestions?: FontName[] }> {
    this.validateParams(params, ['fontFamily', 'fontStyle']);
    const { fontFamily, fontStyle, strict = false, fallbackSuggestions = false } = params;
    
    const fontName = createFontName(fontFamily, normalizeFontStyle(fontStyle));
    
    // Basic format validation
    if (!validateFontName(fontName)) {
      return {
        isValid: false,
        fontName,
        status: 'error',
        message: 'Invalid font name format'
      };
    }
    
    try {
      await figma.loadFontAsync(fontName);
      return {
        isValid: true,
        fontName,
        status: 'available',
        message: 'Font is available and valid'
      };
    } catch (error) {
      const result = {
        isValid: false,
        fontName,
        status: 'missing',
        message: `Font '${fontName.family} ${fontName.style}' is not available`
      };
      
      if (fallbackSuggestions) {
        const suggestions = await this.getSimilarFonts(fontName);
        if (suggestions.length > 0) {
          return { ...result, suggestions };
        }
      }
      
      return result;
    }
  }

  private async getFontInfo(params: any): Promise<FontInfo> {
    this.validateParams(params, ['fontFamily', 'fontStyle']);
    const { fontFamily, fontStyle } = params;
    
    const fontName = createFontName(fontFamily, fontStyle);
    const fontKey = getFontKey(fontName);
    
    // Check cache first
    if (this.fontCache.has(fontKey)) {
      return this.fontCache.get(fontKey)!;
    }
    
    let fontInfo: FontInfo;
    
    try {
      await figma.loadFontAsync(fontName);
      fontInfo = {
        family: fontName.family,
        style: fontName.style,
        status: 'available',
        category: this.categorizeFontFamily(fontName.family),
        metadata: {
          fullName: `${fontName.family} ${fontName.style}`,
          weight: this.parseWeightFromStyle(fontName.style)
        }
      };
    } catch (error) {
      fontInfo = {
        family: fontName.family,
        style: fontName.style,
        status: 'missing',
        category: this.categorizeFontFamily(fontName.family)
      };
    }
    
    this.fontCache.set(fontKey, fontInfo);
    return fontInfo;
  }

  private async preloadFonts(params: any): Promise<{ preloaded: FontInfo[], failed: Array<{ font: FontInfo, reason: string }>, priority: string }> {
    const { fontNames = [], preloadCount, priority = 'normal' } = params;
    
    let fontsToPreload = fontNames.map((font: any) => createFontName(font.family, font.style));
    
    // Limit by preloadCount if specified
    if (preloadCount && preloadCount < fontsToPreload.length) {
      fontsToPreload = fontsToPreload.slice(0, preloadCount);
    }
    
    const preloaded: FontInfo[] = [];
    const failed: Array<{ font: FontInfo, reason: string }> = [];
    
    for (const fontName of fontsToPreload) {
      try {
        await figma.loadFontAsync(fontName);
        const fontInfo: FontInfo = {
          family: fontName.family,
          style: fontName.style,
          status: 'available',
          category: this.categorizeFontFamily(fontName.family)
        };
        preloaded.push(fontInfo);
        this.fontCache.set(getFontKey(fontName), fontInfo);
      } catch (error) {
        const fontInfo: FontInfo = {
          family: fontName.family,
          style: fontName.style,
          status: 'error',
          category: this.categorizeFontFamily(fontName.family)
        };
        failed.push({
          font: fontInfo,
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return { preloaded, failed, priority };
  }

  private getAllTextNodes(node: BaseNode): TextNode[] {
    const textNodes: TextNode[] = [];
    
    if (node.type === 'TEXT') {
      textNodes.push(node as TextNode);
    }
    
    if ('children' in node) {
      for (const child of node.children) {
        textNodes.push(...this.getAllTextNodes(child));
      }
    }
    
    return textNodes;
  }

  private categorizeFontFamily(family: string): 'google' | 'system' | 'custom' {
    // Common Google Fonts families
    const googleFonts = [
      'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Source Sans Pro',
      'Raleway', 'PT Sans', 'Lora', 'Nunito', 'Ubuntu', 'Playfair Display', 'Merriweather',
      'Poppins', 'Fira Sans', 'Work Sans', 'Crimson Text', 'Libre Baskerville'
    ];
    
    // Common system fonts
    const systemFonts = [
      'Arial', 'Helvetica', 'Times', 'Times New Roman', 'Courier', 'Courier New',
      'Verdana', 'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Tahoma',
      'Trebuchet MS', 'Arial Black', 'Impact', 'Comic Sans MS', 'Lucida',
      'Monaco', 'Consolas', 'Menlo', 'SF Pro Display', 'SF Pro Text', 'Segoe UI'
    ];
    
    if (googleFonts.some(gf => family.toLowerCase().includes(gf.toLowerCase()))) {
      return 'google';
    }
    
    if (systemFonts.some(sf => family.toLowerCase().includes(sf.toLowerCase()))) {
      return 'system';
    }
    
    return 'custom';
  }

  private async getSimilarFonts(fontName: FontName): Promise<FontName[]> {
    const suggestions: FontName[] = [];
    const availableFonts = await figma.listAvailableFontsAsync();
    
    // Look for fonts with similar family names
    for (const font of availableFonts) {
      if (this.areFontsSimilar(fontName, font.fontName)) {
        suggestions.push(font.fontName);
        if (suggestions.length >= 3) break; // Limit suggestions
      }
    }
    
    return suggestions;
  }

  private areFontsSimilar(target: FontName, candidate: FontName): boolean {
    // Simple similarity check based on family name similarity and style matching
    const familySimilarity = this.calculateStringSimilarity(target.family.toLowerCase(), candidate.family.toLowerCase());
    const styleMatch = target.style.toLowerCase() === candidate.style.toLowerCase();
    
    return familySimilarity > 0.6 || (familySimilarity > 0.3 && styleMatch);
  }

  private calculateStringSimilarity(a: string, b: string): number {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[b.length][a.length];
  }

  private parseWeightFromStyle(style: string): number {
    const weightMap: Record<string, number> = {
      'thin': 100,
      'extralight': 200,
      'light': 300,
      'regular': 400,
      'medium': 500,
      'semibold': 600,
      'bold': 700,
      'extrabold': 800,
      'black': 900
    };
    
    const normalizedStyle = style.toLowerCase().replace(/\s+/g, '');
    return weightMap[normalizedStyle] || 400;
  }
}