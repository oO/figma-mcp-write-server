import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById, formatNodeResponse } from '../utils/node-utils.js';

/**
 * Handle MEASUREMENT_OPERATION - manage dev-mode measurement annotations
 */
export async function MEASUREMENT_OPERATION(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('measurementOperation', params, async () => {
    BaseOperation.validateParams(params, ['operation']);
    
    const operation = BaseOperation.validateStringParam(
      params.operation,
      'operation',
      ['add_measurement', 'edit_measurement', 'remove_measurement', 'list_measurements']
    );
    
    switch (operation) {
      case 'add_measurement':
        return await addMeasurement(params);
        
      case 'edit_measurement':
        return await editMeasurement(params);
        
      case 'remove_measurement':
        return await removeMeasurement(params);
        
      case 'list_measurements':
        return await listMeasurements(params);
        
      default:
        throw new Error(`Unknown measurement operation: ${operation}`);
    }
  });
}

async function addMeasurement(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['fromNodeId', 'toNodeId', 'direction']);
  
  const fromNode = findNodeById(params.fromNodeId);
  const toNode = findNodeById(params.toNodeId);
  
  if (!fromNode || !toNode) {
    throw new Error('One or both nodes not found');
  }
  
  if (!('x' in fromNode) || !('x' in toNode)) {
    throw new Error('Both nodes must be scene nodes with position');
  }
  
  const direction = BaseOperation.validateStringParam(
    params.direction,
    'direction',
    ['horizontal', 'vertical', 'distance']
  );
  
  // Calculate measurement based on direction
  let value: number;
  let unit = 'px';
  
  switch (direction) {
    case 'horizontal':
      value = Math.abs(toNode.x - fromNode.x);
      break;
    case 'vertical':
      value = Math.abs(toNode.y - fromNode.y);
      break;
    case 'distance':
      const deltaX = toNode.x - fromNode.x;
      const deltaY = toNode.y - fromNode.y;
      value = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      break;
    default:
      throw new Error(`Unknown direction: ${direction}`);
  }
  
  // Generate measurement ID
  const measurementId = `measurement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Store measurement data in plugin data
  const measurementData = {
    id: measurementId,
    fromNodeId: params.fromNodeId,
    toNodeId: params.toNodeId,
    direction,
    value: Math.round(value * 100) / 100,
    unit,
    label: params.label || `${direction} measurement`,
    customValue: params.customValue || undefined,
    createdAt: new Date().toISOString()
  };
  
  // Store in both nodes' plugin data
  fromNode.setPluginData('measurement_' + measurementId, JSON.stringify(measurementData));
  toNode.setPluginData('measurement_' + measurementId, JSON.stringify(measurementData));
  
  return {
    measurementId,
    fromNode: { id: fromNode.id, name: fromNode.name },
    toNode: { id: toNode.id, name: toNode.name },
    direction,
    value: measurementData.value,
    unit,
    label: measurementData.label,
    customValue: measurementData.customValue,
    message: 'Measurement added successfully'
  };
}

async function editMeasurement(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['measurementId']);
  
  const measurementId = params.measurementId;
  let measurementData: any = null;
  let ownerNode: any = null;
  
  // Find the measurement in all nodes
  const allNodes = figma.currentPage.findAll(() => true);
  for (const node of allNodes) {
    const data = node.getPluginData('measurement_' + measurementId);
    if (data) {
      measurementData = JSON.parse(data);
      ownerNode = node;
      break;
    }
  }
  
  if (!measurementData) {
    throw new Error(`Measurement with ID ${measurementId} not found`);
  }
  
  // Update measurement data
  if (params.label !== undefined) {
    measurementData.label = params.label;
  }
  if (params.customValue !== undefined) {
    measurementData.customValue = params.customValue;
  }
  
  measurementData.updatedAt = new Date().toISOString();
  
  // Update plugin data on both nodes
  const fromNode = findNodeById(measurementData.fromNodeId);
  const toNode = findNodeById(measurementData.toNodeId);
  
  if (fromNode && toNode) {
    fromNode.setPluginData('measurement_' + measurementId, JSON.stringify(measurementData));
    toNode.setPluginData('measurement_' + measurementId, JSON.stringify(measurementData));
  }
  
  return {
    measurementId,
    label: measurementData.label,
    customValue: measurementData.customValue,
    direction: measurementData.direction,
    value: measurementData.value,
    unit: measurementData.unit,
    message: 'Measurement updated successfully'
  };
}

async function removeMeasurement(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['measurementId']);
  
  const measurementId = params.measurementId;
  let measurementData: any = null;
  let removedCount = 0;
  
  // Find and remove the measurement from all nodes
  const allNodes = figma.currentPage.findAll(() => true);
  for (const node of allNodes) {
    const data = node.getPluginData('measurement_' + measurementId);
    if (data) {
      if (!measurementData) {
        measurementData = JSON.parse(data);
      }
      node.setPluginData('measurement_' + measurementId, '');
      removedCount++;
    }
  }
  
  if (!measurementData) {
    throw new Error(`Measurement with ID ${measurementId} not found`);
  }
  
  return {
    measurementId,
    removedFromNodes: removedCount,
    label: measurementData.label,
    direction: measurementData.direction,
    message: 'Measurement removed successfully'
  };
}

async function listMeasurements(params: any): Promise<any> {
  const pageId = params.pageId || figma.currentPage.id;
  const page = pageId === figma.currentPage.id ? figma.currentPage : figma.getNodeById(pageId);
  
  if (!page) {
    throw new Error(`Page with ID ${pageId} not found`);
  }
  
  const measurements: any[] = [];
  const measurementIds = new Set<string>();
  
  // Find all measurements in the page
  const allNodes = page.findAll(() => true);
  for (const node of allNodes) {
    const pluginDataKeys = node.getPluginDataKeys();
    for (const key of pluginDataKeys) {
      if (key.startsWith('measurement_')) {
        const measurementId = key.replace('measurement_', '');
        if (!measurementIds.has(measurementId)) {
          measurementIds.add(measurementId);
          const data = node.getPluginData(key);
          if (data) {
            try {
              const measurementData = JSON.parse(data);
              measurements.push({
                id: measurementData.id,
                fromNodeId: measurementData.fromNodeId,
                toNodeId: measurementData.toNodeId,
                direction: measurementData.direction,
                value: measurementData.value,
                unit: measurementData.unit,
                label: measurementData.label,
                customValue: measurementData.customValue,
                createdAt: measurementData.createdAt,
                updatedAt: measurementData.updatedAt
              });
            } catch (e) {
              // Skip invalid measurement data
            }
          }
        }
      }
    }
  }
  
  return {
    pageId,
    pageName: page.name,
    measurementCount: measurements.length,
    measurements,
    message: `Found ${measurements.length} measurements`
  };
}