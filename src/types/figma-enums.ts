import { z } from 'zod';

// ================================================================================
// Figma Enum Constants - Centralized Definitions
// ================================================================================
// This file consolidates all Figma-specific enums to eliminate redundancy
// across operation files and ensure consistency.

/**
 * Text alignment enums used across text, style, and layout operations
 */
export const FigmaTextAlign = {
  horizontal: z.enum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']),
  vertical: z.enum(['TOP', 'CENTER', 'BOTTOM']),
} as const;

/**
 * Text styling enums for typography operations
 */
export const FigmaTextStyle = {
  case: z.enum(['ORIGINAL', 'UPPER', 'LOWER', 'TITLE']),
  decoration: z.enum(['NONE', 'UNDERLINE', 'STRIKETHROUGH']),
  fontWeight: z.enum(['THIN', 'EXTRA_LIGHT', 'LIGHT', 'NORMAL', 'MEDIUM', 'SEMI_BOLD', 'BOLD', 'EXTRA_BOLD', 'BLACK']),
} as const;

/**
 * Export format options for asset export operations
 */
export const FigmaExportFormats = z.enum(['PNG', 'JPG', 'SVG', 'PDF']);

/**
 * Scale modes for image and fill operations
 */
export const FigmaScaleModes = z.enum(['FILL', 'FIT', 'CROP', 'TILE']);

/**
 * Layout and positioning enums
 */
export const FigmaLayout = {
  direction: z.enum(['HORIZONTAL', 'VERTICAL']),
  alignment: z.enum(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']),
  distribution: z.enum(['SPACE_BETWEEN', 'SPACE_AROUND', 'SPACE_EVENLY']),
  counterAxisAlignment: z.enum(['MIN', 'CENTER', 'MAX']),
  wrap: z.enum(['NO_WRAP', 'WRAP']),
} as const;

/**
 * Constraint types for responsive design
 */
export const FigmaConstraints = z.enum(['MIN', 'CENTER', 'MAX', 'STRETCH', 'SCALE']);

/**
 * Node types supported by the system
 * Note: These match Figma's actual node type constants (uppercase)
 */
export const FigmaNodeTypes = z.enum([
  'RECTANGLE', 'ELLIPSE', 'FRAME', 'GROUP', 'TEXT', 'VECTOR', 'STAR', 'POLYGON',
  'LINE', 'COMPONENT', 'INSTANCE', 'SECTION', 'SLICE'
]);

/**
 * Node types for creation operations (lowercase for API compatibility)
 */
export const FigmaCreateNodeTypes = z.enum([
  'rectangle', 'ellipse', 'frame', 'text', 'star', 'polygon'
]);

/**
 * Paint and fill types
 */
export const FigmaPaintTypes = z.enum(['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND', 'IMAGE']);

/**
 * Effect types for styling
 */
export const FigmaEffectTypes = z.enum(['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR']);

/**
 * Boolean operation types for vector operations
 */
export const FigmaBooleanOperations = z.enum(['UNION', 'SUBTRACT', 'INTERSECT', 'EXCLUDE']);

/**
 * Standard CRUD operations used across most tools
 */
export const StandardOperations = z.enum(['create', 'update', 'delete', 'get', 'list']);

/**
 * Style types in Figma
 */
export const FigmaStyleTypes = z.enum(['PAINT', 'TEXT', 'EFFECT', 'GRID']);

/**
 * Variable types for design tokens
 */
export const FigmaVariableTypes = z.enum(['COLOR', 'FLOAT', 'STRING', 'BOOLEAN']);

/**
 * Blend modes for visual effects
 */
export const FigmaBlendModes = z.enum([
  'NORMAL', 'DARKEN', 'MULTIPLY', 'LINEAR_BURN', 'COLOR_BURN',
  'LIGHTEN', 'SCREEN', 'LINEAR_DODGE', 'COLOR_DODGE',
  'OVERLAY', 'SOFT_LIGHT', 'HARD_LIGHT', 'VIVID_LIGHT', 'LINEAR_LIGHT', 'PIN_LIGHT', 'HARD_MIX',
  'DIFFERENCE', 'EXCLUSION', 'SUBTRACT', 'DIVIDE',
  'HUE', 'SATURATION', 'COLOR', 'LUMINOSITY'
]);

/**
 * Component property types
 */
export const FigmaComponentPropertyTypes = z.enum(['BOOLEAN', 'TEXT', 'INSTANCE_SWAP', 'VARIANT']);

/**
 * Export settings quality options
 */
export const FigmaExportQuality = z.enum(['LOW', 'MEDIUM', 'HIGH']);

/**
 * Auto-layout sizing options
 */
export const FigmaAutoLayoutSizing = z.enum(['FIXED', 'HUG_CONTENTS', 'FILL_CONTAINER']);

// Re-export commonly used enum values for convenience
export type FigmaTextAlignHorizontal = z.infer<typeof FigmaTextAlign.horizontal>;
export type FigmaTextAlignVertical = z.infer<typeof FigmaTextAlign.vertical>;
export type FigmaTextCase = z.infer<typeof FigmaTextStyle.case>;
export type FigmaTextDecoration = z.infer<typeof FigmaTextStyle.decoration>;
export type FigmaExportFormat = z.infer<typeof FigmaExportFormats>;
export type FigmaScaleMode = z.infer<typeof FigmaScaleModes>;
export type FigmaNodeType = z.infer<typeof FigmaNodeTypes>;
export type FigmaPaintType = z.infer<typeof FigmaPaintTypes>;
export type FigmaEffectType = z.infer<typeof FigmaEffectTypes>;
export type FigmaBooleanOperation = z.infer<typeof FigmaBooleanOperations>;
export type FigmaStyleType = z.infer<typeof FigmaStyleTypes>;
export type FigmaVariableType = z.infer<typeof FigmaVariableTypes>;
export type FigmaBlendMode = z.infer<typeof FigmaBlendModes>;