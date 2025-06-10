// ================================================================================
// Figma MCP Write Server - Type System Index
// ================================================================================

// Core Figma types (colors, paints, effects, typography)
export * from './figma-base.js';

// Base schemas and common node properties
export * from './schemas.js';

// Node creation, update, and management operations
export * from './node-operations.js';

// Style management operations
export * from './style-operations.js';

// Auto layout and constraints operations
export * from './layout-operations.js';

// Component system operations
export * from './component-operations.js';

// Variable system operations
export * from './variable-operations.js';

// Plugin communication and MCP server types
export * from './plugin-communication.js';

// Server configuration and connection management
export * from './server-config.js';

// Validation utilities and type guards
export * from './validation-utils.js';

// Legacy data response schemas (for backward compatibility)
import { z } from 'zod';
import { ColorSchema, PaintSchema, StrokeSchema, FigmaEffectSchema } from './figma-base.js';

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

// Export legacy types
export type NodeData = z.infer<typeof NodeDataSchema>;
export type SelectionData = z.infer<typeof SelectionDataSchema>;
export type ExportData = z.infer<typeof ExportDataSchema>;
export type StyleData = z.infer<typeof StyleDataSchema>;