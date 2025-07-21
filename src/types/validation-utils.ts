import { z } from 'zod';
import { 
  NodeCreationPayloadSchema, 
  NodeUpdatePayloadSchema, 
  SelectionPayloadSchema, 
  ExportPayloadSchema,
  TypedPluginResponse 
} from './plugin-communication.js';

// ================================================================================
// Type Guards and Validation Helpers
// ================================================================================

// Runtime type guards for better error handling
export function isNodeCreationPayload(payload: unknown): payload is z.infer<typeof NodeCreationPayloadSchema> {
  try {
    NodeCreationPayloadSchema.parse(payload);
    return true;
  } catch {
    return false;
  }
}

export function isNodeUpdatePayload(payload: unknown): payload is z.infer<typeof NodeUpdatePayloadSchema> {
  try {
    NodeUpdatePayloadSchema.parse(payload);
    return true;
  } catch {
    return false;
  }
}

export function isSelectionPayload(payload: unknown): payload is z.infer<typeof SelectionPayloadSchema> {
  try {
    SelectionPayloadSchema.parse(payload);
    return true;
  } catch {
    return false;
  }
}

export function isExportPayload(payload: unknown): payload is z.infer<typeof ExportPayloadSchema> {
  try {
    ExportPayloadSchema.parse(payload);
    return true;
  } catch {
    return false;
  }
}

// Type guard for plugin responses
export function isValidPluginResponse<T>(response: unknown): response is TypedPluginResponse<T> {
  if (typeof response !== 'object' || response === null) return false;
  const r = response as Record<string, unknown>;
  return typeof r.id === 'string' && typeof r.success === 'boolean';
}

// Validation helper with detailed error reporting
/**
 * KISS: Validates and returns data directly, or throws errors
 */
export function validateAndParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T {
  try {
    const result = schema.parse(data);
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.errors.map(issue => {
        const paramName = issue.path.length > 0 ? issue.path.join('.') : 'parameter';
        const message = issue.message;
        
        // Provide more helpful error messages for common cases
        if (issue.code === 'invalid_enum_value') {
          // Special case: text node type in figma_nodes operations
          if (paramName === 'nodeType' && issue.received === 'text' && 
              issue.options && issue.options.includes('rectangle') && issue.options.includes('ellipse')) {
            return `Parameter '${paramName}' has invalid value '${issue.received}'. Text nodes should be created using the figma_text tool, not figma_nodes. Use figma_text for text node creation and management.`;
          }
          return `Parameter '${paramName}' has invalid value '${issue.received}'. Expected one of: ${issue.options?.join(', ')}`;
        }
        
        // Handle union validation failures that often have empty paths
        if (issue.code === 'invalid_union' && paramName === 'parameter') {
          // Try to identify the actual parameter causing the issue from the union errors
          const unionErrors = (issue as any).unionErrors || [];
          for (const unionError of unionErrors) {
            if (unionError.errors) {
              for (const subError of unionError.errors) {
                if (subError.code === 'invalid_enum_value' && subError.path && subError.path.length > 0) {
                  const actualParamName = subError.path.join('.');
                  // Special case: text node type in figma_nodes operations
                  if (actualParamName === 'nodeType' && subError.received === 'text') {
                    return `Parameter '${actualParamName}' has invalid value '${subError.received}'. Text nodes should be created using the figma_text tool, not figma_nodes. Use figma_text for text node creation and management.`;
                  }
                  return `Parameter '${actualParamName}' has invalid value '${subError.received}'. Expected one of: ${subError.options?.join(', ')}`;
                }
              }
            }
          }
        }
        if (issue.code === 'invalid_type') {
          return `Parameter '${paramName}' has wrong type. Expected ${issue.expected}, got ${issue.received}`;
        }
        if (issue.code === 'invalid_string' && issue.validation === 'regex') {
          // Enhanced regex error messages with common pattern recognition
          // For regex validation, extract the actual value from the original data using the path
          let value = 'provided value';
          try {
            if (issue.path.length > 0) {
              // Navigate to the specific field in the original data
              let current = data;
              for (const pathSegment of issue.path) {
                current = (current as any)[pathSegment];
              }
              value = String(current);
            } else if (typeof data === 'string') {
              // If path is empty and data is a string, use the data directly
              value = data;
            }
          } catch (e) {
            // Fallback to generic message if path navigation fails
            value = 'provided value';
          }
          
          // Common parameter-specific guidance
          if (paramName.toLowerCase().includes('color') || paramName === 'fillColor' || paramName === 'strokeColor' || paramName === 'backgroundColor') {
            return `Parameter '${paramName}' has invalid color format '${value}'. Expected hex format '#RRGGBB' or '#RRGGBBAA' (e.g., '#FF5733' or '#FF573380')`;
          }
          if (paramName.toLowerCase().includes('owner') && typeof value === 'string') {
            return `Parameter '${paramName}' has invalid format '${value}'. Expected format "node:ID" or "style:ID" (e.g., "node:123:456" or "style:S:abc123")`;
          }
          if (paramName.toLowerCase().includes('id') && typeof value === 'string') {
            return `Parameter '${paramName}' has invalid ID format '${value}'. Expected valid Figma ID format`;
          }
          
          // Generic regex error with better messaging
          return `Parameter '${paramName}' has invalid format '${value}'. Please check the expected format in the documentation`;
        }
        if (issue.code === 'too_small') {
          const minimum = (issue as any).minimum;
          const received = (issue as any).received;
          if (typeof minimum === 'number') {
            return `Parameter '${paramName}' value ${received} is too small. Minimum allowed: ${minimum}`;
          }
          return `Parameter '${paramName}' is too small. ${message}`;
        }
        if (issue.code === 'too_big') {
          const maximum = (issue as any).maximum;
          const received = (issue as any).received;
          if (typeof maximum === 'number') {
            return `Parameter '${paramName}' value ${received} is too large. Maximum allowed: ${maximum}`;
          }
          return `Parameter '${paramName}' is too large. ${message}`;
        }
        if (issue.code === 'invalid_literal') {
          return `Parameter '${paramName}' has invalid value '${issue.received}'. Expected: '${(issue as any).expected}'`;
        }
        
        // Handle generic "Invalid input" messages with more context
        if (message === 'Invalid input') {
          if (issue.code === 'invalid_union') {
            // Special case: Check if this is a text node type error in union validation
            const unionErrors = (issue as any).unionErrors;
            if (unionErrors) {
              // Check for nested text node errors
              const hasTextNodeError = unionErrors.some((unionError: any) => 
                unionError.issues?.some((innerIssue: any) => {
                  // Direct enum error
                  if (innerIssue.code === 'invalid_enum_value' && 
                      innerIssue.received === 'text' && 
                      innerIssue.options?.includes('rectangle')) {
                    return true;
                  }
                  // Nested union error
                  if (innerIssue.code === 'invalid_union' && innerIssue.unionErrors) {
                    return innerIssue.unionErrors.some((nestedError: any) =>
                      nestedError.issues?.some((nestedIssue: any) =>
                        nestedIssue.code === 'invalid_enum_value' && 
                        nestedIssue.received === 'text' && 
                        nestedIssue.options?.includes('rectangle')
                      )
                    );
                  }
                  return false;
                })
              );
              if (hasTextNodeError) {
                return `Parameter 'nodeType' has invalid value 'text'. Text nodes should be created using the figma_text tool, not figma_nodes. Use figma_text for text node creation and management.`;
              }
            }
            return `Parameter '${paramName}' has invalid value. Please check the expected format or type for this parameter`;
          }
          return `Parameter '${paramName}' has invalid value '${(issue as any).received || (issue as any).input || 'provided value'}'. Please check the documentation for valid values`;
        }
        
        return `Parameter '${paramName}': ${message}`;
      }).join('; ');
      // KISS: Throw validation error directly
      throw new Error(`Validation failed: ${context ? context + ': ' : ''}${issues}`);
    }
    // KISS: Throw unknown validation error directly
    throw new Error(`Validation failed: ${context ? context + ': ' : ''}Unknown validation error: ${String(error)}`);
  }
}

// Safe type assertion with runtime validation
export function assertType<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  errorMessage?: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    throw new Error(errorMessage || `Type assertion failed: ${String(error)}`);
  }
}

// Utility for creating typed message handlers
export function createTypedHandler<TPayload, TResponse>(
  payloadSchema: z.ZodSchema<TPayload>,
  handler: (payload: TPayload) => Promise<TResponse>
) {
  return async (rawPayload: unknown): Promise<TypedPluginResponse<TResponse>> => {
    try {
      // KISS: validateAndParse now throws on validation errors
      const validatedPayload = validateAndParse(payloadSchema, rawPayload, 'payload');
      const result = await handler(validatedPayload);
      
      // KISS: Return data directly with ID placeholder
      return {
        id: '', // Will be set by caller
        data: result
      };
    } catch (error) {
      // KISS: All errors (validation + handler) are thrown
      const errorMessage = error instanceof Error ? error.toString() : String(error);
      throw new Error(`Handler failed: ${errorMessage}`);
    }
  };
}