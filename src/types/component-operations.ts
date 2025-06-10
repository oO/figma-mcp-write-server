import { z } from 'zod';

// ================================================================================
// Component System Operations
// ================================================================================

// Component property definition for variant creation
export const ComponentPropertySchema = z.object({
  name: z.string(),
  type: z.enum(['BOOLEAN', 'TEXT', 'INSTANCE_SWAP', 'VARIANT']),
  defaultValue: z.union([z.string(), z.boolean(), z.null()]).optional(),
  values: z.array(z.string()).optional(), // For VARIANT type
  preferredValues: z.array(z.string()).optional(), // For TEXT type
});

// Manage components schema (consolidated)
export const ManageComponentsSchema = z.object({
  operation: z.enum(['create', 'create_set', 'add_variant', 'remove_variant', 'update', 'delete', 'get']),
  nodeId: z.string().optional(), // Source node to convert (for create)
  componentIds: z.array(z.string()).optional(), // Components to combine (for create_set)
  componentId: z.string().optional(), // Target component (for modify operations)
  name: z.string().optional(), // Component/set name
  description: z.string().optional(), // Component description
  variantProperties: z.record(z.array(z.string())).optional(), // Variant properties
});

// Manage instances schema
export const ManageInstancesSchema = z.object({
  operation: z.enum(['create', 'swap', 'detach', 'reset_overrides', 'set_override', 'get']),
  componentId: z.string().optional(), // Source component (for create)
  instanceId: z.string().optional(), // Target instance (for modify operations)
  overrides: z.record(z.unknown()).optional(), // Property overrides
  swapTarget: z.string().optional(), // New component (for swap operation)
  x: z.number().optional(), // Position (for create operation)
  y: z.number().optional(), // Position (for create operation)
});

// Component response data schemas
export const ComponentDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal('COMPONENT'),
  description: z.string().optional(),
  componentSetId: z.string().optional(),
  properties: z.array(ComponentPropertySchema).optional(),
  variantProperties: z.record(z.string()).optional(),
});

export const ComponentSetDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal('COMPONENT_SET'),
  components: z.array(z.string()), // Component IDs
  variantProperties: z.record(z.array(z.string())),
});

export const InstanceDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal('INSTANCE'),
  componentId: z.string(),
  overrides: z.record(z.unknown()).optional(),
  detached: z.boolean().default(false),
});

// Export types
export type ComponentProperty = z.infer<typeof ComponentPropertySchema>;
export type ManageComponentsParams = z.infer<typeof ManageComponentsSchema>;
export type ManageInstancesParams = z.infer<typeof ManageInstancesSchema>;
export type ComponentData = z.infer<typeof ComponentDataSchema>;
export type ComponentSetData = z.infer<typeof ComponentSetDataSchema>;
export type InstanceData = z.infer<typeof InstanceDataSchema>;