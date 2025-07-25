import { z } from 'zod';
import { caseInsensitiveEnum } from './enum-utils.js';

// ================================================================================
// Auto Layout & Constraints Operations
// ================================================================================


export const ManageAutoLayoutSchema = z.object({
  operation: caseInsensitiveEnum(['get', 'set_horizontal', 'set_vertical', 'set_grid', 'set_freeform', 'set_child', 'reorder_children']),
  nodeId: z.union([z.string(), z.array(z.string())]).optional(),
  containerId: z.string().optional(),
  
  // Core spacing properties
  horizontalSpacing: z.union([z.number(), z.literal('AUTO'), z.array(z.union([z.number(), z.literal('AUTO')]))]).optional(),
  verticalSpacing: z.union([z.number(), z.literal('AUTO'), z.array(z.union([z.number(), z.literal('AUTO')]))]).optional(),
  
  // Flattened Padding Properties
  paddingTop: z.union([z.number(), z.array(z.number())]).optional(),
  paddingRight: z.union([z.number(), z.array(z.number())]).optional(),
  paddingBottom: z.union([z.number(), z.array(z.number())]).optional(),
  paddingLeft: z.union([z.number(), z.array(z.number())]).optional(),
  
  // Alignment properties
  horizontalAlignment: caseInsensitiveEnum(['LEFT', 'CENTER', 'RIGHT', 'AUTO']).optional(),
  verticalAlignment: caseInsensitiveEnum(['TOP', 'MIDDLE', 'BOTTOM', 'BASELINE', 'LEFT', 'CENTER', 'RIGHT']).optional(),
  
  // Sizing mode properties
  fixedWidth: z.boolean().optional(),
  fixedHeight: z.boolean().optional(),
  
  // Wrapping properties
  wrapLayout: z.boolean().optional(),
  
  // Grid properties
  rows: z.number().min(1).optional(),
  columns: z.number().min(1).optional(),
  rowSpacing: z.union([z.number(), z.literal('AUTO')]).optional(),
  columnSpacing: z.union([z.number(), z.literal('AUTO')]).optional(),
  
  // Advanced Properties
  strokesIncludedInLayout: z.boolean().optional(),
  lastOnTop: z.boolean().optional(),
  
  // Child operation properties (support arrays for bulk operations)
  childIndex: z.union([z.number().min(0), z.array(z.number().min(0))]).optional(),
  fromIndex: z.number().min(0).optional(),
  toIndex: z.number().min(0).optional(),
  layoutGrow: z.union([
    z.union([z.literal(0), z.literal(1)]),
    z.array(z.union([z.literal(0), z.literal(1)]))
  ]).optional(),
  layoutAlign: z.union([
    caseInsensitiveEnum(['min', 'center', 'max', 'stretch', 'inherit']),
    z.array(caseInsensitiveEnum(['min', 'center', 'max', 'stretch', 'inherit']))
  ]).optional(),
  horizontalSizing: z.union([
    caseInsensitiveEnum(['fixed', 'hug', 'fill']),
    z.array(caseInsensitiveEnum(['fixed', 'hug', 'fill']))
  ]).optional(),
  verticalSizing: z.union([
    caseInsensitiveEnum(['fixed', 'hug', 'fill']),
    z.array(caseInsensitiveEnum(['fixed', 'hug', 'fill']))
  ]).optional(),
  
  // Grid child properties (support arrays for bulk operations)
  rowSpan: z.union([z.number().min(1), z.array(z.number().min(1))]).optional(),
  columnSpan: z.union([z.number().min(1), z.array(z.number().min(1))]).optional(),
  rowAnchor: z.union([z.number().min(0), z.array(z.number().min(0))]).optional(),
  columnAnchor: z.union([z.number().min(0), z.array(z.number().min(0))]).optional(),
  horizontalAlign: z.union([
    caseInsensitiveEnum(['left', 'center', 'right', 'stretch']),
    z.array(caseInsensitiveEnum(['left', 'center', 'right', 'stretch']))
  ]).optional(),
  verticalAlign: z.union([
    caseInsensitiveEnum(['top', 'middle', 'bottom', 'stretch']),
    z.array(caseInsensitiveEnum(['top', 'middle', 'bottom', 'stretch']))
  ]).optional(),
  
  // Bulk operation control
  failFast: z.boolean().optional(),
}).refine((data) => {
  // set_child operation requires either:
  // 1. containerId + (childIndex OR nodeId) - for single container operations
  // 2. nodeId only - for cross-parent bulk operations
  if (data.operation === 'set_child') {
    return (data.containerId !== undefined && (data.childIndex !== undefined || data.nodeId !== undefined)) ||
           (data.containerId === undefined && data.nodeId !== undefined);
  }
  // reorder_children operation requires containerId
  else if (data.operation === 'reorder_children') {
    return data.containerId !== undefined;
  }
  // Container operations require nodeId
  else {
    return data.nodeId !== undefined;
  }
}, {
  message: "set_child operation requires either 'containerId' + ('childIndex' OR 'nodeId') for single container, or just 'nodeId' for cross-parent bulk operations. reorder_children requires 'containerId'. Container operations require 'nodeId'.",
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