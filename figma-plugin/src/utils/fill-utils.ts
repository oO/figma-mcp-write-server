import { cleanEmptyPropertiesAsync } from './node-utils.js';

/**
 * Consolidated fill utilities - constants, validation, and response helpers
 */

// ===== CONSTANTS =====

export const FILL_DEFAULTS = {
  opacity: 1,
  visible: true,
  blendMode: 'NORMAL'
} as const;

export const ERROR_MESSAGES = {
  NODE_NOT_FOUND: (nodeId: string) => `Node not found: ${nodeId}`,
  NODE_NO_FILLS: (nodeId: string) => `Node ${nodeId} does not support fills`,
  NODE_MIXED_FILLS: (nodeId: string) => `Node ${nodeId} has mixed fills`,
  FILL_INDEX_OUT_OF_BOUNDS: (index: number, max: number) => 
    `Fill index ${index} out of bounds (0-${max})`,
  FILL_INDEX_REQUIRED: (nodeId: string, fillCount: number) =>
    `Node ${nodeId} has ${fillCount} fills. Please specify fillIndex (0-${fillCount - 1}) to update a specific fill.`,
  NO_FILLS_TO_UPDATE: (nodeId: string) => `Node ${nodeId} has no fills to update`,
  UNKNOWN_OPERATION: (operation: string) => `Unknown fill operation: ${operation}`,
  INVALID_FILL_TYPE: (index: number, actualType: string, expectedType: string) =>
    `Fill at index ${index} is not a ${expectedType} fill (type: ${actualType}). Use ${expectedType === 'solid' ? 'update_solid' : expectedType === 'gradient' ? 'update_gradient' : 'update_image'} for ${actualType} fill types.`,
  MISSING_IMAGE_SOURCE: () => 'Must provide imageUrl, imagePath, imageHash, or imageBytes',
  MISMATCHED_STOP_ARRAYS: () => 'stopPositions and stopColors arrays must have the same length'
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
  IMAGE: 'IMAGE'
} as const;

// ===== VALIDATION =====

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

// ===== RESPONSE HELPERS =====

/**
 * Creates a standardized response for fill operations
 * @param nodeId - The node ID
 * @param fillIndex - Optional fill index
 * @param updatedFill - Optional updated fill object
 * @param totalFills - Optional total fill count
 * @param additionalData - Optional additional response data
 * @returns Formatted response object
 */
export async function createFillOperationResponse(
  nodeId: string,
  fillIndex?: number,
  updatedFill?: Paint,
  totalFills?: number,
  additionalData?: Record<string, any>
): Promise<any> {
  const baseResponse = {
    nodeId,
    ...(fillIndex !== undefined && { fillIndex }),
    ...(updatedFill && { updatedFill }),
    ...(totalFills !== undefined && { totalFills }),
    ...additionalData
  };
  
  return await cleanEmptyPropertiesAsync(baseResponse) || baseResponse;
}

/**
 * Creates a standardized response for list operations
 * @param nodeId - The node ID
 * @param fills - Array of fills
 * @param filteredCount - Optional count of filtered results
 * @param filterType - Optional filter type applied
 * @returns Formatted list response
 */
export async function createFillListResponse(
  nodeId: string,
  fills: Paint[],
  filteredCount?: number,
  filterType?: string
): Promise<any> {
  const response = {
    nodeId,
    fills,
    totalFills: fills.length,
    ...(filteredCount !== undefined && { filteredCount }),
    ...(filterType && { filterType })
  };
  
  return await cleanEmptyPropertiesAsync(response) || response;
}

/**
 * Creates a standardized response for add operations
 * @param nodeId - The node ID
 * @param fillAdded - The added fill object
 * @param insertIndex - The index where fill was inserted
 * @param totalFills - Total fill count after addition
 * @returns Formatted add response
 */
export async function createFillAddResponse(
  nodeId: string,
  fillAdded: Paint,
  insertIndex: number,
  totalFills: number
): Promise<any> {
  const response = {
    nodeId,
    fillAdded,
    insertIndex,
    totalFills
  };
  
  return await cleanEmptyPropertiesAsync(response) || response;
}

/**
 * Creates a standardized response for update operations
 * @param nodeId - The node ID
 * @param fillIndex - The updated fill index
 * @param updatedFill - The updated fill object
 * @param totalFills - Total fill count
 * @returns Formatted update response
 */
export async function createFillUpdateResponse(
  nodeId: string,
  fillIndex: number,
  updatedFill: Paint,
  totalFills: number
): Promise<any> {
  return createFillOperationResponse(nodeId, fillIndex, updatedFill, totalFills);
}

/**
 * Creates a standardized response for delete operations
 * @param nodeId - The node ID
 * @param fillIndex - The deleted fill index
 * @param totalFills - Total fill count after deletion
 * @returns Formatted delete response
 */
export async function createFillDeleteResponse(
  nodeId: string,
  fillIndex: number,
  totalFills: number
): Promise<any> {
  const response = {
    nodeId,
    fillIndex,
    deletedFill: true,
    totalFills
  };
  
  return await cleanEmptyPropertiesAsync(response) || response;
}