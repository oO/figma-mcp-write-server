import { OperationResult, NodeInfo } from '../types.js';

export function createSuccessResponse(data?: any): OperationResult {
  return {
    success: true,
    data
  };
}

export function createErrorResponse(error: string | Error): OperationResult {
  const errorMessage = error instanceof Error ? error.message : error;
  return {
    success: false,
    error: errorMessage
  };
}

export function wrapAsync<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<OperationResult> {
  return async (...args: T): Promise<OperationResult> => {
    try {
      const result = await fn(...args);
      return createSuccessResponse(result);
    } catch (error) {
      console.error('❌ Operation failed:', error);
      return createErrorResponse(error as Error);
    }
  };
}

export function formatNodeInfo(node: SceneNode): NodeInfo {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    x: 'x' in node ? node.x : 0,
    y: 'y' in node ? node.y : 0,
    width: 'width' in node ? node.width : 0,
    height: 'height' in node ? node.height : 0
  };
}

export function formatSelection(selection: readonly SceneNode[]): NodeInfo[] {
  return selection.map(formatNodeInfo);
}

export function formatStyleResponse(style: PaintStyle | TextStyle | EffectStyle | GridStyle) {
  const response: any = {
    id: style.id.replace(/,$/, ''), // Fix: Remove trailing comma from style ID
    name: style.name,
    type: style.type,
    description: style.description || ''
  };

  // Add type-specific properties
  if (style.type === 'PAINT') {
    response.paints = (style as PaintStyle).paints;
  } else if (style.type === 'TEXT') {
    const textStyle = style as TextStyle;
    response.fontName = textStyle.fontName;
    response.fontSize = textStyle.fontSize;
    response.letterSpacing = textStyle.letterSpacing;
    response.lineHeight = textStyle.lineHeight;
  } else if (style.type === 'EFFECT') {
    response.effects = (style as EffectStyle).effects;
  } else if (style.type === 'GRID') {
    response.layoutGrids = (style as GridStyle).layoutGrids;
  }

  return response;
}

export function createOperationResponse(operation: string, data: any): any {
  return {
    operation,
    timestamp: Date.now(),
    data
  };
}

export function validateResponse(response: any): boolean {
  return response && typeof response === 'object' && 'success' in response;
}

export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

export function logOperation(operation: string, params: any, result: OperationResult): void {
  const status = result.success ? '✅' : '❌';
  console.log(`${status} ${operation}:`, { params, result });
}

export function createPageNodesResponse(nodes: any[], detail: string = 'standard'): any {
  const topLevelNodes = nodes.filter(node => node.depth === 0);
  
  const response = {
    nodes,
    totalCount: nodes.length,
    topLevelCount: topLevelNodes.length,
    detail
  };

  // For simple mode, also provide a flat list of just the essential info
  if (detail === 'simple') {
    response.nodeList = nodes.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type
    }));
  }

  return response;
}

export function formatExportResponse(nodeId: string, format: string, scale: number): any {
  return {
    nodeId,
    format,
    scale,
    exportedAt: Date.now(),
    message: `Node ${nodeId} exported as ${format} at ${scale}x scale`
  };
}

export function formatHierarchyResponse(operation: string, data: any): any {
  const baseResponse = {
    operation,
    timestamp: Date.now()
  };

  switch (operation) {
    case 'group':
      return Object.assign({}, baseResponse, {
        groupId: data.groupId,
        groupName: data.groupName,
        nodeCount: data.nodeCount
      });
    case 'ungroup':
      return Object.assign({}, baseResponse, {
        ungroupedNodeId: data.nodeId,
        childCount: data.childCount
      });
    case 'move':
      return Object.assign({}, baseResponse, {
        movedNodeId: data.nodeId,
        newParentId: data.newParentId
      });
    case 'reorder':
      return Object.assign({}, baseResponse, {
        reorderedNodeId: data.nodeId,
        newIndex: data.newIndex
      });
    default:
      return Object.assign({}, baseResponse, { data: data });
  }
}