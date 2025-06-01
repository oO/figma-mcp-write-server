import { z } from 'zod';

// ================================================================================
// Simple Figma Node Types (without recursive children to avoid TS infinite loop)
// ================================================================================

export const FigmaNodeSchema = z.object({
  // Core node properties
  id: z.string(),
  name: z.string(),
  type: z.string(),

  // Node state
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),

  // Position and size properties (all nodes have these)
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number(),  // Required - all Figma nodes have width
  height: z.number(), // Required - all Figma nodes have height
  rotation: z.number().default(0),

  // Visual properties
  opacity: z.number().default(1),
  blendMode: z.string().default('NORMAL'),
  fills: z.array(z.any()).optional(),
  strokes: z.array(z.any()).optional(),
  effects: z.array(z.any()).optional(),
  // Removed recursive children to fix TypeScript compilation
});

export type FigmaNode = z.infer<typeof FigmaNodeSchema>;
export type CreateNodeParams = z.infer<typeof CreateNodeSchema>;

// ================================================================================
// Plugin Communication Types
// ================================================================================

export const PluginMessageSchema = z.object({
  id: z.string(),
  type: z.enum([
    'GET_SELECTION',
    'CREATE_NODE',
    'UPDATE_NODE',
    'DELETE_NODE',
    'MOVE_NODE',
    'DUPLICATE_NODE',
    'GET_PAGE_NODES',
    'SET_SELECTION',
    'GET_STYLES',
    'CREATE_STYLE',
    'APPLY_STYLE',
    'EXPORT_NODE',
    'PLUGIN_READY',
    'HEARTBEAT'
  ]),
  payload: z.any().optional(),
});

export type PluginMessage = z.infer<typeof PluginMessageSchema>;

export const PluginResponseSchema = z.object({
  id: z.string(),
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
});

export type PluginResponse = z.infer<typeof PluginResponseSchema>;

// ================================================================================
// MCP Tool Input Schemas
// ================================================================================

export const CreateNodeSchema = z.object({
  // Node type - determines what kind of Figma node to create
  nodeType: z.enum(['rectangle', 'ellipse', 'text', 'frame']),
  
  // Common positioning properties
  x: z.number().default(0),
  y: z.number().default(0),
  name: z.string().optional(),
  
  // Size properties (required for rectangle, ellipse, frame)
  width: z.number().optional(),
  height: z.number().optional(),
  
  // Visual properties
  // fillColor: Used for background color in shapes/frames and text color in text nodes
  fillColor: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  
  // Text-specific properties (only used when nodeType is 'text')
  content: z.string().optional(),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
}).refine((data) => {
  // Validate that required properties are present for each node type
  // Allow defaults to be applied in the createNode method
  switch (data.nodeType) {
    case 'rectangle':
    case 'ellipse':
    case 'frame':
      // These node types are valid (defaults will be applied if width/height missing)
      return true;
    case 'text':
      // Text node should have content (no default makes sense for content)
      return data.content !== undefined && data.content.trim().length > 0;
    default:
      return false;
  }
}, {
  message: "Text nodes must have non-empty content"
});



export const UpdateNodeSchema = z.object({
  nodeId: z.string(),
  properties: z.record(z.any()),
});

export const MoveNodeSchema = z.object({
  nodeId: z.string(),
  x: z.number(),
  y: z.number(),
});

export const DeleteNodeSchema = z.object({
  nodeId: z.string(),
});

export const DuplicateNodeSchema = z.object({
  nodeId: z.string(),
  offsetX: z.number().default(10),
  offsetY: z.number().default(10),
});

export const SetSelectionSchema = z.object({
  nodeIds: z.array(z.string()),
});

export const ExportNodeSchema = z.object({
  nodeId: z.string(),
  format: z.enum(['PNG', 'JPG', 'SVG', 'PDF']).default('PNG'),
  scale: z.number().default(1),
});

// ================================================================================
// Server Configuration
// ================================================================================

export interface ServerConfig {
  port: number;
  corsOrigin: string;
  pluginId: string;
  maxMessageSize: number;
  heartbeatInterval: number;
}

export const DEFAULT_CONFIG: ServerConfig = {
  port: 8765,
  corsOrigin: '*',
  pluginId: 'figma-mcp-write-plugin',
  maxMessageSize: 1024 * 1024, // 1MB
  heartbeatInterval: 30000, // 30 seconds
};

// ================================================================================
// Connection Status
// ================================================================================

export interface ConnectionStatus {
  pluginConnected: boolean;
  lastHeartbeat: Date | null;
  activeClients: number;
}
