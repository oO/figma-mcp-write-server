import { z } from 'zod';
import { FigmaNodeTypes, FigmaCreateNodeTypes, FigmaTextAlign, FigmaExportFormats } from './figma-enums.js';
import { caseInsensitiveEnum } from './enum-utils.js';
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
  ExportFields,
  BulkIdentificationFields,
  BulkPositionFields,
  BulkDimensionFields,
  BulkVisualFields,
  BulkColorFields,
  BulkMetadataFields,
  BulkControlFields
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





// ================================================================================
// Bulk-Enabled Node Operation Schemas - Support for Array Parameters
// ================================================================================

// Bulk-enabled node creation schema (uses CreateNodeSchema validation)
export const BulkCreateNodeSchema = z.object({
  operation: z.enum(['create']),
  nodeType: z.union([FigmaCreateNodeTypes, z.array(FigmaCreateNodeTypes)]),
  ...BulkPositionFields,
  ...BulkDimensionFields,
  ...BulkVisualFields,
  ...BulkColorFields,
  ...BulkMetadataFields,
  ...BulkControlFields,
  
  // Bulk-enabled node-specific properties  
  strokeWidth: z.union([z.number().min(0), z.array(z.number().min(0))]).optional(),
  // Note: characters/content removed - use figma_text for text creation
  
  // Frame-specific properties (bulk-enabled)
  clipsContent: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  
  // Shape-specific properties (bulk-enabled)
  pointCount: z.union([z.number().min(3), z.array(z.number().min(3))]).optional(),
  innerRadius: z.union([z.number().min(0).max(1), z.array(z.number().min(0).max(1))]).optional(),
}).refine((data) => {
  // Prevent text node creation in figma_nodes tool
  const nodeTypes = Array.isArray(data.nodeType) ? data.nodeType : [data.nodeType];
  const hasTextNode = nodeTypes.some(type => type?.toLowerCase() === 'text');
  return !hasTextNode;
}, {
  message: "Text nodes should be created using the figma_text tool, not figma_nodes. Use figma_text for text node creation and management."
});

// Bulk-enabled node update schema
export const BulkUpdateNodeSchema = z.object({
  operation: z.enum(['update']),
  nodeId: z.union([
    z.string(),
    z.array(z.string())
  ]),
  ...BulkPositionFields,
  ...BulkDimensionFields,
  ...BulkVisualFields,
  ...BulkColorFields,
  ...BulkMetadataFields,
  ...BulkControlFields,
  
  // Bulk-enabled node-specific update properties
  strokeWidth: z.union([z.number().min(0), z.array(z.number().min(0))]).optional(),
  characters: z.union([z.string(), z.array(z.string())]).optional(),
  content: z.union([z.string(), z.array(z.string())]).optional(),
  
  // Frame-specific properties (bulk-enabled)
  clipsContent: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  
  // Shape-specific properties (bulk-enabled)
  pointCount: z.union([z.number().min(3), z.array(z.number().min(3))]).optional(),
  innerRadius: z.union([z.number().min(0).max(1), z.array(z.number().min(0).max(1))]).optional(),
});

// Bulk-enabled node delete schema
export const BulkDeleteNodeSchema = z.object({
  operation: z.enum(['delete']),
  nodeId: z.union([
    z.string(),
    z.array(z.string())
  ]),
  ...BulkControlFields,
});

// Bulk-enabled node duplicate schema
export const BulkDuplicateNodeSchema = z.object({
  operation: z.enum(['duplicate']),
  nodeId: z.union([
    z.string(),
    z.array(z.string())
  ]),
  offsetX: z.union([z.number(), z.array(z.number())]).optional(),
  offsetY: z.union([z.number(), z.array(z.number())]).optional(),
  ...BulkControlFields,
});

// Bulk-enabled node get schema
export const BulkGetNodeSchema = z.object({
  operation: z.enum(['get']),
  nodeId: z.union([
    z.string(),
    z.array(z.string())
  ]),
  ...BulkControlFields,
});

// Bulk-enabled node export schema
export const BulkExportNodesSchema = z.object({
  operation: z.enum(['export']),
  nodeId: z.union([
    z.string(),
    z.array(z.string())
  ]),
  
  // Export format parameters (bulk-aware)
  format: z.union([
    caseInsensitiveEnum(['PNG', 'SVG', 'JPG', 'PDF']),
    z.array(caseInsensitiveEnum(['PNG', 'SVG', 'JPG', 'PDF']))
  ]).optional(),
  
  // Export scale parameters (bulk-aware)
  scale: z.union([
    z.number().min(0.5).max(4),
    z.array(z.number().min(0.5).max(4))
  ]).optional(),
  
  // Output type parameters (bulk-aware)
  output: z.union([
    caseInsensitiveEnum(['file', 'data']),
    z.array(caseInsensitiveEnum(['file', 'data']))
  ]).optional(),
  
  // Output directory parameters (bulk-aware)
  outputDirectory: z.union([
    z.string(),
    z.array(z.string())
  ]).optional(),
  
  // Data format parameters (bulk-aware)
  dataFormat: z.union([
    caseInsensitiveEnum(['base64', 'hex']),
    z.array(caseInsensitiveEnum(['base64', 'hex']))
  ]).optional(),
  
  ...BulkControlFields,
});

// Simple single schema like ManageTextSchema
export const UnifiedNodeOperationsSchema = z.object({
  operation: caseInsensitiveEnum(['create', 'get', 'update', 'delete', 'duplicate']),
  
  // Core identification
  nodeId: z.union([z.string(), z.array(z.string())]).optional(),
  
  // Create-specific
  nodeType: z.union([FigmaCreateNodeTypes, z.array(FigmaCreateNodeTypes)]).optional(),
  
  // Basic properties
  ...BulkPositionFields,
  ...BulkDimensionFields,
  ...BulkVisualFields,
  ...BulkColorFields,
  ...BulkMetadataFields,
  ...BulkControlFields,
}).refine((data) => {
  // Validate required fields based on operation
  switch (data.operation) {
    case 'create':
      // Must have nodeType for create
      if (!data.nodeType) return false;
      if (Array.isArray(data.nodeType)) {
        return data.nodeType.length > 0;
      }
      return true;
    case 'get':
    case 'update':
    case 'delete':
    case 'duplicate':
      // Must have nodeId for these operations
      if (!data.nodeId) return false;
      if (Array.isArray(data.nodeId)) {
        return data.nodeId.length > 0 && data.nodeId.every(id => id && id.trim().length > 0);
      }
      return typeof data.nodeId === 'string' && data.nodeId.trim().length > 0;
    default:
      return true;
  }
}, (val) => ({
  message: `Missing required parameters for operation '${val.operation}': ${
    val.operation === 'create' ? "'nodeType' is required" :
    ['get', 'update', 'delete', 'duplicate'].includes(val.operation) ? "'nodeId' is required" :
    "Missing required parameters"
  }`
}));

// Export types
export type TextStyleRange = z.infer<typeof TextStyleRangeSchema>;

// Bulk operation types
export type BulkCreateNodeParams = z.infer<typeof BulkCreateNodeSchema>;
export type BulkUpdateNodeParams = z.infer<typeof BulkUpdateNodeSchema>;
export type BulkDeleteNodeParams = z.infer<typeof BulkDeleteNodeSchema>;
export type BulkDuplicateNodeParams = z.infer<typeof BulkDuplicateNodeSchema>;
export type BulkGetNodeParams = z.infer<typeof BulkGetNodeSchema>;
export type UnifiedNodeOperationsParams = z.infer<typeof UnifiedNodeOperationsSchema>;