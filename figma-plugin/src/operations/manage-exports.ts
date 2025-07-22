import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById, getNodesByIds } from '../utils/node-utils.js';
import { formatExportResponse } from '../utils/response-utils.js';

/**
 * Handle EXPORT_SINGLE operation
 */
export async function handleExportSingle(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('exportSingle', params, async () => {
    // Use 'id' parameter (standard naming)
    const nodeId = params.id;
    BaseOperation.validateParams({ ...params, nodeId }, ['nodeId']);
    
    const node = findNodeById(nodeId);
    
    // Validate node exists and supports export
    if (!node) {
      throw new Error(`Node with ID ${nodeId} not found or is not exportable`);
    }
    
    // Check if node supports exportAsync
    if (!('exportAsync' in node) || typeof node.exportAsync !== 'function') {
      throw new Error(`Node type '${node.type}' does not support export operations. Only scene nodes (frames, groups, components, etc.) can be exported.`);
    }
    
    const format = BaseOperation.validateStringParam(
      params.format || 'PNG',
      'format',
      ['PNG', 'JPG', 'SVG', 'PDF']
    );
    
    // Build export settings
    const exportSettings = buildExportSettings(params, format);
    
    try {
      // Export the node
      const exportedData = await (node as any).exportAsync(exportSettings);
      
      // Convert to base64 for transmission
      const base64Data = figma.base64Encode(exportedData);
      
      // Generate filename for file output
      const filename = generateFilename(node, format, params);
      
      return {
        nodeId: nodeId,
        nodeName: node.name,
        format,
        settings: exportSettings,
        data: base64Data,
        dataFormat: 'base64',
        filename,
        size: exportedData.length,
        message: `Successfully exported ${node.type} "${node.name}" as ${format}`
      };
    } catch (error) {
      throw new Error(`Export failed: ${error.toString()}`);
    }
  });
}

/**
 * Handle EXPORT_NODE operation - uses 'id' parameter instead of 'nodeId'
 */
export async function handleExportNode(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('exportNode', params, async () => {
    // Use 'id' parameter (standard naming)
    const nodeId = params.id;
    BaseOperation.validateParams({ ...params, nodeId }, ['nodeId']);
    
    const node = findNodeById(nodeId);
    
    // Validate node exists and supports export
    if (!node) {
      throw new Error(`Node with ID ${nodeId} not found or is not exportable`);
    }
    
    // Check if node supports exportAsync
    if (!('exportAsync' in node) || typeof node.exportAsync !== 'function') {
      throw new Error(`Node type '${node.type}' does not support export operations. Only scene nodes (frames, groups, components, etc.) can be exported.`);
    }
    
    const format = BaseOperation.validateStringParam(
      params.format || 'PNG',
      'format',
      ['PNG', 'JPG', 'SVG', 'PDF']
    );
    
    // Build export settings
    const exportSettings = buildExportSettings(params, format);
    
    try {
      // Export the node
      const exportedData = await (node as any).exportAsync(exportSettings);
      
      // Convert to base64 for transmission
      const base64Data = figma.base64Encode(exportedData);
      
      // Generate filename for file output
      const filename = generateFilename(node, format, params);
      
      return {
        nodeId: nodeId,
        nodeName: node.name,
        format,
        settings: exportSettings,
        data: base64Data,
        dataFormat: 'base64',
        filename,
        size: exportedData.length,
        message: `Successfully exported ${node.type} "${node.name}" as ${format}`
      };
    } catch (error) {
      throw new Error(`Export failed: ${error.toString()}`);
    }
  });
}

/**
 * Handle EXPORT_BULK operation
 */
export async function handleExportBulk(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('exportBulk', params, async () => {
    // Use 'id' parameter (standard naming)
    const nodeIds = params.id;
    BaseOperation.validateParams({ ...params, nodeIds }, ['nodeIds']);
    
    const nodeIdList = Array.isArray(nodeIds) ? nodeIds : [nodeIds];
    const format = BaseOperation.validateStringParam(
      params.format || 'PNG',
      'format',
      ['PNG', 'JPG', 'SVG', 'PDF']
    );
    
    const results = [];
    const failures = [];
    
    // Build export settings once for all exports
    const exportSettings = buildExportSettings(params, format);
    
    for (const nodeId of nodeIdList) {
      try {
        const node = findNodeById(nodeId);
        
        if (!node) {
          failures.push({
            nodeId,
            error: 'Node not found'
          });
          continue;
        }
        
        // Check if node supports exportAsync
        if (!('exportAsync' in node) || typeof node.exportAsync !== 'function') {
          failures.push({
            nodeId,
            nodeName: node.name,
            error: `Node type '${node.type}' does not support export`
          });
          continue;
        }
        
        // Export the node
        const exportedData = await (node as any).exportAsync(exportSettings);
        const base64Data = figma.base64Encode(exportedData);
        
        // Generate filename for file output
        const filename = generateFilename(node, format, params);
        
        results.push({
          nodeId,
          nodeName: node.name,
          nodeType: node.type,
          format,
          data: base64Data,
          dataFormat: 'base64',
          filename,
          size: exportedData.length
        });
        
      } catch (error) {
        failures.push({
          nodeId,
          error: error.toString()
        });
      }
    }
    
    return {
      results,
      failures,
      summary: {
        total: nodeIdList.length,
        successful: results.length,
        failed: failures.length
      },
      format,
      settings: exportSettings,
      message: `Bulk export completed: ${results.length} successful, ${failures.length} failed`
    };
  });
}



// Helper functions
function buildExportSettings(params: any, format: string): any {
  const settings: any = {
    format: format as any
  };
  
  // Handle scaling
  if (params.scale && params.scale !== 1) {
    settings.constraint = {
      type: 'SCALE',
      value: params.scale
    };
  } else if (params.width || params.height) {
    if (params.width && params.height) {
      settings.constraint = {
        type: 'WIDTH_AND_HEIGHT',
        value: { width: params.width, height: params.height }
      };
    } else if (params.width) {
      settings.constraint = {
        type: 'WIDTH',
        value: params.width
      };
    } else {
      settings.constraint = {
        type: 'HEIGHT',
        value: params.height
      };
    }
  }
  
  // Format-specific settings
  // Note: Figma API doesn't support quality settings for JPG exports
  
  if (format === 'PNG' && params.useAbsoluteBounds !== undefined) {
    settings.useAbsoluteBounds = params.useAbsoluteBounds;
  }
  
  if (format === 'SVG') {
    if (params.svgIdAttribute !== undefined) {
      settings.svgIdAttribute = params.svgIdAttribute;
    }
    if (params.svgSimplifyStroke !== undefined) {
      settings.svgSimplifyStroke = params.svgSimplifyStroke;
    }
  }
  
  return settings;
}


/**
 * Generate filename for exported assets
 */
function generateFilename(node: any, format: string, params: any): string {
  // Sanitize node name for filename
  const sanitizedName = node.name
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid filename characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  
  // Use sanitized name or fallback
  const baseName = sanitizedName || `node_${node.id}`;
  
  // Add scale suffix if specified
  let suffix = '';
  if (params.scale && params.scale !== 1) {
    suffix = `_${params.scale}x`;
  }
  
  // Add custom suffix if provided
  if (params.suffix) {
    suffix += `_${params.suffix}`;
  }
  
  // Generate final filename
  const extension = format.toLowerCase();
  return `${baseName}${suffix}.${extension}`;
}