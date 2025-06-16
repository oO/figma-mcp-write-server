import { z } from 'zod';

// ================================================================================
// Image Operations Schema for Figma MCP Write Server
// ================================================================================

// Image filters schema (all values range from -1.0 to +1.0)
export const ImageFiltersSchema = z.object({
  exposure: z.number().min(-1).max(1).optional(),
  contrast: z.number().min(-1).max(1).optional(),
  saturation: z.number().min(-1).max(1).optional(),
  temperature: z.number().min(-1).max(1).optional(),
  tint: z.number().min(-1).max(1).optional(),
  highlights: z.number().min(-1).max(1).optional(),
  shadows: z.number().min(-1).max(1).optional(),
});

// Transform matrix for CROP mode (2x3 matrix)
export const ImageTransformSchema = z.array(z.array(z.number()).length(3)).length(2);

// Image scale modes
export const ScaleModeSchema = z.enum(['FILL', 'FIT', 'CROP', 'TILE']);

// Fit strategies for smart replacement
export const FitStrategySchema = z.enum(['preserve_container', 'preserve_aspect', 'smart_crop', 'letterbox']);

// Alignment options for smart positioning
export const AlignmentSchema = z.object({
  x: z.enum(['left', 'center', 'right']).optional(),
  y: z.enum(['top', 'center', 'bottom']).optional(),
});

// Core manage_images operation schema
export const ManageImagesSchema = z.object({
  operation: z.enum([
    'create_from_url',
    'create_from_bytes',
    'apply_to_node',
    'replace_image',
    'smart_replace',
    'update_filters',
    'change_scale_mode',
    'rotate',
    'get_image_info',
    'extract_image',
    'clone_image'
  ]),

  // Image Creation
  imageUrl: z.string().url().optional(),
  imageBytes: z.string().optional(), // Base64 encoded bytes

  // Node Operations
  nodeId: z.string().optional(),
  createNode: z.boolean().optional(),
  nodeWidth: z.number().positive().optional(),
  nodeHeight: z.number().positive().optional(),

  // Image Positioning & Scaling
  scaleMode: ScaleModeSchema.optional(),
  imageTransform: ImageTransformSchema.optional(),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).optional(),

  // Image Filters
  filters: ImageFiltersSchema.optional(),

  // Image Replacement & Smart Fitting
  replaceImageUrl: z.string().url().optional(),
  replaceImageBytes: z.string().optional(),
  fitStrategy: FitStrategySchema.optional(),
  alignmentX: z.enum(['left', 'center', 'right']).optional(),
  alignmentY: z.enum(['top', 'center', 'bottom']).optional(),
  maxResize: z.number().positive().optional(), // Maximum % to resize container
  minResize: z.number().positive().optional(), // Minimum % to resize container
  respectAutoLayout: z.boolean().optional(),

  // Advanced Options
  opacity: z.number().min(0).max(1).optional(),
  blendMode: z.string().optional(),
  visible: z.boolean().optional(),

  // Position (for new nodes)
  x: z.number().optional(),
  y: z.number().optional(),

  // Clone operation
  sourceNodeId: z.string().optional(),
  targetNodeId: z.string().optional(),
  preserveFilters: z.boolean().optional(),

  // Image hash for existing images
  imageHash: z.string().optional(),
}).refine((data) => {
  // Validation rules for different operations
  switch (data.operation) {
    case 'create_from_url':
      return !!data.imageUrl;
    case 'create_from_bytes':
      return !!data.imageBytes;
    case 'apply_to_node':
      return !!data.imageHash && (!!data.nodeId || data.createNode);
    case 'replace_image':
    case 'smart_replace':
      return !!data.nodeId && (!!data.replaceImageUrl || !!data.replaceImageBytes);
    case 'update_filters':
    case 'change_scale_mode':
    case 'rotate':
    case 'get_image_info':
    case 'extract_image':
      return !!data.nodeId;
    case 'clone_image':
      return !!data.sourceNodeId && (!!data.targetNodeId || data.createNode);
    default:
      return true;
  }
}, {
  message: "Invalid parameters for the specified operation"
});

// Plugin communication payload for image operations
export const ImageOperationPayloadSchema = z.object({
  type: z.literal('MANAGE_IMAGES'),
  payload: ManageImagesSchema,
});

// Export types
export type ImageFilters = z.infer<typeof ImageFiltersSchema>;
export type ImageTransform = z.infer<typeof ImageTransformSchema>;
export type ScaleMode = z.infer<typeof ScaleModeSchema>;
export type FitStrategy = z.infer<typeof FitStrategySchema>;
export type Alignment = z.infer<typeof AlignmentSchema>;
export type ManageImages = z.infer<typeof ManageImagesSchema>;
export type ImageOperationPayload = z.infer<typeof ImageOperationPayloadSchema>;