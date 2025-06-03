import { z } from 'zod';

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

export const CreateTextSchema = z.object({
  // Core content
  characters: z.string(),
  
  // Positioning
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().optional(),
  height: z.number().optional(),
  
  // Basic styling
  fontFamily: z.string().default("Inter"),
  fontStyle: z.string().optional().default("Regular"),
  fontSize: z.number().default(16),
  
  // Text alignment
  textAlignHorizontal: z.enum(["left", "center", "right", "justified"]).optional(),
  textAlignVertical: z.enum(["top", "center", "bottom"]).optional(),
  
  // Text styling
  textCase: z.enum(["original", "upper", "lower", "title"]).optional(),
  textDecoration: z.enum(["none", "underline", "strikethrough"]).optional(),
  
  // Spacing
  letterSpacing: z.number().optional(),
  lineHeight: z.number().optional(),
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
}).refine((data) => {
  // Validation rules for different operations
  if (data.operation === 'create') {
    return data.styleType !== undefined && data.styleName !== undefined;
  }
  if (data.operation === 'apply') {
    return data.nodeId !== undefined && (data.styleId !== undefined || data.styleName !== undefined);
  }
  if (data.operation === 'delete' || data.operation === 'get') {
    return data.styleId !== undefined || data.styleName !== undefined;
  }
  if (data.operation === 'list') {
    return data.styleType !== undefined;
  }
  return true;
}, {
  message: "Invalid parameters for the specified operation"
});

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
}).refine((data) => {
  // Validation rules for different operations
  if (data.operation === 'enable') {
    // Enable operation should have at least direction
    return true; // Direction will have default in implementation
  }
  return true;
}, {
  message: "Invalid parameters for the specified operation"
});

export const ManageConstraintsSchema = z.object({
  operation: z.enum(['set', 'get', 'reset', 'get_info']),
  nodeId: z.string(),
  
  // Constraint Settings
  horizontal: z.enum(['left', 'right', 'left_right', 'center', 'scale']).optional(),
  vertical: z.enum(['top', 'bottom', 'top_bottom', 'center', 'scale']).optional(),
}).refine((data) => {
  // Validation rules for different operations
  if (data.operation === 'set') {
    // Set operation should have at least one constraint
    return data.horizontal !== undefined || data.vertical !== undefined;
  }
  return true;
}, {
  message: "Set operation requires at least one constraint (horizontal or vertical)"
});

export type ManageAutoLayoutParams = z.infer<typeof ManageAutoLayoutSchema>;
export type ManageConstraintsParams = z.infer<typeof ManageConstraintsSchema>;
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
    'CREATE_TEXT',
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
  // Basic text style properties (for backward compatibility)
  fontStyle: z.string().optional(),
  textAlignHorizontal: z.enum(["left", "center", "right", "justified"]).optional(),
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
