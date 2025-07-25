import { OperationResult, NodeInfo } from '../types.js';
import { cleanEmptyProperties } from './node-utils.js';
import { logger } from './plugin-logger.js';

/**
 * DEPRECATED: Use direct data return instead
 * KISS: Return data directly, no success wrapper
 */
export function createSuccessResponse(data?: any): any {
  logger.warn('createSuccessResponse is deprecated - return data directly');
  return data;
}

/**
 * DEPRECATED: Use throw new Error() instead
 * KISS: Throw errors directly, no error wrapper
 */
export function createErrorResponse(error: string | Error): never {
  logger.warn('createErrorResponse is deprecated - throw errors directly');
  const errorMessage = error instanceof Error ? error.message : error;
  throw new Error(errorMessage);
}

/**
 * DEPRECATED: Use direct async function calls instead
 * KISS: Let functions return data directly or throw errors
 */
export function wrapAsync<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  logger.warn('wrapAsync is deprecated - use direct async calls');
  return async (...args: T): Promise<R> => {
    try {
      const result = await fn(...args);
      return result;
    } catch (error) {
      logger.error('Operation failed:', error);
      throw error;
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

  // Clean empty properties before returning (removes empty {} and [] objects)
  return cleanEmptyProperties(response) || response;
}

export function createOperationResponse(operation: string, data: any): any {
  return {
    operation,
    timestamp: Date.now(),
    data
  };
}

/**
 * DEPRECATED: KISS pattern doesn't use success wrappers
 * Data is valid if it exists, errors are thrown
 */
export function validateResponse(response: any): boolean {
  logger.warn('validateResponse is deprecated - KISS pattern uses direct data/errors');
  return response !== undefined && response !== null;
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

/**
 * DEPRECATED: KISS pattern - operations succeed (return data) or fail (throw)
 */
export function logOperation(operation: string, params: any, result: any): void {
  logger.warn('logOperation success check is deprecated - KISS pattern');
  const status = '✅'; // If we got here, operation succeeded (otherwise would have thrown)
  logger.log(`${status} ${operation}:`, { params, result });
}

export function createPageNodesResponse(nodes: any[], detail: string = 'standard'): any {
  const topLevelNodes = nodes.filter(node => node.depth === 1);
  
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