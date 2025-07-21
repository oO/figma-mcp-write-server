import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
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
    suggestions?: FontName[];
  };
}

interface FontFamily {
  name: string;
  styles: string[];
  category: 'google' | 'system' | 'custom';
  isLoaded: boolean;
}

/**
 * Handle MANAGE_FONTS operation
 * Supports: search_fonts, check_availability, get_missing, get_font_styles, validate_font, get_font_info, preload_fonts, get_project_fonts, get_font_count
 */
export async function handleManageFonts(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('manageFonts', params, async () => {
    BaseOperation.validateParams(params, ['operation']);
    
    const validOperations = ['search_fonts', 'check_availability', 'get_missing', 'get_font_styles', 'validate_font', 'get_font_info', 'preload_fonts', 'get_project_fonts', 'get_font_count'];
    if (!validOperations.includes(params.operation)) {
      throw new Error(`Unknown font operation: ${params.operation}. Valid operations: ${validOperations.join(', ')}`);
    }

    switch (params.operation) {
      case 'search_fonts':
        return await searchFonts(params);
      case 'check_availability':
        return await checkAvailability(params);
      case 'get_missing':
        return await getMissing(params);
      case 'get_font_styles':
        return await getFontStyles(params);
      case 'validate_font':
        return await validateFont(params);
      case 'get_font_info':
        return await getFontInfo(params);
      case 'preload_fonts':
        return await preloadFonts(params);
      case 'get_project_fonts':
        return await getProjectFonts(params);
      case 'get_font_count':
        return await getFontCount(params);
      default:
        throw new Error(`Unknown font operation: ${params.operation}`);
    }
  });
}

async function searchFonts(params: any): Promise<any> {
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
    const category = categorizeFontFamily(family);
    
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

async function checkAvailability(params: any): Promise<FontInfo[]> {
  BaseOperation.validateParams(params, ['fontFamily', 'fontStyle']);
  const { fontFamily, fontStyle, fallbackSuggestions = false, failFast = false } = params;
  
  // Normalize to arrays for bulk processing
  const families = Array.isArray(fontFamily) ? fontFamily : [fontFamily];
  const styles = Array.isArray(fontStyle) ? fontStyle : [fontStyle];
  
  // Handle bulk operations - pair families and styles
  const fontPairs = [];
  const maxLength = Math.max(families.length, styles.length);
  
  for (let i = 0; i < maxLength; i++) {
    const family = families[i] || families[families.length - 1];
    const style = styles[i] || styles[styles.length - 1];
    fontPairs.push({ family, style });
  }
  
  const results: FontInfo[] = [];
  
  for (const { family, style } of fontPairs) {
    const fontName = createFontName(family, style);
    let fontInfo: FontInfo;
    
    try {
      await figma.loadFontAsync(fontName);
      fontInfo = {
        family: fontName.family,
        style: fontName.style,
        status: 'available',
        category: categorizeFontFamily(fontName.family)
      };
    } catch (error) {
      fontInfo = {
        family: fontName.family,
        style: fontName.style,
        status: 'missing',
        category: categorizeFontFamily(fontName.family)
      };
      
      if (fallbackSuggestions) {
        // Add suggested alternatives
        const suggestions = await getSimilarFonts(fontName);
        if (suggestions.length > 0) {
          fontInfo.metadata = { suggestions };
        }
      }
      
      if (failFast) {
        results.push(fontInfo);
        break;
      }
    }
    
    results.push(fontInfo);
  }
  
  return results;
}

async function getMissing(params: any): Promise<{ missingFonts: FontInfo[], suggestions?: Array<{ missing: FontInfo, alternatives: FontInfo[] }> }> {
  const { fallbackSuggestions = false } = params;
  
  // Get all text nodes in the document
  const allNodes = getAllTextNodes(figma.root);
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
        category: categorizeFontFamily(fontName.family)
      };
      
      missingFonts.push(missingFont);
      
      if (fallbackSuggestions) {
        const alternatives = await getSimilarFonts(fontName);
        if (alternatives.length > 0) {
          suggestions.push({
            missing: missingFont,
            alternatives: alternatives.map(alt => ({
              family: alt.family,
              style: alt.style,
              status: 'available' as const,
              category: categorizeFontFamily(alt.family)
            }))
          });
        }
      }
    }
  }
  
  const result: any = { missingFonts };
  if (fallbackSuggestions && suggestions.length > 0) {
    result.suggestions = suggestions;
  }
  
  return result;
}

async function getFontStyles(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['fontFamily']);
  const { fontFamily } = params;
  
  const availableFonts = await figma.listAvailableFontsAsync();
  const styles = availableFonts
    .filter(font => font.fontName.family === fontFamily)
    .map(font => font.fontName.style)
    .sort();
  
  if (styles.length === 0) {
    throw new Error(`Font family '${fontFamily}' not found`);
  }
  
  return {
    family: fontFamily,
    styles,
    styleCount: styles.length,
    category: categorizeFontFamily(fontFamily)
  };
}

async function validateFont(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['fontFamily', 'fontStyle']);
  const { fontFamily, fontStyle } = params;
  
  const fontName = createFontName(fontFamily, fontStyle);
  
  try {
    validateFontName(fontName);
    await figma.loadFontAsync(fontName);
    
    return {
      isValid: true,
      fontName,
      category: categorizeFontFamily(fontFamily),
      message: `Font '${fontFamily}' ${fontStyle} is valid and available`
    };
  } catch (error) {
    return {
      isValid: false,
      fontName,
      error: error.toString(),
      message: `Font '${fontFamily}' ${fontStyle} is not available`
    };
  }
}

async function getFontInfo(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['fontFamily', 'fontStyle']);
  const { fontFamily, fontStyle } = params;
  
  const fontName = createFontName(fontFamily, fontStyle);
  
  try {
    await figma.loadFontAsync(fontName);
    
    const info: FontInfo = {
      family: fontName.family,
      style: fontName.style,
      status: 'available',
      category: categorizeFontFamily(fontName.family)
    };
    
    return info;
  } catch (error) {
    const info: FontInfo = {
      family: fontName.family,
      style: fontName.style,
      status: 'missing',
      category: categorizeFontFamily(fontName.family)
    };
    
    return info;
  }
}

async function preloadFonts(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['fontFamily', 'fontStyle']);
  const { fontFamily, fontStyle, failFast = false } = params;
  
  // Normalize to arrays for bulk processing
  const families = Array.isArray(fontFamily) ? fontFamily : [fontFamily];
  const styles = Array.isArray(fontStyle) ? fontStyle : [fontStyle];
  
  // Handle bulk operations - pair families and styles
  const fontPairs = [];
  const maxLength = Math.max(families.length, styles.length);
  
  for (let i = 0; i < maxLength; i++) {
    const family = families[i] || families[families.length - 1];
    const style = styles[i] || styles[styles.length - 1];
    fontPairs.push({ family, style });
  }
  
  const results = [];
  let loaded = 0;
  let failed = 0;
  
  for (const { family, style } of fontPairs) {
    const fontName = createFontName(family, style);
    
    try {
      await figma.loadFontAsync(fontName);
      results.push({
        family: fontName.family,
        style: fontName.style,
        status: 'loaded'
      });
      loaded++;
    } catch (error) {
      results.push({
        family: fontName.family,
        style: fontName.style,
        status: 'failed',
        error: error.toString()
      });
      failed++;
      
      if (failFast) {
        break;
      }
    }
  }
  
  return {
    results,
    summary: {
      total: fontPairs.length,
      loaded,
      failed
    },
    message: `Preloaded ${loaded}/${fontPairs.length} fonts successfully`
  };
}

async function getProjectFonts(params: any): Promise<any> {
  const { includeUnused = false } = params;
  
  const allNodes = getAllTextNodes(figma.root);
  const usedFonts = new Set<string>();
  const fontUsage = new Map<string, number>();
  
  // Collect all used fonts with usage count
  for (const node of allNodes) {
    if (node.type === 'TEXT') {
      const fontName = node.fontName as FontName;
      if (fontName && typeof fontName === 'object') {
        const fontKey = getFontKey(fontName);
        usedFonts.add(fontKey);
        fontUsage.set(fontKey, (fontUsage.get(fontKey) || 0) + 1);
      }
    }
  }
  
  const projectFonts = [];
  
  for (const fontKey of usedFonts) {
    const [family, style] = fontKey.split(':');
    const fontName = createFontName(family, style);
    
    let status: 'available' | 'missing';
    try {
      await figma.loadFontAsync(fontName);
      status = 'available';
    } catch (error) {
      status = 'missing';
    }
    
    projectFonts.push({
      family: fontName.family,
      style: fontName.style,
      status,
      usageCount: fontUsage.get(fontKey) || 0,
      category: categorizeFontFamily(fontName.family)
    });
  }
  
  // Sort by usage count (descending)
  projectFonts.sort((a, b) => b.usageCount - a.usageCount);
  
  const availableFonts = includeUnused ? await figma.listAvailableFontsAsync() : [];
  const unusedFonts = [];
  
  if (includeUnused) {
    for (const font of availableFonts) {
      const fontKey = getFontKey(font.fontName);
      if (!usedFonts.has(fontKey)) {
        unusedFonts.push({
          family: font.fontName.family,
          style: font.fontName.style,
          status: 'available' as const,
          usageCount: 0,
          category: categorizeFontFamily(font.fontName.family)
        });
      }
    }
  }
  
  return {
    usedFonts: projectFonts,
    unusedFonts: includeUnused ? unusedFonts : undefined,
    summary: {
      totalUsed: projectFonts.length,
      totalUnused: unusedFonts.length,
      totalAvailable: availableFonts.length
    }
  };
}

async function getFontCount(params: any): Promise<any> {
  const availableFonts = await figma.listAvailableFontsAsync();
  const familiesMap = new Map<string, Set<string>>();
  
  // Group by family
  for (const font of availableFonts) {
    const family = font.fontName.family;
    if (!familiesMap.has(family)) {
      familiesMap.set(family, new Set());
    }
    familiesMap.get(family)!.add(font.fontName.style);
  }
  
  const categoryCounts = { google: 0, system: 0, custom: 0 };
  
  for (const family of familiesMap.keys()) {
    const category = categorizeFontFamily(family);
    categoryCounts[category]++;
  }
  
  const totalFamilies = familiesMap.size;
  const totalStyles = availableFonts.length;
  
  return {
    count: totalFamilies,
    summary: `${totalFamilies} font families available (${totalStyles} total styles: ${categoryCounts.google} Google, ${categoryCounts.system} System, ${categoryCounts.custom} Custom)`
  };
}

// Helper functions
function categorizeFontFamily(family: string): 'google' | 'system' | 'custom' {
  // Common Google Fonts
  const googleFonts = [
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Source Sans Pro',
    'Roboto Condensed', 'Raleway', 'Roboto Slab', 'Merriweather',
    'PT Sans', 'Ubuntu', 'Playfair Display', 'Poppins', 'Nunito',
    'Lora', 'Mukti', 'Rubik', 'Work Sans', 'Fira Sans', 'Noto Sans'
  ];
  
  // Common system fonts
  const systemFonts = [
    'Arial', 'Helvetica', 'Times', 'Times New Roman', 'Courier',
    'Courier New', 'Verdana', 'Georgia', 'Palatino', 'Garamond',
    'Bookman', 'Trebuchet MS', 'Arial Narrow', 'Century Gothic',
    'Impact', 'Lucida Console', 'Tahoma', 'Monaco', 'Optima',
    'Avenir', 'Menlo', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue',
    'System Font', '.SF NS Text', '.SF NS Display'
  ];
  
  if (googleFonts.some(gFont => family.includes(gFont))) {
    return 'google';
  }
  
  if (systemFonts.some(sFont => family.includes(sFont))) {
    return 'system';
  }
  
  return 'custom';
}

function getAllTextNodes(node: BaseNode): SceneNode[] {
  const textNodes: SceneNode[] = [];
  
  if (node.type === 'TEXT') {
    textNodes.push(node as TextNode);
  }
  
  if ('children' in node) {
    for (const child of node.children) {
      textNodes.push(...getAllTextNodes(child));
    }
  }
  
  return textNodes;
}

async function getSimilarFonts(targetFont: FontName, maxSuggestions: number = 3): Promise<FontName[]> {
  const availableFonts = await figma.listAvailableFontsAsync();
  const suggestions: FontName[] = [];
  
  // Simple similarity matching - could be enhanced with better algorithms
  const targetFamily = targetFont.family.toLowerCase();
  const targetStyle = targetFont.style.toLowerCase();
  
  // Find fonts with similar style first
  const sameStyleFonts = availableFonts.filter(font => 
    font.fontName.style.toLowerCase() === targetStyle &&
    font.fontName.family.toLowerCase() !== targetFamily
  );
  
  // Add fonts with similar family name
  const similarFamilyFonts = availableFonts.filter(font => {
    const family = font.fontName.family.toLowerCase();
    return family.includes(targetFamily.split(' ')[0]) || 
           targetFamily.includes(family.split(' ')[0]);
  });
  
  // Combine and deduplicate
  const combined = [...sameStyleFonts, ...similarFamilyFonts];
  const seen = new Set<string>();
  
  for (const font of combined) {
    const key = getFontKey(font.fontName);
    if (!seen.has(key) && suggestions.length < maxSuggestions) {
      suggestions.push(font.fontName);
      seen.add(key);
    }
  }
  
  return suggestions;
}