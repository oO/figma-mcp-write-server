import { z } from 'zod';
import { StandardOperations } from './figma-enums.js';

// ================================================================================
// Operation Schema Factory - Standardized Operation Schema Creation
// ================================================================================
// This file provides utilities for creating consistent operation schemas across
// all tools, reducing boilerplate and ensuring uniform validation patterns.

// Import enum utilities to avoid circular dependencies
export { EnumPreprocessor, caseInsensitiveEnum, preprocessEnumFields } from './enum-utils.js';

/**
 * Type for operation validation rules
 */
export type OperationValidationRules<T = any> = Record<string, (data: T) => boolean>;

/**
 * Type for operation-specific schema refinements
 */
export type OperationRefinements<T = any> = Record<string, z.ZodSchema<any>>;

/**
 * Configuration for operation schema creation
 */
export interface OperationSchemaConfig<T extends z.ZodRawShape> {
  /** Base CRUD operations to include */
  baseOperations?: readonly string[];
  /** Additional tool-specific operations */
  additionalOperations?: readonly string[];
  /** Schema fields for the operation */
  fields: T;
  /** Validation rules per operation */
  validationRules?: OperationValidationRules;
  /** Custom refinements per operation */
  refinements?: OperationRefinements;
  /** Default values for optional fields */
  defaults?: Partial<z.infer<z.ZodObject<T>>>;
}

/**
 * Create a standardized operation schema with consistent patterns
 */
export function createOperationSchema<T extends z.ZodRawShape>(
  config: OperationSchemaConfig<T>
): z.ZodType<any> {
  const {
    baseOperations = ['create', 'update', 'delete', 'get', 'list'],
    additionalOperations = [],
    fields,
    validationRules,
    refinements,
  } = config;

  const allOperations = [...baseOperations, ...additionalOperations] as [string, ...string[]];
  
  const baseSchema = z.object({
    operation: z.enum(allOperations),
    ...fields,
  });

  // Apply global validation rules
  let finalSchema: z.ZodType<any> = baseSchema;
  if (validationRules) {
    finalSchema = baseSchema.refine(
      (data: any) => {
        const rule = validationRules[data.operation as string];
        return rule ? rule(data) : true;
      },
      (data: any) => ({
        message: `Invalid parameters for operation: ${data.operation}`,
        path: ['operation'],
      })
    );
  }

  // Apply operation-specific refinements
  if (refinements) {
    Object.entries(refinements).forEach(([operation, refinement]) => {
      finalSchema = finalSchema.refine(
        (data: any) => {
          if (data.operation === operation) {
            try {
              refinement.parse(data);
              return true;
            } catch {
              return false;
            }
          }
          return true;
        },
        (data: any) => ({
          message: `Invalid parameters for ${operation} operation`,
          path: ['operation'],
        })
      );
    });
  }

  return finalSchema;
}

/**
 * Create a CRUD operation schema with standard operations
 */
export function createCRUDSchema<T extends z.ZodRawShape>(
  fields: T,
  additionalOperations: readonly string[] = [],
  validationRules?: OperationValidationRules
) {
  return createOperationSchema({
    baseOperations: ['create', 'update', 'delete', 'get', 'list'],
    additionalOperations,
    fields,
    validationRules,
  });
}

/**
 * Create a management operation schema (create, update, delete, get, list + tool-specific)
 */
export function createManagementSchema<T extends z.ZodRawShape>(
  toolSpecificOperations: readonly string[],
  fields: T,
  validationRules?: OperationValidationRules
) {
  return createOperationSchema({
    baseOperations: ['create', 'update', 'delete', 'get', 'list'],
    additionalOperations: toolSpecificOperations,
    fields,
    validationRules,
  });
}

/**
 * Create a simple action schema (tool-specific operations only)
 */
export function createActionSchema<T extends z.ZodRawShape>(
  operations: readonly string[],
  fields: T,
  validationRules?: OperationValidationRules
) {
  return createOperationSchema({
    baseOperations: [],
    additionalOperations: operations,
    fields,
    validationRules,
  });
}

/**
 * Common validation rules for typical operations
 */
export const CommonValidationRules = {
  /**
   * Require ID for update, delete, get operations
   */
  requiresId: (idField: string = 'nodeId'): OperationValidationRules => ({
    update: (data) => !!data[idField],
    delete: (data) => !!data[idField],
    get: (data) => !!data[idField],
  }),

  /**
   * Require name for create operations
   */
  requiresName: (nameField: string = 'name'): OperationValidationRules => ({
    create: (data) => !!data[nameField],
  }),

  /**
   * Require style ID for apply operations
   */
  requiresStyleId: (): OperationValidationRules => ({
    apply: (data) => !!data.styleId,
  }),

  /**
   * Require both node and style IDs for apply operations
   */
  requiresNodeAndStyleId: (): OperationValidationRules => ({
    apply: (data) => !!data.nodeId && !!data.styleId,
  }),

  /**
   * Require nodeIds array for bulk operations
   */
  requiresNodeIds: (): OperationValidationRules => ({
    apply_bulk: (data) => Array.isArray(data.nodeIds) && data.nodeIds.length > 0,
    update_bulk: (data) => Array.isArray(data.nodeIds) && data.nodeIds.length > 0,
    delete_bulk: (data) => Array.isArray(data.nodeIds) && data.nodeIds.length > 0,
  }),

  /**
   * Require minimum number of nodes for multi-node operations
   */
  requiresMultipleNodes: (minNodes: number = 2): OperationValidationRules => ({
    group: (data) => Array.isArray(data.nodeIds) && data.nodeIds.length >= minNodes,
    align: (data) => Array.isArray(data.nodeIds) && data.nodeIds.length >= minNodes,
    distribute: (data) => Array.isArray(data.nodeIds) && data.nodeIds.length >= minNodes,
  }),
} as const;

/**
 * Create validation rules by combining common patterns
 */
export function combineValidationRules(
  ...ruleSets: OperationValidationRules[]
): OperationValidationRules {
  return Object.assign({}, ...ruleSets);
}

/**
 * Type-safe operation schema builder with fluent interface
 */
export class OperationSchemaBuilder<T extends z.ZodRawShape> {
  private config: OperationSchemaConfig<T>;

  constructor(fields: T) {
    this.config = { fields };
  }

  /**
   * Add base CRUD operations
   */
  withCRUD(operations: readonly string[] = ['create', 'update', 'delete', 'get', 'list']) {
    this.config.baseOperations = operations;
    return this;
  }

  /**
   * Add tool-specific operations
   */
  withOperations(operations: readonly string[]) {
    this.config.additionalOperations = operations;
    return this;
  }

  /**
   * Add validation rules
   */
  withValidation(rules: OperationValidationRules) {
    this.config.validationRules = rules;
    return this;
  }

  /**
   * Add operation-specific refinements
   */
  withRefinements(refinements: OperationRefinements) {
    this.config.refinements = refinements;
    return this;
  }

  /**
   * Add default values
   */
  withDefaults(defaults: Partial<z.infer<z.ZodObject<T>>>) {
    this.config.defaults = defaults;
    return this;
  }

  /**
   * Build the final schema
   */
  build() {
    return createOperationSchema(this.config);
  }
}

/**
 * Create a new operation schema builder
 */
export function operationSchema<T extends z.ZodRawShape>(fields: T) {
  return new OperationSchemaBuilder(fields);
}

// ================================================================================
// Bulk Operation Helpers
// ================================================================================

/**
 * Add bulk operation support to existing schema
 */
export function withBulkOperations<T extends z.ZodType>(
  schema: T,
  bulkOperations: readonly string[] = ['create_bulk', 'update_bulk', 'delete_bulk']
): T {
  // This would need to be implemented based on the specific schema structure
  // For now, return the schema as-is since this is a type-level operation
  return schema;
}

/**
 * Create bulk-specific validation rules
 */
export function createBulkValidationRules(): OperationValidationRules {
  return {
    create_bulk: (data) => typeof data.count === 'number' && data.count > 0,
    update_bulk: (data) => Array.isArray(data.nodeIds) && data.nodeIds.length > 0,
    delete_bulk: (data) => Array.isArray(data.nodeIds) && data.nodeIds.length > 0,
    apply_bulk: (data) => Array.isArray(data.nodeIds) && data.nodeIds.length > 0,
  };
}

// Export commonly used patterns
export const CRUD_OPERATIONS = ['create', 'update', 'delete', 'get', 'list'] as const;
export const BULK_OPERATIONS = ['create_bulk', 'update_bulk', 'delete_bulk'] as const;
export const MANAGEMENT_OPERATIONS = [...CRUD_OPERATIONS, ...BULK_OPERATIONS] as const;