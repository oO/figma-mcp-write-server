import { OperationResult, NodeInfo } from '../types.js';
import { cleanEmptyProperties } from './node-utils.js';
import { logger } from '../logger.js';
import { cleanStyleId } from './parameter-utils.js';


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
    id: cleanStyleId(style.id), // Fix: Remove trailing comma from style ID
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

// Message-level response helpers for main.ts communication
/**
 * Create standardized UI message response for successful operations
 */
export function createOperationSuccessMessage(id: string, operation: string, result: any) {
  return {
    type: 'OPERATION_RESPONSE',
    id,
    operation,
    result
  };
}

/**
 * Create standardized UI message response for failed operations
 */
export function createOperationErrorMessage(id: string, operation: string, error: unknown) {
  return {
    type: 'OPERATION_RESPONSE',
    id,
    operation,
    error: error instanceof Error ? error.toString() : 'Unknown error'
  };
}

/**
 * Create error response for unknown operations
 */
export function createUnknownOperationMessage(id: string, operation: string) {
  return {
    type: 'OPERATION_RESPONSE',
    id: id || 'unknown',
    operation: operation || 'unknown', 
    success: false,
    error: `Unknown operation: ${operation || 'undefined'}`
  };
}