import { z } from 'zod';
import { caseInsensitiveEnum } from './enum-utils.js';

// ================================================================================
// Hierarchy Management Operations
// ================================================================================

export const ManageHierarchySchema = z.object({
  operation: caseInsensitiveEnum(['group', 'ungroup', 'parent', 'unparent', 'order_by_index', 'order_by_depth', 'move_to_page']),
  nodeId: z.union([z.string(), z.array(z.string())]).optional(),
  nodeIds: z.union([
    z.array(z.string()), 
    z.array(z.array(z.string()))
  ]).optional(),
  parentId: z.union([z.string(), z.array(z.string())]).optional(),
  index: z.union([z.number(), z.array(z.number())]).optional(),
  name: z.union([z.string(), z.array(z.string())]).optional(),
  position: z.union([
    caseInsensitiveEnum(['forward', 'backward', 'front', 'back']),
    z.array(caseInsensitiveEnum(['forward', 'backward', 'front', 'back']))
  ]).optional(),
  targetId: z.union([z.string(), z.array(z.string())]).optional(),
  failFast: z.boolean().optional()
});

// Export types
export type ManageHierarchyParams = z.infer<typeof ManageHierarchySchema>;