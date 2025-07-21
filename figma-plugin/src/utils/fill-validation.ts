import { ERROR_MESSAGES } from './fill-constants.js';

/**
 * Validates that a node exists and supports fills
 * @param nodeId - The node ID to validate
 * @returns Object containing the validated node and its fills array
 * @throws Error if node doesn't exist or doesn't support fills
 */
export function validateNodeForFills(nodeId: string): { node: SceneNode; fills: Paint[] } {
  const node = figma.getNodeById(nodeId);
  if (!node) {
    throw new Error(ERROR_MESSAGES.NODE_NOT_FOUND(nodeId));
  }
  
  if (!('fills' in node)) {
    throw new Error(ERROR_MESSAGES.NODE_NO_FILLS(nodeId));
  }
  
  const fills = (node as any).fills;
  if (!Array.isArray(fills)) {
    throw new Error(ERROR_MESSAGES.NODE_MIXED_FILLS(nodeId));
  }
  
  return { node, fills };
}

/**
 * Resolves the fill index for operations, with automatic defaults for single-fill nodes
 * @param params - Parameters containing optional fillIndex and nodeId for error messages
 * @param fills - The fills array to validate against
 * @returns The resolved fill index
 * @throws Error if index is invalid or missing when required
 */
export function resolveFillIndex(
  params: { fillIndex?: number; nodeId: string }, 
  fills: Paint[]
): number {
  let fillIndex: number;
  
  if (params.fillIndex !== undefined && params.fillIndex !== null) {
    fillIndex = params.fillIndex;
  } else {
    if (fills.length === 0) {
      throw new Error(ERROR_MESSAGES.NO_FILLS_TO_UPDATE(params.nodeId));
    } else if (fills.length === 1) {
      fillIndex = 0; // Default to first fill for single-fill nodes
    } else {
      throw new Error(ERROR_MESSAGES.FILL_INDEX_REQUIRED(params.nodeId, fills.length));
    }
  }
  
  if (fillIndex < 0 || fillIndex >= fills.length) {
    throw new Error(ERROR_MESSAGES.FILL_INDEX_OUT_OF_BOUNDS(fillIndex, fills.length - 1));
  }
  
  return fillIndex;
}

/**
 * Validates that a fill at the given index is of the expected type
 * @param fills - The fills array
 * @param fillIndex - The index to check
 * @param expectedType - The expected paint type
 * @throws Error if fill type doesn't match
 */
export function validateFillType(fills: Paint[], fillIndex: number, expectedType: string): void {
  const currentFill = fills[fillIndex];
  if (currentFill.type !== expectedType.toUpperCase()) {
    throw new Error(ERROR_MESSAGES.INVALID_FILL_TYPE(
      fillIndex, 
      currentFill.type, 
      expectedType.toLowerCase()
    ));
  }
}

/**
 * Validates that required image source parameters are provided
 * @param params - Parameters to validate
 * @throws Error if no image source is provided
 */
export function validateImageSource(params: {
  imageUrl?: string;
  imagePath?: string; 
  imageHash?: string;
  imageBytes?: string;
}): void {
  if (!params.imageUrl && !params.imagePath && !params.imageHash && !params.imageBytes) {
    throw new Error(ERROR_MESSAGES.MISSING_IMAGE_SOURCE());
  }
}

/**
 * Validates that gradient stop arrays have matching lengths
 * @param stopPositions - Array of stop positions
 * @param stopColors - Array of stop colors
 * @throws Error if arrays have different lengths
 */
export function validateGradientStops(stopPositions?: number[], stopColors?: string[]): void {
  if (stopPositions && stopColors && stopPositions.length !== stopColors.length) {
    throw new Error(ERROR_MESSAGES.MISMATCHED_STOP_ARRAYS());
  }
}