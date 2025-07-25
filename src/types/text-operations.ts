import { z } from 'zod';
import { caseInsensitiveEnum } from './enum-utils.js';

export const ManageTextSchema = z.object({
  operation: caseInsensitiveEnum(['create', 'update', 'get', 'delete', 'set_range', 'get_range', 'delete_range', 'insert_text', 'delete_text', 'search_text']),
  
  // Basic parameters (support arrays for bulk operations)
  nodeId: z.union([z.string(), z.array(z.string())]).optional(),
  parentId: z.string().optional(),
  characters: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
  x: z.union([z.number(), z.array(z.number())]).optional(),
  y: z.union([z.number(), z.array(z.number())]).optional(),
  name: z.union([z.string(), z.array(z.string())]).optional(),
  width: z.union([z.number().min(1), z.array(z.number().min(1))]).optional(),
  height: z.union([z.number().min(1), z.array(z.number().min(1))]).optional(),
  
  // Font parameters
  fontFamily: z.union([z.string(), z.array(z.string())]).optional(),
  fontStyle: z.union([z.string(), z.array(z.string())]).optional(),
  fontSize: z.union([z.number().min(1).max(400), z.array(z.number().min(1).max(400))]).optional(),
  
  // Text formatting parameters
  fillColor: z.union([z.string().regex(/^#[0-9A-Fa-f]{6}$/), z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/))]).optional(),
  textCase: z.union([caseInsensitiveEnum(['ORIGINAL', 'UPPER', 'LOWER', 'TITLE']), z.array(caseInsensitiveEnum(['ORIGINAL', 'UPPER', 'LOWER', 'TITLE']))]).optional(),
  textDecoration: z.union([caseInsensitiveEnum(['NONE', 'UNDERLINE', 'STRIKETHROUGH']), z.array(caseInsensitiveEnum(['NONE', 'UNDERLINE', 'STRIKETHROUGH']))]).optional(),
  
  // Advanced text decoration parameters
  textDecorationStyle: z.union([caseInsensitiveEnum(['SOLID', 'WAVY', 'DOTTED']), z.array(caseInsensitiveEnum(['SOLID', 'WAVY', 'DOTTED']))]).optional(),
  textDecorationOffset: z.union([z.number(), z.array(z.number())]).optional(),
  textDecorationOffsetUnit: z.union([caseInsensitiveEnum(['PIXELS', 'PERCENT', 'AUTO']), z.array(caseInsensitiveEnum(['PIXELS', 'PERCENT', 'AUTO']))]).optional(),
  textDecorationThickness: z.union([z.number(), z.array(z.number())]).optional(),
  textDecorationThicknessUnit: z.union([caseInsensitiveEnum(['PIXELS', 'PERCENT', 'AUTO']), z.array(caseInsensitiveEnum(['PIXELS', 'PERCENT', 'AUTO']))]).optional(),
  textDecorationColor: z.union([z.string().regex(/^#[0-9A-Fa-f]{6}$/), z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/))]).optional(),
  textDecorationColorAuto: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  textDecorationSkipInk: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  textAlignHorizontal: z.union([caseInsensitiveEnum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']), z.array(caseInsensitiveEnum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']))]).optional(),
  textAlignVertical: z.union([caseInsensitiveEnum(['TOP', 'CENTER', 'BOTTOM']), z.array(caseInsensitiveEnum(['TOP', 'CENTER', 'BOTTOM']))]).optional(),
  textAutoResize: z.union([caseInsensitiveEnum(['NONE', 'WIDTH_AND_HEIGHT', 'HEIGHT']), z.array(caseInsensitiveEnum(['NONE', 'WIDTH_AND_HEIGHT', 'HEIGHT']))]).optional(),
  letterSpacing: z.union([z.number(), z.array(z.number())]).optional(),
  lineHeight: z.union([z.number(), z.array(z.number())]).optional(),
  paragraphSpacing: z.union([z.number().min(0), z.array(z.number().min(0))]).optional(),
  paragraphIndent: z.union([z.number().min(0), z.array(z.number().min(0))]).optional(),
  
  // Flattened character range parameters
  rangeStart: z.union([z.number().min(0), z.array(z.number().min(0))]).optional(),
  rangeEnd: z.union([z.number().min(1), z.array(z.number().min(1))]).optional(),
  rangeFontSize: z.union([z.number().min(1).max(400), z.array(z.number().min(1).max(400))]).optional(),
  rangeFontFamily: z.union([z.string(), z.array(z.string())]).optional(),
  rangeFontStyle: z.union([z.string(), z.array(z.string())]).optional(),
  rangeTextCase: z.union([caseInsensitiveEnum(['ORIGINAL', 'UPPER', 'LOWER', 'TITLE']), z.array(caseInsensitiveEnum(['ORIGINAL', 'UPPER', 'LOWER', 'TITLE']))]).optional(),
  rangeTextDecoration: z.union([caseInsensitiveEnum(['NONE', 'UNDERLINE', 'STRIKETHROUGH']), z.array(caseInsensitiveEnum(['NONE', 'UNDERLINE', 'STRIKETHROUGH']))]).optional(),
  
  // Advanced range text decoration parameters
  rangeTextDecorationStyle: z.union([caseInsensitiveEnum(['SOLID', 'WAVY', 'DOTTED']), z.array(caseInsensitiveEnum(['SOLID', 'WAVY', 'DOTTED']))]).optional(),
  rangeTextDecorationOffset: z.union([z.number(), z.array(z.number())]).optional(),
  rangeTextDecorationOffsetUnit: z.union([caseInsensitiveEnum(['PIXELS', 'PERCENT', 'AUTO']), z.array(caseInsensitiveEnum(['PIXELS', 'PERCENT', 'AUTO']))]).optional(),
  rangeTextDecorationThickness: z.union([z.number(), z.array(z.number())]).optional(),
  rangeTextDecorationThicknessUnit: z.union([caseInsensitiveEnum(['PIXELS', 'PERCENT', 'AUTO']), z.array(caseInsensitiveEnum(['PIXELS', 'PERCENT', 'AUTO']))]).optional(),
  rangeTextDecorationColor: z.union([z.string().regex(/^#[0-9A-Fa-f]{6}$/), z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/))]).optional(),
  rangeTextDecorationColorAuto: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  rangeTextDecorationSkipInk: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  
  rangeLetterSpacing: z.union([z.number(), z.array(z.number())]).optional(),
  rangeFillColor: z.union([z.string().regex(/^#[0-9A-Fa-f]{6}$/), z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/))]).optional(),
  
  // Range hyperlink parameters
  rangeHyperlinkType: z.union([caseInsensitiveEnum(['URL', 'NODE']), z.array(caseInsensitiveEnum(['URL', 'NODE']))]).optional(),
  rangeHyperlinkValue: z.union([z.string(), z.array(z.string())]).optional(),
  
  // Flattened fill parameters
  fillType: z.union([caseInsensitiveEnum(['SOLID']), z.array(caseInsensitiveEnum(['SOLID']))]).optional(),
  fillOpacity: z.union([z.number().min(0).max(1), z.array(z.number().min(0).max(1))]).optional(),
  fillVisible: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  
  // Flattened list parameters
  listType: z.union([caseInsensitiveEnum(['ORDERED', 'UNORDERED', 'NONE']), z.array(caseInsensitiveEnum(['ORDERED', 'UNORDERED', 'NONE']))]).optional(),
  listSpacing: z.union([z.number().min(0), z.array(z.number().min(0))]).optional(),
  
  // Advanced typography parameters
  hangingPunctuation: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  hangingList: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  leadingTrim: z.union([caseInsensitiveEnum(['NONE', 'CAP_HEIGHT', 'BASELINE', 'BOTH']), z.array(caseInsensitiveEnum(['NONE', 'CAP_HEIGHT', 'BASELINE', 'BOTH']))]).optional(),
  autoRename: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  
  // Flattened hyperlink parameters
  hyperlinkType: z.union([caseInsensitiveEnum(['URL', 'NODE']), z.array(caseInsensitiveEnum(['URL', 'NODE']))]).optional(),
  hyperlinkUrl: z.union([z.string(), z.array(z.string())]).optional(),
  hyperlinkNodeId: z.union([z.string(), z.array(z.string())]).optional(),
  
  // Text overflow parameters
  textTruncation: z.union([caseInsensitiveEnum(['DISABLED', 'ENDING']), z.array(caseInsensitiveEnum(['DISABLED', 'ENDING']))]).optional(),
  maxLines: z.union([z.number().min(1), z.array(z.number().min(1))]).optional(),
  
  // Note: OpenType features (ligatures, kerning) are read-only in Figma Plugin API
  
  
  // Text editing parameters
  insertPosition: z.union([z.number().min(0), z.array(z.number().min(0))]).optional(),
  insertText: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
  insertUseStyle: z.union([caseInsensitiveEnum(['BEFORE', 'AFTER']), z.array(caseInsensitiveEnum(['BEFORE', 'AFTER']))]).optional(),
  deleteStart: z.union([z.number().min(0), z.array(z.number().min(0))]).optional(),
  deleteEnd: z.union([z.number().min(1), z.array(z.number().min(1))]).optional(),
  
  // Text search parameters
  searchQuery: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
  searchCaseSensitive: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  searchWholeWord: z.union([z.boolean(), z.array(z.boolean())]).optional(),
  searchMaxResults: z.union([z.number().min(1).max(1000), z.array(z.number().min(1).max(1000))]).optional(),
  
  // Bulk operation control
  failFast: z.boolean().optional()
}).refine((data) => {
  // Validate required fields based on operation
  switch (data.operation) {
    case 'create':
      // Ensure characters is provided and not empty
      if (!data.characters) return false;
      if (Array.isArray(data.characters)) {
        return data.characters.length > 0 && data.characters.every(c => c && c.trim().length > 0);
      }
      return typeof data.characters === 'string' && data.characters.trim().length > 0;
    case 'update':
    case 'get':
    case 'delete':
    case 'set_range':
    case 'get_range':
    case 'delete_range':
      // Ensure nodeId is provided
      if (!data.nodeId) return false;
      if (Array.isArray(data.nodeId)) {
        return data.nodeId.length > 0 && data.nodeId.every(id => id && id.trim().length > 0);
      }
      return typeof data.nodeId === 'string' && data.nodeId.trim().length > 0;
    case 'insert_text':
      // Ensure nodeId, insertPosition, and insertText are provided
      if (!data.nodeId || data.insertPosition === undefined || !data.insertText) return false;
      if (Array.isArray(data.nodeId)) {
        const hasValidNodeIds = data.nodeId.length > 0 && data.nodeId.every(id => id && id.trim().length > 0);
        const hasValidPositions = Array.isArray(data.insertPosition) ? data.insertPosition.length > 0 : data.insertPosition >= 0;
        const hasValidText = Array.isArray(data.insertText) ? data.insertText.length > 0 && data.insertText.every(t => t && t.trim().length > 0) : data.insertText.trim().length > 0;
        return hasValidNodeIds && hasValidPositions && hasValidText;
      }
      return typeof data.nodeId === 'string' && data.nodeId.trim().length > 0 && 
             typeof data.insertPosition === 'number' && data.insertPosition >= 0 && 
             typeof data.insertText === 'string' && data.insertText.trim().length > 0;
    case 'delete_text':
      // Ensure nodeId, deleteStart, and deleteEnd are provided
      if (!data.nodeId || data.deleteStart === undefined || data.deleteEnd === undefined) return false;
      if (Array.isArray(data.nodeId)) {
        const hasValidNodeIds = data.nodeId.length > 0 && data.nodeId.every(id => id && id.trim().length > 0);
        const hasValidStarts = Array.isArray(data.deleteStart) ? data.deleteStart.length > 0 : data.deleteStart >= 0;
        const hasValidEnds = Array.isArray(data.deleteEnd) ? data.deleteEnd.length > 0 : data.deleteEnd >= 1;
        return hasValidNodeIds && hasValidStarts && hasValidEnds;
      }
      return typeof data.nodeId === 'string' && data.nodeId.trim().length > 0 && 
             typeof data.deleteStart === 'number' && data.deleteStart >= 0 && 
             typeof data.deleteEnd === 'number' && data.deleteEnd >= 1 && 
             data.deleteStart < data.deleteEnd;
    case 'search_text':
      // Ensure searchQuery is provided (nodeId is optional for global search)
      if (!data.searchQuery) return false;
      
      // Validate searchQuery
      const hasValidQueries = Array.isArray(data.searchQuery) ? 
        data.searchQuery.length > 0 && data.searchQuery.every(q => q && q.trim().length > 0) : 
        typeof data.searchQuery === 'string' && data.searchQuery.trim().length > 0;
      
      if (!hasValidQueries) return false;
      
      // If nodeId is provided, validate it
      if (data.nodeId !== undefined) {
        if (Array.isArray(data.nodeId)) {
          const hasValidNodeIds = data.nodeId.length > 0 && data.nodeId.every(id => id && id.trim().length > 0);
          return hasValidNodeIds;
        }
        return typeof data.nodeId === 'string' && data.nodeId.trim().length > 0;
      }
      
      // If no nodeId provided, it's a global search - just need valid searchQuery
      return true;
    default:
      return true;
  }
}, (val) => ({
  message: `Missing required parameters for operation '${val.operation}': ${
    val.operation === 'create' ? "'characters' is required and cannot be empty" :
    ['update', 'get', 'delete', 'set_range', 'get_range', 'delete_range'].includes(val.operation) ? "'nodeId' is required and cannot be empty" :
    val.operation === 'insert_text' ? "'nodeId', 'insertPosition', and 'insertText' are required" :
    val.operation === 'delete_text' ? "'nodeId', 'deleteStart', and 'deleteEnd' are required (deleteStart must be < deleteEnd)" :
    val.operation === 'search_text' ? "'searchQuery' is required and cannot be empty (nodeId is optional for global search)" :
    "Missing required parameters"
  }`
}));

export type ManageText = z.infer<typeof ManageTextSchema>;