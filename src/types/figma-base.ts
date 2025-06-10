import { z } from 'zod';

// ================================================================================
// Figma Core Types (Color, Paint, Effects, Typography)
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

// Export all inferred types
export type Color = z.infer<typeof ColorSchema>;
export type SolidPaint = z.infer<typeof SolidPaintSchema>;
export type GradientPaint = z.infer<typeof GradientPaintSchema>;
export type ImagePaint = z.infer<typeof ImagePaintSchema>;
export type Paint = z.infer<typeof PaintSchema>;
export type Stroke = z.infer<typeof StrokeSchema>;
export type FigmaEffect = z.infer<typeof FigmaEffectSchema>;
export type FontName = z.infer<typeof FontNameSchema>;
export type TypeStyle = z.infer<typeof TypeStyleSchema>;