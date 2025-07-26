import { z } from 'zod';

// ================================================================================
// Variable System Operations
// ================================================================================

// Variable collection management schema with bulk operations support
export const ManageCollectionsSchema = z.object({
  operation: z.enum(['create', 'update', 'delete', 'get', 'list', 'add_mode', 'remove_mode', 'rename_mode']),
  
  // Bulk-enabled parameters - support both single values and arrays
  collectionId: z.union([z.string(), z.array(z.string())]).optional(), // For modify operations
  name: z.union([z.string(), z.array(z.string())]).optional(), // Collection name
  modes: z.union([z.string(), z.array(z.string()), z.array(z.array(z.string()))]).optional(), // Mode names for creation
  modeId: z.union([z.string(), z.array(z.string())]).optional(), // Specific mode ID for operations
  modeName: z.union([z.string(), z.array(z.string())]).optional(), // For add mode operations
  newModeName: z.union([z.string(), z.array(z.string())]).optional(), // For rename operations
  description: z.union([z.string(), z.array(z.string())]).optional(), // Collection description
  hiddenFromPublishing: z.union([z.boolean(), z.array(z.boolean())]).optional() // Publishing visibility
});

// Variable management schema with bulk operations support
export const ManageVariablesSchema = z.object({
  operation: z.enum(['create_variable', 'update_variable', 'delete_variable', 'get_variable', 'list_variables', 'bind_variable', 'unbind_variable', 'create_collection', 'update_collection', 'delete_collection', 'duplicate_collection', 'get_collection', 'list_collections', 'add_mode', 'remove_mode', 'rename_mode']),
  
  // Bulk-enabled parameters - support both single values and arrays
  variableId: z.union([z.string(), z.array(z.string())]).optional(), // For variable-specific operations
  collectionId: z.union([z.string(), z.array(z.string())]).optional(), // Collection context for creation
  variableName: z.union([z.string(), z.array(z.string())]).optional(), // Variable name
  variableType: z.union([z.enum(['COLOR', 'FLOAT', 'STRING', 'BOOLEAN']), z.array(z.enum(['COLOR', 'FLOAT', 'STRING', 'BOOLEAN']))]).optional(), // Variable type
  modeValues: z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]).optional(), // Values per mode
  
  // Binding operations (bulk-enabled)
  id: z.union([z.string(), z.array(z.string())]).optional(), // Target node ID for binding
  styleId: z.union([z.string(), z.array(z.string())]).optional(), // Target style for binding
  property: z.union([z.string(), z.array(z.string())]).optional(), // Property to bind (e.g., "fills", "width")
  effectField: z.string().optional(), // Effect field for binding (radius, color, spread, offsetX, offsetY)
  gridField: z.string().optional(), // Grid field for binding (sectionSize, count, offset, gutterSize)
  
  // Variable metadata (bulk-enabled)
  description: z.union([z.string(), z.array(z.string())]).optional(), // Variable description
  scopes: z.union([z.array(z.string()), z.array(z.array(z.string()))]).optional(), // Property scopes
  codeSyntax: z.union([z.record(z.string()), z.array(z.record(z.string()))]).optional(), // Platform code syntax
  hiddenFromPublishing: z.union([z.boolean(), z.array(z.boolean())]).optional(), // Publishing visibility
  
  // Collection parameters (bulk-enabled)
  name: z.union([z.string(), z.array(z.string())]).optional(), // Collection name
  newName: z.string().optional(), // New name for duplicate_collection operation
  modes: z.union([z.string(), z.array(z.string()), z.array(z.array(z.string()))]).optional(), // Mode names for creation
  modeId: z.union([z.string(), z.array(z.string())]).optional(), // Specific mode ID for operations
  modeName: z.union([z.string(), z.array(z.string())]).optional(), // For add mode operations
  newModeName: z.union([z.string(), z.array(z.string())]).optional() // For rename operations
});


// Export types
export type ManageCollectionsParams = z.infer<typeof ManageCollectionsSchema>;
export type ManageVariablesParams = z.infer<typeof ManageVariablesSchema>;