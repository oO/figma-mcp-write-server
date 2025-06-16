import { BaseHandler } from './base-handler.js';
import { AutoLayoutParams, ConstraintsParams, OperationResult, OperationHandler } from '../types.js';
import { findNodeById, formatNodeResponse, selectAndFocus, validateNodeType } from '../utils/node-utils.js';

export class LayoutHandler extends BaseHandler {
  protected getHandlerName(): string {
    return 'LayoutHandler';
  }

  getOperations(): Record<string, OperationHandler> {
    return {
      MANAGE_AUTO_LAYOUT: (params) => this.manageAutoLayout(params),
      MANAGE_CONSTRAINTS: (params) => this.manageConstraints(params)
    };
  }

  private async manageAutoLayout(params: AutoLayoutParams): Promise<OperationResult> {
    return this.executeOperation('manageAutoLayout', params, async () => {
      this.validateParams(params, ['operation', 'nodeId']);
      
      const operation = this.validateStringParam(
        params.operation,
        'operation',
        ['enable', 'disable', 'update', 'get_properties']
      );

      const node = findNodeById(params.nodeId);
      validateNodeType(node, ['FRAME', 'COMPONENT', 'INSTANCE']);

      switch (operation) {
        case 'enable':
          return await this.enableAutoLayout(node as FrameNode, params);
        case 'disable':
          return await this.disableAutoLayout(node as FrameNode);
        case 'update':
          return await this.updateAutoLayout(node as FrameNode, params);
        case 'get_properties':
          return await this.getAutoLayoutProperties(node as FrameNode);
        default:
          throw new Error(`Unknown auto layout operation: ${operation}`);
      }
    });
  }

  private async enableAutoLayout(frame: FrameNode, params: AutoLayoutParams): Promise<any> {
    // Set auto layout mode
    frame.layoutMode = params.direction === 'vertical' ? 'VERTICAL' : 'HORIZONTAL';
    
    // Set spacing
    if (params.spacing !== undefined) {
      frame.itemSpacing = params.spacing;
    }
    
    // Set padding
    if (params.paddingTop !== undefined) {
      frame.paddingTop = params.paddingTop;
    }
    if (params.paddingRight !== undefined) {
      frame.paddingRight = params.paddingRight;
    }
    if (params.paddingBottom !== undefined) {
      frame.paddingBottom = params.paddingBottom;
    }
    if (params.paddingLeft !== undefined) {
      frame.paddingLeft = params.paddingLeft;
    }
    
    // Set alignments
    if (params.primaryAlignment) {
      frame.primaryAxisAlignItems = params.primaryAlignment.toUpperCase() as any;
    }
    
    if (params.counterAlignment) {
      frame.counterAxisAlignItems = params.counterAlignment.toUpperCase() as any;
    }
    
    // Set resizing behavior
    if (params.resizingWidth) {
      frame.layoutGrow = params.resizingWidth === 'fill' ? 1 : 0;
    }
    
    // Set other properties
    if (params.strokesIncludedInLayout !== undefined) {
      frame.strokesIncludedInLayout = params.strokesIncludedInLayout;
    }
    
    if (params.layoutWrap) {
      frame.layoutWrap = params.layoutWrap.toUpperCase() as any;
    }
    
    selectAndFocus([frame]);
    
    return {
      operation: 'enable',
      nodeId: frame.id,
      name: frame.name,
      direction: frame.layoutMode.toLowerCase(),
      spacing: frame.itemSpacing,
      message: `Enabled auto layout on frame: ${frame.name}`
    };
  }

  private async disableAutoLayout(frame: FrameNode): Promise<any> {
    frame.layoutMode = 'NONE';
    
    selectAndFocus([frame]);
    
    return {
      operation: 'disable',
      nodeId: frame.id,
      name: frame.name,
      message: `Disabled auto layout on frame: ${frame.name}`
    };
  }

  private async updateAutoLayout(frame: FrameNode, params: AutoLayoutParams): Promise<any> {
    if (frame.layoutMode === 'NONE') {
      throw new Error('Auto layout must be enabled before updating properties');
    }
    
    // Update direction
    if (params.direction) {
      frame.layoutMode = params.direction === 'vertical' ? 'VERTICAL' : 'HORIZONTAL';
    }
    
    // Update spacing
    if (params.spacing !== undefined) {
      frame.itemSpacing = params.spacing;
    }
    
    // Update padding
    if (params.paddingTop !== undefined) {
      frame.paddingTop = params.paddingTop;
    }
    if (params.paddingRight !== undefined) {
      frame.paddingRight = params.paddingRight;
    }
    if (params.paddingBottom !== undefined) {
      frame.paddingBottom = params.paddingBottom;
    }
    if (params.paddingLeft !== undefined) {
      frame.paddingLeft = params.paddingLeft;
    }
    
    // Update alignments
    if (params.primaryAlignment) {
      frame.primaryAxisAlignItems = params.primaryAlignment.toUpperCase() as any;
    }
    
    if (params.counterAlignment) {
      frame.counterAxisAlignItems = params.counterAlignment.toUpperCase() as any;
    }
    
    // Update other properties
    if (params.strokesIncludedInLayout !== undefined) {
      frame.strokesIncludedInLayout = params.strokesIncludedInLayout;
    }
    
    if (params.layoutWrap) {
      frame.layoutWrap = params.layoutWrap.toUpperCase() as any;
    }
    
    selectAndFocus([frame]);
    
    return {
      operation: 'update',
      nodeId: frame.id,
      name: frame.name,
      direction: frame.layoutMode.toLowerCase(),
      spacing: frame.itemSpacing,
      message: `Updated auto layout properties for frame: ${frame.name}`
    };
  }

  private async getAutoLayoutProperties(frame: FrameNode): Promise<any> {
    const isAutoLayout = frame.layoutMode !== 'NONE';
    
    if (!isAutoLayout) {
      return {
        operation: 'get_properties',
        nodeId: frame.id,
        name: frame.name,
        autoLayout: null,
        message: 'Auto layout is not enabled on this frame'
      };
    }
    
    return {
      operation: 'get_properties',
      nodeId: frame.id,
      name: frame.name,
      autoLayout: {
        direction: frame.layoutMode.toLowerCase(),
        spacing: frame.itemSpacing,
        paddingTop: frame.paddingTop,
        paddingRight: frame.paddingRight,
        paddingBottom: frame.paddingBottom,
        paddingLeft: frame.paddingLeft,
        primaryAlignment: frame.primaryAxisAlignItems.toLowerCase(),
        counterAlignment: frame.counterAxisAlignItems.toLowerCase(),
        strokesIncludedInLayout: frame.strokesIncludedInLayout,
        layoutWrap: frame.layoutWrap?.toLowerCase()
      }
    };
  }

  private async manageConstraints(params: ConstraintsParams): Promise<OperationResult> {
    return this.executeOperation('manageConstraints', params, async () => {
      this.validateParams(params, ['operation', 'nodeId']);
      
      const operation = this.validateStringParam(
        params.operation,
        'operation',
        ['set', 'get', 'reset', 'get_info']
      );

      const node = findNodeById(params.nodeId);

      switch (operation) {
        case 'set':
          return await this.setConstraints(node, params);
        case 'get':
          return await this.getConstraints(node);
        case 'reset':
          return await this.resetConstraints(node);
        case 'get_info':
          return await this.getConstraintInfo(node);
        default:
          throw new Error(`Unknown constraints operation: ${operation}`);
      }
    });
  }

  private async setConstraints(node: SceneNode, params: ConstraintsParams): Promise<any> {
    if (!('constraints' in node)) {
      throw new Error(`Node type ${node.type} does not support constraints`);
    }
    
    const constraints: any = Object.assign({}, node.constraints);
    
    if (params.horizontal) {
      switch (params.horizontal) {
        case 'left':
          constraints.horizontal = 'MIN';
          break;
        case 'right':
          constraints.horizontal = 'MAX';
          break;
        case 'left_right':
          constraints.horizontal = 'STRETCH';
          break;
        case 'center':
          constraints.horizontal = 'CENTER';
          break;
        case 'scale':
          constraints.horizontal = 'SCALE';
          break;
      }
    }
    
    if (params.vertical) {
      switch (params.vertical) {
        case 'top':
          constraints.vertical = 'MIN';
          break;
        case 'bottom':
          constraints.vertical = 'MAX';
          break;
        case 'top_bottom':
          constraints.vertical = 'STRETCH';
          break;
        case 'center':
          constraints.vertical = 'CENTER';
          break;
        case 'scale':
          constraints.vertical = 'SCALE';
          break;
      }
    }
    
    (node as any).constraints = constraints;
    selectAndFocus([node]);
    
    return {
      operation: 'set',
      nodeId: node.id,
      name: node.name,
      constraints: {
        horizontal: params.horizontal,
        vertical: params.vertical
      },
      message: `Set constraints for node: ${node.name}`
    };
  }

  private async getConstraints(node: SceneNode): Promise<any> {
    if (!('constraints' in node)) {
      throw new Error(`Node type ${node.type} does not support constraints`);
    }
    
    const constraints = (node as any).constraints;
    
    // Convert Figma constraint values back to our format
    const horizontal = this.figmaConstraintToString(constraints.horizontal);
    const vertical = this.figmaConstraintToString(constraints.vertical);
    
    return {
      operation: 'get',
      nodeId: node.id,
      name: node.name,
      constraints: {
        horizontal,
        vertical
      }
    };
  }

  private async resetConstraints(node: SceneNode): Promise<any> {
    if (!('constraints' in node)) {
      throw new Error(`Node type ${node.type} does not support constraints`);
    }
    
    (node as any).constraints = {
      horizontal: 'MIN',
      vertical: 'MIN'
    };
    
    selectAndFocus([node]);
    
    return {
      operation: 'reset',
      nodeId: node.id,
      name: node.name,
      message: `Reset constraints for node: ${node.name}`
    };
  }

  private async getConstraintInfo(node: SceneNode): Promise<any> {
    const parent = node.parent;
    
    return {
      operation: 'get_info',
      nodeId: node.id,
      name: node.name,
      parentWidth: parent && 'width' in parent ? (parent as any).width : null,
      parentHeight: parent && 'height' in parent ? (parent as any).height : null,
      x: 'x' in node ? (node as any).x : 0,
      y: 'y' in node ? (node as any).y : 0,
      width: 'width' in node ? (node as any).width : 0,
      height: 'height' in node ? (node as any).height : 0
    };
  }

  private figmaConstraintToString(constraint: string): string {
    switch (constraint) {
      case 'MIN': return 'left'; // or 'top'
      case 'MAX': return 'right'; // or 'bottom'
      case 'STRETCH': return 'left_right'; // or 'top_bottom'
      case 'CENTER': return 'center';
      case 'SCALE': return 'scale';
      default: return 'left';
    }
  }
}