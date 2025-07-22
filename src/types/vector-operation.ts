import { z } from 'zod';

// ================================================================================
// Vector Operations Schema
// ================================================================================

export const ManageVectorOperationsSchema = z.object({
  operation: z.enum(['create_vector', 'flatten', 'outline_stroke', 'get_vector_paths']),
  nodeId: z.string().optional(),
  vectorPaths: z.array(z.object({
    windingRule: z.enum(['EVENODD', 'NONZERO']).default('NONZERO'),
    data: z.string()
  })).optional(),
  name: z.string().optional(),
  strokeWidth: z.number().min(0).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  preserveOriginal: z.boolean().default(false)
});

export type ManageVectorOperationsParams = z.infer<typeof ManageVectorOperationsSchema>;