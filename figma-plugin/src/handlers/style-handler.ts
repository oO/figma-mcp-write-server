import { BaseHandler } from './base-handler.js';
import { StyleParams, OperationResult, OperationHandler, StyleInfo } from '../types.js';
import { findNodeById } from '../utils/node-utils.js';
import { hexToRgb, hexToRgba, createSolidPaint, createGradientPaint } from '../utils/color-utils.js';
import { loadFont, ensureFontLoaded, getFontFromParams } from '../utils/font-utils.js';
import { formatStyleResponse } from '../utils/response-utils.js';

export class StyleHandler extends BaseHandler {
  protected getHandlerName(): string {
    return 'StyleHandler';
  }

  getOperations(): Record<string, OperationHandler> {
    return {
      MANAGE_STYLES: (params) => this.manageStyles(params)
    };
  }

  private async manageStyles(params: StyleParams): Promise<OperationResult> {
    return this.executeOperation('manageStyles', params, async () => {
      this.validateParams(params, ['operation']);
      
      const operation = this.validateStringParam(
        params.operation,
        'operation',
        ['create', 'update', 'list', 'apply', 'delete', 'get']
      );

      switch (operation) {
        case 'create':
          return await this.createStyle(params);
        case 'update':
          return await this.updateStyle(params);
        case 'list':
          return await this.listStyles(params);
        case 'apply':
          return await this.applyStyle(params);
        case 'delete':
          return await this.deleteStyle(params);
        case 'get':
          return await this.getStyle(params);
        default:
          throw new Error(`Unknown style operation: ${operation}`);
      }
    });
  }

  private async createStyle(params: StyleParams): Promise<any> {
    this.validateParams(params, ['styleType', 'styleName']);
    
    const styleType = this.validateStringParam(
      params.styleType!,
      'styleType',
      ['paint', 'text', 'effect', 'grid']
    );

    switch (styleType) {
      case 'paint':
        return await this.createPaintStyle(params);
      case 'text':
        return await this.createTextStyle(params);
      case 'effect':
        return await this.createEffectStyle(params);
      case 'grid':
        return await this.createGridStyle(params);
      default:
        throw new Error(`Unknown style type: ${styleType}`);
    }
  }

  private async updateStyle(params: StyleParams): Promise<any> {
    this.validateParams(params, ['styleId']);
    
    const styleId = params.styleId!.replace(/,$/, ''); // Remove trailing comma
    
    // Get all styles and find the one to update
    const paintStyles = figma.getLocalPaintStyles();
    const textStyles = figma.getLocalTextStyles();
    const effectStyles = figma.getLocalEffectStyles();
    const gridStyles = figma.getLocalGridStyles();
    const allStyles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles];
    
    const style = allStyles.find(s => s.id.replace(/,$/, '') === styleId);
    if (!style) {
      throw new Error(`Style with ID ${styleId} not found`);
    }
    
    // Update style name if provided
    if (params.styleName) {
      style.name = params.styleName;
    }
    
    // Update style properties based on type
    if (style.type === 'PAINT') {
      await this.updatePaintStyle(style as PaintStyle, params);
    } else if (style.type === 'TEXT') {
      await this.updateTextStyle(style as TextStyle, params);
    } else if (style.type === 'EFFECT') {
      await this.updateEffectStyle(style as EffectStyle, params);
    } else if (style.type === 'GRID') {
      await this.updateGridStyle(style as GridStyle, params);
    }
    
    return {
      styleId: style.id,
      styleName: style.name,
      styleType: style.type.toLowerCase(),
      message: `Updated ${style.type.toLowerCase()} style: ${style.name}`
    };
  }

  private async updatePaintStyle(style: PaintStyle, params: StyleParams): Promise<void> {
    if (params.color) {
      const paint = await this.createPaint(params);
      style.paints = [paint];
    }
  }

  private async updateTextStyle(style: TextStyle, params: StyleParams): Promise<void> {
    if (params.fontFamily && params.fontStyle) {
      const fontName = { family: params.fontFamily, style: params.fontStyle };
      await ensureFontLoaded(fontName);
      style.fontName = fontName;
    }
    
    if (params.fontSize !== undefined) {
      style.fontSize = params.fontSize;
    }
  }

  private async updateEffectStyle(style: EffectStyle, params: StyleParams): Promise<void> {
    if (params.effects && params.effects.length > 0) {
      style.effects = params.effects.map(effect => this.createEffect(effect));
    }
  }

  private async updateGridStyle(style: GridStyle, params: StyleParams): Promise<void> {
    if (params.layoutGrids && params.layoutGrids.length > 0) {
      style.layoutGrids = params.layoutGrids.map(grid => this.createLayoutGrid(grid));
    }
  }

  private async createPaintStyle(params: StyleParams): Promise<any> {
    const style = figma.createPaintStyle();
    style.name = params.styleName!;
    
    if (params.color) {
      const paint = await this.createPaint(params);
      style.paints = [paint];
    }
    
    return {
      styleId: style.id,
      styleName: style.name,
      styleType: 'paint',
      message: `Created paint style: ${style.name}`
    };
  }

  private async createTextStyle(params: StyleParams): Promise<any> {
    const style = figma.createTextStyle();
    style.name = params.styleName!;
    
    // Apply text properties
    if (params.fontFamily && params.fontStyle) {
      const fontName = { family: params.fontFamily, style: params.fontStyle };
      await ensureFontLoaded(fontName);
      style.fontName = fontName;
    }
    
    if (params.fontSize !== undefined) {
      style.fontSize = params.fontSize;
    }
    
    // Note: textAlignHorizontal and textAlignVertical are not supported on TextStyle
    // These properties are set directly on TextNode instances
    
    return {
      styleId: style.id,
      styleName: style.name,
      styleType: 'text',
      message: `Created text style: ${style.name}`
    };
  }

  private async createEffectStyle(params: StyleParams): Promise<any> {
    const style = figma.createEffectStyle();
    style.name = params.styleName!;
    
    if (params.effects && params.effects.length > 0) {
      style.effects = params.effects.map(effect => this.createEffect(effect));
    }
    
    return {
      styleId: style.id,
      styleName: style.name,
      styleType: 'effect',
      message: `Created effect style: ${style.name}`
    };
  }

  private async createGridStyle(params: StyleParams): Promise<any> {
    const style = figma.createGridStyle();
    style.name = params.styleName!;
    
    if (params.layoutGrids && params.layoutGrids.length > 0) {
      style.layoutGrids = params.layoutGrids.map(grid => this.createLayoutGrid(grid));
    }
    
    return {
      styleId: style.id,
      styleName: style.name,
      styleType: 'grid',
      message: `Created grid style: ${style.name}`
    };
  }

  private async createPaint(params: StyleParams): Promise<Paint> {
    const paintType = params.paintType || 'solid';
    
    switch (paintType) {
      case 'solid':
        return {
          type: 'SOLID',
          color: hexToRgb(params.color!),
          opacity: params.opacity !== undefined ? params.opacity : 1
        };
      
      case 'gradient_linear':
      case 'gradient_radial':
      case 'gradient_angular':
      case 'gradient_diamond':
        return {
          type: paintType.replace('gradient_', 'GRADIENT_').toUpperCase() as any,
          gradientStops: params.gradientStops?.map(stop => ({
            position: stop.position,
            color: hexToRgba(stop.color, stop.opacity || 1)
          })) || [],
          gradientTransform: params.gradientTransform as any
        };
      
      default:
        throw new Error(`Unsupported paint type: ${paintType}`);
    }
  }

  private createEffect(effectData: any): Effect {
    const effect: any = {
      type: effectData.type.toUpperCase(),
      visible: effectData.visible !== undefined ? effectData.visible : true
    };
    
    if (effectData.color) {
      const color = hexToRgb(effectData.color);
      effect.color = { 
        r: color.r, 
        g: color.g, 
        b: color.b, 
        a: effectData.opacity !== undefined ? effectData.opacity : 1 
      };
    }
    
    if (effectData.offset) {
      effect.offset = effectData.offset;
    }
    
    if (effectData.radius !== undefined) {
      effect.radius = effectData.radius;
    }
    
    if (effectData.spread !== undefined) {
      effect.spread = effectData.spread;
    }
    
    if (effectData.blendMode) {
      effect.blendMode = effectData.blendMode.toUpperCase();
    }
    
    return effect;
  }

  private createLayoutGrid(gridData: any): LayoutGrid {
    const grid: any = {
      pattern: gridData.pattern.toUpperCase(),
      visible: gridData.visible !== undefined ? gridData.visible : true
    };
    
    if (gridData.sectionSize !== undefined) grid.sectionSize = gridData.sectionSize;
    if (gridData.color) grid.color = hexToRgba(gridData.color);
    if (gridData.alignment) grid.alignment = gridData.alignment.toUpperCase();
    if (gridData.gutterSize !== undefined) grid.gutterSize = gridData.gutterSize;
    if (gridData.offset !== undefined) grid.offset = gridData.offset;
    if (gridData.count !== undefined) grid.count = gridData.count;
    
    return grid;
  }

  private async listStyles(params: StyleParams): Promise<any> {
    const styleType = params.styleType;
    let styles: (PaintStyle | TextStyle | EffectStyle | GridStyle)[] = [];
    
    switch (styleType) {
      case 'paint':
        styles = figma.getLocalPaintStyles();
        break;
      case 'text':
        styles = figma.getLocalTextStyles();
        break;
      case 'effect':
        styles = figma.getLocalEffectStyles();
        break;
      case 'grid':
        styles = figma.getLocalGridStyles();
        break;
      default:
        const paintStyles = figma.getLocalPaintStyles();
        const textStyles = figma.getLocalTextStyles();
        const effectStyles = figma.getLocalEffectStyles();
        const gridStyles = figma.getLocalGridStyles();
        styles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles] as any[];
    }
    
    return {
      styles: styles.map(style => formatStyleResponse(style)),
      count: styles.length,
      styleType: styleType || 'all'
    };
  }

  private async applyStyle(params: StyleParams): Promise<any> {
    this.validateParams(params, ['nodeId']);
    
    const node = findNodeById(params.nodeId!);
    let style: PaintStyle | TextStyle | EffectStyle | GridStyle | undefined;
    
    // Find style by ID or name
    if (params.styleId) {
      const paintStyles = figma.getLocalPaintStyles();
      const textStyles = figma.getLocalTextStyles();
      const effectStyles = figma.getLocalEffectStyles();
      const gridStyles = figma.getLocalGridStyles();
      const allStyles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles] as any[];
      // Fix: Remove trailing comma from style IDs (Figma API bug)
      style = allStyles.find(s => s.id.replace(/,$/, '') === params.styleId);
    } else if (params.styleName) {
      const paintStyles = figma.getLocalPaintStyles();
      const textStyles = figma.getLocalTextStyles();
      const effectStyles = figma.getLocalEffectStyles();
      const gridStyles = figma.getLocalGridStyles();
      const allStyles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles] as any[];
      style = allStyles.find(s => s.name === params.styleName);
    }
    
    if (!style) {
      throw new Error('Style not found');
    }
    
    // Apply style based on type
    switch (style.type) {
      case 'PAINT':
        if ('fillStyleId' in node) {
          (node as any).fillStyleId = style.id;
        }
        break;
      case 'TEXT':
        if (node.type === 'TEXT') {
          (node as TextNode).textStyleId = style.id;
        }
        break;
      case 'EFFECT':
        if ('effectStyleId' in node) {
          (node as any).effectStyleId = style.id;
        }
        break;
      case 'GRID':
        if ('gridStyleId' in node) {
          (node as any).gridStyleId = style.id;
        }
        break;
    }
    
    return {
      nodeId: params.nodeId,
      styleId: style.id,
      styleName: style.name,
      styleType: style.type.toLowerCase(),
      message: `Applied ${style.type.toLowerCase()} style "${style.name}" to node`
    };
  }

  private async deleteStyle(params: StyleParams): Promise<any> {
    this.validateParams(params, ['styleId']);
    
    // Debug: Log the requested style ID
    console.log('DELETE STYLE DEBUG - Requested ID:', params.styleId);
    
    // Find the style by searching through all local styles
    const paintStyles = figma.getLocalPaintStyles();
    const textStyles = figma.getLocalTextStyles();
    const effectStyles = figma.getLocalEffectStyles();
    const gridStyles = figma.getLocalGridStyles();
    const allStyles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles];
    
    // Debug: Log all available style IDs
    console.log('DELETE STYLE DEBUG - Available style IDs:');
    allStyles.forEach(s => {
      console.log(`  - ${s.name}: ${s.id} (type: ${s.type})`);
    });
    
    // Fix: Remove trailing comma from style IDs (Figma API bug)
    const style = allStyles.find(s => s.id.replace(/,$/, '') === params.styleId);
    
    console.log('DELETE STYLE DEBUG - Fixed comparison result:', !!style);
    
    if (!style) {
      // Enhanced error with more debugging info
      throw new Error(`Style not found with ID: ${params.styleId}. Found ${allStyles.length} total styles in file. Check console for available IDs.`);
    }
    
    console.log('DELETE STYLE DEBUG - Found style to delete:', {
      id: style.id,
      name: style.name,
      type: style.type
    });
    
    // Capture style info BEFORE deletion - create minimal response to avoid issues
    const styleInfo: any = {
      id: style.id.replace(/,$/, ''), // Clean ID for response
      name: style.name,
      type: style.type
    };
    
    // Safely capture description
    try {
      styleInfo.description = style.description || '';
    } catch (e) {
      styleInfo.description = '';
    }
    
    // Safely add type-specific properties before deletion
    if (style.type === 'TEXT') {
      try {
        const textStyle = style as TextStyle;
        styleInfo.fontName = textStyle.fontName;
        styleInfo.fontSize = textStyle.fontSize;
        styleInfo.letterSpacing = textStyle.letterSpacing;
        styleInfo.lineHeight = textStyle.lineHeight;
      } catch (e) {
        console.warn('Could not capture text style properties:', e);
      }
    }
    
    // Delete the style using the correct API pattern
    style.remove();
    
    console.log('DELETE STYLE DEBUG - Style removed successfully');
    
    return {
      deletedStyle: styleInfo,
      message: `Successfully deleted ${styleInfo.type.toLowerCase()} style "${styleInfo.name}"`
    };
  }

  private async getStyle(params: StyleParams): Promise<any> {
    this.validateParams(params, ['styleId']);
    
    // Find the style by searching through all local styles
    const paintStyles = figma.getLocalPaintStyles();
    const textStyles = figma.getLocalTextStyles();
    const effectStyles = figma.getLocalEffectStyles();
    const gridStyles = figma.getLocalGridStyles();
    const allStyles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles];
    
    // Fix: Remove trailing comma from style IDs (Figma API bug)
    const style = allStyles.find(s => s.id.replace(/,$/, '') === params.styleId);
    
    if (!style) {
      throw new Error(`Style not found with ID: ${params.styleId}`);
    }
    
    return formatStyleResponse(style);
  }
}