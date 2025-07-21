import { z } from 'zod';
import { caseInsensitiveEnum } from './enum-utils.js';

// ================================================================================
// Page Management Operations
// ================================================================================

export const ManagePagesSchema = z.object({
  operation: caseInsensitiveEnum(['list', 'get', 'create', 'update', 'delete', 'duplicate', 'switch', 'reorder', 'create_divider', 'get_current']),
  
  // Core parameters
  pageId: z.union([z.string(), z.array(z.string())]).optional(),
  name: z.union([z.string(), z.array(z.string())]).optional(),
  
  // List operation parameters
  detail: caseInsensitiveEnum(['minimal', 'standard', 'full']).optional(),
  
  // Create/update parameters
  insertIndex: z.union([z.number(), z.array(z.number())]).optional(),
  
  // Flattened Background Properties (solid color only currently supported)
  backgroundColor: z.union([z.string(), z.array(z.string())]).optional(), // Hex color
  backgroundOpacity: z.union([z.number(), z.array(z.number())]).optional(), // 0-1
  
  // Flattened Prototype Background Properties 
  prototypeBackgroundColor: z.union([z.string(), z.array(z.string())]).optional(), // Hex color
  prototypeBackgroundOpacity: z.union([z.number(), z.array(z.number())]).optional(), // 0-1
  
  // Flattened Guide Properties
  guideAxis: z.union([
    caseInsensitiveEnum(['x', 'y']),
    z.array(caseInsensitiveEnum(['x', 'y']))
  ]).optional(),
  guideOffset: z.union([z.number(), z.array(z.number())]).optional(),
  
  // Complex properties (for advanced use cases)
  backgrounds: z.union([z.array(z.any()), z.array(z.array(z.any()))]).optional(),
  prototypeBackgrounds: z.union([z.array(z.any()), z.array(z.array(z.any()))]).optional(),
  guides: z.union([z.array(z.any()), z.array(z.array(z.any()))]).optional(),
  flowStartingPoints: z.union([z.array(z.any()), z.array(z.array(z.any()))]).optional(),
  
  // Delete parameters
  switchToPageId: z.union([z.string(), z.array(z.string())]).optional(),
  
  // Reorder parameters
  newIndex: z.union([z.number(), z.array(z.number())]).optional(),
  
  // Bulk operation control
  failFast: z.boolean().optional()
});

// Export types
export type ManagePagesParams = z.infer<typeof ManagePagesSchema>;