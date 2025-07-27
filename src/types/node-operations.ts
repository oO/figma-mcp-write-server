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
  operation: caseInsensitiveEnum([
    'get', 'list', 'update', 'delete', 'duplicate', 
    'create_rectangle', 'create_ellipse', 'create_frame', 'create_section', 'create_slice', 'create_star', 'create_polygon',
    'update_rectangle', 'update_ellipse', 'update_frame', 'update_section', 'update_slice', 'update_star', 'update_polygon'
  ]),
  
  // Core identification
  nodeId: z.union([z.string(), z.array(z.string())]).optional(),
  
  // Parent container for create operations
  parentId: z.string().optional(),
  
  // Basic properties
  ...BulkPositionFields,
  ...BulkDimensionFields,
  ...BulkVisualFields,
  ...BulkColorFields,
  ...BulkMetadataFields,
  ...BulkControlFields,
  
  // Type-specific properties
  // Rectangle and Frame properties
  cornerRadius: z.union([z.number().min(0), z.array(z.number().min(0))]).optional(),
  topLeftRadius: z.union([z.number().min(0), z.array(z.number().min(0))]).optional(),
  topRightRadius: z.union([z.number().min(0), z.array(z.number().min(0))]).optional(),
  bottomLeftRadius: z.union([z.number().min(0), z.array(z.number().min(0))]).optional(),
  bottomRightRadius: z.union([z.number().min(0), z.array(z.number().min(0))]).optional(),
  cornerSmoothing: z.union([z.number().min(0).max(1), z.array(z.number().min(0).max(1))]).optional(),
  
  // Frame-specific properties
  clipsContent: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  
  // Section-specific properties
  sectionContentsHidden: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  devStatus: z.union([
    caseInsensitiveEnum(['READY_FOR_DEV', 'IN_DEVELOPMENT', 'COMPLETED']),
    z.array(caseInsensitiveEnum(['READY_FOR_DEV', 'IN_DEVELOPMENT', 'COMPLETED']))
  ]).optional(),
  
  // Star and Polygon properties
  pointCount: z.union([z.number().min(3), z.array(z.number().min(3))]).optional(),
  innerRadius: z.union([z.number().min(0).max(1), z.array(z.number().min(0).max(1))]).optional(),
  
  // Offset properties for duplication
  offsetX: z.union([z.number(), z.array(z.number())]).optional(),
  offsetY: z.union([z.number(), z.array(z.number())]).optional(),
  
  // Count for bulk creation
  count: z.number().min(1).max(100).optional(),
  
  // List operation filter parameters
  filterByName: z.string().optional(),
  filterByType: z.union([z.string(), z.array(z.string())]).optional(),
  filterByVisibility: caseInsensitiveEnum(['visible', 'hidden', 'all']).optional(),
  filterByLockedState: z.boolean().optional(),
  traversal: caseInsensitiveEnum(['children', 'ancestors', 'siblings', 'descendants']).optional(),
  maxDepth: z.number().min(0).optional(),
  maxResults: z.number().min(1).optional(),
  includeAllPages: z.boolean().optional(),
  detail: caseInsensitiveEnum(['minimal', 'standard', 'detailed']).optional(),
  pageId: z.string().optional(),
}).refine((data) => {
  // Validate required fields based on operation
  const createOps = ['create_rectangle', 'create_ellipse', 'create_frame', 'create_section', 'create_slice', 'create_star', 'create_polygon'];
  const updateOps = ['get', 'update', 'delete', 'duplicate', 'update_rectangle', 'update_ellipse', 'update_frame', 'update_section', 'update_slice', 'update_star', 'update_polygon'];
  
  if (updateOps.includes(data.operation)) {
    // Must have nodeId for these operations
    if (!data.nodeId) return false;
    if (Array.isArray(data.nodeId)) {
      return data.nodeId.length > 0 && data.nodeId.every(id => id && id.trim().length > 0);
    }
    return typeof data.nodeId === 'string' && data.nodeId.trim().length > 0;
  }
  
  return true;
}, (val) => ({
  message: `Missing required parameters for operation '${val.operation}': ${
    ['get', 'update', 'delete', 'duplicate', 'update_rectangle', 'update_ellipse', 'update_frame', 'update_section', 'update_slice', 'update_star', 'update_polygon'].includes(val.operation) ? "'nodeId' is required" :
    "Missing required parameters"
  }`
})).refine((data) => {
  // Validate that count parameter is only used with duplicate operation
  if (data.count !== undefined && data.operation !== 'duplicate') {
    return false;
  }
  return true;
}, (val) => ({
  message: `Parameter 'count' is only valid for duplicate operations, not '${val.operation}'`
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