import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById, findNodeOrPageById, getNodesByIds } from '../utils/node-utils.js';
import { modifyExportSettings } from '../utils/figma-property-utils.js';

/**
 * Handle MANAGE_EXPORTS operation - manages export settings and performs exports
 */
export async function handleManageExports(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('manageExports', params, async () => {
    const { operation, id, nodeId, exportIndex, newIndex, fromNodeId, toNodeId, fromId, toId } = params;
  
  // Support both legacy nodeId and new id parameter
  const targetId = id || nodeId;
  const sourceId = fromId || fromNodeId;
  const destinationId = toId || toNodeId;
    
    switch (operation) {
      case 'get_setting':
        return handleGetSetting(params);
      case 'create_setting':
        return handleCreateSetting(params);
      case 'update_setting':
        return handleUpdateSetting(params);
      case 'delete_setting':
        return handleDeleteSetting(params);
      case 'reorder_setting':
        return handleReorderSetting(params);
      case 'clear_settings':
        return handleClearSettings(params);
      case 'duplicate_setting':
        return handleDuplicateSetting(params);
      case 'export':
        return handleExport(params);
      default:
        throw new Error(`Unknown export operation: ${operation}`);
    }
  });
}

/**
 * Get specific export setting by index or all export settings
 */
function handleGetSetting(params: any): OperationResult {
  const { id, nodeId, exportIndex } = params;
  const targetId = id || nodeId;
  const target = findNodeOrPageById(targetId);
  
  if (!target) {
    throw new Error(`Node or page with ID ${targetId} not found`);
  }
  
  if (exportIndex !== undefined) {
    // Get specific setting by index
    if (exportIndex < 0 || exportIndex >= node.exportSettings.length) {
      throw new Error(`Export setting index ${exportIndex} out of range. Node has ${node.exportSettings.length} export settings.`);
    }
    
    return {
      id: targetId,
      nodeId: targetId, // Legacy compatibility
      nodeName: target.name,
      exportIndex,
      setting: target.exportSettings[exportIndex],
      message: `Retrieved export setting ${exportIndex} from ${target.type.toLowerCase()} "${target.name}"`
    };
  } else {
    // Get all settings
    return {
      id: targetId,
      nodeId: targetId, // Legacy compatibility
      nodeName: target.name,
      settings: target.exportSettings,
      count: target.exportSettings.length,
      message: `Retrieved ${target.exportSettings.length} export settings from ${target.type.toLowerCase()} "${target.name}"`
    };
  }
}

/**
 * Create new export setting
 */
function handleCreateSetting(params: any): OperationResult {
  const { nodeId, format } = params;
  const node = findNodeById(nodeId);
  
  if (!node) {
    throw new Error(`Node with ID ${nodeId} not found`);
  }
  
  // Build export settings from flattened parameters
  const exportSettings = buildExportSettingsFromParams(params);
  
  // Add the new setting using property management
  modifyExportSettings(node, manager => {
    manager.push(exportSettings);
  });
  
  const newIndex = node.exportSettings.length - 1;
  
  return {
    nodeId,
    nodeName: node.name,
    exportIndex: newIndex,
    setting: exportSettings,
    totalSettings: node.exportSettings.length,
    message: `Created new ${format} export setting for node "${node.name}" at index ${newIndex}`
  };
}

/**
 * Update existing export setting
 */
function handleUpdateSetting(params: any): OperationResult {
  const { id, nodeId, exportIndex } = params;
  const targetId = id || nodeId;
  const target = findNodeOrPageById(targetId);
  
  if (!target) {
    throw new Error(`Node or page with ID ${targetId} not found`);
  }
  
  if (exportIndex < 0 || exportIndex >= target.exportSettings.length) {
    throw new Error(`Export setting index ${exportIndex} out of range. Target has ${target.exportSettings.length} export settings.`);
  }
  
  // Get existing setting and merge with new parameters
  const existingSetting = target.exportSettings[exportIndex];
  const updatedSettings = buildExportSettingsFromParams(params, existingSetting);
  
  // Update the setting using property management
  modifyExportSettings(target, manager => {
    manager.update(exportIndex, updatedSettings);
  });
  
  return {
    id: targetId,
    nodeId: targetId, // Legacy compatibility
    nodeName: target.name,
    exportIndex,
    setting: updatedSettings,
    previousSetting: existingSetting,
    message: `Updated export setting ${exportIndex} for ${target.type.toLowerCase()} "${target.name}"`
  };
}

/**
 * Delete export setting by index
 */
function handleDeleteSetting(params: any): OperationResult {
  const { id, nodeId, exportIndex } = params;
  const targetId = id || nodeId;
  const target = findNodeOrPageById(targetId);
  
  if (!target) {
    throw new Error(`Node or page with ID ${targetId} not found`);
  }
  
  if (exportIndex < 0 || exportIndex >= target.exportSettings.length) {
    throw new Error(`Export setting index ${exportIndex} out of range. Target has ${target.exportSettings.length} export settings.`);
  }
  
  const deletedSetting = target.exportSettings[exportIndex];
  
  // Remove the setting using property management
  modifyExportSettings(target, manager => {
    manager.remove(exportIndex);
  });
  
  return {
    id: targetId,
    nodeId: targetId, // Legacy compatibility
    nodeName: target.name,
    exportIndex,
    deletedSetting,
    remainingSettings: target.exportSettings.length,
    message: `Deleted export setting ${exportIndex} from ${target.type.toLowerCase()} "${target.name}". ${target.exportSettings.length} settings remaining.`
  };
}

/**
 * Reorder export setting
 */
function handleReorderSetting(params: any): OperationResult {
  const { id, nodeId, exportIndex, newIndex } = params;
  const targetId = id || nodeId;
  const target = findNodeOrPageById(targetId);
  
  if (!target) {
    throw new Error(`Node or page with ID ${targetId} not found`);
  }
  
  if (exportIndex < 0 || exportIndex >= target.exportSettings.length) {
    throw new Error(`Export setting index ${exportIndex} out of range. Target has ${target.exportSettings.length} export settings.`);
  }
  
  if (newIndex < 0 || newIndex >= target.exportSettings.length) {
    throw new Error(`New index ${newIndex} out of range. Target has ${target.exportSettings.length} export settings.`);
  }
  
  const movedSetting = target.exportSettings[exportIndex];
  
  // Reorder the setting using property management
  modifyExportSettings(target, manager => {
    manager.move(exportIndex, newIndex);
  });
  
  return {
    id: targetId,
    nodeId: targetId, // Legacy compatibility
    nodeName: target.name,
    exportIndex,
    newIndex,
    movedSetting,
    message: `Moved export setting from index ${exportIndex} to ${newIndex} for ${target.type.toLowerCase()} "${target.name}"`
  };
}

/**
 * Clear all export settings
 */
function handleClearSettings(params: any): OperationResult {
  const { id, nodeId } = params;
  const targetId = id || nodeId;
  const target = findNodeOrPageById(targetId);
  
  if (!target) {
    throw new Error(`Node or page with ID ${targetId} not found`);
  }
  
  const clearedCount = target.exportSettings.length;
  
  // Clear all settings using property management
  modifyExportSettings(target, manager => {
    manager.clear();
  });
  
  return {
    id: targetId,
    nodeId: targetId, // Legacy compatibility
    nodeName: target.name,
    clearedCount,
    message: `Cleared ${clearedCount} export settings from ${target.type.toLowerCase()} "${target.name}"`
  };
}

/**
 * Duplicate export settings from one node to another
 */
function handleDuplicateSetting(params: any): OperationResult {
  const { fromId, fromNodeId, toId, toNodeId, exportIndex } = params;
  const sourceId = fromId || fromNodeId;
  const destinationId = toId || toNodeId;
  const fromTarget = findNodeOrPageById(sourceId);
  
  if (!fromTarget) {
    throw new Error(`Source node or page with ID ${sourceId} not found`);
  }
  
  // Handle single or multiple target nodes/pages
  const toTargetIds = Array.isArray(destinationId) ? destinationId : [destinationId];
  const results = [];
  
  for (const targetId of toTargetIds) {
    const toTarget = findNodeOrPageById(targetId);
    
    if (!toTarget) {
      results.push({
        id: targetId,
        nodeId: targetId, // Legacy compatibility
        success: false,
        error: 'Node or page not found'
      });
      continue;
    }
    
    try {
      // Copy specific setting or all settings
      const settingsToCopy = exportIndex !== undefined 
        ? [fromTarget.exportSettings[exportIndex]]
        : fromTarget.exportSettings;
      
      if (exportIndex !== undefined && (exportIndex < 0 || exportIndex >= fromTarget.exportSettings.length)) {
        throw new Error(`Export setting index ${exportIndex} out of range. Source has ${fromTarget.exportSettings.length} export settings.`);
      }
      
      // Add copied settings to target node/page
      modifyExportSettings(toTarget, manager => {
        settingsToCopy.forEach(setting => {
          manager.push({ ...setting }); // Create copies
        });
      });
      
      results.push({
        id: targetId,
        nodeId: targetId, // Legacy compatibility
        nodeName: toTarget.name,
        success: true,
        copiedSettings: settingsToCopy.length,
        totalSettings: toTarget.exportSettings.length,
        message: `Copied ${settingsToCopy.length} export settings to ${toTarget.type.toLowerCase()} "${toTarget.name}"`
      });
    } catch (error) {
      results.push({
        id: targetId,
        nodeId: targetId, // Legacy compatibility
        success: false,
        error: error.toString()
      });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  
  return {
    fromId: sourceId,
    fromNodeId: sourceId, // Legacy compatibility
    fromNodeName: fromTarget.name,
    results,
    summary: {
      total: results.length,
      successful: successCount,
      failed: failCount
    },
    message: `Duplicated export settings from ${fromTarget.type.toLowerCase()} "${fromTarget.name}" to ${successCount} targets (${failCount} failed)`
  };
}

/**
 * Export node(s) using settings
 */
async function handleExport(params: any): Promise<OperationResult> {
  const { id, nodeId, target = 'FILE', exportIndex } = params;
  const targetId = id || nodeId;
  const targetIds = Array.isArray(targetId) ? targetId : [targetId];
  
  const results = [];
  
  for (const singleId of targetIds) {
    const exportTarget = findNodeOrPageById(singleId);
    
    if (!exportTarget) {
      results.push({
        id: singleId,
        nodeId: singleId, // Legacy compatibility
        success: false,
        error: 'Node or page not found'
      });
      continue;
    }
    
    // Check if target supports exportAsync
    if (!('exportAsync' in exportTarget) || typeof exportTarget.exportAsync !== 'function') {
      results.push({
        id: singleId,
        nodeId: singleId, // Legacy compatibility
        success: false,
        error: `${exportTarget.type} does not support export operations`
      });
      continue;
    }
    
    try {
      // Handle page-specific logic - load page if needed
      if (exportTarget.type === 'PAGE' && 'loadAsync' in exportTarget) {
        await exportTarget.loadAsync();
      }
      
      let exportSettings;
      
      if (exportIndex !== undefined) {
        // Use predefined setting
        if (exportIndex < 0 || exportIndex >= exportTarget.exportSettings.length) {
          throw new Error(`Export setting index ${exportIndex} out of range. Target has ${exportTarget.exportSettings.length} export settings.`);
        }
        exportSettings = exportTarget.exportSettings[exportIndex];
      } else if (params.format || params.constraintType || params.constraintValue || params.contentsOnly !== undefined || params.useAbsoluteBounds !== undefined || params.colorProfile || params.suffix !== undefined || params.svgOutlineText !== undefined || params.svgIdAttribute !== undefined || params.svgSimplifyStroke !== undefined) {
        // Use custom settings from parameters with node's first setting as base (or default if no settings)
        const baseSetting = (exportTarget.exportSettings && exportTarget.exportSettings.length > 0) 
          ? { ...exportTarget.exportSettings[0] } 
          : { format: 'PNG', contentsOnly: true };
        exportSettings = buildExportSettingsFromParams(params, baseSetting);
        
        // Ensure format is always valid
        if (!exportSettings.format || !['PNG', 'JPG', 'PDF', 'SVG', 'SVG_STRING'].includes(exportSettings.format)) {
          exportSettings.format = 'PNG';
        }
      } else {
        // Use node's first export setting - skip nodes without export settings
        if (exportTarget.exportSettings && exportTarget.exportSettings.length > 0) {
          exportSettings = exportTarget.exportSettings[0];
        } else {
          // Skip nodes without export settings
          results.push({
            id: singleId,
            nodeId: singleId, // Legacy compatibility
            success: false,
            error: `No export settings found for ${exportTarget.type.toLowerCase()} "${exportTarget.name}". Use format parameter to specify export settings.`
          });
          continue;
        }
      }
      
      // Handle SVG format auto-selection based on target
      if (exportSettings.format === 'SVG') {
        exportSettings.format = target === 'DATA' ? 'SVG_STRING' : 'SVG';
      }
      
      // Export the node or page
      const exportedData = await (exportTarget as any).exportAsync(exportSettings);
      
      // Handle data encoding based on format
      let data, dataFormat;
      if (exportSettings.format === 'SVG_STRING') {
        // SVG_STRING returns string directly
        data = exportedData;
        dataFormat = 'string';
      } else {
        // Convert binary data to base64 for transmission
        data = figma.base64Encode(exportedData);
        dataFormat = 'base64';
      }
      
      // Generate filename
      const filename = generateFilename(exportTarget, exportSettings.format, params);
      
      results.push({
        id: singleId,
        nodeId: singleId, // Legacy compatibility
        nodeName: exportTarget.name,
        nodeType: exportTarget.type,
        success: true,
        format: exportSettings.format,
        settings: exportSettings,
        data: data,
        dataFormat: dataFormat,
        filename,
        size: exportedData.length,
        target,
        message: `Successfully exported ${exportTarget.type.toLowerCase()} "${exportTarget.name}" as ${exportSettings.format}`
      });
    } catch (error) {
      results.push({
        id: singleId,
        nodeId: singleId, // Legacy compatibility
        success: false,
        error: error.toString()
      });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  
  // For single target export, return the result directly
  if (targetIds.length === 1) {
    return results[0];
  }
  
  // For bulk export, return summary
  return {
    results,
    summary: {
      total: results.length,
      successful: successCount,
      failed: failCount
    },
    target,
    message: `Bulk export completed: ${successCount} successful, ${failCount} failed`
  };
}

/**
 * Build ExportSettings from flattened parameters
 */
function buildExportSettingsFromParams(params: any, existingSetting?: any): any {
  const settings: any = existingSetting ? { ...existingSetting } : {};
  
  // Core settings
  if (params.format) settings.format = params.format;
  if (params.contentsOnly !== undefined) settings.contentsOnly = params.contentsOnly;
  if (params.useAbsoluteBounds !== undefined) settings.useAbsoluteBounds = params.useAbsoluteBounds;
  if (params.colorProfile) settings.colorProfile = params.colorProfile;
  if (params.suffix !== undefined) settings.suffix = params.suffix;
  
  // Clean up incompatible properties based on format
  const finalFormat = params.format || existingSetting?.format;
  
  if (finalFormat === 'SVG' || finalFormat === 'SVG_STRING') {
    // SVG doesn't support constraints - remove if present
    delete settings.constraint;
    
    // SVG-specific settings
    if (params.svgOutlineText !== undefined) settings.svgOutlineText = params.svgOutlineText;
    if (params.svgIdAttribute !== undefined) settings.svgIdAttribute = params.svgIdAttribute;
    if (params.svgSimplifyStroke !== undefined) settings.svgSimplifyStroke = params.svgSimplifyStroke;
  } else if (finalFormat === 'PNG' || finalFormat === 'JPG') {
    // PNG/JPG support constraints
    if (params.constraintType && params.constraintValue) {
      settings.constraint = {
        type: params.constraintType,
        value: params.constraintValue
      };
    }
    
    // Remove SVG-specific properties if present
    delete settings.svgOutlineText;
    delete settings.svgIdAttribute;
    delete settings.svgSimplifyStroke;
  } else if (finalFormat === 'PDF') {
    // PDF doesn't support constraints or SVG-specific properties
    delete settings.constraint;
    delete settings.svgOutlineText;
    delete settings.svgIdAttribute;
    delete settings.svgSimplifyStroke;
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
  
  // Add custom suffix if provided
  let suffix = '';
  if (params.suffix) {
    suffix = `_${params.suffix}`;
  }
  
  // Generate final filename
  const extension = format.toLowerCase().replace('_string', '');
  return `${baseName}${suffix}.${extension}`;
}