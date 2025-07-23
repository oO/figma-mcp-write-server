import { cleanEmptyPropertiesAsync } from './node-utils.js';

/**
 * Safely extract a property value from a node, avoiding Symbol serialization issues
 */
function safeGetProperty(node: any, propertyName: string): any {
  if (!(propertyName in node) || node[propertyName] === undefined) {
    return undefined;
  }
  const value = node[propertyName];
  // Skip symbols and other non-serializable values
  if (typeof value === 'symbol' || typeof value === 'function') {
    return undefined;
  }
  return value;
}

/**
 * Creates a standardized response for stroke operations
 * @param nodeId - The node ID
 * @param paintIndex - Optional paint index
 * @param updatedPaint - Optional updated paint object
 * @param totalPaints - Optional total paint count
 * @param strokeProperties - Optional stroke properties (weight, align, etc.)
 * @param additionalData - Optional additional response data
 * @returns Formatted response object
 */
export async function createStrokeOperationResponse(
  nodeId: string,
  paintIndex?: number,
  updatedPaint?: Paint,
  totalPaints?: number,
  strokeProperties?: Record<string, any>,
  additionalData?: Record<string, any>
): Promise<any> {
  const baseResponse = {
    nodeId,
    ...(paintIndex !== undefined && { paintIndex }),
    ...(updatedPaint && { updatedPaint }),
    ...(totalPaints !== undefined && { totalPaints }),
    ...(strokeProperties && { strokeProperties }),
    ...additionalData
  };
  
  return await cleanEmptyPropertiesAsync(baseResponse) || baseResponse;
}

/**
 * Creates a standardized response for list operations
 * @param nodeId - The node ID
 * @param strokes - Array of stroke paints
 * @param strokeProperties - Stroke properties (weight, align, etc.)
 * @param filteredCount - Optional count of filtered results
 * @param filterType - Optional filter type applied
 * @returns Formatted list response
 */
export async function createStrokeListResponse(
  nodeId: string,
  strokes: Paint[],
  strokeProperties: Record<string, any>,
  filteredCount?: number,
  filterType?: string
): Promise<any> {
  const response = {
    nodeId,
    stroke: strokeProperties,
    strokePaints: strokes,
    totalStrokePaints: strokes.length,
    ...(filteredCount !== undefined && { filteredCount }),
    ...(filterType && { filterType })
  };

  return await cleanEmptyPropertiesAsync(response) || response;
}

/**
 * Creates a standardized response for add operations
 * @param nodeId - The node ID
 * @param addedPaint - The added paint object
 * @param paintIndex - Index where paint was added
 * @param totalPaints - Total paint count after addition
 * @returns Formatted add response
 */
export async function createStrokeAddResponse(
  nodeId: string,
  addedPaint: Paint,
  paintIndex: number,
  totalPaints: number
): Promise<any> {
  return await createStrokeOperationResponse(
    nodeId,
    paintIndex,
    addedPaint,
    totalPaints,
    undefined,
    { operation: 'add' }
  );
}

/**
 * Creates a standardized response for update operations
 * @param nodeId - The node ID
 * @param updatedPaint - The updated paint object (if paint-level update)
 * @param paintIndex - Paint index (if paint-level update)
 * @param strokeProperties - Updated stroke properties (if stroke-level update)
 * @param totalPaints - Total paint count
 * @returns Formatted update response
 */
export async function createStrokeUpdateResponse(
  nodeId: string,
  updatedPaint?: Paint,
  paintIndex?: number,
  strokeProperties?: Record<string, any>,
  totalPaints?: number
): Promise<any> {
  return await createStrokeOperationResponse(
    nodeId,
    paintIndex,
    updatedPaint,
    totalPaints,
    strokeProperties,
    { operation: 'update' }
  );
}

/**
 * Creates a standardized response for delete operations
 * @param nodeId - The node ID
 * @param deletedPaintIndex - Index of deleted paint
 * @param totalPaints - Total paint count after deletion
 * @returns Formatted delete response
 */
export async function createStrokeDeleteResponse(
  nodeId: string,
  deletedPaintIndex: number,
  totalPaints: number
): Promise<any> {
  return await createStrokeOperationResponse(
    nodeId,
    undefined,
    undefined,
    totalPaints,
    undefined,
    { 
      operation: 'delete',
      deletedPaintIndex
    }
  );
}

/**
 * Extracts stroke properties from a node
 * @param node - The Figma node
 * @returns Object with stroke properties
 */
export function extractStrokeProperties(node: any): Record<string, any> {
  const strokeProperties: Record<string, any> = {};

  // Use safe property extraction to avoid Symbol serialization issues
  const strokeWeight = safeGetProperty(node, 'strokeWeight');
  if (strokeWeight !== undefined) strokeProperties.strokeWeight = strokeWeight;
  
  const strokeAlign = safeGetProperty(node, 'strokeAlign');
  if (strokeAlign !== undefined) strokeProperties.strokeAlign = strokeAlign;
  
  const strokeCap = safeGetProperty(node, 'strokeCap');
  if (strokeCap !== undefined) strokeProperties.strokeCap = strokeCap;
  
  // Handle line node caps (connector nodes have separate start/end caps)
  const startCap = safeGetProperty(node, 'connectorStartStrokeCap');
  if (startCap !== undefined) strokeProperties.startCap = startCap;
  
  const endCap = safeGetProperty(node, 'connectorEndStrokeCap');
  if (endCap !== undefined) strokeProperties.endCap = endCap;
  
  const strokeJoin = safeGetProperty(node, 'strokeJoin');
  if (strokeJoin !== undefined) strokeProperties.strokeJoin = strokeJoin;
  
  const strokeMiterLimit = safeGetProperty(node, 'strokeMiterLimit');
  if (strokeMiterLimit !== undefined) strokeProperties.strokeMiterLimit = strokeMiterLimit;
  
  const dashPattern = safeGetProperty(node, 'dashPattern');
  if (dashPattern !== undefined) strokeProperties.dashPattern = dashPattern;
  
  // Individual side stroke weights
  const strokeTopWeight = safeGetProperty(node, 'strokeTopWeight');
  if (strokeTopWeight !== undefined) strokeProperties.strokeTopWeight = strokeTopWeight;
  
  const strokeRightWeight = safeGetProperty(node, 'strokeRightWeight');
  if (strokeRightWeight !== undefined) strokeProperties.strokeRightWeight = strokeRightWeight;
  
  const strokeBottomWeight = safeGetProperty(node, 'strokeBottomWeight');
  if (strokeBottomWeight !== undefined) strokeProperties.strokeBottomWeight = strokeBottomWeight;
  
  const strokeLeftWeight = safeGetProperty(node, 'strokeLeftWeight');
  if (strokeLeftWeight !== undefined) strokeProperties.strokeLeftWeight = strokeLeftWeight;

  return strokeProperties;
}