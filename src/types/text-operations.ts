import { z } from 'zod';

export const ManageTextSchema = z.object({
  operation: z.enum(['create', 'update', 'character_styling', 'convert_to_vectors', 'apply_text_style', 'create_text_style']),
  nodeId: z.string().optional(),
  characters: z.string().min(1, 'Text content cannot be empty').optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  name: z.string().optional(),
  fontFamily: z.string().optional(),
  fontStyle: z.string().optional(),
  fontSize: z.number().min(1).max(1000).optional(),
  fontWeight: z.number().min(100).max(900).optional(),
  textAlignHorizontal: z.enum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']).optional(),
  textAlignVertical: z.enum(['TOP', 'CENTER', 'BOTTOM']).optional(),
  textCase: z.enum(['ORIGINAL', 'UPPER', 'LOWER', 'TITLE']).optional(),
  textDecoration: z.enum(['NONE', 'UNDERLINE', 'STRIKETHROUGH']).optional(),
  letterSpacing: z.union([
    z.number(),
    z.object({ value: z.number(), unit: z.enum(['PIXELS', 'PERCENT']) })
  ]).optional(),
  lineHeight: z.union([
    z.number(),
    z.object({ value: z.number(), unit: z.enum(['PIXELS', 'PERCENT']) })
  ]).optional(),
  paragraphSpacing: z.number().optional(),
  paragraphIndent: z.number().optional(),
  textAutoResize: z.enum(['NONE', 'WIDTH_AND_HEIGHT', 'HEIGHT', 'TRUNCATE']).optional(),
  textListOptions: z.object({
    type: z.enum(['ORDERED', 'UNORDERED'])
  }).optional(),
  characterRanges: z.array(z.object({
    start: z.number().min(0),
    end: z.number().min(0),
    fontSize: z.number().min(1).max(1000).optional(),
    fontFamily: z.string().optional(),
    fontStyle: z.string().optional(),
    fontWeight: z.number().min(100).max(900).optional(),
    textCase: z.enum(['ORIGINAL', 'UPPER', 'LOWER', 'TITLE']).optional(),
    textDecoration: z.enum(['NONE', 'UNDERLINE', 'STRIKETHROUGH']).optional(),
    letterSpacing: z.union([
      z.number(),
      z.object({ value: z.number(), unit: z.enum(['PIXELS', 'PERCENT']) })
    ]).optional(),
    fills: z.array(z.object({
      type: z.enum(['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL']),
      color: z.string().optional(),
      visible: z.boolean().optional(),
      opacity: z.number().min(0).max(1).optional()
    })).optional()
  })).optional(),
  fills: z.array(z.object({
    type: z.enum(['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL']),
    color: z.string().optional(),
    visible: z.boolean().optional(),
    opacity: z.number().min(0).max(1).optional()
  })).optional(),
  vectorConversion: z.object({
    preserveStrokes: z.boolean().optional(),
    combineShapes: z.boolean().optional()
  }).optional(),
  textStyleId: z.string().optional(),
  styleName: z.string().optional(),
  styleDescription: z.string().optional(),
  hyperlink: z.object({
    type: z.enum(['URL', 'NODE']),
    url: z.string().optional(),
    nodeId: z.string().optional()
  }).optional(),
  openTypeFeatures: z.record(z.boolean()).optional()
});

export type ManageText = z.infer<typeof ManageTextSchema>;