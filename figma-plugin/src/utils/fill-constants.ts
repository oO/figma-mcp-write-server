/**
 * Constants and error messages for fill operations
 */

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