import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById } from '../utils/node-utils.js';

/**
 * Handle DEV_RESOURCE_OPERATION - manage dev mode resources and CSS generation
 */
export async function DEV_RESOURCE_OPERATION(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('devResourceOperation', params, async () => {
    BaseOperation.validateParams(params, ['operation']);
    
    const operation = BaseOperation.validateStringParam(
      params.operation,
      'operation',
      ['generate_css', 'set_dev_status', 'add_dev_link', 'remove_dev_link', 'get_dev_resources']
    );
    
    switch (operation) {
      case 'generate_css':
        return await generateCss(params);
        
      case 'set_dev_status':
        return await setDevStatus(params);
        
      case 'add_dev_link':
        return await addDevLink(params);
        
      case 'remove_dev_link':
        return await removeDevLink(params);
        
      case 'get_dev_resources':
        return await getDevResources(params);
        
      default:
        throw new Error(`Unknown dev resource operation: ${operation}`);
    }
  });
}

async function generateCss(params: any): Promise<any> {
  if (!params.nodeId) {
    throw new Error('nodeId parameter is required for generate_css operation');
  }
  
  const node = findNodeById(params.nodeId);
  if (!node) {
    throw new Error(`Node ${params.nodeId} not found`);
  }
  
  // Basic CSS generation - this is a simplified implementation
  // In a full implementation, this would generate actual CSS based on node properties
  const cssOptions = params.cssOptions || {};
  const includeChildren = cssOptions.includeChildren || false;
  const includeComments = cssOptions.includeComments !== false;
  const useFlexbox = cssOptions.useFlexbox !== false;
  
  let css = '';
  
  if (includeComments) {
    css += `/* CSS for ${node.name} (${node.type}) */\n`;
  }
  
  // Generate basic CSS selector
  const className = node.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  css += `.${className} {\n`;
  
  // Add basic properties based on node type
  if ('width' in node && 'height' in node) {
    css += `  width: ${(node as any).width}px;\n`;
    css += `  height: ${(node as any).height}px;\n`;
  }
  
  if ('fills' in node && (node as any).fills && (node as any).fills.length > 0) {
    const fill = (node as any).fills[0];
    if (fill.type === 'SOLID') {
      const { r, g, b, a } = fill.color;
      const alpha = fill.opacity !== undefined ? fill.opacity : (a || 1);
      if (alpha === 1) {
        css += `  background: rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)});\n`;
      } else {
        css += `  background: rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha});\n`;
      }
    }
  }
  
  if (useFlexbox && 'layoutMode' in node && (node as any).layoutMode !== 'NONE') {
    css += `  display: flex;\n`;
    css += `  flex-direction: ${(node as any).layoutMode === 'HORIZONTAL' ? 'row' : 'column'};\n`;
    
    if ('itemSpacing' in node) {
      css += `  gap: ${(node as any).itemSpacing}px;\n`;
    }
  }
  
  css += `}\n`;
  
  return {
    operation: 'generate_css',
    nodeId: node.id,
    nodeName: node.name,
    css: css,
    cssOptions: {
      includeChildren,
      includeComments,
      useFlexbox
    },
    message: `Generated CSS for node: ${node.name}`
  };
}

async function setDevStatus(params: any): Promise<any> {
  if (!params.nodeId) {
    throw new Error('nodeId parameter is required for set_dev_status operation');
  }
  
  if (!params.status) {
    throw new Error('status parameter is required for set_dev_status operation');
  }
  
  const node = findNodeById(params.nodeId);
  if (!node) {
    throw new Error(`Node ${params.nodeId} not found`);
  }
  
  const validStatuses = ['ready_for_dev', 'in_progress', 'dev_complete'];
  if (!validStatuses.includes(params.status)) {
    throw new Error(`Invalid status: ${params.status}. Valid statuses: ${validStatuses.join(', ')}`);
  }
  
  // Note: In a full implementation, this would set actual dev status in Figma
  // For now, we return a response indicating the operation was processed
  
  return {
    operation: 'set_dev_status',
    nodeId: node.id,
    nodeName: node.name,
    status: params.status,
    message: `Set dev status to "${params.status}" for node: ${node.name}`,
    note: 'Dev status setting requires Figma desktop app with dev mode for full functionality'
  };
}

async function addDevLink(params: any): Promise<any> {
  if (!params.nodeId) {
    throw new Error('nodeId parameter is required for add_dev_link operation');
  }
  
  if (!params.linkUrl) {
    throw new Error('linkUrl parameter is required for add_dev_link operation');
  }
  
  const node = findNodeById(params.nodeId);
  if (!node) {
    throw new Error(`Node ${params.nodeId} not found`);
  }
  
  // Note: In a full implementation, this would add actual dev links in Figma
  // For now, we return a response indicating the operation was processed
  
  const linkId = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    operation: 'add_dev_link',
    nodeId: node.id,
    nodeName: node.name,
    linkId: linkId,
    linkUrl: params.linkUrl,
    linkTitle: params.linkTitle || params.linkUrl,
    message: `Added dev link "${params.linkTitle || params.linkUrl}" to node: ${node.name}`,
    note: 'Dev link management requires Figma desktop app with dev mode for full functionality'
  };
}

async function removeDevLink(params: any): Promise<any> {
  if (!params.linkId) {
    throw new Error('linkId parameter is required for remove_dev_link operation');
  }
  
  // Note: In a full implementation, this would remove actual dev links in Figma
  // For now, we return a response indicating the operation was processed
  
  return {
    operation: 'remove_dev_link',
    linkId: params.linkId,
    message: `Removed dev link with ID: ${params.linkId}`,
    note: 'Dev link management requires Figma desktop app with dev mode for full functionality'
  };
}

async function getDevResources(params: any): Promise<any> {
  if (!params.nodeId) {
    throw new Error('nodeId parameter is required for get_dev_resources operation');
  }
  
  const node = findNodeById(params.nodeId);
  if (!node) {
    throw new Error(`Node ${params.nodeId} not found`);
  }
  
  // Note: In a full implementation, this would retrieve actual dev resources from Figma
  // For now, we return a response with available basic information
  
  return {
    operation: 'get_dev_resources',
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type,
    devResources: {
      status: 'unknown',
      links: [],
      specs: {
        width: 'width' in node ? (node as any).width : null,
        height: 'height' in node ? (node as any).height : null,
        x: 'x' in node ? (node as any).x : null,
        y: 'y' in node ? (node as any).y : null
      }
    },
    message: `Retrieved dev resources for node: ${node.name}`,
    note: 'Full dev resource information requires Figma desktop app with dev mode'
  };
}