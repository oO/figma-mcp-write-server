import { z } from 'zod';

// ================================================================================
// Boolean Operations Schema
// ================================================================================

export const ManageBooleanOperationsSchema = z.object({
  operation: z.enum(['union', 'subtract', 'intersect', 'exclude']),
  nodeIds: z.array(z.string()).min(2, "Boolean operations require at least 2 nodes"),
  name: z.string().optional(),
  preserveOriginal: z.boolean().default(false)
});

export type ManageBooleanOperationsParams = z.infer<typeof ManageBooleanOperationsSchema>;