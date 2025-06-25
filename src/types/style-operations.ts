import { z } from 'zod';
import { 
  FigmaStyleTypesCompat, 
  FigmaPaintTypes, 
  FigmaScaleModes,
  FigmaTextAlign,
  FigmaTextStyle,
  FigmaEffectTypes,
  FigmaBlendModes
} from './figma-enums.js';
import { 
  IdentificationFields,
  TypographyFields,
  ColorFields,
  VisualFields,
  MetadataFields
} from './common-fields.js';
import { 
  createManagementSchema,
  CommonValidationRules,
  combineValidationRules
} from './operation-factory.js';

// ================================================================================
// Style Management Schemas - Consolidated with Shared Types
// ================================================================================

// Gradient and effect definitions (style-specific, not commonly reused)
export const GradientStopSchema = z.object({
  position: z.number(),
  color: z.string(),
});

export const EffectSchema = z.object({
  type: FigmaEffectTypes,
  visible: z.boolean().default(true),
  color: z.string().optional(),
  blendMode: FigmaBlendModes.optional(),
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

// Style management schema using shared components
export const ManageStylesSchema = createManagementSchema(
  ['apply', 'apply_bulk'], // Style-specific operations beyond CRUD
  {
    // Use shared identification fields (but make nodeIds optional for some operations)
    nodeId: z.string().optional(),
    styleId: z.string().optional(),
    componentId: z.string().optional(),
    instanceId: z.string().optional(),
    variableId: z.string().optional(),
    collectionId: z.string().optional(),
    nodeIds: z.array(z.string()).optional(), // Optional for non-bulk operations
    
    // Style-specific fields
    styleType: FigmaStyleTypesCompat.optional(),
    styleName: z.string().optional(),
    
    // Paint Style Properties
    paintType: FigmaPaintTypes.optional(),
    gradientStops: z.array(GradientStopSchema).optional(),
    gradientTransform: z.array(z.number()).optional(),
    imageHash: z.string().optional(),
    scaleMode: FigmaScaleModes.optional(),
    
    // Use shared color and visual fields
    ...ColorFields,
    ...VisualFields,
    
    // Use shared typography fields for text styles
    ...TypographyFields,
    
    // Text style specific fields
    textAutoResize: z.enum(['none', 'width_and_height', 'height']).optional(),
    lineHeightUnit: z.enum(['pixels', 'percent', 'auto']).optional(),
    paragraphIndent: z.number().optional(),
    listSpacing: z.number().optional(),
    hangingPunctuation: z.boolean().optional(),
    hangingList: z.boolean().optional(),
    textTruncation: z.enum(['disabled', 'ending']).optional(),
    maxLines: z.number().optional(),
    
    // Effect Style Properties
    effects: z.array(EffectSchema).optional(),
    
    // Grid Style Properties
    layoutGrids: z.array(LayoutGridSchema).optional(),
    
    // Use shared metadata fields
    ...MetadataFields,
  },
  // Validation rules using shared patterns
  combineValidationRules(
    CommonValidationRules.requiresId('styleId'),
    CommonValidationRules.requiresName('styleName'),
    CommonValidationRules.requiresNodeAndStyleId(),
    CommonValidationRules.requiresNodeIds(),
    // Style-specific validation
    {
      create: (data) => !!data.styleName && !!data.styleType,
      apply: (data) => !!data.nodeId && !!data.styleId,
      apply_bulk: (data) => Array.isArray(data.nodeIds) && data.nodeIds.length > 0 && !!data.styleId,
    }
  )
);

// Export types
export type ManageStylesParams = z.infer<typeof ManageStylesSchema>;
export type GradientStop = z.infer<typeof GradientStopSchema>;
export type Effect = z.infer<typeof EffectSchema>;
export type LayoutGrid = z.infer<typeof LayoutGridSchema>;