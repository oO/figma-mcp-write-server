import { z } from 'zod';
import { caseInsensitiveEnum } from './enum-utils.js';
import { PaintSchema } from './figma-base.js';
// Import common schemas from fills to avoid duplication
import {
  HexColorSchema,
  OpacitySchema,
  CoordinateSchema,
  BulkFailFastSchema,
  PaintTypeFilterSchema,
  GradientTypeSchema,
  ImageScaleModeSchema,
  OverwriteModeSchema,
  PatternTileTypeSchema,
  PatternAlignmentSchema,
  GradientHandleSchema,
  ImageTransformSchema,
  ImageFilterSchema,
  StopPositionsSchema,
  StopColorsSchema,
  InsertIndexSchema,
  NewIndexSchema
} from './fill-operations.js';

// Import BlendModeSchema from effect-operations to avoid conflict
import { BlendModeSchema } from './effect-operations.js';

// Stroke-specific schemas that don't conflict with existing exports
export const StrokeOperationSchema = caseInsensitiveEnum([
  'get', 'add_solid', 'add_gradient', 'add_image', 'add_pattern',
  'update', 'update_solid', 'update_gradient', 'update_image', 'update_pattern',
  'delete', 'reorder', 'clear', 'duplicate'
]);

export const StrokeAlignSchema = caseInsensitiveEnum(['INSIDE', 'OUTSIDE', 'CENTER']);
export const StrokeCapSchema = caseInsensitiveEnum(['NONE', 'ROUND', 'SQUARE', 'ARROW_LINES', 'ARROW_EQUILATERAL']);
export const StrokeJoinSchema = caseInsensitiveEnum(['MITER', 'BEVEL', 'ROUND']);

export const PaintIndexSchema = z.number().int().min(0).describe('Paint array index in strokes array');
export const StrokeWeightSchema = z.number().min(0).describe('Stroke thickness in pixels');
export const StrokeMiterLimitSchema = z.number().min(1).describe('Miter join limit');
export const DashPatternSchema = z.array(z.number()).describe('Dash pattern array');

// Transform schemas specific to strokes (avoid conflicts by using different names)
const TransformOffsetSchema = z.number().min(-1).max(1).describe('Transform offset (-1 to 1, 0=center)');
const TransformScaleSchema = z.number().min(0).describe('Transform scale factor (1.0=original)');
const TransformRotationSchema = z.number().describe('Transform rotation in degrees');
const TransformSkewSchema = z.number().describe('Transform skew angle in degrees');

// Pattern parameters specific to strokes
const PatternScalingFactorSchema = z.number().min(0).describe('Pattern scaling factor');
const PatternSpacingSchema = z.number().describe('Pattern spacing value');

// Bulk operation support - single values or arrays
const SingleOrArray = <T extends z.ZodType>(schema: T) => z.union([schema, z.array(schema)]);

// Base schemas for common parameters
const BaseStrokeParams = {
  nodeId: SingleOrArray(z.string().describe('Node ID')),
  paintIndex: SingleOrArray(PaintIndexSchema).optional(),
  filterType: PaintTypeFilterSchema.optional(),
  failFast: BulkFailFastSchema.optional()
};

// Stroke property parameters (for update operation)
const StrokePropertyParams = {
  strokeWeight: SingleOrArray(StrokeWeightSchema).optional(),
  strokeAlign: SingleOrArray(StrokeAlignSchema).optional(),
  strokeCap: SingleOrArray(StrokeCapSchema).optional(),
  strokeJoin: SingleOrArray(StrokeJoinSchema).optional(),
  strokeMiterLimit: SingleOrArray(StrokeMiterLimitSchema).optional(),
  dashPattern: SingleOrArray(DashPatternSchema).optional()
};

// Paint property parameters (for all paint operations)
const PaintPropertyParams = {
  opacity: SingleOrArray(OpacitySchema).optional(),
  visible: SingleOrArray(z.boolean()).optional(),
  blendMode: SingleOrArray(BlendModeSchema).optional()
};

// Color parameters
const ColorParams = {
  color: SingleOrArray(HexColorSchema)
};

// Gradient parameters
const GradientParams = {
  gradientType: SingleOrArray(GradientTypeSchema),
  stopPositions: StopPositionsSchema.optional(),
  stopColors: StopColorsSchema.optional(),
  gradientStartX: SingleOrArray(CoordinateSchema).optional(),
  gradientStartY: SingleOrArray(CoordinateSchema).optional(),
  gradientEndX: SingleOrArray(CoordinateSchema).optional(),
  gradientEndY: SingleOrArray(CoordinateSchema).optional(),
  gradientScale: SingleOrArray(z.number().min(0)).optional()
};

// Image parameters
const ImageParams = {
  imageUrl: SingleOrArray(z.string().url()).optional(),
  imagePath: SingleOrArray(z.string()).optional(),
  imageBytes: SingleOrArray(z.string()).optional(),
  imageHash: SingleOrArray(z.string()).optional(),
  imageScaleMode: SingleOrArray(ImageScaleModeSchema).optional(),
  imageTransform: SingleOrArray(ImageTransformSchema).optional(),
  transformOffsetX: SingleOrArray(TransformOffsetSchema).optional(),
  transformOffsetY: SingleOrArray(TransformOffsetSchema).optional(),
  transformScale: SingleOrArray(TransformScaleSchema).optional(),
  transformScaleX: SingleOrArray(TransformScaleSchema).optional(),
  transformScaleY: SingleOrArray(TransformScaleSchema).optional(),
  transformRotation: SingleOrArray(TransformRotationSchema).optional(),
  transformSkewX: SingleOrArray(TransformSkewSchema).optional(),
  transformSkewY: SingleOrArray(TransformSkewSchema).optional(),
  filterExposure: SingleOrArray(ImageFilterSchema).optional(),
  filterContrast: SingleOrArray(ImageFilterSchema).optional(),
  filterSaturation: SingleOrArray(ImageFilterSchema).optional(),
  filterTemperature: SingleOrArray(ImageFilterSchema).optional(),
  filterTint: SingleOrArray(ImageFilterSchema).optional(),
  filterHighlights: SingleOrArray(ImageFilterSchema).optional(),
  filterShadows: SingleOrArray(ImageFilterSchema).optional()
};

// Pattern parameters
const PatternParams = {
  sourceNodeId: SingleOrArray(z.string()),
  patternTileType: SingleOrArray(PatternTileTypeSchema).optional(),
  patternScalingFactor: SingleOrArray(PatternScalingFactorSchema).optional(),
  patternSpacingX: SingleOrArray(PatternSpacingSchema).optional(),
  patternSpacingY: SingleOrArray(PatternSpacingSchema).optional(),
  patternHorizontalAlignment: SingleOrArray(PatternAlignmentSchema).optional()
};

// Operation-specific schemas

// GET operation
const GetStrokeParams = z.object({
  operation: z.literal('get'),
  ...BaseStrokeParams
});

// ADD operations (paint-level only, no stroke properties)
const AddSolidStrokeParams = z.object({
  operation: z.literal('add_solid'),
  ...BaseStrokeParams,
  ...ColorParams,
  ...PaintPropertyParams
});

const AddGradientStrokeParams = z.object({
  operation: z.literal('add_gradient'),
  ...BaseStrokeParams,
  ...GradientParams,
  ...PaintPropertyParams
});

const AddImageStrokeParams = z.object({
  operation: z.literal('add_image'),
  ...BaseStrokeParams,
  ...ImageParams,
  ...PaintPropertyParams
});

const AddPatternStrokeParams = z.object({
  operation: z.literal('add_pattern'),
  ...BaseStrokeParams,
  ...PatternParams,
  ...PaintPropertyParams
});

// UPDATE operations
const UpdateStrokeParams = z.object({
  operation: z.literal('update'),
  ...BaseStrokeParams,
  ...StrokePropertyParams, // Stroke properties (no paintIndex needed)
  ...PaintPropertyParams   // Paint properties (requires paintIndex)
});

const UpdateSolidStrokeParams = z.object({
  operation: z.literal('update_solid'),
  ...BaseStrokeParams,
  ...ColorParams,
  ...PaintPropertyParams
}).refine(data => data.paintIndex !== undefined, {
  message: "paintIndex is required for paint-specific updates"
});

const UpdateGradientStrokeParams = z.object({
  operation: z.literal('update_gradient'),
  ...BaseStrokeParams,
  ...GradientParams,
  ...PaintPropertyParams
}).refine(data => data.paintIndex !== undefined, {
  message: "paintIndex is required for paint-specific updates"
});

const UpdateImageStrokeParams = z.object({
  operation: z.literal('update_image'),
  ...BaseStrokeParams,
  ...ImageParams,
  ...PaintPropertyParams
}).refine(data => data.paintIndex !== undefined, {
  message: "paintIndex is required for paint-specific updates"
});

const UpdatePatternStrokeParams = z.object({
  operation: z.literal('update_pattern'),
  ...BaseStrokeParams,
  ...PatternParams,
  ...PaintPropertyParams
}).refine(data => data.paintIndex !== undefined, {
  message: "paintIndex is required for paint-specific updates"
});

// MANAGEMENT operations
const DeleteStrokeParams = z.object({
  operation: z.literal('delete'),
  ...BaseStrokeParams
}).refine(data => data.paintIndex !== undefined, {
  message: "paintIndex is required for delete operations"
});

const ReorderStrokeParams = z.object({
  operation: z.literal('reorder'),
  ...BaseStrokeParams,
  newIndex: SingleOrArray(NewIndexSchema)
}).refine(data => data.paintIndex !== undefined, {
  message: "paintIndex is required for reorder operations"
});

const ClearStrokeParams = z.object({
  operation: z.literal('clear'),
  ...BaseStrokeParams
});

const DuplicateStrokeParams = z.object({
  operation: z.literal('duplicate'),
  fromNodeId: SingleOrArray(z.string()),
  toNodeId: SingleOrArray(z.string()),
  paintIndex: SingleOrArray(PaintIndexSchema).optional(),
  overwrite: OverwriteModeSchema.optional(),
  failFast: BulkFailFastSchema.optional()
});

// Union of all stroke operations
export const ManageStrokesSchema = z.union([
  GetStrokeParams,
  AddSolidStrokeParams,
  AddGradientStrokeParams,
  AddImageStrokeParams,
  AddPatternStrokeParams,
  UpdateStrokeParams,
  UpdateSolidStrokeParams,
  UpdateGradientStrokeParams,
  UpdateImageStrokeParams,
  UpdatePatternStrokeParams,
  DeleteStrokeParams,
  ReorderStrokeParams,
  ClearStrokeParams,
  DuplicateStrokeParams
]);

// Type exports
export type ManageStrokesParams = z.infer<typeof ManageStrokesSchema>;
export type GetStrokeParams = z.infer<typeof GetStrokeParams>;
export type AddSolidStrokeParams = z.infer<typeof AddSolidStrokeParams>;
export type AddGradientStrokeParams = z.infer<typeof AddGradientStrokeParams>;
export type AddImageStrokeParams = z.infer<typeof AddImageStrokeParams>;
export type AddPatternStrokeParams = z.infer<typeof AddPatternStrokeParams>;
export type UpdateStrokeParams = z.infer<typeof UpdateStrokeParams>;
export type UpdateSolidStrokeParams = z.infer<typeof UpdateSolidStrokeParams>;
export type UpdateGradientStrokeParams = z.infer<typeof UpdateGradientStrokeParams>;
export type UpdateImageStrokeParams = z.infer<typeof UpdateImageStrokeParams>;
export type UpdatePatternStrokeParams = z.infer<typeof UpdatePatternStrokeParams>;
export type DeleteStrokeParams = z.infer<typeof DeleteStrokeParams>;
export type ReorderStrokeParams = z.infer<typeof ReorderStrokeParams>;
export type ClearStrokeParams = z.infer<typeof ClearStrokeParams>;
export type DuplicateStrokeParams = z.infer<typeof DuplicateStrokeParams>;