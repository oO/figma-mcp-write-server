import { BaseHandler } from './base-handler.js';
import { NodeParams, TextParams, OperationResult, OperationHandler } from '../types.js';
import { hexToRgb, createSolidPaint } from '../utils/color-utils.js';
import { findNodeById, formatNodeResponse, selectAndFocus, moveNodeToPosition, resizeNode } from '../utils/node-utils.js';
import { loadFont, getFontFromParams, ensureFontLoaded } from '../utils/font-utils.js';
import { createSuccessResponse } from '../utils/response-utils.js';

export class NodeHandler extends BaseHandler {
  protected getHandlerName(): string {
    return 'NodeHandler';
  }

  getOperations(): Record<string, OperationHandler> {
    return {
      CREATE_NODE: (params) => this.createNode(params),
      CREATE_STAR: (params) => this.createStar(params),
      CREATE_POLYGON: (params) => this.createPolygon(params),
      UPDATE_NODE: (params) => this.updateNode(params),
      MOVE_NODE: (params) => this.moveNode(params),
      DELETE_NODE: (params) => this.deleteNode(params),
      DUPLICATE_NODE: (params) => this.duplicateNode(params)
    };
  }

  private async createNode(params: NodeParams): Promise<OperationResult> {
    return this.executeOperation('createNode', params, async () => {
      this.validateParams(params, ['nodeType']);
      
      const nodeType = this.validateStringParam(
        params.nodeType, 
        'nodeType', 
        ['rectangle', 'ellipse', 'text', 'frame', 'star', 'polygon']
      );

      switch (nodeType) {
        case 'rectangle':
          return await this.createRectangle(params);
        case 'ellipse':
          return await this.createEllipse(params);
        case 'text':
          return await this.createText(params as TextParams);
        case 'frame':
          return await this.createFrame(params);
        case 'star':
          return await this.createStar(params);
        case 'polygon':
          return await this.createPolygon(params);
        default:
          throw new Error(`Unknown node type: ${nodeType}`);
      }
    });
  }

  private async createRectangle(params: NodeParams): Promise<any> {
    const rect = figma.createRectangle();
    
    // Set position
    rect.x = params.x || 0;
    rect.y = params.y || 0;
    
    // Set size with defaults
    const width = params.width || 100;
    const height = params.height || 100;
    rect.resize(width, height);
    
    // Set name
    rect.name = params.name || 'Rectangle';
    
    // Apply corner properties
    await this.applyCornerProperties(rect, params);
    
    // Apply styling
    await this.applyBasicStyling(rect, params);
    
    // Apply transform and interaction properties
    await this.applyTransformAndInteraction(rect, params);
    
    // Add to page and select
    figma.currentPage.appendChild(rect);
    selectAndFocus([rect]);
    
    return formatNodeResponse(rect);
  }

  private async createEllipse(params: NodeParams): Promise<any> {
    const ellipse = figma.createEllipse();
    
    // Set position
    ellipse.x = params.x || 0;
    ellipse.y = params.y || 0;
    
    // Set size with defaults
    const width = params.width || 100;
    const height = params.height || 100;
    ellipse.resize(width, height);
    
    // Set name
    ellipse.name = params.name || 'Ellipse';
    
    // Apply styling
    await this.applyBasicStyling(ellipse, params);
    
    // Apply transform and interaction properties
    await this.applyTransformAndInteraction(ellipse, params);
    
    // Add to page and select
    figma.currentPage.appendChild(ellipse);
    selectAndFocus([ellipse]);
    
    return formatNodeResponse(ellipse);
  }

  private async createText(params: TextParams): Promise<any> {
    const text = figma.createText();
    
    // Load font first
    const fontName = getFontFromParams(params);
    await ensureFontLoaded(fontName);
    
    // Set basic properties
    text.fontName = fontName;
    text.characters = params.characters || params.content || 'Text';
    text.fontSize = params.fontSize || 16;
    
    // Set position
    text.x = params.x || 0;
    text.y = params.y || 0;
    
    // Set name
    text.name = params.name || 'Text';
    
    // Apply text-specific styling
    await this.applyTextStyling(text, params);
    
    // Apply basic styling
    await this.applyBasicStyling(text, params);
    
    // Apply transform and interaction properties
    await this.applyTransformAndInteraction(text, params);
    
    // Add to page and select
    figma.currentPage.appendChild(text);
    selectAndFocus([text]);
    
    return formatNodeResponse(text);
  }

  private async createFrame(params: NodeParams): Promise<any> {
    const frame = figma.createFrame();
    
    // Set position
    frame.x = params.x || 0;
    frame.y = params.y || 0;
    
    // Set size with defaults
    const width = params.width || 200;
    const height = params.height || 200;
    frame.resize(width, height);
    
    // Set name
    frame.name = params.name || 'Frame';
    
    // Apply corner properties
    await this.applyCornerProperties(frame, params);
    
    // Apply frame-specific properties
    if (params.clipsContent !== undefined) {
      frame.clipsContent = params.clipsContent;
    }
    
    // Apply styling
    await this.applyBasicStyling(frame, params);
    
    // Apply transform and interaction properties
    await this.applyTransformAndInteraction(frame, params);
    
    // Add to page and select
    figma.currentPage.appendChild(frame);
    selectAndFocus([frame]);
    
    return formatNodeResponse(frame);
  }

  private async createStar(params: NodeParams): Promise<any> {
    const star = figma.createStar();
    
    // Set position
    star.x = params.x || 0;
    star.y = params.y || 0;
    
    // Set size with defaults
    const width = params.width || 100;
    const height = params.height || 100;
    star.resize(width, height);
    
    // Set name
    star.name = params.name || 'Star';
    
    // Apply star-specific properties
    if (params.pointCount !== undefined) {
      star.pointCount = Math.max(3, params.pointCount);
    }
    
    if (params.innerRadius !== undefined) {
      star.innerRadius = Math.max(0, Math.min(1, params.innerRadius));
    }
    
    // Apply styling
    await this.applyBasicStyling(star, params);
    
    // Apply transform and interaction properties
    await this.applyTransformAndInteraction(star, params);
    
    // Add to page and select
    figma.currentPage.appendChild(star);
    selectAndFocus([star]);
    
    return formatNodeResponse(star);
  }

  private async createPolygon(params: NodeParams): Promise<any> {
    const polygon = figma.createPolygon();
    
    // Set position
    polygon.x = params.x || 0;
    polygon.y = params.y || 0;
    
    // Set size with defaults
    const width = params.width || 100;
    const height = params.height || 100;
    polygon.resize(width, height);
    
    // Set name
    polygon.name = params.name || 'Polygon';
    
    // Apply polygon-specific properties
    if (params.pointCount !== undefined) {
      polygon.pointCount = Math.max(3, params.pointCount);
    }
    
    // Apply styling
    await this.applyBasicStyling(polygon, params);
    
    // Apply transform and interaction properties
    await this.applyTransformAndInteraction(polygon, params);
    
    // Add to page and select
    figma.currentPage.appendChild(polygon);
    selectAndFocus([polygon]);
    
    return formatNodeResponse(polygon);
  }

  private async applyCornerProperties(node: RectangleNode | FrameNode, params: NodeParams): Promise<void> {
    // Apply corner radius
    if (params.cornerRadius !== undefined) {
      node.cornerRadius = params.cornerRadius;
    }
    
    // Apply individual corner radii (overrides general cornerRadius)
    if (params.topLeftRadius !== undefined || 
        params.topRightRadius !== undefined || 
        params.bottomLeftRadius !== undefined || 
        params.bottomRightRadius !== undefined) {
      
      node.topLeftRadius = params.topLeftRadius ?? node.topLeftRadius;
      node.topRightRadius = params.topRightRadius ?? node.topRightRadius;
      node.bottomLeftRadius = params.bottomLeftRadius ?? node.bottomLeftRadius;
      node.bottomRightRadius = params.bottomRightRadius ?? node.bottomRightRadius;
    }
    
    // Apply corner smoothing
    if (params.cornerSmoothing !== undefined) {
      node.cornerSmoothing = Math.max(0, Math.min(1, params.cornerSmoothing));
    }
  }

  private async applyBasicStyling(node: SceneNode, params: NodeParams): Promise<void> {
    // Apply fill color
    if (params.fillColor) {
      const color = hexToRgb(params.fillColor);
      (node as any).fills = [{ type: 'SOLID', color }];
    }
    
    // Apply stroke
    if (params.strokeColor) {
      const strokeColor = hexToRgb(params.strokeColor);
      (node as any).strokes = [{ type: 'SOLID', color: strokeColor }];
    }
    
    if (params.strokeWidth !== undefined) {
      (node as any).strokeWeight = params.strokeWidth;
    }
    
    // Apply opacity (only for nodes that support it)
    if (params.opacity !== undefined && 'opacity' in node) {
      (node as any).opacity = Math.max(0, Math.min(1, params.opacity));
    }
    
    // Apply visibility
    if (params.visible !== undefined) {
      node.visible = params.visible;
    }
  }

  private async applyTransformAndInteraction(node: SceneNode, params: NodeParams): Promise<void> {
    // Apply rotation (only for nodes that support it)
    if (params.rotation !== undefined && 'rotation' in node) {
      (node as any).rotation = (params.rotation * Math.PI) / 180; // Convert degrees to radians
    }
    
    // Apply locked state
    if (params.locked !== undefined) {
      node.locked = params.locked;
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
    
    // Text case
    if (params.textCase) {
      text.textCase = params.textCase.toUpperCase() as any;
    }
    
    // Text decoration
    if (params.textDecoration) {
      text.textDecoration = params.textDecoration.toUpperCase() as any;
    }
    
    // Letter spacing
    if (params.letterSpacing !== undefined) {
      text.letterSpacing = { unit: 'PIXELS', value: params.letterSpacing };
    }
    
    // Line height
    if (params.lineHeight) {
      const lineHeight = params.lineHeight;
      text.lineHeight = {
        value: lineHeight.value,
        unit: lineHeight.unit === 'px' ? 'PIXELS' : 'PERCENT'
      } as LineHeight;
    }
    
    // Paragraph settings
    if (params.paragraphIndent !== undefined) {
      text.paragraphIndent = params.paragraphIndent;
    }
    
    if (params.paragraphSpacing !== undefined) {
      text.paragraphSpacing = params.paragraphSpacing;
    }
    
    // Apply style ranges if provided
    if (params.styleRanges && params.styleRanges.length > 0) {
      await this.applyTextStyleRanges(text, params.styleRanges);
    }
  }

  private async applyTextStyleRanges(text: TextNode, ranges: any[]): Promise<void> {
    for (const range of ranges) {
      const { start, end } = range;
      
      // Load font for this range if specified
      if (range.fontName || (range.fontFamily && range.fontStyle)) {
        const fontName = range.fontName || {
          family: range.fontFamily,
          style: range.fontStyle
        };
        await ensureFontLoaded(fontName);
        text.setRangeFontName(start, end, fontName);
      }
      
      // Apply other range properties
      if (range.fontSize !== undefined) {
        text.setRangeFontSize(start, end, range.fontSize);
      }
      
      if (range.fillColor) {
        const color = hexToRgb(range.fillColor);
        text.setRangeFills(start, end, [{ type: 'SOLID', color }]);
      }
      
      if (range.textCase) {
        text.setRangeTextCase(start, end, range.textCase.toUpperCase());
      }
      
      if (range.textDecoration) {
        text.setRangeTextDecoration(start, end, range.textDecoration.toUpperCase());
      }
      
      if (range.letterSpacing !== undefined) {
        text.setRangeLetterSpacing(start, end, {
          unit: 'PIXELS',
          value: range.letterSpacing
        });
      }
    }
  }

  private async updateNode(params: any): Promise<OperationResult> {
    return this.executeOperation('updateNode', params, async () => {
      this.validateParams(params, ['nodeId']);
      
      const node = findNodeById(params.nodeId);
      
      // Handle legacy properties format for backward compatibility
      const properties = params.properties || params;
      
      // Update basic properties
      if (properties.name !== undefined) {
        node.name = properties.name;
      }
      
      if (properties.visible !== undefined) {
        node.visible = properties.visible;
      }
      
      if (properties.locked !== undefined) {
        node.locked = properties.locked;
      }
      
      // Update position if node supports it
      if ('x' in node && 'y' in node) {
        if (properties.x !== undefined) {
          (node as any).x = properties.x;
        }
        if (properties.y !== undefined) {
          (node as any).y = properties.y;
        }
      }
      
      // Update size if node supports it
      if ('resize' in node) {
        if (properties.width !== undefined && properties.height !== undefined) {
          (node as any).resize(properties.width, properties.height);
        } else if (properties.width !== undefined || properties.height !== undefined) {
          const currentWidth = 'width' in node ? (node as any).width : 100;
          const currentHeight = 'height' in node ? (node as any).height : 100;
          (node as any).resize(
            properties.width || currentWidth,
            properties.height || currentHeight
          );
        }
      }
      
      // Update corner properties for rectangles and frames
      if (node.type === 'RECTANGLE' || node.type === 'FRAME') {
        await this.applyCornerProperties(node as RectangleNode | FrameNode, properties);
      }
      
      // Update frame-specific properties
      if (node.type === 'FRAME' && properties.clipsContent !== undefined) {
        (node as FrameNode).clipsContent = properties.clipsContent;
      }
      
      // Update shape-specific properties
      if (node.type === 'STAR') {
        const starNode = node as StarNode;
        if (properties.pointCount !== undefined) {
          starNode.pointCount = Math.max(3, properties.pointCount);
        }
        if (properties.innerRadius !== undefined) {
          starNode.innerRadius = Math.max(0, Math.min(1, properties.innerRadius));
        }
      }
      
      if (node.type === 'POLYGON' && properties.pointCount !== undefined) {
        (node as PolygonNode).pointCount = Math.max(3, properties.pointCount);
      }
      
      // Update text properties
      if (node.type === 'TEXT') {
        const textNode = node as TextNode;
        
        if (properties.content !== undefined || properties.characters !== undefined) {
          textNode.characters = properties.content || properties.characters;
        }
        
        if (properties.fontSize !== undefined) {
          textNode.fontSize = properties.fontSize;
        }
        
        if (properties.fontFamily !== undefined || properties.fontStyle !== undefined) {
          const currentFontName = textNode.fontName as FontName;
          const fontName = {
            family: properties.fontFamily || currentFontName.family,
            style: properties.fontStyle || currentFontName.style
          };
          await ensureFontLoaded(fontName);
          textNode.fontName = fontName;
        }
        
        if (properties.textAlignHorizontal !== undefined) {
          textNode.textAlignHorizontal = properties.textAlignHorizontal.toUpperCase() as any;
        }
      }
      
      // Update styling
      if (properties.fillColor) {
        const color = hexToRgb(properties.fillColor);
        (node as any).fills = [{ type: 'SOLID', color }];
      }
      
      if (properties.strokeColor) {
        const strokeColor = hexToRgb(properties.strokeColor);
        (node as any).strokes = [{ type: 'SOLID', color: strokeColor }];
      }
      
      if (properties.strokeWidth !== undefined) {
        (node as any).strokeWeight = properties.strokeWidth;
      }
      
      if (properties.opacity !== undefined && 'opacity' in node) {
        (node as any).opacity = Math.max(0, Math.min(1, properties.opacity));
      }
      
      // Update transform properties
      if (properties.rotation !== undefined && 'rotation' in node) {
        (node as any).rotation = (properties.rotation * Math.PI) / 180; // Convert degrees to radians
      }
      
      selectAndFocus([node]);
      return formatNodeResponse(node);
    });
  }

  private async moveNode(params: any): Promise<OperationResult> {
    return this.executeOperation('moveNode', params, async () => {
      this.validateParams(params, ['nodeId', 'x', 'y']);
      
      const node = findNodeById(params.nodeId);
      const x = this.validateNumberParam(params.x, 'x');
      const y = this.validateNumberParam(params.y, 'y');
      
      moveNodeToPosition(node, x, y);
      selectAndFocus([node]);
      
      return formatNodeResponse(node);
    });
  }

  private async deleteNode(params: any): Promise<OperationResult> {
    return this.executeOperation('deleteNode', params, async () => {
      this.validateParams(params, ['nodeId']);
      
      const node = findNodeById(params.nodeId);
      const nodeInfo = formatNodeResponse(node);
      
      node.remove();
      
      return {
        deletedNode: nodeInfo,
        message: `Deleted ${nodeInfo.type} "${nodeInfo.name}"`
      };
    });
  }

  private async duplicateNode(params: any): Promise<OperationResult> {
    return this.executeOperation('duplicateNode', params, async () => {
      this.validateParams(params, ['nodeId']);
      
      const node = findNodeById(params.nodeId);
      const duplicate = node.clone();
      
      const offsetX = params.offsetX || 10;
      const offsetY = params.offsetY || 10;
      
      if ('x' in duplicate && 'y' in duplicate) {
        (duplicate as any).x = (node as any).x + offsetX;
        (duplicate as any).y = (node as any).y + offsetY;
      }
      
      duplicate.name = node.name + ' Copy';
      
      // Insert after the original node
      if (node.parent) {
        const index = node.parent.children.indexOf(node);
        node.parent.insertChild(index + 1, duplicate);
      } else {
        figma.currentPage.appendChild(duplicate);
      }
      
      selectAndFocus([duplicate]);
      
      return {
        original: formatNodeResponse(node),
        duplicate: formatNodeResponse(duplicate)
      };
    });
  }
}