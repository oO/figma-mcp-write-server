import { BaseHandler } from './base-handler.js';
import { TextParams, OperationResult, OperationHandler } from '../types.js';
import { hexToRgb } from '../utils/color-utils.js';
import { formatNodeResponse, selectAndFocus } from '../utils/node-utils.js';
import { loadFont, getFontFromParams, ensureFontLoaded, FontCache } from '../utils/font-utils.js';

export class TextHandler extends BaseHandler {
  protected getHandlerName(): string {
    return 'TextHandler';
  }

  getOperations(): Record<string, OperationHandler> {
    return {
      CREATE_TEXT: (params) => this.createText(params)
    };
  }

  private async createText(params: TextParams): Promise<OperationResult> {
    return this.executeOperation('createText', params, async () => {
      this.validateParams(params, ['characters']);
      
      const text = figma.createText();
      
      // Load default font first
      const defaultFont = getFontFromParams(params);
      await ensureFontLoaded(defaultFont);
      
      // Set basic properties
      text.fontName = defaultFont;
      text.characters = params.characters;
      text.fontSize = params.fontSize || 16;
      
      // Set position
      text.x = params.x || 0;
      text.y = params.y || 0;
      
      // Set name
      text.name = params.name || 'Text';
      
      // Apply sizing if specified
      if (params.width || params.height) {
        await this.applyTextSizing(text, params);
      }
      
      // Apply text styling
      await this.applyTextStyling(text, params);
      
      // Apply style ranges if provided
      if (params.styleRanges && params.styleRanges.length > 0) {
        await this.applyStyleRanges(text, params.styleRanges);
      }
      
      // Create text style if requested
      if (params.createStyle && params.styleName) {
        await this.createTextStyle(text, params.styleName);
      }
      
      // Add to page and select
      figma.currentPage.appendChild(text);
      selectAndFocus([text]);
      
      return formatNodeResponse(text);
    });
  }

  private async applyTextSizing(text: TextNode, params: TextParams): Promise<void> {
    // Handle auto-resize mode
    if (params.width && !params.height) {
      text.textAutoResize = 'HEIGHT';
      text.resize(params.width, text.height);
    } else if (params.width && params.height) {
      text.textAutoResize = 'NONE';
      text.resize(params.width, params.height);
    } else {
      text.textAutoResize = 'WIDTH_AND_HEIGHT';
    }
  }

  private async applyTextStyling(text: TextNode, params: TextParams): Promise<void> {
    // Text alignment
    if (params.textAlignHorizontal) {
      text.textAlignHorizontal = params.textAlignHorizontal.toUpperCase() as any;
    }
    
    if (params.textAlignVertical) {
      text.textAlignVertical = params.textAlignVertical.toUpperCase() as any;
    }
    
    // Text case transformation
    if (params.textCase) {
      text.textCase = params.textCase.toUpperCase() as any;
    }
    
    // Text decoration
    if (params.textDecoration) {
      text.textDecoration = params.textDecoration.toUpperCase() as any;
    }
    
    // Letter spacing
    if (params.letterSpacing !== undefined) {
      text.letterSpacing = {
        unit: 'PIXELS',
        value: params.letterSpacing
      };
    }
    
    // Line height
    if (params.lineHeight) {
      if (typeof params.lineHeight === 'object') {
        text.lineHeight = params.lineHeight;
      } else {
        // Convert number to appropriate line height object
        const unit = params.lineHeight > 10 ? 'PIXELS' : 'PERCENT';
        text.lineHeight = {
          unit: unit as any,
          value: params.lineHeight
        };
      }
    }
    
    // Paragraph settings
    if (params.paragraphIndent !== undefined) {
      text.paragraphIndent = params.paragraphIndent;
    }
    
    if (params.paragraphSpacing !== undefined) {
      text.paragraphSpacing = params.paragraphSpacing;
    }
    
    // Fill color
    if (params.fillColor) {
      const color = hexToRgb(params.fillColor);
      text.fills = [{ type: 'SOLID', color }];
    }
  }

  private async applyStyleRanges(text: TextNode, ranges: any[]): Promise<void> {
    // Sort ranges by start position to apply them in order
    const sortedRanges = ranges.slice().sort((a, b) => a.start - b.start);
    
    for (const range of sortedRanges) {
      const { start, end } = range;
      
      // Validate range bounds
      if (start < 0 || end > text.characters.length || start >= end) {
        console.warn(`Invalid range [${start}, ${end}] for text length ${text.characters.length}`);
        continue;
      }
      
      // Load and apply font
      if (range.fontName || (range.fontFamily && range.fontStyle)) {
        const fontName = range.fontName || {
          family: range.fontFamily,
          style: range.fontStyle
        };
        
        try {
          await ensureFontLoaded(fontName);
          text.setRangeFontName(start, end, fontName);
        } catch (error) {
          console.warn(`Failed to apply font ${fontName.family} ${fontName.style} to range [${start}, ${end}]`);
        }
      }
      
      // Apply font size
      if (range.fontSize !== undefined) {
        text.setRangeFontSize(start, end, range.fontSize);
      }
      
      // Apply fill color
      if (range.fillColor) {
        const color = hexToRgb(range.fillColor);
        text.setRangeFills(start, end, [{ type: 'SOLID', color }]);
      }
      
      // Apply text case
      if (range.textCase) {
        text.setRangeTextCase(start, end, range.textCase.toUpperCase() as any);
      }
      
      // Apply text decoration
      if (range.textDecoration) {
        text.setRangeTextDecoration(start, end, range.textDecoration.toUpperCase() as any);
      }
      
      // Apply letter spacing
      if (range.letterSpacing !== undefined) {
        text.setRangeLetterSpacing(start, end, {
          unit: 'PIXELS',
          value: range.letterSpacing
        });
      }
      
      // Apply line height
      if (range.lineHeight) {
        let lineHeight;
        if (typeof range.lineHeight === 'object') {
          lineHeight = range.lineHeight;
        } else {
          const unit = range.lineHeight > 10 ? 'PIXELS' : 'PERCENT';
          lineHeight = {
            unit: unit as any,
            value: range.lineHeight
          };
        }
        text.setRangeLineHeight(start, end, lineHeight);
      }
    }
  }

  private async createTextStyle(text: TextNode, styleName: string): Promise<void> {
    try {
      const textStyle = figma.createTextStyle();
      textStyle.name = styleName;
      
      // Copy properties from the text node
      textStyle.fontName = text.fontName;
      textStyle.fontSize = text.fontSize;
      textStyle.letterSpacing = text.letterSpacing;
      textStyle.lineHeight = text.lineHeight;
      textStyle.paragraphIndent = text.paragraphIndent;
      textStyle.paragraphSpacing = text.paragraphSpacing;
      textStyle.textCase = text.textCase;
      textStyle.textDecoration = text.textDecoration;
      textStyle.textAlignHorizontal = text.textAlignHorizontal;
      textStyle.textAlignVertical = text.textAlignVertical;
      
      // Apply fills if any
      if (text.fills && text.fills.length > 0) {
        textStyle.fills = text.fills;
      }
      
      console.log(`✅ Created text style: ${styleName}`);
    } catch (error) {
      console.warn(`Failed to create text style ${styleName}:`, error);
    }
  }

  private async loadFontsForStyleRanges(ranges: any[]): Promise<void> {
    const uniqueFonts = new Set<string>();
    
    for (const range of ranges) {
      if (range.fontName) {
        uniqueFonts.add(`${range.fontName.family}:${range.fontName.style}`);
      } else if (range.fontFamily && range.fontStyle) {
        uniqueFonts.add(`${range.fontFamily}:${range.fontStyle}`);
      }
    }
    
    const fontPromises = Array.from(uniqueFonts).map(fontKey => {
      const [family, style] = fontKey.split(':');
      return FontCache.loadAndCache({ family, style });
    });
    
    await Promise.allSettled(fontPromises);
  }

  private validateStyleRange(range: any, textLength: number): boolean {
    if (typeof range.start !== 'number' || typeof range.end !== 'number') {
      return false;
    }
    
    if (range.start < 0 || range.end > textLength || range.start >= range.end) {
      return false;
    }
    
    return true;
  }

  private sanitizeTextContent(content: string): string {
    // Remove or replace problematic characters
    return content
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Control characters
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n');
  }

  private estimateTextDimensions(text: string, fontSize: number): { width: number; height: number } {
    // Rough estimation for text dimensions
    const avgCharWidth = fontSize * 0.6;
    const lineHeight = fontSize * 1.2;
    const lines = text.split('\n');
    const maxLineLength = Math.max.apply(Math, lines.map(line => line.length));
    
    return {
      width: maxLineLength * avgCharWidth,
      height: lines.length * lineHeight
    };
  }
}