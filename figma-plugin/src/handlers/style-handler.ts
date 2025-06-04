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
        ['create', 'list', 'apply', 'delete', 'get']
      );

      switch (operation) {
        case 'create':
          return await this.createStyle(params);
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
      style = allStyles.find(s => s.id === params.styleId);
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
    let style: PaintStyle | TextStyle | EffectStyle | GridStyle | undefined;
    
    const paintStyles = figma.getLocalPaintStyles();
    const textStyles = figma.getLocalTextStyles();
    const effectStyles = figma.getLocalEffectStyles();
    const gridStyles = figma.getLocalGridStyles();
    const allStyles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles] as any[];
    
    if (params.styleId) {
      style = allStyles.find(s => s.id === params.styleId);
    } else if (params.styleName) {
      style = allStyles.find(s => s.name === params.styleName);
    }
    
    if (!style) {
      throw new Error('Style not found');
    }
    
    const styleInfo = {
      id: style.id,
      name: style.name,
      type: style.type
    };
    
    style.remove();
    
    return {
      deletedStyle: styleInfo,
      message: `Deleted ${style.type.toLowerCase()} style "${style.name}"`
    };
  }

  private async getStyle(params: StyleParams): Promise<any> {
    let style: PaintStyle | TextStyle | EffectStyle | GridStyle | undefined;
    
    const paintStyles = figma.getLocalPaintStyles();
    const textStyles = figma.getLocalTextStyles();
    const effectStyles = figma.getLocalEffectStyles();
    const gridStyles = figma.getLocalGridStyles();
    const allStyles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles] as any[];
    
    if (params.styleId) {
      style = allStyles.find(s => s.id === params.styleId);
    } else if (params.styleName) {
      style = allStyles.find(s => s.name === params.styleName);
    }
    
    if (!style) {
      throw new Error('Style not found');
    }
    
    return formatStyleResponse(style);
  }
}