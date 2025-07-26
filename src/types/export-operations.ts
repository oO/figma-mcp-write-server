import { z } from 'zod';

// ================================================================================
// Export Operations Schema
// ================================================================================

export const ManageExportsSchema = z.object({
  operation: z.enum(['get_setting', 'create_setting', 'update_setting', 'delete_setting', 'reorder_setting', 'clear_settings', 'duplicate_setting', 'export']),
  
  // Core bulk-enabled parameters
  id: z.union([z.string(), z.array(z.string())]).optional(),
  nodeId: z.union([z.string(), z.array(z.string())]).optional(), // Legacy compatibility
  exportIndex: z.union([z.number(), z.array(z.number())]).optional(),
  newIndex: z.union([z.number(), z.array(z.number())]).optional(),
  
  // Export settings parameters (flattened, bulk-enabled)
  format: z.union([z.enum(['PNG', 'JPG', 'SVG', 'PDF']), z.array(z.enum(['PNG', 'JPG', 'SVG', 'PDF']))]).optional(),
  constraintType: z.union([z.enum(['SCALE', 'WIDTH', 'HEIGHT']), z.array(z.enum(['SCALE', 'WIDTH', 'HEIGHT']))]).optional(),
  constraintValue: z.union([z.number(), z.array(z.number())]).optional(),
  contentsOnly: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  useAbsoluteBounds: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  colorProfile: z.union([z.enum(['DOCUMENT', 'SRGB', 'DISPLAY_P3_V4']), z.array(z.enum(['DOCUMENT', 'SRGB', 'DISPLAY_P3_V4']))]).optional(),
  suffix: z.union([z.string(), z.array(z.string())]).optional(),
  
  // SVG-specific parameters (bulk-enabled)
  svgOutlineText: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  svgIdAttribute: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  svgSimplifyStroke: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  
  // Export operation parameters
  target: z.union([z.enum(['FILE', 'DATA']), z.array(z.enum(['FILE', 'DATA']))]).optional().default('FILE'),
  outputDirectory: z.union([z.string(), z.array(z.string())]).default('~/Downloads/Figma Exports'),
  
  // Duplicate operation parameters
  fromId: z.union([z.string(), z.array(z.string())]).optional(),
  toId: z.union([z.string(), z.array(z.string())]).optional(),
  fromNodeId: z.union([z.string(), z.array(z.string())]).optional(), // Legacy compatibility
  toNodeId: z.union([z.string(), z.array(z.string())]).optional(), // Legacy compatibility
  
});

export type ManageExportsParams = z.infer<typeof ManageExportsSchema>;