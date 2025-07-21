import { z } from 'zod';
import { caseInsensitiveEnum } from './enum-utils.js';

// ================================================================================
// Plugin Status Operations Schema
// ================================================================================

export const PluginStatusSchema = z.object({
  operation: caseInsensitiveEnum(['ping', 'status', 'health', 'system', 'figma']),
  timeout: z.number().min(100).max(30000).optional()
});

export type PluginStatusParams = z.infer<typeof PluginStatusSchema>;