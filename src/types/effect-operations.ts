import { z } from 'zod';
import { ColorSchema } from './figma-base.js';
import { caseInsensitiveEnum } from './enum-utils.js';

// ================================================================================
// Enhanced Effect Schemas for Complete Figma API Coverage
// ================================================================================

// Vector2D type for offsets and positions
export const Vector2DSchema = z.object({
  x: z.number(),
  y: z.number()
});

// Enhanced Blend Mode enum with all Figma API values
export const BlendModeSchema = caseInsensitiveEnum([
  'NORMAL', 'DARKEN', 'MULTIPLY', 'LINEAR_BURN', 'COLOR_BURN',
  'LIGHTEN', 'SCREEN', 'LINEAR_DODGE', 'COLOR_DODGE',
  'OVERLAY', 'SOFT_LIGHT', 'HARD_LIGHT',
  'DIFFERENCE', 'EXCLUSION',
  'HUE', 'SATURATION', 'COLOR', 'LUMINOSITY'
]);

// Drop Shadow Effect Schema
export const DropShadowEffectParamsSchema = z.object({
  type: z.literal('DROP_SHADOW'),
  color: ColorSchema,
  offset: Vector2DSchema,
  radius: z.number().min(0),
  spread: z.number().default(0),
  visible: z.boolean().default(true),
  blendMode: BlendModeSchema.default('NORMAL'),
  showShadowBehindNode: z.boolean().optional()
});

// Inner Shadow Effect Schema  
export const InnerShadowEffectParamsSchema = z.object({
  type: z.literal('INNER_SHADOW'),
  color: ColorSchema,
  offset: Vector2DSchema,
  radius: z.number().min(0),
  spread: z.number().default(0),
  visible: z.boolean().default(true),
  blendMode: BlendModeSchema.default('NORMAL')
});

// Layer Blur Effect Schema
export const LayerBlurEffectParamsSchema = z.object({
  type: z.literal('LAYER_BLUR'),
  radius: z.number().min(0),
  visible: z.boolean().default(true)
});

// Background Blur Effect Schema
export const BackgroundBlurEffectParamsSchema = z.object({
  type: z.literal('BACKGROUND_BLUR'),
  radius: z.number().min(0),
  visible: z.boolean().default(true)
});

// Noise Effect Schema
export const NoiseEffectParamsSchema = z.object({
  type: z.literal('NOISE'),
  blendMode: BlendModeSchema,
  size: z.number(),
  density: z.number(),
  noiseType: caseInsensitiveEnum(['MONOTONE', 'DUOTONE', 'MULTITONE']),
  secondaryColor: ColorSchema.optional(),
  opacity: z.number().min(0).max(1).optional(),
  visible: z.boolean().default(true)
});

// Texture Effect Schema
export const TextureEffectParamsSchema = z.object({
  type: z.literal('TEXTURE'),
  size: z.number(),
  radius: z.number(),
  visible: z.boolean().default(true)
});

// Union of all effect parameter schemas
export const EffectParamsSchema = z.union([
  DropShadowEffectParamsSchema,
  InnerShadowEffectParamsSchema,
  LayerBlurEffectParamsSchema,
  BackgroundBlurEffectParamsSchema,
  NoiseEffectParamsSchema,
  TextureEffectParamsSchema
]);

// ================================================================================
// Effects Management Schema with Flat Parameters
// ================================================================================

// Effect type enum for operation parameters
export const EffectTypeSchema = caseInsensitiveEnum([
  'DROP_SHADOW',
  'INNER_SHADOW', 
  'LAYER_BLUR',
  'BACKGROUND_BLUR',
  'NOISE',
  'TEXTURE'
]);

// Owner format validation - "node:ID" or "style:ID"
export const EffectOwnerSchema = z.string().regex(/^(node|style):.+/, 
  'Owner must be in format "node:ID" or "style:ID"'
);

// Main effects management schema with flat parameters
export const ManageEffectsSchema = z.object({
  // Required base parameters
  operation: caseInsensitiveEnum(['create', 'update', 'delete', 'get', 'reorder', 'duplicate']),
  owner: z.union([
    EffectOwnerSchema,
    z.array(EffectOwnerSchema)
  ]),

  // Operation-specific parameters
  effectType: z.union([
    EffectTypeSchema,
    z.array(EffectTypeSchema)
  ]).optional(),
  
  effectIndex: z.union([
    z.number().int().min(0),
    z.array(z.number().int().min(0))
  ]).optional(),
  
  newIndex: z.union([
    z.number().int().min(0),
    z.array(z.number().int().min(0))
  ]).optional(),

  // Flat effect parameters for all effect types
  // Color and offset parameters (hex format matching other tools)
  color: z.union([
    z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/, "Color must be in hex format '#RRGGBB' or '#RRGGBBAA' (e.g., '#FF5733' or '#FF573380')"),
    z.array(z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/, "Color must be in hex format '#RRGGBB' or '#RRGGBBAA' (e.g., '#FF5733' or '#FF573380')"))
  ]).optional(),
  
  offsetX: z.union([
    z.number(),
    z.array(z.number())
  ]).optional(),
  
  offsetY: z.union([
    z.number(), 
    z.array(z.number())
  ]).optional(),

  // Numeric parameters
  radius: z.union([
    z.number().min(0),
    z.array(z.number().min(0))
  ]).optional(),
  
  spread: z.union([
    z.number(),
    z.array(z.number())
  ]).optional(),
  
  size: z.union([
    z.number(),
    z.array(z.number())
  ]).optional(),
  
  density: z.union([
    z.number(),
    z.array(z.number())
  ]).optional(),

  // Boolean parameters
  visible: z.union([
    z.boolean(),
    z.array(z.boolean())
  ]).optional(),
  
  showShadowBehindNode: z.union([
    z.boolean(),
    z.array(z.boolean())
  ]).optional(),

  // Enum parameters
  blendMode: z.union([
    BlendModeSchema,
    z.array(BlendModeSchema)
  ]).optional(),
  
  noiseType: z.union([
    caseInsensitiveEnum(['MONOTONE', 'DUOTONE', 'MULTITONE']),
    z.array(caseInsensitiveEnum(['MONOTONE', 'DUOTONE', 'MULTITONE']))
  ]).optional(),

  // Additional parameters
  secondaryColor: z.union([
    z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/, "Secondary color must be in hex format '#RRGGBB' or '#RRGGBBAA' (e.g., '#FF5733' or '#FF573380')"),
    z.array(z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/, "Secondary color must be in hex format '#RRGGBB' or '#RRGGBBAA' (e.g., '#FF5733' or '#FF573380')"))
  ]).optional(),
  
  opacity: z.union([
    z.number().min(0).max(1),
    z.array(z.number().min(0).max(1))
  ]).optional(),

  // TEXTURE effect parameters
  clipToShape: z.union([
    z.boolean(),
    z.array(z.boolean())
  ]).optional(),

});

// ================================================================================
// Export Types
// ================================================================================

export type Vector2D = z.infer<typeof Vector2DSchema>;
export type BlendMode = z.infer<typeof BlendModeSchema>;
export type DropShadowEffectParams = z.infer<typeof DropShadowEffectParamsSchema>;
export type InnerShadowEffectParams = z.infer<typeof InnerShadowEffectParamsSchema>;
export type LayerBlurEffectParams = z.infer<typeof LayerBlurEffectParamsSchema>;
export type BackgroundBlurEffectParams = z.infer<typeof BackgroundBlurEffectParamsSchema>;
export type NoiseEffectParams = z.infer<typeof NoiseEffectParamsSchema>;
export type TextureEffectParams = z.infer<typeof TextureEffectParamsSchema>;
export type EffectParams = z.infer<typeof EffectParamsSchema>;
export type EffectType = z.infer<typeof EffectTypeSchema>;
export type EffectOwner = z.infer<typeof EffectOwnerSchema>;
export type ManageEffectsParams = z.infer<typeof ManageEffectsSchema>;