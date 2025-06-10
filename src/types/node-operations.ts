import { z } from 'zod';
import { BaseNodePropertiesSchema, BasePositionSchema, BaseSizeSchema, BaseTextAlignmentSchema, BaseTextStyleSchema } from './schemas.js';

// ================================================================================
// Node Operation Schemas
// ================================================================================

// Text styling with ranges
export const TextStyleRangeSchema = z.object({
  start: z.number(),
  end: z.number(),
  fontFamily: z.string().optional(),
  fontStyle: z.string().optional(),
  fontSize: z.number().optional(),
  fillColor: z.string().optional(),
  textDecoration: z.enum(["none", "underline", "strikethrough"]).optional(),
  textCase: z.enum(["original", "upper", "lower", "title"]).optional(),
  letterSpacing: z.number().optional(),
  lineHeight: z.number().optional(),
});

// Text creation schema
export const CreateTextSchema = BasePositionSchema
  .merge(BaseSizeSchema)
  .merge(BaseTextAlignmentSchema)
  .merge(BaseTextStyleSchema)
  .extend({
    // Core content
    characters: z.string(),
    name: z.string().optional(),
    
    // Text-specific defaults
    fontFamily: z.string().default("Inter"),
    fontStyle: z.string().optional().default("Regular"),
    fontSize: z.number().default(16),
    
    // Spacing
    lineHeightUnit: z.enum(["px", "percent"]).optional().default("percent"),
    paragraphIndent: z.number().optional(),
    paragraphSpacing: z.number().optional(),
    
    // Visual
    fillColor: z.string().optional(),
    
    // Advanced styling with ranges
    styleRanges: z.array(TextStyleRangeSchema).optional(),
    
    // Style management
    createStyle: z.boolean().optional(),
    styleName: z.string().optional(),
  });

// Node creation schema
export const CreateNodeSchema = BaseNodePropertiesSchema.extend({
  // Node type
  nodeType: z.enum(['rectangle', 'ellipse', 'text', 'frame', 'star', 'polygon']),
  
  // Frame-specific properties
  clipsContent: z.boolean().optional(),
  
  // Shape-specific properties
  pointCount: z.number().min(3).optional(), // star nodes
  innerRadius: z.number().min(0).max(1).optional(), // star nodes
  
  // Text properties (for backward compatibility)
  content: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  fontStyle: z.string().optional(),
  textAlignHorizontal: z.enum(["left", "center", "right", "justified"]).optional(),
}).refine((data) => {
  // Text nodes must have content - validation logic kept here as it's structural
  if (data.nodeType === 'text') {
    return data.content !== undefined && data.content.trim().length > 0;
  }
  return true;
}, {
  message: "Text nodes must have non-empty content"
});

// Node update schema
export const UpdateNodeSchema = BaseNodePropertiesSchema.extend({
  nodeId: z.string(), // required - ID of node to update
  
  // Frame-specific properties
  clipsContent: z.boolean().optional(),
  
  // Shape-specific properties
  pointCount: z.number().min(3).optional(),
  innerRadius: z.number().min(0).max(1).optional(),
  
  // Text properties
  content: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  fontStyle: z.string().optional(),
  textAlignHorizontal: z.enum(["left", "center", "right", "justified"]).optional(),
  
  // Legacy support
  properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

// Node management operations
export const ManageNodesSchema = z.object({
  operation: z.enum(['move', 'delete', 'duplicate']),
  nodeId: z.string(),
  x: z.number().optional(),
  y: z.number().optional(),
  offsetX: z.number().default(10).optional(),
  offsetY: z.number().default(10).optional(),
});

// Selection operations
export const SetSelectionSchema = z.object({
  nodeIds: z.array(z.string()),
});

// Export operations
export const ExportNodeSchema = z.object({
  nodeId: z.string(),
  format: z.enum(['PNG', 'JPG', 'SVG', 'PDF']).default('PNG'),
  scale: z.number().default(1),
});

// Export types
export type TextStyleRange = z.infer<typeof TextStyleRangeSchema>;
export type CreateTextParams = z.infer<typeof CreateTextSchema>;
export type CreateNodeParams = z.infer<typeof CreateNodeSchema>;
export type UpdateNodeParams = z.infer<typeof UpdateNodeSchema>;
export type ManageNodesParams = z.infer<typeof ManageNodesSchema>;