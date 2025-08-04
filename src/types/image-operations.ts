import { z } from 'zod';
import { caseInsensitiveEnum } from './enum-utils.js';

/**
 * Image management operations schema
 */
export const ManageImagesSchema = z.object({
  operation: caseInsensitiveEnum(['list', 'get', 'export', 'create']),
  
  // Page selection
  pageId: z.string().optional(),
  
  // For 'get' and 'export' operations
  imageHash: z.union([
    z.string(),
    z.array(z.string())
  ]).optional(),
  
  // Options (mainly for 'get' operation)
  includeMetadata: z.boolean().optional(),
  includeUsage: z.boolean().optional(),
  
  // Filters (mainly for 'list' operation)
  filterByHash: z.array(z.string()).optional(),
  filterByNode: z.array(z.string()).optional(),
  
  // Export operation parameters
  format: z.enum(['DATA', 'PNG']).optional(),
  outputDirectory: z.string().optional(),
  suffix: z.string().optional(),
  
  // Create operation parameters
  source: z.union([
    z.string(),
    z.array(z.string())
  ]).optional(),
  
  // Internal parameters (converted from source)
  url: z.union([
    z.string(),
    z.array(z.string())
  ]).optional(),
  path: z.union([
    z.string(),
    z.array(z.string())
  ]).optional(),
  x: z.union([
    z.number(),
    z.array(z.number())
  ]).optional(),
  y: z.union([
    z.number(),
    z.array(z.number())
  ]).optional(),
  name: z.union([
    z.string(),
    z.array(z.string())
  ]).optional(),
  imageBytes: z.union([
    z.string(),
    z.array(z.string())
  ]).optional() // Base64 encoded image data (internal use)
});

export type ManageImagesParams = z.infer<typeof ManageImagesSchema>;