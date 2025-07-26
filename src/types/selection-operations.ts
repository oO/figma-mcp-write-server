import { z } from 'zod';
import { 
  createActionSchema,
  CommonValidationRules
} from './operation-factory.js';
import { caseInsensitiveEnum } from './enum-utils.js';

// ================================================================================
// Selection Management Schemas
// ================================================================================

// Selection operations are purely action-based (no CRUD operations)
export const ManageSelectionSchema = createActionSchema(
  ['get_selection', 'set_selection', 'list_nodes'],
  {
    // Page and node targeting
    pageId: z.string().optional(),
    nodeId: z.union([z.string(), z.array(z.string())]).optional(),
    
    // Traversal options
    traversal: caseInsensitiveEnum(['children', 'ancestors', 'siblings', 'descendants']).optional(),
    
    filterByType: z.union([z.string(), z.array(z.string())]).optional(),
    filterByName: z.string().optional(),
    filterByVisibility: caseInsensitiveEnum(['visible', 'hidden', 'all']).optional(),
    filterByLockedState: z.boolean().optional(),
    
    // Detail and filtering options
    detail: caseInsensitiveEnum(['minimal', 'standard', 'full']).optional(),
    includeAllPages: z.boolean().optional(),
    maxDepth: z.number().min(1).optional(),
    maxResults: z.number().min(1).max(1000).optional(),
    
    // Behavior options
    focus: z.boolean().optional()
  },
  {
    // Operation-specific validation rules with better error messages
    set_selection: (data: any) => {
      // Check if any valid parameter is provided (non-empty)
      const hasNodeId = data.nodeId && (Array.isArray(data.nodeId) ? data.nodeId.length > 0 : data.nodeId.trim() !== '');
      const hasFilter = data.filterByType || data.filterByName || data.filterByLockedState !== undefined || data.traversal;
      const hasAnySelection = hasNodeId || hasFilter;
      
      if (!hasAnySelection) {
        throw new Error('set_selection requires at least one parameter: nodeId (non-empty), filterByType, filterByName, filterByLockedState, or traversal');
      }
      
      return true;
    }
  }
);

export type ManageSelectionParams = z.infer<typeof ManageSelectionSchema>;