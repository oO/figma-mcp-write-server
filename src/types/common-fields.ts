import { z } from 'zod';
import { FigmaTextAlign, FigmaTextStyle, FigmaConstraints, FigmaAutoLayoutSizing } from './figma-enums.js';

// ================================================================================
// Common Field Definitions - Reusable Schema Components
// ================================================================================
// This file consolidates commonly used field patterns to eliminate redundancy
// across operation files and provide consistent validation.

/**
 * Core identification fields used across multiple operations
 */
export const IdentificationFields = {
  nodeId: z.string(), // Required for operations that need existing node
  nodeIds: z.array(z.string()).optional(), // For bulk operations
  styleId: z.string().optional(),
  componentId: z.string().optional(),
  instanceId: z.string().optional(),
  variableId: z.string().optional(),
  collectionId: z.string().optional(),
} as const;

/**
 * Optional identification fields for operations that may need node references
 */
export const OptionalIdentificationFields = {
  nodeId: z.string().optional(),
  nodeIds: z.array(z.string()).optional(),
  styleId: z.string().optional(),
  componentId: z.string().optional(),
  instanceId: z.string().optional(),
  variableId: z.string().optional(),
  collectionId: z.string().optional(),
} as const;

/**
 * Position and coordinate fields
 */
export const PositionFields = {
  x: z.number().optional(),
  y: z.number().optional(),
  offsetX: z.number().default(10),
  offsetY: z.number().default(10),
} as const;

/**
 * Size and dimension fields
 */
export const DimensionFields = {
  width: z.number().optional(),
  height: z.number().optional(),
  minWidth: z.number().optional(),
  maxWidth: z.number().optional(),
  minHeight: z.number().optional(),
  maxHeight: z.number().optional(),
} as const;

/**
 * Visual appearance fields with consistent validation
 */
export const VisualFields = {
  opacity: z.number().min(0).max(1).optional(),
  rotation: z.number().optional(),
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  cornerRadius: z.number().min(0).optional(),
} as const;

/**
 * Color fields with hex validation (supports 6-digit #RRGGBB and 8-digit #RRGGBBAA)
 */
export const ColorFields = {
  fillColor: z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/).optional(),
  fillOpacity: z.number().min(0).max(1).optional(),
  strokeColor: z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/).optional(),
  strokeOpacity: z.number().min(0).max(1).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/).optional(),
} as const;

/**
 * Typography fields for text operations
 */
export const TypographyFields = {
  fontFamily: z.string().optional(),
  fontSize: z.number().min(1).max(1000).optional(),
  fontStyle: z.string().optional(),
  fontWeight: FigmaTextStyle.fontWeight.optional(),
  textCase: FigmaTextStyle.case.optional(),
  textDecoration: FigmaTextStyle.decoration.optional(),
  textAlignHorizontal: FigmaTextAlign.horizontal.optional(),
  textAlignVertical: FigmaTextAlign.vertical.optional(),
  lineHeight: z.number().positive().optional(),
  letterSpacing: z.number().optional(),
  paragraphSpacing: z.number().min(0).optional(),
} as const;

/**
 * Stroke and border fields
 */
export const StrokeFields = {
  strokeWeight: z.number().min(0).optional(),
  strokeAlign: z.enum(['INSIDE', 'OUTSIDE', 'CENTER']).optional(),
  strokeCap: z.enum(['NONE', 'ROUND', 'SQUARE', 'ARROW_LINES', 'ARROW_EQUILATERAL']).optional(),
  strokeJoin: z.enum(['MITER', 'BEVEL', 'ROUND']).optional(),
  strokeMiterLimit: z.number().min(1).optional(),
  dashPattern: z.array(z.number()).optional(),
} as const;

/**
 * Layout constraint fields
 */
export const ConstraintFields = {
  horizontalConstraint: FigmaConstraints.optional(),
  verticalConstraint: FigmaConstraints.optional(),
} as const;

/**
 * Auto-layout fields
 */
export const AutoLayoutFields = {
  layoutMode: z.enum(['HORIZONTAL', 'VERTICAL', 'NONE']).optional(),
  primaryAxisSizingMode: FigmaAutoLayoutSizing.optional(),
  counterAxisSizingMode: FigmaAutoLayoutSizing.optional(),
  primaryAxisAlignItems: z.enum(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']).optional(),
  counterAxisAlignItems: z.enum(['MIN', 'CENTER', 'MAX']).optional(),
  paddingLeft: z.number().min(0).optional(),
  paddingRight: z.number().min(0).optional(),
  paddingTop: z.number().min(0).optional(),
  paddingBottom: z.number().min(0).optional(),
  itemSpacing: z.number().min(0).optional(),
  layoutWrap: z.enum(['NO_WRAP', 'WRAP']).optional(),
} as const;

/**
 * Export settings fields
 */
export const ExportFields = {
  format: z.enum(['PNG', 'JPG', 'SVG', 'PDF']).optional(),
  scale: z.number().min(0.01).max(4).optional(),
  quality: z.number().min(0).max(100).optional(),
  useAbsoluteBounds: z.boolean().optional(),
} as const;

/**
 * Naming and description fields
 */
export const MetadataFields = {
  name: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
} as const;

// ================================================================================
// Composite Field Groups - Common Combinations
// ================================================================================

/**
 * Basic node properties for creation - no ID fields needed
 */
export const BasicCreateFields = {
  ...PositionFields,
  ...DimensionFields,
  ...VisualFields,
  ...MetadataFields,
} as const;

/**
 * Basic node properties for updates - requires nodeId
 */
export const BasicUpdateFields = {
  ...IdentificationFields, // nodeId is required
  ...PositionFields,
  ...DimensionFields,
  ...VisualFields,
  ...MetadataFields,
} as const;

/**
 * Basic node properties with optional IDs - for mixed operations
 */
export const BasicNodeFields = {
  ...OptionalIdentificationFields,
  ...PositionFields,
  ...DimensionFields,
  ...VisualFields,
  ...MetadataFields,
} as const;

/**
 * Shape node properties - for geometric shapes
 */
export const ShapeNodeFields = {
  ...BasicNodeFields,
  ...ColorFields,
  ...StrokeFields,
} as const;

/**
 * Text node properties - for text elements
 */
export const TextNodeFields = {
  ...BasicNodeFields,
  ...TypographyFields,
  content: z.string().optional(),
  textStyleId: z.string().optional(),
} as const;

/**
 * Layout container properties - for frames and groups
 */
export const ContainerNodeFields = {
  ...BasicNodeFields,
  ...AutoLayoutFields,
  ...ConstraintFields,
  clipsContent: z.boolean().optional(),
} as const;

// ================================================================================
// Mixin Helper Functions - Schema Composition Utilities
// ================================================================================

/**
 * Add position fields to any schema
 */
export const withPosition = <T extends z.ZodRawShape>(schema: T) =>
  z.object({ ...schema, ...PositionFields });

/**
 * Add dimension fields to any schema
 */
export const withDimensions = <T extends z.ZodRawShape>(schema: T) =>
  z.object({ ...schema, ...DimensionFields });

/**
 * Add visual appearance fields to any schema
 */
export const withVisuals = <T extends z.ZodRawShape>(schema: T) =>
  z.object({ ...schema, ...VisualFields });

/**
 * Add typography fields to any schema
 */
export const withTypography = <T extends z.ZodRawShape>(schema: T) =>
  z.object({ ...schema, ...TypographyFields });

/**
 * Add identification fields to any schema
 */
export const withIdentification = <T extends z.ZodRawShape>(schema: T) =>
  z.object({ ...schema, ...IdentificationFields });

/**
 * Add auto-layout fields to any schema
 */
export const withAutoLayout = <T extends z.ZodRawShape>(schema: T) =>
  z.object({ ...schema, ...AutoLayoutFields });

/**
 * Add stroke properties to any schema
 */
export const withStrokes = <T extends z.ZodRawShape>(schema: T) =>
  z.object({ ...schema, ...StrokeFields });

/**
 * Add constraint fields to any schema
 */
export const withConstraints = <T extends z.ZodRawShape>(schema: T) =>
  z.object({ ...schema, ...ConstraintFields });

/**
 * Add export settings to any schema
 */
export const withExportSettings = <T extends z.ZodRawShape>(schema: T) =>
  z.object({ ...schema, ...ExportFields });

/**
 * Create a complete node schema with all common fields
 */
export const createNodeSchema = <T extends z.ZodRawShape>(additionalFields: T = {} as T) =>
  z.object({
    ...BasicNodeFields,
    ...additionalFields,
  });

/**
 * Create a bulk operation schema with nodeIds array
 */
export const createBulkSchema = <T extends z.ZodRawShape>(fields: T) =>
  z.object({
    nodeIds: z.array(z.string()).min(1),
    ...fields,
  });

// ================================================================================
// Bulk Operations Support - Field Definitions with Array Support
// ================================================================================

/**
 * Creates bulk-enabled field definitions that support both single values and arrays
 */
const createBulkField = <T extends z.ZodType>(schema: T) => 
  z.union([schema, z.array(schema)]);

/**
 * Creates bulk-enabled optional field definitions
 */
const createOptionalBulkField = <T extends z.ZodType>(schema: T) =>
  z.union([schema, z.array(schema)]).optional();

/**
 * Bulk-enabled identification fields
 */
export const BulkIdentificationFields = {
  nodeId: createOptionalBulkField(z.string()),
  nodeIds: z.array(z.string()).optional(),
  styleId: createOptionalBulkField(z.string()),
  componentId: createOptionalBulkField(z.string()),
  instanceId: createOptionalBulkField(z.string()),
  variableId: createOptionalBulkField(z.string()),
  collectionId: createOptionalBulkField(z.string()),
} as const;

/**
 * Bulk-enabled position fields
 */
export const BulkPositionFields = {
  x: createOptionalBulkField(z.number()),
  y: createOptionalBulkField(z.number()),
  offsetX: createOptionalBulkField(z.number()),
  offsetY: createOptionalBulkField(z.number()),
} as const;

/**
 * Bulk-enabled dimension fields
 */
export const BulkDimensionFields = {
  width: createOptionalBulkField(z.number()),
  height: createOptionalBulkField(z.number()),
  minWidth: createOptionalBulkField(z.number()),
  maxWidth: createOptionalBulkField(z.number()),
  minHeight: createOptionalBulkField(z.number()),
  maxHeight: createOptionalBulkField(z.number()),
} as const;

/**
 * Bulk-enabled visual fields
 */
export const BulkVisualFields = {
  opacity: createOptionalBulkField(z.number().min(0).max(1)),
  rotation: createOptionalBulkField(z.number()),
  visible: createOptionalBulkField(z.boolean()),
  locked: createOptionalBulkField(z.boolean()),
  cornerRadius: createOptionalBulkField(z.number().min(0)),
} as const;

/**
 * Bulk-enabled color fields (supports 6-digit #RRGGBB and 8-digit #RRGGBBAA)
 */
export const BulkColorFields = {
  fillColor: createOptionalBulkField(z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/)),
  fillOpacity: createOptionalBulkField(z.number().min(0).max(1)),
  strokeColor: createOptionalBulkField(z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/)),
  strokeOpacity: createOptionalBulkField(z.number().min(0).max(1)),
  strokeWeight: createOptionalBulkField(z.number().min(0)),
  strokeAlign: createOptionalBulkField(z.enum(['INSIDE', 'OUTSIDE', 'CENTER'])),
  backgroundColor: createOptionalBulkField(z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/)),
} as const;

/**
 * Bulk-enabled metadata fields
 */
export const BulkMetadataFields = {
  name: createOptionalBulkField(z.string()),
  description: createOptionalBulkField(z.string()),
  tags: createOptionalBulkField(z.array(z.string())),
} as const;

/**
 * Bulk operation control fields
 */
export const BulkControlFields = {
  failFast: z.boolean().optional(), // Stop on first error in bulk operations
  count: z.number().min(1).optional(), // Number of items to create (alternative to arrays)
} as const;

// Note: Individual field groups are already exported above with their definitions
// Bulk field groups provide array support for bulk operations