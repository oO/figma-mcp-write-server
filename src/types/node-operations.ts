import { z } from 'zod';
import { FigmaNodeTypes, FigmaCreateNodeTypes, FigmaTextAlign, FigmaExportFormats } from './figma-enums.js';
import { 
  BasicNodeFields,
  BasicCreateFields,
  BasicUpdateFields,
  TypographyFields,
  ColorFields,
  PositionFields,
  DimensionFields,
  IdentificationFields,
  OptionalIdentificationFields,
  ExportFields
} from './common-fields.js';
import { 
  createActionSchema,
  CommonValidationRules,
  combineValidationRules
} from './operation-factory.js';

// ================================================================================
// Node Operation Schemas - Consolidated with Shared Types
// ================================================================================

// Text styling with ranges (node-specific, not commonly reused)
export const TextStyleRangeSchema = z.object({
  start: z.number(),
  end: z.number(),
  ...TypographyFields, // Use shared typography fields
  fillColor: z.string().optional(),
});

// Node creation schema using shared components
export const CreateNodeSchema = z.object({
  nodeType: FigmaCreateNodeTypes,
  ...BasicCreateFields, // Use creation fields without ID requirements
  ...ColorFields,
  
  // Node-specific properties
  strokeWidth: z.number().min(0).optional(),
  characters: z.string().optional(), // For text nodes
  content: z.string().optional(), // Legacy text content field
  
  // Frame-specific properties
  clipsContent: z.boolean().optional(),
  
  // Shape-specific properties
  pointCount: z.number().min(3).optional(), // star nodes
  innerRadius: z.number().min(0).max(1).optional(), // star nodes
  
  // Text properties using shared typography fields
  ...TypographyFields,
  
  // Advanced styling
  styleRanges: z.array(TextStyleRangeSchema).optional(),
  createStyle: z.boolean().optional(),
  styleName: z.string().optional(),
}).refine((data) => {
  // Text nodes must have content
  if (data.nodeType === 'text') {
    return (data.characters && data.characters.trim().length > 0) || 
           (data.content && data.content.trim().length > 0);
  }
  return true;
}, {
  message: "Text nodes must have non-empty content (characters or content field)"
});

// Node update schema using shared components
export const UpdateNodeSchema = z.object({
  ...BasicUpdateFields, // Includes required nodeId field
  ...ColorFields,
  ...TypographyFields,
  
  // Node-specific update properties
  strokeWidth: z.number().min(0).optional(),
  characters: z.string().optional(),
  content: z.string().optional(), // Legacy support
  
  // Frame-specific properties
  clipsContent: z.boolean().optional(),
  
  // Shape-specific properties
  pointCount: z.number().min(3).optional(),
  innerRadius: z.number().min(0).max(1).optional(),
  
  // Legacy support for arbitrary properties
  properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
}); // nodeId is now required by BasicUpdateFields, no need for refine

// Node management operations using operation factory
export const ManageNodesSchema = createActionSchema(
  ['move', 'delete', 'duplicate'],
  {
    nodeId: z.string(), // Required for all operations
    ...PositionFields,
  },
  {
    // Operation-specific validation
    move: (data) => data.x !== undefined || data.y !== undefined,
  }
);

// Selection operations using shared fields
export const SetSelectionSchema = z.object({
  nodeIds: z.array(z.string()).min(1),
});

export const GetPageNodesSchema = z.object({
  detail: z.enum(['simple', 'standard', 'detailed']).default('standard'),
  includeHidden: z.boolean().default(false),
  includePages: z.boolean().default(false),
  nodeTypes: z.array(z.string()).optional(),
  maxDepth: z.number().optional(),
});

// Export operations using shared export fields
export const ExportNodeSchema = z.object({
  ...IdentificationFields,
  ...ExportFields,
}).refine((data) => {
  return !!data.nodeId;
}, {
  message: "Node ID is required for export operations"
});

// Export types
export type TextStyleRange = z.infer<typeof TextStyleRangeSchema>;
export type CreateNodeParams = z.infer<typeof CreateNodeSchema>;
export type UpdateNodeParams = z.infer<typeof UpdateNodeSchema>;
export type ManageNodesParams = z.infer<typeof ManageNodesSchema>;
export type SetSelectionParams = z.infer<typeof SetSelectionSchema>;
export type GetPageNodesParams = z.infer<typeof GetPageNodesSchema>;
export type ExportNodeParams = z.infer<typeof ExportNodeSchema>;