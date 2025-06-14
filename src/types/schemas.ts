import { z } from 'zod';
import { ColorSchema, PaintSchema, StrokeSchema, FigmaEffectSchema } from './figma-base.js';

// ================================================================================
// Base Schema Components for Node Operations
// ================================================================================

// Common position and size properties
export const BasePositionSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
});

export const BaseSizeSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
});

// Common visual properties
export const BaseVisualSchema = z.object({
  fillColor: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  visible: z.boolean().default(true),
  rotation: z.number().optional(),
  locked: z.boolean().default(false),
});

// Common stroke properties
export const BaseStrokeSchema = z.object({
  strokeColor: z.string().optional(),
  strokeWidth: z.number().min(0).optional(),
});

// Common corner properties
export const BaseCornerSchema = z.object({
  cornerRadius: z.number().min(0).optional(),
  topLeftRadius: z.number().min(0).optional(),
  topRightRadius: z.number().min(0).optional(),
  bottomLeftRadius: z.number().min(0).optional(),
  bottomRightRadius: z.number().min(0).optional(),
  cornerSmoothing: z.number().min(0).max(1).optional(),
});

// Common text alignment properties
export const BaseTextAlignmentSchema = z.object({
  textAlignHorizontal: z.enum(["left", "center", "right", "justified"]).optional(),
  textAlignVertical: z.enum(["top", "center", "bottom"]).optional(),
});

// Text styling properties
export const BaseTextStyleSchema = z.object({
  fontFamily: z.string().optional(),
  fontStyle: z.string().optional(),
  fontSize: z.number().optional(),
  textCase: z.enum(["original", "upper", "lower", "title"]).optional(),
  textDecoration: z.enum(["none", "underline", "strikethrough"]).optional(),
  letterSpacing: z.number().optional(),
  lineHeight: z.number().optional(),
});

// Base node properties (combination of all common properties)
export const BaseNodePropertiesSchema = BasePositionSchema
  .merge(BaseSizeSchema)
  .merge(BaseVisualSchema)
  .merge(BaseStrokeSchema)
  .merge(BaseCornerSchema)
  .extend({
    name: z.string().optional(),
  });

// Simple Figma Node Schema (without recursive children)
export const FigmaNodeSchema = z.object({
  // Core node properties
  id: z.string(),
  name: z.string(),
  type: z.string(),

  // Node state
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),

  // Position and size properties (all nodes have these)
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number(),  // Required - all Figma nodes have width
  height: z.number(), // Required - all Figma nodes have height
  rotation: z.number().default(0),

  // Visual properties
  opacity: z.number().default(1),
  blendMode: z.string().default('NORMAL'),
  fills: z.array(PaintSchema).optional(),
  strokes: z.array(StrokeSchema).optional(),
  effects: z.array(FigmaEffectSchema).optional(),
});

// Export types
export type FigmaNode = z.infer<typeof FigmaNodeSchema>;

// ================================================================================
// Boolean Operations Schemas
// ================================================================================

export const ManageBooleanOperationsSchema = z.object({
  operation: z.enum(['union', 'subtract', 'intersect', 'exclude']),
  nodeIds: z.array(z.string()).min(2, "Boolean operations require at least 2 nodes"),
  name: z.string().optional(),
  preserveOriginal: z.boolean().default(false)
});

// ================================================================================
// Vector Operations Schemas
// ================================================================================

export const ManageVectorOperationsSchema = z.object({
  operation: z.enum(['create_vector', 'flatten', 'outline_stroke', 'get_vector_paths']),
  nodeId: z.string().optional(),
  vectorPaths: z.array(z.any()).optional(),
  name: z.string().optional(),
  strokeWidth: z.number().min(0).optional(),
  x: z.number().optional(),
  y: z.number().optional()
});

// Export types for boolean and vector operations
export type ManageBooleanOperationsParams = z.infer<typeof ManageBooleanOperationsSchema>;
export type ManageVectorOperationsParams = z.infer<typeof ManageVectorOperationsSchema>;

// ================================================================================
// Dev Mode Operations Schemas
// ================================================================================

export const ManageAnnotationsSchema = z.object({
  operation: z.enum(['add_annotation', 'edit_annotation', 'remove_annotation', 'list_annotations']),
  nodeId: z.string().optional(),
  annotationId: z.string().optional(),
  label: z.string().optional(),
  labelMarkdown: z.string().optional(),
  properties: z.record(z.string(), z.any()).optional(),
  categoryId: z.string().optional()
});

export const ManageMeasurementsSchema = z.object({
  operation: z.enum(['add_measurement', 'edit_measurement', 'remove_measurement', 'list_measurements']),
  measurementId: z.string().optional(),
  fromNodeId: z.string().optional(),
  toNodeId: z.string().optional(),
  direction: z.enum(['horizontal', 'vertical', 'distance']).optional(),
  label: z.string().optional(),
  customValue: z.string().optional(),
  pageId: z.string().optional()
});

export const ManageDevResourcesSchema = z.object({
  operation: z.enum(['generate_css', 'set_dev_status', 'add_dev_link', 'remove_dev_link', 'get_dev_resources']),
  nodeId: z.string().optional(),
  status: z.enum(['ready_for_dev', 'in_progress', 'dev_complete']).optional(),
  linkUrl: z.string().optional(),
  linkTitle: z.string().optional(),
  linkId: z.string().optional(),
  cssOptions: z.object({
    includeChildren: z.boolean().default(false),
    includeComments: z.boolean().default(true),
    useFlexbox: z.boolean().default(true)
  }).optional()
});

// Export types for dev mode operations
export type ManageAnnotationsParams = z.infer<typeof ManageAnnotationsSchema>;
export type ManageMeasurementsParams = z.infer<typeof ManageMeasurementsSchema>;
export type ManageDevResourcesParams = z.infer<typeof ManageDevResourcesSchema>;

// ================================================================================
// Export Operations Schemas
// ================================================================================

export const ManageExportsSchema = z.object({
  operation: z.enum(['export_single', 'export_bulk', 'export_library', 'list_presets', 'apply_preset']),
  
  // Single node export
  nodeId: z.string().optional(),
  
  // Bulk export
  nodeIds: z.array(z.string()).optional(),
  
  // Export format and settings
  format: z.enum(['PNG', 'SVG', 'JPG', 'PDF']).default('PNG'),
  settings: z.object({
    scale: z.number().default(1),
    quality: z.number().min(1).max(100).optional(),
    dpi: z.number().optional(),
    constraint: z.object({
      type: z.enum(['SCALE', 'WIDTH', 'HEIGHT']),
      value: z.number()
    }).optional(),
    padding: z.number().optional(),
    includeId: z.boolean().default(false),
    suffix: z.string().optional()
  }).optional(),
  
  // Preset management
  exportPreset: z.enum(['ios_app_icon', 'android_assets', 'web_assets', 'marketing_assets', 'print_ready']).optional(),
  presetId: z.string().optional(),
  
  // Organization strategy
  organizationStrategy: z.enum(['flat', 'by_type', 'by_component', 'by_size', 'by_density', 'by_scale']).default('flat'),
  
  // Output control (simplified)
  output: z.enum(['file', 'data']).default('file'),
  
  // File output parameters (when output='file')
  outputDirectory: z.string().optional(),
  
  // Data output parameters (when output='data')
  dataFormat: z.enum(['base64', 'hex']).default('base64'),
  maxDataSize: z.number().optional(),
  
  // Library export
  assetType: z.enum(['components', 'styles', 'variables']).optional(),
  filters: z.object({
    name: z.string().optional(),
    published: z.boolean().optional(),
    libraryId: z.string().optional()
  }).optional()
});

// Export types for export operations
export type ManageExportsParams = z.infer<typeof ManageExportsSchema>;