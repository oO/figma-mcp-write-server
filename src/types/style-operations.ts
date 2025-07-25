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

// Internal schema definitions (not exported - only used within ManageStylesSchema)
const GradientStopSchema = z.object({
  position: z.number(),
  color: z.string(),
});

const EffectSchema = z.object({
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

const LayoutGridSchema = z.object({
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
  ['apply'], // Style-specific operations beyond CRUD
  {
    // Use shared identification fields
    nodeId: z.string().optional(),
    styleId: z.string().optional(),
    componentId: z.string().optional(),
    instanceId: z.string().optional(),
    variableId: z.string().optional(),
    collectionId: z.string().optional(),
    
    // Style-specific fields
    type: FigmaStyleTypesCompat.optional(),
    
    // Paint Style Properties
    paintType: FigmaPaintTypes.optional(),
    gradientStops: z.array(GradientStopSchema).optional(),
    gradientTransform: z.array(z.number()).optional(),
    imageHash: z.string().optional(),
    scaleMode: FigmaScaleModes.optional(),
    
    // Style-specific color field (styles use 'color', not 'fillColor')
    color: z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/).optional(),
    
    // Use shared visual fields
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
  // Validation rules for implemented operations only
  {
    create: (data) => !!data.name && !!data.type,
    update: (data) => !!data.styleId,
    delete: (data) => !!data.styleId,
    get: (data) => !!data.styleId,
    apply: (data) => !!data.nodeId && !!data.styleId,
    duplicate: (data) => !!data.styleId,
  }
);

// Export types
export type ManageStylesParams = z.infer<typeof ManageStylesSchema>;