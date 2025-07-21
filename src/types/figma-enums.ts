import { z } from 'zod';
import { caseInsensitiveEnum } from './enum-utils.js';

// ================================================================================
// Figma Enum Constants - Centralized Definitions (Case-Insensitive)
// ================================================================================
// This file consolidates all Figma-specific enums with case-insensitive preprocessing
// to improve Agent Experience by accepting any case variation of enum values.

/**
 * Text alignment enums used across text, style, and layout operations
 * Case-insensitive: accepts 'left', 'LEFT', 'Left', etc.
 */
export const FigmaTextAlign = {
  horizontal: caseInsensitiveEnum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']),
  vertical: caseInsensitiveEnum(['TOP', 'CENTER', 'BOTTOM']),
} as const;

/**
 * Text styling enums for typography operations
 * Case-insensitive: accepts 'original', 'ORIGINAL', 'Original', etc.
 */
export const FigmaTextStyle = {
  case: caseInsensitiveEnum(['ORIGINAL', 'UPPER', 'LOWER', 'TITLE']),
  decoration: caseInsensitiveEnum(['NONE', 'UNDERLINE', 'STRIKETHROUGH']),
  fontWeight: caseInsensitiveEnum(['THIN', 'EXTRA_LIGHT', 'LIGHT', 'NORMAL', 'MEDIUM', 'SEMI_BOLD', 'BOLD', 'EXTRA_BOLD', 'BLACK']),
} as const;

/**
 * Export format options for asset export operations
 * Case-insensitive: accepts 'png', 'PNG', 'Png', etc.
 */
export const FigmaExportFormats = caseInsensitiveEnum(['PNG', 'JPG', 'SVG', 'PDF']);

/**
 * Scale modes for image and fill operations
 * Case-insensitive: accepts 'fill', 'FILL', 'Fill', etc.
 */
export const FigmaScaleModes = caseInsensitiveEnum(['FILL', 'FIT', 'CROP', 'TILE']);

/**
 * Layout and positioning enums
 * Case-insensitive: accepts 'horizontal', 'HORIZONTAL', 'Horizontal', etc.
 */
export const FigmaLayout = {
  direction: caseInsensitiveEnum(['HORIZONTAL', 'VERTICAL']),
  alignment: caseInsensitiveEnum(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']),
  distribution: caseInsensitiveEnum(['SPACE_BETWEEN', 'SPACE_AROUND', 'SPACE_EVENLY']),
  counterAxisAlignment: caseInsensitiveEnum(['MIN', 'CENTER', 'MAX']),
  wrap: caseInsensitiveEnum(['NO_WRAP', 'WRAP']),
} as const;

/**
 * Constraint types for responsive design
 * Case-insensitive: accepts 'min', 'MIN', 'Min', etc.
 */
export const FigmaConstraints = caseInsensitiveEnum(['MIN', 'CENTER', 'MAX', 'STRETCH', 'SCALE']);

/**
 * Node types supported by the system
 * Case-insensitive: accepts 'rectangle', 'RECTANGLE', 'Rectangle', etc.
 */
export const FigmaNodeTypes = caseInsensitiveEnum([
  'RECTANGLE', 'ELLIPSE', 'FRAME', 'GROUP', 'TEXT', 'VECTOR', 'STAR', 'POLYGON',
  'LINE', 'COMPONENT', 'INSTANCE', 'SECTION', 'SLICE'
]);

/**
 * Node types for creation operations
 * Case-insensitive: accepts 'rectangle', 'RECTANGLE', 'Rectangle', etc.
 * Note: Will normalize to lowercase for API compatibility
 */
export const FigmaCreateNodeTypes = caseInsensitiveEnum([
  'rectangle', 'ellipse', 'frame', 'star', 'polygon', 'line'
]);

/**
 * Paint and fill types
 * Case-insensitive: accepts 'solid', 'SOLID', 'Solid', etc.
 */
export const FigmaPaintTypes = caseInsensitiveEnum(['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND', 'IMAGE']);

/**
 * Effect types for styling
 * Case-insensitive: accepts 'drop_shadow', 'DROP_SHADOW', 'dropShadow', etc.
 */
export const FigmaEffectTypes = caseInsensitiveEnum(['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR', 'NOISE', 'TEXTURE']);

/**
 * Stroke cap types for line endings and arrows
 * Case-insensitive: accepts 'arrow_lines', 'ARROW_LINES', 'ArrowLines', etc.
 */
export const FigmaStrokeCapTypes = caseInsensitiveEnum([
  'NONE', 'ROUND', 'SQUARE', 'ARROW_LINES', 'ARROW_EQUILATERAL', 
  'DIAMOND_FILLED', 'TRIANGLE_FILLED', 'CIRCLE_FILLED'
]);

/**
 * Boolean operation types for vector operations
 * Case-insensitive: accepts 'union', 'UNION', 'Union', etc.
 */
export const FigmaBooleanOperations = caseInsensitiveEnum(['UNION', 'SUBTRACT', 'INTERSECT', 'EXCLUDE']);

/**
 * Standard CRUD operations used across most tools
 * Case-insensitive: accepts 'create', 'CREATE', 'Create', etc.
 */
export const StandardOperations = caseInsensitiveEnum(['create', 'update', 'delete', 'get', 'list']);

/**
 * Style types in Figma (internal uppercase)
 * Case-insensitive: accepts 'paint', 'PAINT', 'Paint', etc.
 */
export const FigmaStyleTypes = caseInsensitiveEnum(['PAINT', 'TEXT', 'EFFECT', 'GRID']);

/**
 * Style types for API compatibility (lowercase for backward compatibility)
 * Case-insensitive: accepts 'paint', 'PAINT', 'Paint', etc.
 * Note: Will normalize to lowercase for backward compatibility
 */
export const FigmaStyleTypesCompat = caseInsensitiveEnum(['paint', 'text', 'effect', 'grid']);

/**
 * Variable types for design tokens
 * Case-insensitive: accepts 'color', 'COLOR', 'Color', etc.
 */
export const FigmaVariableTypes = caseInsensitiveEnum(['COLOR', 'FLOAT', 'STRING', 'BOOLEAN']);

/**
 * Blend modes for visual effects
 * Case-insensitive: accepts 'normal', 'NORMAL', 'Normal', etc.
 */
export const FigmaBlendModes = caseInsensitiveEnum([
  'NORMAL', 'DARKEN', 'MULTIPLY', 'LINEAR_BURN', 'COLOR_BURN',
  'LIGHTEN', 'SCREEN', 'LINEAR_DODGE', 'COLOR_DODGE',
  'OVERLAY', 'SOFT_LIGHT', 'HARD_LIGHT', 'VIVID_LIGHT', 'LINEAR_LIGHT', 'PIN_LIGHT', 'HARD_MIX',
  'DIFFERENCE', 'EXCLUSION', 'SUBTRACT', 'DIVIDE',
  'HUE', 'SATURATION', 'COLOR', 'LUMINOSITY'
]);

/**
 * Component property types
 * Case-insensitive: accepts 'boolean', 'BOOLEAN', 'Boolean', etc.
 */
export const FigmaComponentPropertyTypes = caseInsensitiveEnum(['BOOLEAN', 'TEXT', 'INSTANCE_SWAP', 'VARIANT']);

/**
 * Export settings quality options
 * Case-insensitive: accepts 'low', 'LOW', 'Low', etc.
 */
export const FigmaExportQuality = caseInsensitiveEnum(['LOW', 'MEDIUM', 'HIGH']);

/**
 * Auto-layout sizing options
 * Case-insensitive: accepts 'fixed', 'FIXED', 'Fixed', etc.
 */
export const FigmaAutoLayoutSizing = caseInsensitiveEnum(['FIXED', 'HUG_CONTENTS', 'FILL_CONTAINER']);

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