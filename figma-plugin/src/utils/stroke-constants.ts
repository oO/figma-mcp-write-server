/**
 * Constants and error messages for stroke operations
 */

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