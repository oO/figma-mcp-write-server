import { z } from 'zod';

// ================================================================================
// Auto Layout & Constraints Operations
// ================================================================================

// Auto layout related schemas
export const PaddingSchema = z.object({
  top: z.number().optional(),
  right: z.number().optional(),
  bottom: z.number().optional(),
  left: z.number().optional(),
});

export const ResizingSchema = z.object({
  width: z.enum(['hug', 'fill', 'fixed']).optional(),
  height: z.enum(['hug', 'fill', 'fixed']).optional(),
});

export const ManageAutoLayoutSchema = z.object({
  operation: z.enum(['enable', 'disable', 'update', 'get_properties']),
  nodeId: z.string(),
  
  // Layout Direction
  direction: z.enum(['horizontal', 'vertical']).optional(),
  
  // Spacing
  spacing: z.number().optional(),
  
  // Flattened Padding Properties
  paddingTop: z.number().optional(),
  paddingRight: z.number().optional(),
  paddingBottom: z.number().optional(),
  paddingLeft: z.number().optional(),
  
  // Alignment
  primaryAlignment: z.enum(['min', 'center', 'max', 'space_between']).optional(),
  counterAlignment: z.enum(['min', 'center', 'max']).optional(),
  
  // Flattened Resizing Properties
  resizingWidth: z.enum(['hug', 'fill', 'fixed']).optional(),
  resizingHeight: z.enum(['hug', 'fill', 'fixed']).optional(),
  
  // Advanced Properties
  strokesIncludedInLayout: z.boolean().optional(),
  layoutWrap: z.enum(['no_wrap', 'wrap']).optional(),
});

export const ManageConstraintsSchema = z.object({
  operation: z.enum(['set', 'get', 'reset', 'get_info']),
  nodeId: z.string(),
  
  // Constraint Settings
  horizontal: z.enum(['left', 'right', 'left_right', 'center', 'scale']).optional(),
  vertical: z.enum(['top', 'bottom', 'top_bottom', 'center', 'scale']).optional(),
});

// ================================================================================
// Alignment Operations
// ================================================================================

export const ManageAlignmentSchema = z.object({
  // Operations
  horizontalOperation: z.enum(['position', 'align', 'distribute']).optional(),
  horizontalDirection: z.enum(['left', 'center', 'right']).optional(),
  horizontalReferencePoint: z.enum(['left', 'center', 'right']).optional(),
  horizontalAlignmentPoint: z.enum(['left', 'center', 'right']).optional(),
  horizontalSpacing: z.number().optional(),
  
  verticalOperation: z.enum(['position', 'align', 'distribute']).optional(),
  verticalDirection: z.enum(['top', 'middle', 'bottom']).optional(),
  verticalReferencePoint: z.enum(['top', 'middle', 'bottom']).optional(),
  verticalAlignmentPoint: z.enum(['top', 'middle', 'bottom']).optional(),
  verticalSpacing: z.number().optional(),
  
  // Target nodes
  nodeIds: z.array(z.string()),
  
  // Reference modes
  referenceMode: z.enum(['bounds', 'key_object', 'relative']).optional().default('bounds'),
  referenceNodeId: z.string().optional(),
  
  // Additional options
  margin: z.number().optional()
});

// Export types
export type ManageAutoLayoutParams = z.infer<typeof ManageAutoLayoutSchema>;
export type ManageConstraintsParams = z.infer<typeof ManageConstraintsSchema>;
export type ManageAlignmentParams = z.infer<typeof ManageAlignmentSchema>;
export type Padding = z.infer<typeof PaddingSchema>;
export type Resizing = z.infer<typeof ResizingSchema>;