import { z } from 'zod';
import { caseInsensitiveEnum } from './enum-utils.js';

// ================================================================================
// Auto Layout & Constraints Operations
// ================================================================================


export const ManageAutoLayoutSchema = z.object({
  operation: caseInsensitiveEnum(['enable', 'disable', 'update', 'get_properties']),
  nodeId: z.union([z.string(), z.array(z.string())]),
  
  // Layout Direction
  direction: z.union([
    caseInsensitiveEnum(['horizontal', 'vertical']),
    z.array(caseInsensitiveEnum(['horizontal', 'vertical']))
  ]).optional(),
  
  // Spacing
  spacing: z.union([z.number(), z.array(z.number())]).optional(),
  
  // Flattened Padding Properties
  paddingTop: z.union([z.number(), z.array(z.number())]).optional(),
  paddingRight: z.union([z.number(), z.array(z.number())]).optional(),
  paddingBottom: z.union([z.number(), z.array(z.number())]).optional(),
  paddingLeft: z.union([z.number(), z.array(z.number())]).optional(),
  
  // Alignment
  primaryAlignment: caseInsensitiveEnum(['min', 'center', 'max', 'space_between']).optional(),
  counterAlignment: caseInsensitiveEnum(['min', 'center', 'max']).optional(),
  
  // Flattened Resizing Properties
  resizingWidth: caseInsensitiveEnum(['hug', 'fill', 'fixed']).optional(),
  resizingHeight: caseInsensitiveEnum(['hug', 'fill', 'fixed']).optional(),
  
  // Advanced Properties
  strokesIncludedInLayout: z.boolean().optional(),
  layoutWrap: caseInsensitiveEnum(['no_wrap', 'wrap']).optional(),
  
  // Bulk operation control
  failFast: z.boolean().optional(),
});

export const ManageConstraintsSchema = z.object({
  operation: caseInsensitiveEnum(['get', 'set', 'reset']),
  nodeId: z.union([z.string(), z.array(z.string())]),
  
  // Constraint Settings
  horizontalConstraint: z.union([
    caseInsensitiveEnum(['MIN', 'MAX', 'STRETCH', 'CENTER', 'SCALE']),
    z.array(caseInsensitiveEnum(['MIN', 'MAX', 'STRETCH', 'CENTER', 'SCALE']))
  ]).optional(),
  verticalConstraint: z.union([
    caseInsensitiveEnum(['MIN', 'MAX', 'STRETCH', 'CENTER', 'SCALE']),
    z.array(caseInsensitiveEnum(['MIN', 'MAX', 'STRETCH', 'CENTER', 'SCALE']))
  ]).optional(),
});

// ================================================================================
// Alignment Operations
// ================================================================================

export const ManageAlignmentSchema = z.object({
  // Operations
  horizontalOperation: z.enum(['position', 'align', 'distribute', 'spread']).optional(),
  horizontalDirection: z.enum(['left', 'center', 'right']).optional(),
  horizontalReferencePoint: z.enum(['left', 'center', 'right']).optional(),
  horizontalAlignmentPoint: z.enum(['left', 'center', 'right']).optional(),
  horizontalSpacing: z.number().optional(),
  
  verticalOperation: z.enum(['position', 'align', 'distribute', 'spread']).optional(),
  verticalDirection: z.enum(['top', 'middle', 'bottom']).optional(),
  verticalReferencePoint: z.enum(['top', 'middle', 'bottom']).optional(),
  verticalAlignmentPoint: z.enum(['top', 'middle', 'bottom']).optional(),
  verticalSpacing: z.number().optional(),
  
  // Target nodes
  nodeIds: z.array(z.string()),
  
  // Reference modes
  referenceMode: z.enum(['bounds', 'key_object', 'relative']).optional().default('bounds'),
  referenceNodeId: z.string().optional(),
  
  // Spread operation parameters
  spreadDirection: z.enum(['horizontal', 'vertical']).optional(),
  spacing: z.number().optional(),
  
  // Additional options
  margin: z.number().optional()
});

// Export types
export type ManageAutoLayoutParams = z.infer<typeof ManageAutoLayoutSchema>;
export type ManageConstraintsParams = z.infer<typeof ManageConstraintsSchema>;
export type ManageAlignmentParams = z.infer<typeof ManageAlignmentSchema>;