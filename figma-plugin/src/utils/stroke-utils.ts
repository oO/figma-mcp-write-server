import { cleanEmptyPropertiesAsync } from './node-utils.js';

/**
 * Consolidated stroke utilities - constants, validation, and response helpers
 */

// ===== CONSTANTS =====

export const STROKE_DEFAULTS = {
  opacity: 1,
  visible: true,
  blendMode: 'NORMAL',
  strokeWeight: 0,
  strokeAlign: 'CENTER'
} as const;

export const ERROR_MESSAGES = {
  NODE_NOT_FOUND: (nodeId: string) => `Node not found: ${nodeId}`,
  NODE_NO_STROKES: (nodeId: string) => `Node ${nodeId} does not support strokes`,
  NODE_MIXED_STROKES: (nodeId: string) => `Node ${nodeId} has mixed strokes`,
  PAINT_INDEX_OUT_OF_BOUNDS: (nodeId: string, index: number, max: number) => 
    `Paint index ${index} out of bounds for node ${nodeId} (valid range: 0-${max - 1})`,
  PAINT_INDEX_REQUIRED: (nodeId: string, paintCount: number) =>
    `Node ${nodeId} has ${paintCount} stroke paints. Please specify paintIndex (0-${paintCount - 1}) to update a specific paint.`,
  NO_STROKES_TO_UPDATE: (nodeId: string) => `Node ${nodeId} has no stroke paints to update`,
  UNKNOWN_OPERATION: (operation: string) => `Unknown stroke operation: ${operation}`,
  INVALID_PAINT_TYPE: (index: number, actualType: string, expectedType: string) =>
    `Paint at index ${index} is not a ${expectedType} paint (type: ${actualType}). Use ${expectedType === 'solid' ? 'update_solid' : expectedType === 'gradient' ? 'update_gradient' : 'update_image'} for ${actualType} paint types.`,
  MISSING_IMAGE_SOURCE: () => 'Must provide imageUrl, imagePath, imageHash, or imageBytes',
  MISMATCHED_STOP_ARRAYS: () => 'stopPositions and stopColors arrays must have the same length',
  INVALID_STROKE_WEIGHT: (weight: number) => `Stroke weight must be non-negative, got ${weight}`,
  INVALID_STROKE_ALIGN: (align: string) => `Invalid stroke alignment '${align}'. Valid values: INSIDE, OUTSIDE, CENTER`,
  INVALID_STROKE_CAP: (cap: string) => `Invalid stroke cap '${cap}'. Valid values: NONE, ROUND, SQUARE, ARROW_LINES, ARROW_EQUILATERAL`,
  INVALID_STROKE_JOIN: (join: string) => `Invalid stroke join '${join}'. Valid values: MITER, BEVEL, ROUND`,
  INVALID_STROKE_MITER_LIMIT: (limit: number) => `Stroke miter limit must be at least 1, got ${limit}`,
  STROKE_PAINT_REQUIRED: (nodeId: string) => `Node ${nodeId} requires at least one stroke paint to be visible`
} as const;

export const SCALE_MODES = {
  FILL: 'FILL',
  FIT: 'FIT', 
  CROP: 'CROP',
  TILE: 'TILE'
} as const;

export const PAINT_TYPES = {
  SOLID: 'SOLID',
  GRADIENT_LINEAR: 'GRADIENT_LINEAR',
  GRADIENT_RADIAL: 'GRADIENT_RADIAL',
  GRADIENT_ANGULAR: 'GRADIENT_ANGULAR',
  GRADIENT_DIAMOND: 'GRADIENT_DIAMOND',
  IMAGE: 'IMAGE',
  PATTERN: 'PATTERN'
} as const;

export const STROKE_ALIGN = {
  INSIDE: 'INSIDE',
  OUTSIDE: 'OUTSIDE',
  CENTER: 'CENTER'
} as const;

export const STROKE_CAP = {
  NONE: 'NONE',
  ROUND: 'ROUND',
  SQUARE: 'SQUARE',
  ARROW_LINES: 'ARROW_LINES',
  ARROW_EQUILATERAL: 'ARROW_EQUILATERAL'
} as const;

export const STROKE_JOIN = {
  MITER: 'MITER',
  BEVEL: 'BEVEL',
  ROUND: 'ROUND'
} as const;

// ===== VALIDATION =====

/**
 * Validates that a node exists and supports strokes
 * @param nodeId - The node ID to validate
 * @returns Object containing the validated node and its strokes array
 * @throws Error if node doesn't exist or doesn't support strokes
 */
export function validateNodeForStrokes(nodeId: string): { node: SceneNode; strokes: Paint[] } {
  const node = figma.getNodeById(nodeId);
  if (!node) {
    throw new Error(ERROR_MESSAGES.NODE_NOT_FOUND(nodeId));
  }
  
  if (!('strokes' in node)) {
    throw new Error(ERROR_MESSAGES.NODE_NO_STROKES(nodeId));
  }
  
  const strokes = (node as any).strokes;
  if (!Array.isArray(strokes)) {
    throw new Error(ERROR_MESSAGES.NODE_MIXED_STROKES(nodeId));
  }
  
  return { node, strokes };
}

/**
 * Resolves the paint index for operations, with automatic defaults for single-paint nodes
 * @param params - Parameters containing optional paintIndex and nodeId for error messages
 * @param strokes - The strokes array to validate against
 * @returns The resolved paint index
 * @throws Error if index is invalid or missing when required
 */
export function resolvePaintIndex(
  params: { paintIndex?: number; nodeId: string }, 
  strokes: Paint[]
): number {
  let paintIndex: number;
  
  if (params.paintIndex !== undefined && params.paintIndex !== null) {
    paintIndex = params.paintIndex;
  } else {
    if (strokes.length === 0) {
      throw new Error(ERROR_MESSAGES.NO_STROKES_TO_UPDATE(params.nodeId));
    } else if (strokes.length === 1) {
      paintIndex = 0; // Default to first paint for single-paint nodes
    } else {
      throw new Error(ERROR_MESSAGES.PAINT_INDEX_REQUIRED(params.nodeId, strokes.length));
    }
  }

  // Validate index bounds
  if (paintIndex < 0 || paintIndex >= strokes.length) {
    throw new Error(ERROR_MESSAGES.PAINT_INDEX_OUT_OF_BOUNDS(params.nodeId, paintIndex, strokes.length));
  }

  return paintIndex;
}

/**
 * Validates that stroke paints match the expected type
 * @param strokes - The strokes array to validate
 * @param paintIndex - Index of the paint to check
 * @param expectedType - Expected paint type (e.g., 'SOLID', 'GRADIENT_LINEAR')
 * @throws Error if paint type doesn't match
 */
export function validatePaintType(strokes: Paint[], paintIndex: number, expectedType: string): void {
  const paint = strokes[paintIndex];
  if (!paint) {
    throw new Error(`Paint at index ${paintIndex} does not exist`);
  }
  
  if (paint.type !== expectedType) {
    throw new Error(`Expected paint type '${expectedType}' but found '${paint.type}' at index ${paintIndex}`);
  }
}

/**
 * Validates image source parameters for image stroke operations
 * @param params - Parameters that may contain image sources
 * @throws Error if no valid image source is provided or multiple sources are provided
 */
export function validateImageSource(params: {
  imageUrl?: string | string[];
  imagePath?: string | string[];
  imageBytes?: string | string[];
  imageHash?: string | string[];
}): void {
  const sources = [
    params.imageUrl ? 'imageUrl' : null,
    params.imagePath ? 'imagePath' : null,
    params.imageBytes ? 'imageBytes' : null,
    params.imageHash ? 'imageHash' : null
  ].filter(Boolean);

  if (sources.length === 0) {
    throw new Error('At least one image source is required: imageUrl, imagePath, imageBytes, or imageHash');
  }

  if (sources.length > 1) {
    throw new Error(`Only one image source should be provided, but found: ${sources.join(', ')}`);
  }
}

/**
 * Validates gradient stops configuration
 * @param stopPositions - Array of stop positions (0-1)
 * @param stopColors - Array of stop colors
 * @throws Error if stop arrays are invalid or mismatched
 */
export function validateGradientStops(stopPositions?: number[], stopColors?: string[]): void {
  if (stopPositions && stopColors) {
    if (stopPositions.length !== stopColors.length) {
      throw new Error(`Stop positions (${stopPositions.length}) and colors (${stopColors.length}) arrays must have the same length`);
    }
  }

  if (stopPositions) {
    if (stopPositions.length < 2) {
      throw new Error('At least 2 gradient stops are required');
    }
    
    // Validate positions are in range 0-1
    for (let i = 0; i < stopPositions.length; i++) {
      if (stopPositions[i] < 0 || stopPositions[i] > 1) {
        throw new Error(`Gradient stop position at index ${i} must be between 0 and 1, got ${stopPositions[i]}`);
      }
    }
    
    // Validate positions are sorted
    for (let i = 1; i < stopPositions.length; i++) {
      if (stopPositions[i] < stopPositions[i - 1]) {
        throw new Error('Gradient stop positions must be in ascending order');
      }
    }
  }

  if (stopColors && stopColors.length < 2) {
    throw new Error('At least 2 gradient stop colors are required');
  }
}

/**
 * Validates stroke weight value
 * @param strokeWeight - Stroke weight value to validate
 * @throws Error if stroke weight is invalid
 */
export function validateStrokeWeight(strokeWeight: number): void {
  if (strokeWeight < 0) {
    throw new Error(`Stroke weight must be non-negative, got ${strokeWeight}`);
  }
}

/**
 * Validates stroke alignment value
 * @param strokeAlign - Stroke alignment value to validate
 * @throws Error if stroke alignment is invalid
 */
export function validateStrokeAlign(strokeAlign: string): void {
  const validValues = ['INSIDE', 'OUTSIDE', 'CENTER'];
  if (!validValues.includes(strokeAlign.toUpperCase())) {
    throw new Error(`Invalid stroke alignment '${strokeAlign}'. Valid values: ${validValues.join(', ')}`);
  }
}

/**
 * Validates stroke cap value
 * @param strokeCap - Stroke cap value to validate
 * @throws Error if stroke cap is invalid
 */
export function validateStrokeCap(strokeCap: string): void {
  const validValues = ['NONE', 'ROUND', 'SQUARE', 'ARROW_LINES', 'ARROW_EQUILATERAL'];
  if (!validValues.includes(strokeCap.toUpperCase())) {
    throw new Error(`Invalid stroke cap '${strokeCap}'. Valid values: ${validValues.join(', ')}`);
  }
}

/**
 * Validates stroke join value
 * @param strokeJoin - Stroke join value to validate
 * @throws Error if stroke join is invalid
 */
export function validateStrokeJoin(strokeJoin: string): void {
  const validValues = ['MITER', 'BEVEL', 'ROUND'];
  if (!validValues.includes(strokeJoin.toUpperCase())) {
    throw new Error(`Invalid stroke join '${strokeJoin}'. Valid values: ${validValues.join(', ')}`);
  }
}

/**
 * Validates stroke miter limit value
 * @param strokeMiterLimit - Stroke miter limit value to validate
 * @throws Error if stroke miter limit is invalid
 */
export function validateStrokeMiterLimit(strokeMiterLimit: number): void {
  if (strokeMiterLimit < 1) {
    throw new Error(`Stroke miter limit must be at least 1, got ${strokeMiterLimit}`);
  }
}

// ===== RESPONSE HELPERS =====

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