import { z } from 'zod';
import { caseInsensitiveEnum } from './enum-utils.js';

// ================================================================================
// Component System Operations
// ================================================================================


// Manage components schema (consolidated)
export const ManageComponentsSchema = z.object({
  operation: caseInsensitiveEnum(['create', 'create_set', 'create_instance', 'update', 'delete', 'publish', 'list', 'get', 'detach_instance', 'swap_instance']),
  nodeId: z.union([z.string(), z.array(z.string())]).optional(), // Source node(s) to convert (for create) - supports bulk
  componentIds: z.array(z.string()).optional(), // Components to combine (for create_set) - array only, not bulk-aware
  componentId: z.union([z.string(), z.array(z.string())]).optional(), // Target component(s) (for modify operations) - supports bulk
  instanceId: z.union([z.string(), z.array(z.string())]).optional(), // Target instance(s) (for instance operations) - supports bulk
  newComponentId: z.union([z.string(), z.array(z.string())]).optional(), // New component(s) (for swap operations) - supports bulk
  id: z.union([z.string(), z.array(z.string())]).optional(), // Universal node ID(s) - works for components, instances, or component sets - supports bulk
  componentSetId: z.string().optional(), // Component set ID for operations
  name: z.union([z.string(), z.array(z.string())]).optional(), // Component/set name(s) - supports bulk
  description: z.union([z.string(), z.array(z.string())]).optional(), // Component description(s) - supports bulk
  variantProperties: z.array(z.string()).optional(), // Flattened variant properties array (parallel to componentIds): ["type=Primary, size=Small", "type=Secondary, size=Large"]
  properties: z.record(z.unknown()).optional(), // Component properties to update
  variantName: z.string().optional(), // Variant property name to change (for change_variant)
  variantValue: z.string().optional(), // New variant property value (for change_variant)
  variants: z.record(z.string()).optional(), // Multiple variant properties to change (for change_variant)
  x: z.union([z.number(), z.array(z.number())]).optional(), // Position(s) for created components - supports bulk
  y: z.union([z.number(), z.array(z.number())]).optional(), // Position(s) for created components - supports bulk
  includeInstances: z.boolean().nullable().optional(), // Include instances in listing
  filterType: caseInsensitiveEnum(['all', 'components', 'component_sets']).optional(), // Filter type for listing
});

// Manage instances schema
export const ManageInstancesSchema = z.object({
  operation: caseInsensitiveEnum(['create', 'update', 'duplicate', 'detach', 'swap', 'reset_overrides', 'get', 'list']),
  componentId: z.union([z.string(), z.array(z.string())]).optional(), // Source component(s) (for create) - supports bulk
  instanceId: z.union([z.string(), z.array(z.string())]).optional(), // Instance ID(s) for target operations - supports bulk
  mainComponentId: z.union([z.string(), z.array(z.string())]).optional(), // New component(s) (for swap operation) - supports bulk
  name: z.union([z.string(), z.array(z.string())]).optional(), // Instance name(s) - supports bulk
  overrides: z.record(z.unknown()).optional(), // Property overrides
  x: z.union([z.number(), z.array(z.number())]).optional(), // Position(s) - supports bulk
  y: z.union([z.number(), z.array(z.number())]).optional(), // Position(s) - supports bulk
});


// Export types
export type ManageComponentsParams = z.infer<typeof ManageComponentsSchema>;
export type ManageInstancesParams = z.infer<typeof ManageInstancesSchema>;