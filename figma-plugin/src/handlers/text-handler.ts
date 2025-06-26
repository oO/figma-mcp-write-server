import { BaseHandler } from './base-handler.js';
import { OperationResult, OperationHandler } from '../types.js';
import { hexToRgb } from '../utils/color-utils.js';
import { formatNodeResponse, selectAndFocus } from '../utils/node-utils.js';
import { loadFont, getFontFromParams, ensureFontLoaded, FontCache } from '../utils/font-utils.js';

interface ManageTextParams {
  operation: 'create' | 'update' | 'character_styling' | 'apply_text_style' | 'create_text_style';
  nodeId?: string;
  characters?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  fontFamily?: string;
  fontStyle?: string;
  fontSize?: number;
  fontWeight?: number;
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  letterSpacing?: number | { value: number; unit: 'PIXELS' | 'PERCENT' };
  lineHeight?: number | { value: number; unit: 'PIXELS' | 'PERCENT' };
  paragraphSpacing?: number;
  paragraphIndent?: number;
  textAutoResize?: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'TRUNCATE';
  textListOptions?: { type: 'ORDERED' | 'UNORDERED' };
  characterRanges?: Array<{
    start: number;
    end: number;
    fontSize?: number;
    fontFamily?: string;
    fontStyle?: string;
    fontWeight?: number;
    textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
    textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
    letterSpacing?: number | { value: number; unit: 'PIXELS' | 'PERCENT' };
    fills?: Array<{
      type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL';
      color?: string;
      visible?: boolean;
      opacity?: number;
    }>;
  }>;
  fills?: Array<{
    type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL';
    color?: string;
    visible?: boolean;
    opacity?: number;
  }>;
  textStyleId?: string;
  styleName?: string;
  styleDescription?: string;
  hyperlink?: {
    type: 'URL' | 'NODE';
    url?: string;
    nodeId?: string;
  };
  openTypeFeatures?: { [feature: string]: boolean };
}

export class TextHandler extends BaseHandler {
  protected getHandlerName(): string {
    return 'TextHandler';
  }

  getOperations(): Record<string, OperationHandler> {
    return {
      'MANAGE_TEXT': (params) => this.manageText(params)
    };
  }

  private async manageText(params: ManageTextParams): Promise<OperationResult> {
    return this.executeOperation('manageText', params, async () => {
      switch (params.operation) {
        case 'create':
          return this.handleCreateText(params);
        case 'update':
          return this.handleUpdateText(params);
        case 'character_styling':
          return this.handleCharacterStyling(params);
        case 'apply_text_style':
          return this.handleApplyTextStyle(params);
        case 'create_text_style':
          return this.handleCreateTextStyle(params);
        default:
          throw new Error(`Unknown operation: ${params.operation}`);
      }
    });
  }

  private async handleCreateText(params: ManageTextParams): Promise<any> {
    this.validateParams(params, ['characters']);
    
    // Additional validation for non-empty characters
    if (!params.characters || params.characters.trim() === '') {
      throw new Error('Text nodes must have non-empty characters content');
    }
    
    let text: TextNode | null = null;
    
    try {
      text = figma.createText();
      
      // CRITICAL FIX: Load font FIRST before setting any text properties
      const fontResult = await this.loadFontWithFallback(params.fontFamily, params.fontStyle);
      text.fontName = fontResult.fontName;
      
      // STEP 1: Create text node with minimal properties (font must be loaded first)
      text.characters = params.characters;
      text.x = params.x || 0;
      text.y = params.y || 0;
      text.name = params.name || 'Text';
      text.fontSize = params.fontSize || 16;
    
      // Apply basic text properties
      await this.applyTextProperties(text, params);
      
      // STEP 2: Apply text style AFTER creation (following Figma's native pattern)
      if (params.textStyleId) {
        console.log('CREATE TEXT DEBUG - Applying text style:', params.textStyleId);
        console.log('CREATE TEXT DEBUG - Text node before style application:', {
          fontSize: text.fontSize,
          fontName: text.fontName,
          characters: text.characters
        });
        
        // Debug: Check if the style actually exists
        const allTextStyles = figma.getLocalTextStyles();
        const targetStyle = allTextStyles.find(s => s.id.replace(/,$/, '') === params.textStyleId);
        console.log('CREATE TEXT DEBUG - Target style found:', !!targetStyle);
        if (targetStyle) {
          console.log('CREATE TEXT DEBUG - Target style details:', {
            id: targetStyle.id,
            name: targetStyle.name,
            fontSize: targetStyle.fontSize
          });
          
          // CRITICAL FIX: Use the actual Figma style ID (with comma) for setTextStyleIdAsync
          console.log('CREATE TEXT DEBUG - Using actual Figma style ID:', targetStyle.id);
          await text.setTextStyleIdAsync(targetStyle.id);
        } else {
          console.log('CREATE TEXT DEBUG - Style not found, cannot apply');
        }
        
        console.log('CREATE TEXT DEBUG - Text node after style application:', {
          fontSize: text.fontSize,
          fontName: text.fontName,
          textStyleId: text.textStyleId,
          characters: text.characters
        });
      }
      
      // Apply character-level styling if provided
      if (params.characterRanges && params.characterRanges.length > 0) {
        await this.applyCharacterRanges(text, params.characterRanges);
      }
      
      // Apply hyperlink if provided
      if (params.hyperlink) {
        this.applyHyperlink(text, params.hyperlink);
      }
      
      // Create text style if requested
      if (params.styleName) {
        await this.createTextStyleFromNode(text, {
          name: params.styleName,
          description: params.styleDescription
        });
      }
      
      // Only add to page after all operations succeed
      figma.currentPage.appendChild(text);
      selectAndFocus([text]);
      
      return {
        ...formatNodeResponse(text),
        appliedFont: {
          requested: params.fontFamily ? `${params.fontFamily} ${params.fontStyle || 'Regular'}` : 'Inter Regular',
          actual: `${fontResult.fontName.family} ${fontResult.fontName.style}`,
          substituted: fontResult.substituted,
          reason: fontResult.reason
        }
      };
    } catch (error) {
      // Rollback: Remove the text node if it was created but operations failed
      if (text) {
        try {
          text.remove();
        } catch (removeError) {
          console.warn('Failed to remove partially created text node during rollback:', removeError);
        }
      }
      throw error;
    }
  }

  private async handleUpdateText(params: ManageTextParams): Promise<any> {
    this.validateParams(params, ['nodeId']);
    
    const node = figma.getNodeById(params.nodeId!);
    if (!node || node.type !== 'TEXT') {
      throw new Error('Node not found or is not a text node');
    }
    
    const text = node as TextNode;
    
    // CRITICAL FIX: Load current font before any text operations
    if (text.fontName !== figma.mixed) {
      await figma.loadFontAsync(text.fontName as FontName);
    }
    
    // Update characters if provided (with validation)
    if (params.characters !== undefined) {
      if (params.characters.trim() === '') {
        throw new Error('Text nodes cannot be updated to have empty characters content');
      }
      text.characters = params.characters;
    }
    
    // Update font if provided
    if (params.fontFamily || params.fontStyle) {
      const fontResult = await this.loadFontWithFallback(params.fontFamily, params.fontStyle);
      text.fontName = fontResult.fontName;
    }
    
    // Apply text properties
    await this.applyTextProperties(text, params);
    
    // Apply character-level styling if provided
    if (params.characterRanges && params.characterRanges.length > 0) {
      await this.applyCharacterRanges(text, params.characterRanges);
    }
    
    return formatNodeResponse(text);
  }

  private async handleCharacterStyling(params: ManageTextParams): Promise<any> {
    this.validateParams(params, ['nodeId', 'characterRanges']);
    
    const node = figma.getNodeById(params.nodeId!);
    if (!node || node.type !== 'TEXT') {
      throw new Error('Node not found or is not a text node');
    }
    
    const text = node as TextNode;
    
    // CRITICAL FIX: Load current font before character styling
    if (text.fontName !== figma.mixed) {
      await figma.loadFontAsync(text.fontName as FontName);
    }
    
    await this.applyCharacterRanges(text, params.characterRanges!);
    
    return formatNodeResponse(text);
  }


  private async handleApplyTextStyle(params: ManageTextParams): Promise<any> {
    this.validateParams(params, ['nodeId', 'textStyleId']);
    
    const node = figma.getNodeById(params.nodeId!);
    if (!node || node.type !== 'TEXT') {
      throw new Error('Node not found or is not a text node');
    }
    
    const text = node as TextNode;
    
    // CRITICAL FIX: Load current font before applying text style
    if (text.fontName !== figma.mixed) {
      await figma.loadFontAsync(text.fontName as FontName);
    }
    
    // Apply the text style using the correct async API method
    // CRITICAL FIX: Find the actual style and use its real ID (with comma)
    const allTextStyles = figma.getLocalTextStyles();
    const targetStyle = allTextStyles.find(s => s.id.replace(/,$/, '') === params.textStyleId);
    
    if (!targetStyle) {
      throw new Error(`Text style not found with ID: ${params.textStyleId}`);
    }
    
    await text.setTextStyleIdAsync(targetStyle.id);
    
    return {
      ...formatNodeResponse(text),
      textStyleId: params.textStyleId,
      message: `Applied text style ${params.textStyleId} to text node`
    };
  }

  private async handleCreateTextStyle(params: ManageTextParams): Promise<any> {
    this.validateParams(params, ['nodeId', 'styleName']);
    
    const node = figma.getNodeById(params.nodeId!);
    if (!node || node.type !== 'TEXT') {
      throw new Error('Node not found or is not a text node');
    }
    
    const text = node as TextNode;
    
    // CRITICAL FIX: Load current font before creating text style
    if (text.fontName !== figma.mixed) {
      await figma.loadFontAsync(text.fontName as FontName);
    }
    const textStyle = await this.createTextStyleFromNode(text, {
      name: params.styleName!,
      description: params.styleDescription
    });
    
    return {
      styleId: textStyle.id,
      styleName: textStyle.name,
      description: params.styleDescription
    };
  }

  private async loadFontWithFallback(fontFamily?: string, fontStyle?: string): Promise<{
    fontName: FontName;
    substituted: boolean;
    reason?: string;
  }> {
    const requestedFont = {
      family: fontFamily || 'Inter',
      style: fontStyle || 'Regular'
    };
    
    try {
      await ensureFontLoaded(requestedFont);
      return {
        fontName: requestedFont,
        substituted: false
      };
    } catch (error) {
      // Try with Inter as fallback
      const fallbackFont = { family: 'Inter', style: 'Regular' };
      try {
        await ensureFontLoaded(fallbackFont);
        return {
          fontName: fallbackFont,
          substituted: true,
          reason: `${requestedFont.family} ${requestedFont.style} not available`
        };
      } catch (fallbackError) {
        // Use system default
        const systemFont = { family: 'Roboto', style: 'Regular' };
        await ensureFontLoaded(systemFont);
        return {
          fontName: systemFont,
          substituted: true,
          reason: 'Custom font and Inter not available, using system default'
        };
      }
    }
  }

  private async applyTextProperties(text: TextNode, params: ManageTextParams): Promise<void> {
    // Font size
    if (params.fontSize !== undefined) {
      text.fontSize = params.fontSize;
    }
    
    // Text alignment
    if (params.textAlignHorizontal) {
      text.textAlignHorizontal = params.textAlignHorizontal;
    }
    
    if (params.textAlignVertical) {
      text.textAlignVertical = params.textAlignVertical;
    }
    
    // Text case
    if (params.textCase) {
      text.textCase = params.textCase;
    }
    
    // Text decoration
    if (params.textDecoration) {
      text.textDecoration = params.textDecoration;
    }
    
    // Letter spacing
    if (params.letterSpacing !== undefined) {
      if (typeof params.letterSpacing === 'number') {
        text.letterSpacing = { unit: 'PIXELS', value: params.letterSpacing };
      } else {
        text.letterSpacing = params.letterSpacing;
      }
    }
    
    // Line height
    if (params.lineHeight !== undefined) {
      if (typeof params.lineHeight === 'number') {
        const unit = params.lineHeight > 10 ? 'PIXELS' : 'PERCENT';
        text.lineHeight = { unit: unit as any, value: params.lineHeight };
      } else {
        text.lineHeight = params.lineHeight as any;
      }
    }
    
    // Paragraph settings
    if (params.paragraphSpacing !== undefined) {
      text.paragraphSpacing = params.paragraphSpacing;
    }
    
    if (params.paragraphIndent !== undefined) {
      text.paragraphIndent = params.paragraphIndent;
    }
    
    // Text auto resize
    if (params.textAutoResize) {
      text.textAutoResize = params.textAutoResize;
    }
    
    // Apply sizing constraints
    if (params.width !== undefined || params.height !== undefined) {
      if (params.width && params.height) {
        text.textAutoResize = 'NONE';
        text.resize(params.width, params.height);
      } else if (params.width) {
        text.textAutoResize = 'HEIGHT';
        text.resize(params.width, text.height);
      }
    }
    
    // Apply fills
    if (params.fills && params.fills.length > 0) {
      const paints = params.fills.map(fill => this.convertFillToPaint(fill));
      text.fills = paints;
    }
  }

  private async applyCharacterRanges(text: TextNode, ranges: NonNullable<ManageTextParams['characterRanges']>): Promise<void> {
    const sortedRanges = ranges.slice().sort((a, b) => a.start - b.start);
    
    for (const range of sortedRanges) {
      const { start, end } = range;
      
      if (start < 0 || end > text.characters.length || start >= end) {
        console.warn(`Invalid range [${start}, ${end}] for text length ${text.characters.length}`);
        continue;
      }
      
      // Apply font
      if (range.fontFamily || range.fontStyle) {
        const fontResult = await this.loadFontWithFallback(range.fontFamily, range.fontStyle);
        text.setRangeFontName(start, end, fontResult.fontName);
      }
      
      // Apply font size
      if (range.fontSize !== undefined) {
        text.setRangeFontSize(start, end, range.fontSize);
      }
      
      // Apply text case
      if (range.textCase) {
        text.setRangeTextCase(start, end, range.textCase);
      }
      
      // Apply text decoration
      if (range.textDecoration) {
        text.setRangeTextDecoration(start, end, range.textDecoration);
      }
      
      // Apply letter spacing
      if (range.letterSpacing !== undefined) {
        if (typeof range.letterSpacing === 'number') {
          text.setRangeLetterSpacing(start, end, { unit: 'PIXELS', value: range.letterSpacing });
        } else {
          text.setRangeLetterSpacing(start, end, range.letterSpacing);
        }
      }
      
      // Apply fills
      if (range.fills && range.fills.length > 0) {
        const paints = range.fills.map(fill => this.convertFillToPaint(fill));
        text.setRangeFills(start, end, paints);
      }
    }
  }

  private convertFillToPaint(fill: NonNullable<ManageTextParams['fills']>[0]): Paint {
    const paint: Paint = {
      type: fill.type as any,
      visible: fill.visible !== false,
      opacity: fill.opacity !== undefined ? fill.opacity : 1
    };
    
    if (fill.color && fill.type === 'SOLID') {
      (paint as SolidPaint).color = hexToRgb(fill.color);
    }
    
    return paint;
  }

  private applyHyperlink(text: TextNode, hyperlink: NonNullable<ManageTextParams['hyperlink']>): void {
    const hyperlinkData: HyperlinkTarget = hyperlink.type === 'URL' 
      ? { type: 'URL', url: hyperlink.url! }
      : { type: 'NODE', nodeId: hyperlink.nodeId! };
    
    text.hyperlink = hyperlinkData;
  }

  private async createTextStyleFromNode(text: TextNode, styleConfig: NonNullable<ManageTextParams['createTextStyle']>): Promise<TextStyle> {
    const textStyle = figma.createTextStyle();
    textStyle.name = styleConfig.name;
    textStyle.description = styleConfig.description || '';
    
    // Copy properties from text node
    if (text.fontName !== figma.mixed) {
      textStyle.fontName = text.fontName as FontName;
    }
    if (text.fontSize !== figma.mixed) {
      textStyle.fontSize = text.fontSize as number;
    }
    if (text.letterSpacing !== figma.mixed) {
      textStyle.letterSpacing = text.letterSpacing as LetterSpacing;
    }
    if (text.lineHeight !== figma.mixed) {
      textStyle.lineHeight = text.lineHeight as LineHeight;
    }
    if (text.textCase !== figma.mixed) {
      textStyle.textCase = text.textCase as TextCase;
    }
    if (text.textDecoration !== figma.mixed) {
      textStyle.textDecoration = text.textDecoration as TextDecoration;
    }
    
    return textStyle;
  }

}