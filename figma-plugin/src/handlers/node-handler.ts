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
        ['rectangle', 'ellipse', 'text', 'frame']
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
    
    // Apply styling
    await this.applyBasicStyling(rect, params);
    
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
    
    // Apply styling
    await this.applyBasicStyling(frame, params);
    
    // Add to page and select
    figma.currentPage.appendChild(frame);
    selectAndFocus([frame]);
    
    return formatNodeResponse(frame);
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
      text.lineHeight = params.lineHeight;
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
      this.validateParams(params, ['nodeId', 'properties']);
      
      const node = findNodeById(params.nodeId);
      const properties = params.properties;
      
      // Update basic properties
      if (properties.name !== undefined) {
        node.name = properties.name;
      }
      
      if (properties.visible !== undefined) {
        node.visible = properties.visible;
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
      
      // Update styling
      if (properties.fillColor) {
        const color = hexToRgb(properties.fillColor);
        (node as any).fills = [{ type: 'SOLID', color }];
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