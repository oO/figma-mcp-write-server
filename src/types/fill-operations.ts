import { z } from 'zod';
import { caseInsensitiveEnum } from './enum-utils.js';
import { PaintSchema } from './figma-base.js';

// Common field schemas
export const HexColorSchema = z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{4})$/).describe('Hex color (e.g. #FF0000, #FF0000AA)');
export const OpacitySchema = z.number().min(0).max(1).describe('Opacity value (0-1)');
export const CoordinateSchema = z.number().describe('Coordinate value');
export const BulkFailFastSchema = z.boolean().default(false).describe('Stop on first error in bulk operations');

// Enum schemas for fill operations
export const FillOperationSchema = caseInsensitiveEnum([
  'get', 'add_solid', 'add_gradient', 'add_image', 'add_pattern',
  'update', 'update_solid', 'update_gradient', 'update_image', 'update_pattern',
  'delete', 'reorder', 'clear', 'duplicate'
]);

export const PaintTypeFilterSchema = caseInsensitiveEnum([
  'SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 
  'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND', 'IMAGE', 'VIDEO', 'PATTERN'
]);

export const GradientTypeSchema = caseInsensitiveEnum([
  'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND'
]);

export const ImageScaleModeSchema = caseInsensitiveEnum(['FILL', 'FIT', 'CROP', 'TILE']);

export const OverwriteModeSchema = caseInsensitiveEnum(['NONE', 'SINGLE', 'ALL']);

export const PatternTileTypeSchema = caseInsensitiveEnum(['RECTANGULAR', 'HORIZONTAL_HEXAGONAL', 'VERTICAL_HEXAGONAL']);

export const PatternAlignmentSchema = caseInsensitiveEnum(['START', 'CENTER', 'END']);

// Import BlendModeSchema from effect-operations to avoid duplicate export
import { BlendModeSchema } from './effect-operations.js';

// Core parameter schemas
export const FillIndexSchema = z.number().int().min(0).describe('Fill array index');
export const InsertIndexSchema = z.number().int().min(0).describe('Position to insert new fill');
export const NewIndexSchema = z.number().int().min(0).describe('Target position for reorder');

// Gradient parameters
export const StopPositionsSchema = z.array(z.number().min(0).max(1)).min(2).describe('Gradient stop positions (0-1)');
export const StopColorsSchema = z.array(HexColorSchema).min(2).describe('Gradient stop colors');

// Flattened gradient handle parameters
export const GradientHandleSchema = z.object({
  gradientStartX: z.number().optional().describe('Gradient start X position in node coordinates (0=left edge, 1=right edge, supports negative and >1 values)'),
  gradientStartY: z.number().optional().describe('Gradient start Y position in node coordinates (0=top edge, 1=bottom edge, supports negative and >1 values)'),
  gradientEndX: z.number().optional().describe('Gradient end X position in node coordinates (0=left edge, 1=right edge, supports negative and >1 values)'),
  gradientEndY: z.number().optional().describe('Gradient end Y position in node coordinates (0=top edge, 1=bottom edge, supports negative and >1 values)'),
  gradientScale: z.number().min(0).optional().describe('Gradient scale factor (1=normal, 0.5=half size, 2=double size)')
});

// Image parameters
export const ImageTransformSchema = z.array(z.number()).length(6).describe('Flat transformation array [a,b,c,d,e,f] where a,b=scale/rotation, c,d=skew, e,f=translation');
export const ImageFilterSchema = z.object({
  filterExposure: z.number().min(-1).max(1).optional().describe('Image exposure (-1 to 1)'),
  filterContrast: z.number().min(-1).max(1).optional().describe('Image contrast (-1 to 1)'),
  filterSaturation: z.number().min(-1).max(1).optional().describe('Image saturation (-1 to 1)'),
  filterTemperature: z.number().min(-1).max(1).optional().describe('Image temperature (-1 to 1)'),
  filterTint: z.number().min(-1).max(1).optional().describe('Image tint (-1 to 1)'),
  filterHighlights: z.number().min(-1).max(1).optional().describe('Image highlights (-1 to 1)'),
  filterShadows: z.number().min(-1).max(1).optional().describe('Image shadows (-1 to 1)')
});

// Base fill parameters
export const BaseFillParamsSchema = z.object({
  opacity: OpacitySchema.optional().describe('Fill opacity (0-1)'),
  visible: z.boolean().optional().describe('Fill visibility'),
  blendMode: BlendModeSchema.optional().describe('Fill blend mode'),
  insertIndex: InsertIndexSchema.optional().describe('Position to insert new fill')
});

// Main schema using oneOf pattern for node targeting
export const ManageFillsSchema = z.object({
  operation: FillOperationSchema.describe('Fill operation to perform'),
  
  // Node targeting (oneOf pattern)
  nodeId: z.union([
    z.string().describe('Single node ID'),
    z.array(z.string()).min(1).describe('Array of node IDs for bulk operations')
  ]).optional(),
  
  // Operation-specific parameters
  fillIndex: FillIndexSchema.optional().describe('Target fill index for single-fill operations'),
  filterType: PaintTypeFilterSchema.optional().describe('Filter fills by Paint type'),
  
  // Complete fill replacement
  fill: PaintSchema.optional().describe('Complete Paint object for replacement'),
  
  // Common fill parameters
  opacity: OpacitySchema.optional().describe('Fill opacity (0-1)'),
  visible: z.boolean().optional().describe('Fill visibility'),
  blendMode: BlendModeSchema.optional().describe('Fill blend mode'),
  insertIndex: InsertIndexSchema.optional().describe('Position to insert new fill'),
  
  // Solid fill creation
  color: HexColorSchema.optional().describe('Hex color for solid fills'),
  
  // Gradient fill creation
  gradientType: GradientTypeSchema.optional().describe('Gradient type'),
  stopPositions: StopPositionsSchema.optional().describe('Gradient stop positions'),
  stopColors: StopColorsSchema.optional().describe('Gradient stop colors'),
  
  // Flattened gradient handles (coordinate system: 0,0 = top-left, 1,1 = bottom-right of node bounding box)
  gradientStartX: z.number().optional().describe('Gradient start X position in node coordinates (0=left edge, 1=right edge, negative values extend beyond left, >1 extends beyond right)'),
  gradientStartY: z.number().optional().describe('Gradient start Y position in node coordinates (0=top edge, 1=bottom edge, negative values extend beyond top, >1 extends beyond bottom)'),
  gradientEndX: z.number().optional().describe('Gradient end X position in node coordinates (0=left edge, 1=right edge, negative values extend beyond left, >1 extends beyond right)'),
  gradientEndY: z.number().optional().describe('Gradient end Y position in node coordinates (0=top edge, 1=bottom edge, negative values extend beyond top, >1 extends beyond bottom)'),
  gradientScale: z.number().optional().describe('Gradient scale factor (1=normal, 0.5=half size, 2=double size, affects gradient spread)'),
  
  // Image fill creation (with bulk support)
  imageUrl: z.union([
    z.string().url().describe('Single image URL'),
    z.array(z.string().url()).min(1).describe('Array of image URLs for bulk operations')
  ]).optional(),
  imagePath: z.union([
    z.string().describe('Single local image file path'),
    z.array(z.string()).min(1).describe('Array of local image file paths for bulk operations')
  ]).optional(),
  imageBytes: z.union([
    z.string().describe('Single Base64 encoded image data'),
    z.array(z.string()).min(1).describe('Array of Base64 encoded image data for bulk operations')
  ]).optional(),
  imageHash: z.union([
    z.string().describe('Single existing image hash'),
    z.array(z.string()).min(1).describe('Array of existing image hashes for bulk operations')
  ]).optional(),
  imageScaleMode: z.union([
    ImageScaleModeSchema.describe('Single image scale mode'),
    z.array(ImageScaleModeSchema).min(1).describe('Array of image scale modes for bulk operations')
  ]).optional(),
  imageTransform: z.union([
    ImageTransformSchema.describe('Single image transformation'),
    z.array(ImageTransformSchema).min(1).describe('Array of image transformations for bulk operations')
  ]).optional(),
  
  // Transform parameters (mode-specific behavior)
  transformOffsetX: z.union([
    z.number().min(-1).max(1).describe('Single transform horizontal offset (-1 to 1, 0=center) - used in CROP mode'),
    z.array(z.number().min(-1).max(1)).min(1).describe('Array of transform horizontal offsets for bulk operations')
  ]).optional(),
  transformOffsetY: z.union([
    z.number().min(-1).max(1).describe('Single transform vertical offset (-1 to 1, 0=center) - used in CROP mode'),
    z.array(z.number().min(-1).max(1)).min(1).describe('Array of transform vertical offsets for bulk operations')
  ]).optional(),
  transformScale: z.union([
    z.number().min(0).describe('Single transform uniform scale factor (1.0=original, 2.0=double) - used in TILE mode'),
    z.array(z.number().min(0)).min(1).describe('Array of transform uniform scale factors for bulk operations')
  ]).optional(),
  transformScaleX: z.union([
    z.number().min(0).describe('Single transform horizontal scale factor (1.0=original, 2.0=double) - used in CROP mode'),
    z.array(z.number().min(0)).min(1).describe('Array of transform horizontal scale factors for bulk operations')
  ]).optional(),
  transformScaleY: z.union([
    z.number().min(0).describe('Single transform vertical scale factor (1.0=original, 2.0=double) - used in CROP mode'),
    z.array(z.number().min(0)).min(1).describe('Array of transform vertical scale factors for bulk operations')
  ]).optional(),
  transformRotation: z.union([
    z.number().describe('Single transform rotation in degrees - all modes (90° increments for TILE/FILL/FIT)'),
    z.array(z.number()).min(1).describe('Array of transform rotations for bulk operations')
  ]).optional(),
  transformSkewX: z.union([
    z.number().describe('Single transform horizontal skew angle in degrees - used in CROP mode only'),
    z.array(z.number()).min(1).describe('Array of transform horizontal skew angles for bulk operations')
  ]).optional(),
  transformSkewY: z.union([
    z.number().describe('Single transform vertical skew angle in degrees - used in CROP mode only'),
    z.array(z.number()).min(1).describe('Array of transform vertical skew angles for bulk operations')
  ]).optional(),
  
  // Pattern fill creation (with bulk support)
  sourceNodeId: z.union([
    z.string().describe('Single source node ID for pattern'),
    z.array(z.string()).min(1).describe('Array of source node IDs for bulk operations')
  ]).optional(),
  patternTileType: z.union([
    PatternTileTypeSchema.describe('Single pattern tile type'),
    z.array(PatternTileTypeSchema).min(1).describe('Array of pattern tile types for bulk operations')
  ]).optional(),
  patternScalingFactor: z.union([
    z.number().min(0).describe('Single pattern scaling factor'),
    z.array(z.number().min(0)).min(1).describe('Array of pattern scaling factors for bulk operations')
  ]).optional(),
  patternSpacingX: z.union([
    z.number().describe('Single pattern horizontal spacing'),
    z.array(z.number()).min(1).describe('Array of pattern horizontal spacings for bulk operations')
  ]).optional(),
  patternSpacingY: z.union([
    z.number().describe('Single pattern vertical spacing'),
    z.array(z.number()).min(1).describe('Array of pattern vertical spacings for bulk operations')
  ]).optional(),
  patternHorizontalAlignment: z.union([
    PatternAlignmentSchema.describe('Single pattern horizontal alignment'),
    z.array(PatternAlignmentSchema).min(1).describe('Array of pattern horizontal alignments for bulk operations')
  ]).optional(),
  
  // Image filters (flattened, with bulk support)
  filterExposure: z.union([
    z.number().min(-1).max(1).describe('Single exposure value'),
    z.array(z.number().min(-1).max(1)).min(1).describe('Array of exposure values for bulk operations')
  ]).optional(),
  filterContrast: z.union([
    z.number().min(-1).max(1).describe('Single contrast value'),
    z.array(z.number().min(-1).max(1)).min(1).describe('Array of contrast values for bulk operations')
  ]).optional(),
  filterSaturation: z.union([
    z.number().min(-1).max(1).describe('Single saturation value'),
    z.array(z.number().min(-1).max(1)).min(1).describe('Array of saturation values for bulk operations')
  ]).optional(),
  filterTemperature: z.union([
    z.number().min(-1).max(1).describe('Single temperature value'),
    z.array(z.number().min(-1).max(1)).min(1).describe('Array of temperature values for bulk operations')
  ]).optional(),
  filterTint: z.union([
    z.number().min(-1).max(1).describe('Single tint value'),
    z.array(z.number().min(-1).max(1)).min(1).describe('Array of tint values for bulk operations')
  ]).optional(),
  filterHighlights: z.union([
    z.number().min(-1).max(1).describe('Single highlights value'),
    z.array(z.number().min(-1).max(1)).min(1).describe('Array of highlights values for bulk operations')
  ]).optional(),
  filterShadows: z.union([
    z.number().min(-1).max(1).describe('Single shadows value'),
    z.array(z.number().min(-1).max(1)).min(1).describe('Array of shadows values for bulk operations')
  ]).optional(),
  
  // Node creation parameters (for image fills)
  x: CoordinateSchema.optional().describe('X position for new nodes'),
  y: CoordinateSchema.optional().describe('Y position for new nodes'),
  
  // Reorder operation
  newIndex: NewIndexSchema.optional().describe('Target position for reorder'),
  
  // Duplicate operation
  fromNodeId: z.union([z.string(), z.array(z.string())]).optional().describe('Source node ID(s) for duplicate'),
  toNodeId: z.union([z.string(), z.array(z.string())]).optional().describe('Target node ID(s) for duplicate'),
  overwrite: OverwriteModeSchema.optional().describe('Overwrite mode: NONE=add to existing, SINGLE=replace at same index, ALL=replace all fills'),
  
  // Bulk operation controls
  failFast: BulkFailFastSchema.optional().describe('Stop on first error in bulk operations')
}).describe('Figma fills management parameters');

// Operation-specific validation schemas
export const GetFillSchema = ManageFillsSchema.extend({
  operation: z.literal('get'),
  nodeId: z.string().describe('Node ID'),
  fillIndex: FillIndexSchema.optional().describe('Fill index to retrieve (optional - if not provided, returns all fills)')
}).describe('Get specific fill by index or all fills');

export const ListFillsSchema = ManageFillsSchema.extend({
  operation: z.literal('list'),
  nodeId: z.union([z.string(), z.array(z.string())]).describe('Node ID(s)'),
  filterType: PaintTypeFilterSchema.optional().describe('Filter by Paint type')
}).describe('List all fills from node(s)');

export const AddSolidFillSchema = ManageFillsSchema.extend({
  operation: z.literal('add_solid'),
  nodeId: z.union([z.string(), z.array(z.string())]).describe('Node ID(s)'),
  color: HexColorSchema.describe('Hex color for solid fill')
}).describe('Add solid color fill');

export const AddGradientFillSchema = ManageFillsSchema.extend({
  operation: z.literal('add_gradient'),
  nodeId: z.union([z.string(), z.array(z.string())]).describe('Node ID(s)'),
  gradientType: GradientTypeSchema.describe('Gradient type'),
  stopPositions: StopPositionsSchema.optional().describe('Gradient stop positions (optional - defaults to [0, 1])'),
  stopColors: StopColorsSchema.optional().describe('Gradient stop colors (optional - defaults to white to black)')
}).describe('Add gradient fill');

export const AddImageFillSchema = ManageFillsSchema.extend({
  operation: z.literal('add_image'),
  nodeId: z.union([z.string(), z.array(z.string())]).optional().describe('Node ID(s)'),
  imageUrl: z.union([
    z.string().url().describe('Single image URL'),
    z.array(z.string().url()).min(1).describe('Array of image URLs for bulk operations')
  ]).optional(),
  imagePath: z.union([
    z.string().describe('Single local image path'),
    z.array(z.string()).min(1).describe('Array of local image paths for bulk operations')
  ]).optional(),
  imageHash: z.union([
    z.string().describe('Single existing image hash'),
    z.array(z.string()).min(1).describe('Array of existing image hashes for bulk operations')
  ]).optional(),
  imageScaleMode: z.union([
    ImageScaleModeSchema.describe('Single image scale mode'),
    z.array(ImageScaleModeSchema).min(1).describe('Array of image scale modes for bulk operations')
  ]).optional()
}).refine(data => data.imageUrl || data.imagePath || data.imageBytes || data.imageHash, {
  message: 'Must provide imageUrl, imagePath, imageBytes, or imageHash'
}).describe('Add image fill');

export const AddPatternFillSchema = ManageFillsSchema.extend({
  operation: z.literal('add_pattern'),
  nodeId: z.union([z.string(), z.array(z.string())]).describe('Node ID(s)'),
  sourceNodeId: z.union([
    z.string().describe('Single source node ID for pattern'),
    z.array(z.string()).min(1).describe('Array of source node IDs for bulk operations')
  ]).describe('Source node ID(s) for pattern fills'),
  patternTileType: z.union([
    PatternTileTypeSchema.describe('Single pattern tile type'),
    z.array(PatternTileTypeSchema).min(1).describe('Array of pattern tile types for bulk operations')
  ]).optional(),
  patternScalingFactor: z.union([
    z.number().min(0).describe('Single pattern scaling factor'),
    z.array(z.number().min(0)).min(1).describe('Array of pattern scaling factors for bulk operations')
  ]).optional(),
  patternSpacingX: z.union([
    z.number().describe('Single pattern horizontal spacing'),
    z.array(z.number()).min(1).describe('Array of pattern horizontal spacings for bulk operations')
  ]).optional(),
  patternSpacingY: z.union([
    z.number().describe('Single pattern vertical spacing'),
    z.array(z.number()).min(1).describe('Array of pattern vertical spacings for bulk operations')
  ]).optional(),
  patternHorizontalAlignment: z.union([
    PatternAlignmentSchema.describe('Single pattern horizontal alignment'),
    z.array(PatternAlignmentSchema).min(1).describe('Array of pattern horizontal alignments for bulk operations')
  ]).optional()
}).describe('Add pattern fill');

export const UpdateFillSchema = ManageFillsSchema.extend({
  operation: z.literal('update'),
  nodeId: z.string().describe('Node ID'),
  fillIndex: FillIndexSchema.optional().describe('Fill index to update (optional - defaults to 0 for single-fill nodes, required for multi-fill nodes)'),
  
  // Common fill properties only
  opacity: OpacitySchema.optional().describe('Update fill opacity'),
  visible: z.boolean().optional().describe('Update fill visibility'),
  blendMode: BlendModeSchema.optional().describe('Update fill blend mode')
}).describe('Update common fill properties (opacity, visible, blendMode). For type-specific updates, use update_solid, update_gradient, or update_image');

export const UpdateSolidFillSchema = ManageFillsSchema.extend({
  operation: z.literal('update_solid'),
  nodeId: z.string().describe('Node ID'),
  fillIndex: FillIndexSchema.optional().describe('Fill index to update (optional - defaults to 0 for single-fill nodes, required for multi-fill nodes)'),
  
  // Solid color update parameters
  color: HexColorSchema.optional().describe('Update solid color'),
  
  // Common fill properties
  opacity: OpacitySchema.optional().describe('Update fill opacity'),
  visible: z.boolean().optional().describe('Update fill visibility'),
  blendMode: BlendModeSchema.optional().describe('Update fill blend mode')
}).describe('Update solid color fill properties');

export const UpdateGradientFillSchema = ManageFillsSchema.extend({
  operation: z.literal('update_gradient'),
  nodeId: z.string().describe('Node ID'),
  fillIndex: FillIndexSchema.optional().describe('Fill index to update (optional - defaults to 0 for single-fill nodes, required for multi-fill nodes)'),
  
  // Gradient update parameters
  gradientType: GradientTypeSchema.optional().describe('Update gradient type'),
  stopPositions: StopPositionsSchema.optional().describe('Update gradient stop positions'),
  stopColors: StopColorsSchema.optional().describe('Update gradient stop colors'),
  
  // Gradient positioning parameters
  gradientStartX: z.number().optional().describe('Update gradient start X position'),
  gradientStartY: z.number().optional().describe('Update gradient start Y position'),
  gradientEndX: z.number().optional().describe('Update gradient end X position'),
  gradientEndY: z.number().optional().describe('Update gradient end Y position'),
  gradientScale: z.number().min(0).optional().describe('Update gradient scale'),
  
  // Common fill properties
  opacity: OpacitySchema.optional().describe('Update fill opacity'),
  visible: z.boolean().optional().describe('Update fill visibility'),
  blendMode: BlendModeSchema.optional().describe('Update fill blend mode')
}).describe('Update gradient fill properties including positioning');

export const UpdateImageFillSchema = ManageFillsSchema.extend({
  operation: z.literal('update_image'),
  nodeId: z.string().describe('Node ID'),
  fillIndex: FillIndexSchema.optional().describe('Fill index to update (optional - defaults to 0 for single-fill nodes, required for multi-fill nodes)'),
  
  // Image update parameters
  imageScaleMode: ImageScaleModeSchema.optional().describe('Update image scale mode'),
  
  // Common fill properties
  opacity: OpacitySchema.optional().describe('Update fill opacity'),
  visible: z.boolean().optional().describe('Update fill visibility'),
  blendMode: BlendModeSchema.optional().describe('Update fill blend mode')
}).describe('Update image fill properties');

export const UpdatePatternFillSchema = ManageFillsSchema.extend({
  operation: z.literal('update_pattern'),
  nodeId: z.string().describe('Node ID'),
  fillIndex: FillIndexSchema.optional().describe('Fill index to update (optional - defaults to 0 for single-fill nodes, required for multi-fill nodes)'),
  
  // Pattern update parameters
  sourceNodeId: z.string().optional().describe('Update pattern source node ID'),
  patternTileType: PatternTileTypeSchema.optional().describe('Update pattern tile type'),
  patternScalingFactor: z.number().min(0).optional().describe('Update pattern scaling factor'),
  patternSpacingX: z.number().optional().describe('Update pattern horizontal spacing'),
  patternSpacingY: z.number().optional().describe('Update pattern vertical spacing'),
  patternHorizontalAlignment: PatternAlignmentSchema.optional().describe('Update pattern horizontal alignment'),
  
  // Common fill properties
  opacity: OpacitySchema.optional().describe('Update fill opacity'),
  visible: z.boolean().optional().describe('Update fill visibility'),
  blendMode: BlendModeSchema.optional().describe('Update fill blend mode')
}).describe('Update pattern fill properties');

export const DeleteFillSchema = ManageFillsSchema.extend({
  operation: z.literal('delete'),
  nodeId: z.union([z.string(), z.array(z.string())]).describe('Node ID(s)'),
  fillIndex: FillIndexSchema.describe('Fill index to delete')
}).describe('Delete specific fill');

export const ReorderFillSchema = ManageFillsSchema.extend({
  operation: z.literal('reorder'),
  nodeId: z.string().describe('Node ID'),
  fillIndex: FillIndexSchema.describe('Current fill index'),
  newIndex: NewIndexSchema.describe('Target position')
}).describe('Reorder fill position');

export const ClearFillsSchema = ManageFillsSchema.extend({
  operation: z.literal('clear'),
  nodeId: z.union([z.string(), z.array(z.string())]).describe('Node ID(s)')
}).describe('Clear all fills');

export const DuplicateFillsSchema = ManageFillsSchema.extend({
  operation: z.literal('duplicate'),
  fromNodeId: z.union([z.string(), z.array(z.string())]).describe('Source node ID(s) - single string or array for bulk source operations'),
  toNodeId: z.union([z.string(), z.array(z.string())]).describe('Target node ID(s) - single string or array for bulk target operations'),
  fillIndex: z.number().int().min(0).optional().describe('Single fill index to duplicate from each source node (if not provided, duplicates all fills)'),
  overwrite: OverwriteModeSchema.optional().describe('Overwrite mode: NONE=add to existing (default), SINGLE=replace at same index, ALL=replace all fills')
}).describe('Duplicate fills between nodes with bulk source and target support');

// Export types
export type ManageFillsParams = z.infer<typeof ManageFillsSchema>;
export type GetFillParams = z.infer<typeof GetFillSchema>;
export type ListFillsParams = z.infer<typeof ListFillsSchema>;
export type AddSolidFillParams = z.infer<typeof AddSolidFillSchema>;
export type AddGradientFillParams = z.infer<typeof AddGradientFillSchema>;
export type AddImageFillParams = z.infer<typeof AddImageFillSchema>;
export type AddPatternFillParams = z.infer<typeof AddPatternFillSchema>;
export type UpdateFillParams = z.infer<typeof UpdateFillSchema>;
export type UpdateSolidFillParams = z.infer<typeof UpdateSolidFillSchema>;
export type UpdateGradientFillParams = z.infer<typeof UpdateGradientFillSchema>;
export type UpdateImageFillParams = z.infer<typeof UpdateImageFillSchema>;
export type UpdatePatternFillParams = z.infer<typeof UpdatePatternFillSchema>;
export type DeleteFillParams = z.infer<typeof DeleteFillSchema>;
export type ReorderFillParams = z.infer<typeof ReorderFillSchema>;
export type ClearFillsParams = z.infer<typeof ClearFillsSchema>;
export type DuplicateFillsParams = z.infer<typeof DuplicateFillsSchema>;