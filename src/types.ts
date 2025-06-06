import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

// ================================================================================
// Figma API Types (Strongly Typed)
// ================================================================================

// Color representation in Figma
export const ColorSchema = z.object({
  r: z.number().min(0).max(1),
  g: z.number().min(0).max(1),
  b: z.number().min(0).max(1),
  a: z.number().min(0).max(1).optional().default(1)
});

// Paint types used in Figma
export const SolidPaintSchema = z.object({
  type: z.literal('SOLID'),
  color: ColorSchema,
  opacity: z.number().min(0).max(1).optional(),
  visible: z.boolean().optional().default(true)
});

export const GradientPaintSchema = z.object({
  type: z.enum(['GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND']),
  gradientStops: z.array(z.object({
    position: z.number().min(0).max(1),
    color: ColorSchema
  })),
  gradientTransform: z.array(z.array(z.number())).optional(),
  opacity: z.number().min(0).max(1).optional(),
  visible: z.boolean().optional().default(true)
});

export const ImagePaintSchema = z.object({
  type: z.literal('IMAGE'),
  imageHash: z.string(),
  scaleMode: z.enum(['FILL', 'FIT', 'CROP', 'TILE']),
  imageTransform: z.array(z.array(z.number())).optional(),
  scalingFactor: z.number().optional(),
  rotation: z.number().optional(),
  filters: z.object({
    exposure: z.number().optional(),
    contrast: z.number().optional(),
    saturation: z.number().optional(),
    temperature: z.number().optional(),
    tint: z.number().optional(),
    highlights: z.number().optional(),
    shadows: z.number().optional()
  }).optional(),
  opacity: z.number().min(0).max(1).optional(),
  visible: z.boolean().optional().default(true)
});

export const PaintSchema = z.union([SolidPaintSchema, GradientPaintSchema, ImagePaintSchema]);

// Stroke properties
export const StrokeSchema = z.object({
  type: z.enum(['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND']),
  color: ColorSchema.optional(),
  opacity: z.number().min(0).max(1).optional(),
  visible: z.boolean().optional().default(true)
});

// Effect types
export const DropShadowEffectSchema = z.object({
  type: z.literal('DROP_SHADOW'),
  color: ColorSchema,
  offset: z.object({ x: z.number(), y: z.number() }),
  radius: z.number().min(0),
  spread: z.number().optional(),
  visible: z.boolean().default(true),
  blendMode: z.enum(['NORMAL', 'MULTIPLY', 'SCREEN', 'OVERLAY', 'SOFT_LIGHT', 'HARD_LIGHT', 'COLOR_DODGE', 'COLOR_BURN', 'DARKEN', 'LIGHTEN', 'DIFFERENCE', 'EXCLUSION', 'HUE', 'SATURATION', 'COLOR', 'LUMINOSITY']).optional()
});

export const InnerShadowEffectSchema = z.object({
  type: z.literal('INNER_SHADOW'),
  color: ColorSchema,
  offset: z.object({ x: z.number(), y: z.number() }),
  radius: z.number().min(0),
  spread: z.number().optional(),
  visible: z.boolean().default(true),
  blendMode: z.enum(['NORMAL', 'MULTIPLY', 'SCREEN', 'OVERLAY', 'SOFT_LIGHT', 'HARD_LIGHT', 'COLOR_DODGE', 'COLOR_BURN', 'DARKEN', 'LIGHTEN', 'DIFFERENCE', 'EXCLUSION', 'HUE', 'SATURATION', 'COLOR', 'LUMINOSITY']).optional()
});

export const BlurEffectSchema = z.object({
  type: z.enum(['LAYER_BLUR', 'BACKGROUND_BLUR']),
  radius: z.number().min(0),
  visible: z.boolean().default(true)
});

export const FigmaEffectSchema = z.union([DropShadowEffectSchema, InnerShadowEffectSchema, BlurEffectSchema]);

// Font and typography
export const FontNameSchema = z.object({
  family: z.string(),
  style: z.string()
});

export const TypeStyleSchema = z.object({
  fontName: FontNameSchema,
  fontSize: z.number(),
  textAlignHorizontal: z.enum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']).optional(),
  textAlignVertical: z.enum(['TOP', 'CENTER', 'BOTTOM']).optional(),
  letterSpacing: z.number().optional(),
  lineHeight: z.union([
    z.object({ value: z.number(), unit: z.literal('PIXELS') }),
    z.object({ value: z.number(), unit: z.literal('PERCENT') }),
    z.object({ unit: z.literal('AUTO') })
  ]).optional(),
  paragraphIndent: z.number().optional(),
  paragraphSpacing: z.number().optional(),
  textCase: z.enum(['ORIGINAL', 'UPPER', 'LOWER', 'TITLE']).optional(),
  textDecoration: z.enum(['NONE', 'UNDERLINE', 'STRIKETHROUGH']).optional(),
  fills: z.array(PaintSchema).optional()
});

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

// Plugin response data
export const NodeDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
  opacity: z.number().optional(),
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  fills: z.array(PaintSchema).optional(),
  strokes: z.array(StrokeSchema).optional(),
  effects: z.array(FigmaEffectSchema).optional(),
  children: z.array(z.record(z.unknown())).optional() // Simplified to avoid circular reference
});

export const SelectionDataSchema = z.object({
  selectedNodes: z.array(NodeDataSchema),
  count: z.number()
});

export const ExportDataSchema = z.object({
  imageData: z.string(), // Base64 encoded image
  format: z.string(),
  scale: z.number(),
  width: z.number(),
  height: z.number()
});

export const StyleDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['PAINT', 'TEXT', 'EFFECT', 'GRID']),
  description: z.string().optional(),
  properties: z.record(z.unknown())
});

// ================================================================================
// Base Schema Components
// ================================================================================

// Common position and size properties
export const BasePositionSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
});

export const BaseSizeSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
});

// Common visual properties
export const BaseVisualSchema = z.object({
  fillColor: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  visible: z.boolean().default(true),
  rotation: z.number().optional(),
  locked: z.boolean().default(false),
});

// Common stroke properties
export const BaseStrokeSchema = z.object({
  strokeColor: z.string().optional(),
  strokeWidth: z.number().min(0).optional(),
});

// Common corner properties
export const BaseCornerSchema = z.object({
  cornerRadius: z.number().min(0).optional(),
  topLeftRadius: z.number().min(0).optional(),
  topRightRadius: z.number().min(0).optional(),
  bottomLeftRadius: z.number().min(0).optional(),
  bottomRightRadius: z.number().min(0).optional(),
  cornerSmoothing: z.number().min(0).max(1).optional(),
});

// Common text alignment properties
export const BaseTextAlignmentSchema = z.object({
  textAlignHorizontal: z.enum(["left", "center", "right", "justified"]).optional(),
  textAlignVertical: z.enum(["top", "center", "bottom"]).optional(),
});

// Text styling properties
export const BaseTextStyleSchema = z.object({
  fontFamily: z.string().optional(),
  fontStyle: z.string().optional(),
  fontSize: z.number().optional(),
  textCase: z.enum(["original", "upper", "lower", "title"]).optional(),
  textDecoration: z.enum(["none", "underline", "strikethrough"]).optional(),
  letterSpacing: z.number().optional(),
  lineHeight: z.number().optional(),
});

// Base node properties (combination of all common properties)
export const BaseNodePropertiesSchema = BasePositionSchema
  .merge(BaseSizeSchema)
  .merge(BaseVisualSchema)
  .merge(BaseStrokeSchema)
  .merge(BaseCornerSchema)
  .extend({
    name: z.string().optional(),
  });

// ================================================================================
// Typography Types
// ================================================================================

export const TextStyleRangeSchema = z.object({
  start: z.number(),
  end: z.number(),
  fontFamily: z.string().optional(),
  fontStyle: z.string().optional(),
  fontSize: z.number().optional(),
  fillColor: z.string().optional(),
  textDecoration: z.enum(["none", "underline", "strikethrough"]).optional(),
  textCase: z.enum(["original", "upper", "lower", "title"]).optional(),
  letterSpacing: z.number().optional(),
  lineHeight: z.number().optional(),
});

export type TextStyleRange = z.infer<typeof TextStyleRangeSchema>;

export const CreateTextSchema = BasePositionSchema
  .merge(BaseSizeSchema)
  .merge(BaseTextAlignmentSchema)
  .merge(BaseTextStyleSchema)
  .extend({
    // Core content
    characters: z.string(),
    
    // Text-specific defaults
    fontFamily: z.string().default("Inter"),
    fontStyle: z.string().optional().default("Regular"),
    fontSize: z.number().default(16),
    
    // Spacing
    lineHeightUnit: z.enum(["px", "percent"]).optional().default("percent"),
    paragraphIndent: z.number().optional(),
    paragraphSpacing: z.number().optional(),
    
    // Visual
    fillColor: z.string().optional(),
    
    // Advanced styling with ranges
    styleRanges: z.array(TextStyleRangeSchema).optional(),
    
    // Style management
    createStyle: z.boolean().optional(),
    styleName: z.string().optional(),
  });

export type CreateTextParams = z.infer<typeof CreateTextSchema>;

// ================================================================================
// Style Management Types
// ================================================================================

export const GradientStopSchema = z.object({
  position: z.number(),
  color: z.string(),
});

export const EffectSchema = z.object({
  type: z.enum(['drop_shadow', 'inner_shadow', 'layer_blur', 'background_blur']),
  visible: z.boolean().default(true),
  color: z.string().optional(),
  blendMode: z.string().optional(),
  offset: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  radius: z.number().optional(),
  spread: z.number().optional(),
  showShadowBehindNode: z.boolean().optional(),
});

export const LayoutGridSchema = z.object({
  pattern: z.enum(['columns', 'rows', 'grid']),
  sectionSize: z.number().optional(),
  visible: z.boolean().default(true),
  color: z.string().optional(),
  alignment: z.enum(['min', 'max', 'center', 'stretch']).optional(),
  gutterSize: z.number().optional(),
  offset: z.number().optional(),
  count: z.number().optional(),
});

export const ManageStylesSchema = z.object({
  operation: z.enum(['create', 'list', 'apply', 'delete', 'get']),
  styleType: z.enum(['paint', 'text', 'effect', 'grid']).optional(),
  styleName: z.string().optional(),
  styleId: z.string().optional(),
  nodeId: z.string().optional(),
  
  // Paint Style Properties
  paintType: z.enum(['solid', 'gradient_linear', 'gradient_radial', 'gradient_angular', 'gradient_diamond', 'image']).optional(),
  color: z.string().optional(),
  opacity: z.number().optional(),
  gradientStops: z.array(GradientStopSchema).optional(),
  gradientTransform: z.array(z.number()).optional(),
  imageHash: z.string().optional(),
  scaleMode: z.enum(['fill', 'fit', 'crop', 'tile']).optional(),
  
  // Text Style Properties
  fontFamily: z.string().optional(),
  fontStyle: z.string().optional(),
  fontSize: z.number().optional(),
  fontWeight: z.number().optional(),
  textAlignHorizontal: z.enum(['left', 'center', 'right', 'justified']).optional(),
  textAlignVertical: z.enum(['top', 'center', 'bottom']).optional(),
  textAutoResize: z.enum(['none', 'width_and_height', 'height']).optional(),
  textCase: z.enum(['original', 'upper', 'lower', 'title']).optional(),
  textDecoration: z.enum(['none', 'underline', 'strikethrough']).optional(),
  letterSpacing: z.number().optional(),
  lineHeight: z.number().optional(),
  lineHeightUnit: z.enum(['pixels', 'percent', 'auto']).optional(),
  paragraphIndent: z.number().optional(),
  paragraphSpacing: z.number().optional(),
  listSpacing: z.number().optional(),
  hangingPunctuation: z.boolean().optional(),
  hangingList: z.boolean().optional(),
  textTruncation: z.enum(['disabled', 'ending']).optional(),
  maxLines: z.number().optional(),
  fillColor: z.string().optional(),
  
  // Effect Style Properties
  effects: z.array(EffectSchema).optional(),
  
  // Grid Style Properties
  layoutGrids: z.array(LayoutGridSchema).optional(),
});

// Validation logic moved to handler layer

export type ManageStylesParams = z.infer<typeof ManageStylesSchema>;
export type GradientStop = z.infer<typeof GradientStopSchema>;
export type Effect = z.infer<typeof EffectSchema>;
export type LayoutGrid = z.infer<typeof LayoutGridSchema>;

// ================================================================================
// Auto Layout & Constraints Types
// ================================================================================

export const PaddingSchema = z.object({
  top: z.number().optional(),
  right: z.number().optional(),
  bottom: z.number().optional(),
  left: z.number().optional(),
});

export const ResizingSchema = z.object({
  width: z.enum(['hug', 'fill', 'fixed']).optional(),
  height: z.enum(['hug', 'fill', 'fixed']).optional(),
});

export const ManageAutoLayoutSchema = z.object({
  operation: z.enum(['enable', 'disable', 'update', 'get_properties']),
  nodeId: z.string(),
  
  // Layout Direction
  direction: z.enum(['horizontal', 'vertical']).optional(),
  
  // Spacing & Padding
  spacing: z.number().optional(),
  padding: PaddingSchema.optional(),
  
  // Alignment
  primaryAlignment: z.enum(['min', 'center', 'max', 'space_between']).optional(),
  counterAlignment: z.enum(['min', 'center', 'max']).optional(),
  
  // Resizing Behavior
  resizing: ResizingSchema.optional(),
  
  // Advanced Properties
  strokesIncludedInLayout: z.boolean().optional(),
  layoutWrap: z.enum(['no_wrap', 'wrap']).optional(),
});

// Validation logic moved to handler layer

export const ManageConstraintsSchema = z.object({
  operation: z.enum(['set', 'get', 'reset', 'get_info']),
  nodeId: z.string(),
  
  // Constraint Settings
  horizontal: z.enum(['left', 'right', 'left_right', 'center', 'scale']).optional(),
  vertical: z.enum(['top', 'bottom', 'top_bottom', 'center', 'scale']).optional(),
});

// Validation logic moved to handler layer

export type ManageAutoLayoutParams = z.infer<typeof ManageAutoLayoutSchema>;
export type ManageConstraintsParams = z.infer<typeof ManageConstraintsSchema>;
export type ManageNodesParams = z.infer<typeof ManageNodesSchema>;
export type Padding = z.infer<typeof PaddingSchema>;
export type Resizing = z.infer<typeof ResizingSchema>;

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
  fills: z.array(PaintSchema).optional(),
  strokes: z.array(StrokeSchema).optional(),
  effects: z.array(FigmaEffectSchema).optional(),
  // Removed recursive children to fix TypeScript compilation
});

export type FigmaNode = z.infer<typeof FigmaNodeSchema>;
export type CreateNodeParams = z.infer<typeof CreateNodeSchema>;
export type UpdateNodeParams = z.infer<typeof UpdateNodeSchema>;

// ================================================================================
// Enhanced Response Types
// ================================================================================

export interface NodeOperationResult {
  success: boolean;
  nodeId?: string;        // for create_node
  message: string;
  warnings?: string[];    // for non-critical issues (e.g., clamped values)
  properties?: {          // echo back applied properties
    [key: string]: any;
  };
}

// ================================================================================
// Plugin Communication Types
// ================================================================================

export const PluginMessageSchema = z.object({
  id: z.string(),
  type: z.enum([
    'GET_SELECTION',
    'CREATE_NODE',
    'CREATE_TEXT',
    'CREATE_STAR',
    'CREATE_POLYGON',
    'UPDATE_NODE',
    'DELETE_NODE',
    'MOVE_NODE',
    'DUPLICATE_NODE',
    'GET_PAGE_NODES',
    'SET_SELECTION',
    'MANAGE_STYLES',
    'EXPORT_NODE',
    'MANAGE_AUTO_LAYOUT',
    'MANAGE_CONSTRAINTS',
    'PLUGIN_READY',
    'HEARTBEAT'
  ]),
  payload: z.union([
    NodeCreationPayloadSchema,
    NodeUpdatePayloadSchema,
    SelectionPayloadSchema,
    ExportPayloadSchema,
    z.record(z.unknown())
  ]).optional(),
});

export type PluginMessage = z.infer<typeof PluginMessageSchema>;

export const PluginResponseSchema = z.object({
  id: z.string(),
  success: z.boolean(),
  data: z.union([
    NodeDataSchema,
    SelectionDataSchema,
    ExportDataSchema,
    StyleDataSchema,
    z.array(NodeDataSchema),
    z.record(z.unknown())
  ]).optional(),
  error: z.string().optional(),
});

export type PluginResponse = z.infer<typeof PluginResponseSchema>;

// ================================================================================
// MCP Tool Input Schemas
// ================================================================================

export const CreateNodeSchema = BaseNodePropertiesSchema.extend({
  // Node type
  nodeType: z.enum(['rectangle', 'ellipse', 'text', 'frame', 'star', 'polygon']),
  
  // Frame-specific properties
  clipsContent: z.boolean().optional(),
  
  // Shape-specific properties
  pointCount: z.number().min(3).optional(), // star nodes
  innerRadius: z.number().min(0).max(1).optional(), // star nodes
  
  // Text properties (for backward compatibility)
  content: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  fontStyle: z.string().optional(),
  textAlignHorizontal: z.enum(["left", "center", "right", "justified"]).optional(),
}).refine((data) => {
  // Text nodes must have content - validation logic kept here as it's structural
  if (data.nodeType === 'text') {
    return data.content !== undefined && data.content.trim().length > 0;
  }
  return true;
}, {
  message: "Text nodes must have non-empty content"
});



export const UpdateNodeSchema = BaseNodePropertiesSchema.extend({
  nodeId: z.string(), // required - ID of node to update
  
  // Frame-specific properties
  clipsContent: z.boolean().optional(),
  
  // Shape-specific properties
  pointCount: z.number().min(3).optional(),
  innerRadius: z.number().min(0).max(1).optional(),
  
  // Text properties
  content: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  fontStyle: z.string().optional(),
  textAlignHorizontal: z.enum(["left", "center", "right", "justified"]).optional(),
  
  // Legacy support
  properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});



export const ManageNodesSchema = z.object({
  operation: z.enum(['move', 'delete', 'duplicate']),
  nodeId: z.string(),
  x: z.number().optional(),
  y: z.number().optional(),
  offsetX: z.number().default(10).optional(),
  offsetY: z.number().default(10).optional(),
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

export interface OperationTimeouts {
  [operationType: string]: number;
}

export interface CommunicationConfig {
  defaultTimeout: number;
  operationTimeouts: OperationTimeouts;
  batchTimeout: number;
  maxBatchSize: number;
  requestQueueSize: number;
  reconnectAttempts: number;
  reconnectDelay: number;
  healthCheckInterval: number;
}

export interface ServerConfig {
  port: number;
  corsOrigin: string;
  pluginId: string;
  maxMessageSize: number;
  heartbeatInterval: number;
  communication: CommunicationConfig;
}

export const DEFAULT_COMMUNICATION_CONFIG: CommunicationConfig = {
  defaultTimeout: 30000, // 30 seconds
  operationTimeouts: {
    'CREATE_NODE': 5000,
    'UPDATE_NODE': 3000,
    'MOVE_NODE': 2000,
    'DELETE_NODE': 2000,
    'DUPLICATE_NODE': 5000,
    'GET_SELECTION': 1000,
    'SET_SELECTION': 1000,
    'GET_PAGE_NODES': 10000, // Can be slow for large documents
    'EXPORT_NODE': 15000, // Export operations can take time
    'MANAGE_STYLES': 5000,
    'MANAGE_AUTO_LAYOUT': 3000,
    'MANAGE_CONSTRAINTS': 2000,
    'CREATE_TEXT': 4000
  },
  batchTimeout: 100, // 100ms window for batching
  maxBatchSize: 10,
  requestQueueSize: 50,
  reconnectAttempts: 3,
  reconnectDelay: 1000,
  healthCheckInterval: 5000 // 5 seconds
};

export const DEFAULT_CONFIG: ServerConfig = {
  port: 8765,
  corsOrigin: '*',
  pluginId: 'figma-mcp-write-plugin',
  maxMessageSize: 1024 * 1024, // 1MB
  heartbeatInterval: 30000, // 30 seconds
  communication: DEFAULT_COMMUNICATION_CONFIG
};

// ================================================================================
// Connection Status
// ================================================================================

export interface ConnectionStatus {
  pluginConnected: boolean;
  lastHeartbeat: Date | null;
  activeClients: number;
  connectionHealth: 'healthy' | 'degraded' | 'unhealthy';
  reconnectAttempts: number;
  averageResponseTime: number;
  queuedRequests: number;
}

export interface QueuedRequest {
  id: string;
  request: any;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  timestamp: number;
  priority: 'low' | 'normal' | 'high';
  retries: number;
}

export interface RequestBatch {
  id: string;
  requests: QueuedRequest[];
  timeout: NodeJS.Timeout;
}

export enum RequestPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2
}

// ================================================================================
// Handler Interface & Tool System (Enhanced with Generics)
// ================================================================================

export interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

// Generic plugin communication types
export interface TypedPluginMessage<TPayload = unknown> {
  id: string;
  type: string;
  payload?: TPayload;
}

export interface TypedPluginResponse<TData = unknown> {
  id: string;
  success: boolean;
  data?: TData;
  error?: string;
}

// Specific operation types with proper typing
export type CreateNodeRequest = TypedPluginMessage<z.infer<typeof NodeCreationPayloadSchema>>;
export type UpdateNodeRequest = TypedPluginMessage<z.infer<typeof NodeUpdatePayloadSchema>>;
export type GetSelectionRequest = TypedPluginMessage<z.infer<typeof SelectionPayloadSchema>>;
export type ExportNodeRequest = TypedPluginMessage<z.infer<typeof ExportPayloadSchema>>;

export type NodeCreationResponse = TypedPluginResponse<{ nodeId: string; properties?: Record<string, unknown> }>;
export type SelectionResponse = TypedPluginResponse<z.infer<typeof SelectionDataSchema>>;
export type ExportResponse = TypedPluginResponse<z.infer<typeof ExportDataSchema>>;
export type StyleResponse = TypedPluginResponse<z.infer<typeof StyleDataSchema>[]>;

export interface ToolHandler {
  getTools(): Tool[];
  handle(toolName: string, args: any): Promise<any>;
}

// Enhanced WebSocket communication with generics
export interface TypedWebSocketCommunication {
  sendMessage<TPayload, TResponse = unknown>(message: TypedPluginMessage<TPayload>): Promise<TypedPluginResponse<TResponse>>;
  onMessage<TPayload>(handler: (message: TypedPluginMessage<TPayload>) => void): void;
}

// Communication Layer Types
export interface HealthMetrics {
  responseTime: number[];
  errorCount: number;
  successCount: number;
  lastError: string | null;
  lastSuccess: Date | null;
}

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

// Export all inferred types for external use
export type Color = z.infer<typeof ColorSchema>;
export type SolidPaint = z.infer<typeof SolidPaintSchema>;
export type GradientPaint = z.infer<typeof GradientPaintSchema>;
export type ImagePaint = z.infer<typeof ImagePaintSchema>;
export type Paint = z.infer<typeof PaintSchema>;
export type Stroke = z.infer<typeof StrokeSchema>;
export type FigmaEffect = z.infer<typeof FigmaEffectSchema>;
export type FontName = z.infer<typeof FontNameSchema>;
export type TypeStyle = z.infer<typeof TypeStyleSchema>;
export type NodeCreationPayload = z.infer<typeof NodeCreationPayloadSchema>;
export type NodeUpdatePayload = z.infer<typeof NodeUpdatePayloadSchema>;
export type SelectionPayload = z.infer<typeof SelectionPayloadSchema>;
export type ExportPayload = z.infer<typeof ExportPayloadSchema>;
export type NodeData = z.infer<typeof NodeDataSchema>;
export type SelectionData = z.infer<typeof SelectionDataSchema>;
export type ExportData = z.infer<typeof ExportDataSchema>;
export type StyleData = z.infer<typeof StyleDataSchema>;

// Re-export Tool interface from MCP SDK for convenience
export type { Tool } from '@modelcontextprotocol/sdk/types.js';
