import { z } from 'zod';

// ================================================================================
// Vectors Operations Schema
// ================================================================================

// SVG Path object schema
const VectorPathSchema = z.object({
  windingRule: z.enum(['EVENODD', 'NONZERO']).default('NONZERO'),
  data: z.string()
});

// Transform origin schema
const TransformOriginSchema = z.object({
  x: z.number(),
  y: z.number()
});

export const VectorsOperationsSchema = z.object({
  operation: z.enum([
    // VectorNetwork Format (Advanced) 
    'create_vector', 'get_vector', 'update_vector',
    // Line Format (Simple Lines)
    'create_line', 'get_line', 'update_line',
    // Utility Operations
    'flatten', 'convert_stroke', 'convert_shape', 'convert_text', 'extract_element'
  ]),
  
  // Node identification
  nodeId: z.string().optional(),
  nodeIds: z.array(z.string()).optional(),
  
  
  // VectorNetwork Format parameters (sparse format)
  vertices: z.string().optional(), // JSON array: "[x,y,x,y,x,y...]"
  regions: z.array(z.object({
    loops: z.array(z.string()), // ["[0,1,2,3]", "[4,5,6,7]"]
    windingRule: z.enum(['EVENODD', 'NONZERO']).optional(),
    fillIndex: z.number().optional()
  })).optional(),
  paths: z.array(z.string()).optional(), // ["[0,1,2]", "[5,6,7]"]
  handles: z.record(z.string()).optional(), // {"0→1": "[tx1,ty1,tx2,ty2]"}
  vertexProps: z.record(z.any()).optional(),
  fills: z.array(z.array(z.any())).optional(), // Paint[][] palette
  
  // Alternative: wrapped sparse format
  vectorNetwork: z.object({
    vertices: z.string(), // JSON array: "[x,y,x,y,x,y...]"
    regions: z.array(z.object({
      loops: z.array(z.string()), // ["[0,1,2,3]", "[4,5,6,7]"]
      windingRule: z.enum(['EVENODD', 'NONZERO']).optional(),
      fillIndex: z.number().optional()
    })).optional(),
    paths: z.array(z.string()).optional(), // ["[0,1,2]", "[5,6,7]"]
    handles: z.record(z.string()).optional(), // {"0→1": "[tx1,ty1,tx2,ty2]"}
    vertexProps: z.record(z.any()).optional(),
    fills: z.array(z.array(z.any())).optional()
  }).optional(),
  
  // Line Format parameters (two styles)
  startX: z.number().optional(),
  startY: z.number().optional(),
  endX: z.number().optional(),
  endY: z.number().optional(),
  length: z.number().optional(),
  
  // Common parameters
  parentId: z.string().optional(),
  name: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  fillColor: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().min(0).optional(),
  strokeDashPattern: z.array(z.number()).optional(),
  cornerRadius: z.number().min(0).optional(),
  
  
  // Node-level transform parameters (for update_vector)
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  rotation: z.number().optional(), // Used for both line and node-level transforms
  transformMode: z.enum(['absolute', 'relative']).default('absolute'),
  
  // Operation-specific parameters
  merge: z.boolean().default(false),
  replaceOriginal: z.boolean().default(true),
  pathIndex: z.number().optional(),
  tolerance: z.number().min(0).default(1.0),
  
  // Extract element parameters
  elementType: z.enum(['region', 'path']).optional(),
  regionIndex: z.number().optional(),
  removeFromSource: z.boolean().default(true)
});

export type VectorsOperationsParams = z.infer<typeof VectorsOperationsSchema>;