import { FontName } from '../types.js';

export async function loadFont(fontName: FontName): Promise<void> {
  try {
    await figma.loadFontAsync(fontName);
    console.log(`✅ Loaded font: ${fontName.family} ${fontName.style}`);
  } catch (error) {
    console.warn(`⚠️ Failed to load font ${fontName.family} ${fontName.style}, falling back to Inter Regular`);
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  }
}

export async function loadFonts(fontNames: FontName[]): Promise<void> {
  const loadPromises = fontNames.map(font => loadFont(font));
  await Promise.all(loadPromises);
}

export function createFontName(family: string, style: string = 'Regular'): FontName {
  return { family, style };
}

export function validateFontName(fontName: FontName): boolean {
  return !!(fontName.family && fontName.style);
}

export function normalizeFontStyle(style: string): string {
  const styleMap: Record<string, string> = {
    'regular': 'Regular',
    'bold': 'Bold',
    'italic': 'Italic',
    'medium': 'Medium',
    'light': 'Light',
    'semibold': 'SemiBold',
    'extrabold': 'ExtraBold',
    'black': 'Black',
    'thin': 'Thin'
  };
  
  return styleMap[style.toLowerCase()] || style;
}

export async function ensureFontLoaded(fontName: FontName): Promise<FontName> {
  const normalizedFont = {
    family: fontName.family || 'Inter',
    style: normalizeFontStyle(fontName.style || 'Regular')
  };
  
  await loadFont(normalizedFont);
  return normalizedFont;
}

export function getFontFromParams(params: any): FontName {
  if (params.fontName) {
    return params.fontName;
  }
  
  return createFontName(
    params.fontFamily || 'Inter',
    params.fontStyle || 'Regular'
  );
}

export async function loadDefaultFont(): Promise<FontName> {
  const defaultFont = createFontName('Inter', 'Regular');
  await loadFont(defaultFont);
  return defaultFont;
}

export function isFontAvailable(fontName: FontName): boolean {
  try {
    // This is a simplified check - in practice, you might need more sophisticated detection
    return !!(fontName.family && fontName.style);
  } catch {
    return false;
  }
}

export async function loadFontSafely(fontName: FontName): Promise<FontName> {
  try {
    await figma.loadFontAsync(fontName);
    return fontName;
  } catch (error) {
    console.warn(`Failed to load ${fontName.family} ${fontName.style}, using Inter Regular`);
    const fallback = createFontName('Inter', 'Regular');
    await figma.loadFontAsync(fallback);
    return fallback;
  }
}

export function getFontKey(fontName: FontName): string {
  return `${fontName.family}:${fontName.style}`;
}

export class FontCache {
  private static cache = new Set<string>();
  
  static async loadAndCache(fontName: FontName): Promise<void> {
    const key = getFontKey(fontName);
    if (!this.cache.has(key)) {
      await loadFont(fontName);
      this.cache.add(key);
    }
  }
  
  static isLoaded(fontName: FontName): boolean {
    return this.cache.has(getFontKey(fontName));
  }
  
  static clear(): void {
    this.cache.clear();
  }
}