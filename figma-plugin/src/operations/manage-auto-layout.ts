import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById, selectAndFocus, validateNodeType } from '../utils/node-utils.js';

/**
 * Handle MANAGE_AUTO_LAYOUT operation
 */
export async function handleManageAutoLayout(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('manageAutoLayout', params, async () => {
    BaseOperation.validateParams(params, ['operation', 'nodeId']);
    
    const operation = BaseOperation.validateStringParam(
      params.operation,
      'operation',
      ['enable', 'disable', 'update', 'get_properties']
    );

    const nodeId = params.nodeId;
    if (!nodeId) {
      throw new Error('Parameter "nodeId" is required');
    }

    const node = findNodeById(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }
    validateNodeType(node, ['FRAME', 'COMPONENT', 'INSTANCE']);

    switch (operation) {
      case 'enable':
        return await enableAutoLayout(node as FrameNode, params);
      case 'disable':
        return await disableAutoLayout(node as FrameNode);
      case 'update':
        return await updateAutoLayout(node as FrameNode, params);
      case 'get_properties':
        return await getAutoLayoutProperties(node as FrameNode);
      default:
        throw new Error(`Unknown auto layout operation: ${operation}`);
    }
  });
}

async function enableAutoLayout(frame: FrameNode, params: any): Promise<any> {
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
  
  return {
    operation: 'enable',
    nodeId: frame.id,
    name: frame.name,
    direction: frame.layoutMode.toLowerCase(),
    spacing: frame.itemSpacing,
    message: `Enabled auto layout on frame: ${frame.name}`
  };
}

async function disableAutoLayout(frame: FrameNode): Promise<any> {
  frame.layoutMode = 'NONE';
  
  return {
    operation: 'disable',
    nodeId: frame.id,
    name: frame.name,
    message: `Disabled auto layout on frame: ${frame.name}`
  };
}

async function updateAutoLayout(frame: FrameNode, params: any): Promise<any> {
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
  
  return {
    operation: 'update',
    nodeId: frame.id,
    name: frame.name,
    direction: frame.layoutMode.toLowerCase(),
    spacing: frame.itemSpacing,
    message: `Updated auto layout properties for frame: ${frame.name}`
  };
}

async function getAutoLayoutProperties(frame: FrameNode): Promise<any> {
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