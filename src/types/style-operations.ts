import { z } from 'zod';

// ================================================================================
// Style Management Schemas
// ================================================================================

// Gradient and effect definitions
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

// Main style management schema
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

// Export types
export type ManageStylesParams = z.infer<typeof ManageStylesSchema>;
export type GradientStop = z.infer<typeof GradientStopSchema>;
export type Effect = z.infer<typeof EffectSchema>;
export type LayoutGrid = z.infer<typeof LayoutGridSchema>;