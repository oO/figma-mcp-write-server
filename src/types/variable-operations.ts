import { z } from 'zod';

// ================================================================================
// Variable System Operations
// ================================================================================

// Variable collection management schema
export const ManageCollectionsSchema = z.object({
  operation: z.enum(['create', 'update', 'delete', 'get', 'list', 'add_mode', 'remove_mode', 'rename_mode']),
  collectionId: z.string().optional(), // For modify operations
  collectionName: z.string().optional(), // Collection name
  modes: z.array(z.string()).optional(), // Mode names for creation
  modeId: z.string().optional(), // Specific mode ID for operations
  newModeName: z.string().optional(), // For rename operations
  description: z.string().optional(), // Collection description
  hiddenFromPublishing: z.boolean().optional(), // Publishing visibility
});

// Variable management schema
export const ManageVariablesSchema = z.object({
  operation: z.enum(['create', 'update', 'delete', 'get', 'list', 'bind', 'unbind', 'get_bindings']),
  variableId: z.string().optional(), // For variable-specific operations
  collectionId: z.string().optional(), // Collection context for creation
  variableName: z.string().optional(), // Variable name
  variableType: z.enum(['COLOR', 'FLOAT', 'STRING', 'BOOLEAN']).optional(), // Variable type
  modeValues: z.record(z.unknown()).optional(), // Values per mode
  
  // Binding operations
  nodeId: z.string().optional(), // Target node for binding
  styleId: z.string().optional(), // Target style for binding
  property: z.string().optional(), // Property to bind (e.g., "fills", "width")
  
  // Variable metadata
  description: z.string().optional(), // Variable description
  scopes: z.array(z.string()).optional(), // Property scopes
  codeSyntax: z.record(z.string()).optional(), // Platform code syntax
  hiddenFromPublishing: z.boolean().optional(), // Publishing visibility
});

// Variable collection data schema
export const VariableCollectionDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  modes: z.array(z.object({
    id: z.string(),
    name: z.string()
  })),
  defaultModeId: z.string(),
  hiddenFromPublishing: z.boolean().default(false),
  variableIds: z.array(z.string()).optional(),
});

// Variable data schema
export const VariableDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  collectionId: z.string(),
  type: z.enum(['COLOR', 'FLOAT', 'STRING', 'BOOLEAN']),
  scopes: z.array(z.string()).default([]),
  codeSyntax: z.record(z.string()).default({}),
  hiddenFromPublishing: z.boolean().default(false),
  valuesByMode: z.record(z.unknown()).default({}),
});

// Variable binding data schema
export const VariableBindingDataSchema = z.object({
  variableId: z.string(),
  nodeId: z.string().optional(),
  styleId: z.string().optional(),
  property: z.string(),
  boundValue: z.unknown().optional(),
});

// Export types
export type ManageCollectionsParams = z.infer<typeof ManageCollectionsSchema>;
export type ManageVariablesParams = z.infer<typeof ManageVariablesSchema>;
export type VariableCollectionData = z.infer<typeof VariableCollectionDataSchema>;
export type VariableData = z.infer<typeof VariableDataSchema>;
export type VariableBindingData = z.infer<typeof VariableBindingDataSchema>;