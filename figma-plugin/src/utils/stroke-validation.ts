import { ERROR_MESSAGES } from './stroke-constants.js';

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