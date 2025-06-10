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
export function validateAndParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.errors.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');
      return {
        success: false,
        error: `${context ? context + ': ' : ''}Validation failed: ${issues}`
      };
    }
    return {
      success: false,
      error: `${context ? context + ': ' : ''}Unknown validation error: ${String(error)}`
    };
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
    const validation = validateAndParse(payloadSchema, rawPayload, 'payload');
    
    if (!validation.success) {
      return {
        id: '', // Will be set by caller
        success: false,
        error: validation.error
      };
    }
    
    try {
      const result = await handler(validation.data);
      return {
        id: '', // Will be set by caller
        success: true,
        data: result
      };
    } catch (error) {
      return {
        id: '', // Will be set by caller
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  };
}