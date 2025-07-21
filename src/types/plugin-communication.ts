import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types';
import { ManageImagesSchema } from './image-operations.js';

// ================================================================================
// Plugin Communication & MCP Server Types
// ================================================================================

// Plugin communication payloads
export const NodeCreationPayloadSchema = z.object({
  nodeType: z.string(),
  name: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  fillColor: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  cornerRadius: z.number().optional(),
  content: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  fontStyle: z.string().optional()
});

export const NodeUpdatePayloadSchema = z.object({
  nodeId: z.string(),
  properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
});

export const SelectionPayloadSchema = z.object({
  nodeIds: z.array(z.string()).optional()
});

export const ExportPayloadSchema = z.object({
  nodeId: z.string(),
  format: z.enum(['PNG', 'JPG', 'SVG', 'PDF']).optional(),
  scale: z.number().optional()
});

// Plugin message schema
export const PluginMessageSchema = z.object({
  id: z.string(),
  type: z.enum([
    'GET_SELECTION',
    'CREATE_NODE',
    'MANAGE_TEXT',
    'CREATE_STAR',
    'CREATE_POLYGON',
    'UPDATE_NODE',
    'DELETE_NODE',
    'DUPLICATE_NODE',
    'GET_PAGE_NODES',
    'SET_SELECTION',
    'MANAGE_STYLES',
    'EXPORT_NODE',
    'MANAGE_AUTO_LAYOUT',
    'MANAGE_CONSTRAINTS',
    'MANAGE_COMPONENTS',
    'MANAGE_INSTANCES',
    'MANAGE_COLLECTIONS',
    'MANAGE_VARIABLES',
    'MANAGE_IMAGES',
    'PLUGIN_READY',
    'HEARTBEAT'
  ]),
  payload: z.union([
    NodeCreationPayloadSchema,
    NodeUpdatePayloadSchema,
    SelectionPayloadSchema,
    ExportPayloadSchema,
    ManageImagesSchema,
    z.record(z.unknown())
  ]).optional(),
});

export const PluginResponseSchema = z.object({
  id: z.string(),
  success: z.boolean(),
  data: z.union([
    z.record(z.unknown()),
    z.array(z.record(z.unknown()))
  ]).optional(),
  error: z.string().optional(),
});

// Tool handler interface
export interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface ToolHandler {
  getTools(): Tool[];
  handle(toolName: string, args: any): Promise<any>;
}

// Enhanced response and operation types
export interface NodeOperationResult {
  success: boolean;
  nodeId?: string;        // for create_node
  message: string;
  warnings?: string[];    // for non-critical issues (e.g., clamped values)
  properties?: {          // echo back applied properties
    [key: string]: any;
  };
}

// Generic plugin communication types
export interface TypedPluginMessage<TPayload = unknown> {
  id: string;
  type: string;
  payload?: TPayload;
}

/**
 * KISS: TypedPluginResponse returns data directly, errors are thrown
 */
export interface TypedPluginResponse<TData = unknown> {
  id: string;
  data: TData;
}

// Export schema types
export type PluginMessage = z.infer<typeof PluginMessageSchema>;
export type PluginResponse = z.infer<typeof PluginResponseSchema>;
export type NodeCreationPayload = z.infer<typeof NodeCreationPayloadSchema>;
export type NodeUpdatePayload = z.infer<typeof NodeUpdatePayloadSchema>;
export type SelectionPayload = z.infer<typeof SelectionPayloadSchema>;
export type ExportPayload = z.infer<typeof ExportPayloadSchema>;

// Re-export Tool interface from MCP SDK for convenience
export type { Tool } from '@modelcontextprotocol/sdk/types';