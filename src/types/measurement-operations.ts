import { z } from 'zod';

// ================================================================================
// Measurement Operations Schema
// ================================================================================

export const ManageMeasurementsSchema = z.object({
  operation: z.enum(['add_measurement', 'edit_measurement', 'remove_measurement', 'list_measurements']),
  measurementId: z.union([z.string(), z.array(z.string())]).optional(),
  fromNodeId: z.union([z.string(), z.array(z.string())]).optional(),
  toNodeId: z.union([z.string(), z.array(z.string())]).optional(),
  direction: z.union([z.enum(['horizontal', 'vertical', 'distance']), z.array(z.enum(['horizontal', 'vertical', 'distance']))]).optional(),
  label: z.union([z.string(), z.array(z.string())]).optional(),
  customValue: z.union([z.string(), z.array(z.string())]).optional(),
  pageId: z.union([z.string(), z.array(z.string())]).optional()
});

export type ManageMeasurementsParams = z.infer<typeof ManageMeasurementsSchema>;