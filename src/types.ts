import { z } from 'zod';

// =====================
// Figma Node Types (simplified for write operations)
// =====================

export const FigmaNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
  opacity: z.number().optional(),
  blendMode: z.string().optional(),
  fills: z.array(z.any()).optional(),
  strokes: z.array(z.any()).optional(),
  effects: z.array(z.any()).optional(),
  children: z.array(z.lazy(() => FigmaNodeSchema)).optional(),
});

export type FigmaNode = z.infer<typeof FigmaNodeSchema>;

// =====================
// Plugin Bridge Communication Types
// =====================

export const PluginMessageSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'GET_SELECTION',
    'CREATE_RECTANGLE',
    'CREATE_ELLIPSE', 
    'CREATE_TEXT',
    'CREATE_FRAME',
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
    'PLUGIN_READY'
  ]),
  payload: z.any().optional(),
});

export type PluginMessage = z.infer<typeof PluginMessageSchema>;

export const PluginResponseSchema = z.object({
  id: z.string().uuid(),
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
});

export type PluginResponse = z.infer<typeof PluginResponseSchema>;

// =====================
// MCP Tool Input Schemas
// =====================

export const CreateRectangleSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().default(100),
  height: z.number().default(100),
  name: z.string().default('Rectangle'),
  fillColor: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
});

export const CreateEllipseSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().default(100),
  height: z.number().default(100),
  name: z.string().default('Ellipse'),
  fillColor: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
});

export const CreateTextSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  content: z.string().default('Text'),
  fontSize: z.number().default(16),
  fontFamily: z.string().default('Inter'),
  textColor: z.string().optional(),
  name: z.string().default('Text'),
});

export const CreateFrameSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().default(200),
  height: z.number().default(200),
  name: z.string().default('Frame'),
  backgroundColor: z.string().optional(),
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

// =====================
// Server Configuration
// =====================

export interface ServerConfig {
  port: number;
  corsOrigin: string;
  pluginId: string;
  maxMessageSize: number;
  heartbeatInterval: number;
}

export const DEFAULT_CONFIG: ServerConfig = {
  port: 3001,
  corsOrigin: '*',
  pluginId: 'figma-mcp-write-plugin',
  maxMessageSize: 1024 * 1024, // 1MB
  heartbeatInterval: 30000, // 30 seconds
};

// =====================
// Connection Status
// =====================

export interface ConnectionStatus {
  pluginConnected: boolean;
  lastHeartbeat: Date | null;
  activeClients: number;
}
