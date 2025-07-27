import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById, formatNodeResponse, selectAndFocus } from '../utils/node-utils.js';

/**
 * Handle MANAGE_INSTANCES operation
 * Supports: create, update, duplicate, detach, swap, reset_overrides, get, list
 */
export async function MANAGE_INSTANCES(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('manageInstances', params, async () => {
    BaseOperation.validateParams(params, ['operation']);
    
    const validOperations = ['create', 'update', 'duplicate', 'detach', 'swap', 'reset_overrides', 'get', 'list'];
    if (!validOperations.includes(params.operation)) {
      throw new Error(`Unknown instance operation: ${params.operation}. Valid operations: ${validOperations.join(', ')}`);
    }

    switch (params.operation) {
      case 'create':
        return await createInstance(params);
      case 'update':
        return await updateInstance(params);
      case 'duplicate':
        return await duplicateInstance(params);
      case 'detach':
        return await detachInstance(params);
      case 'swap':
        return await swapInstance(params);
      case 'reset_overrides':
        return await resetInstanceOverrides(params);
      case 'get':
        return await getInstance(params);
      case 'list':
        return await listInstances(params);
      default:
        throw new Error(`Unknown instance operation: ${params.operation}`);
    }
  });
}

async function createInstance(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['componentId']);

  const node = findNodeById(params.componentId);
  if (!node) {
    throw new Error(`Node with ID ${params.componentId} not found`);
  }
  
  let targetComponent: ComponentNode;
  
  if (node.type === 'COMPONENT') {
    targetComponent = node as ComponentNode;
  } else if (node.type === 'COMPONENT_SET') {
    // For component sets, default to the first component
    const componentSet = node as ComponentSetNode;
    const firstComponent = componentSet.children.find(child => child.type === 'COMPONENT') as ComponentNode;
    
    if (!firstComponent) {
      throw new Error(`Component set ${params.componentId} has no components`);
    }
    
    targetComponent = firstComponent;
  } else {
    throw new Error(`Node ${params.componentId} is not a component or component set`);
  }

  // Create instance from the target component
  const instance = targetComponent.createInstance();
  
  // Set position if provided
  if (params.x !== undefined) instance.x = params.x;
  if (params.y !== undefined) instance.y = params.y;
  
  // Set name if provided
  if (params.name) instance.name = params.name;

  // Apply overrides if provided
  if (params.overrides && typeof params.overrides === 'object') {
    try {
      for (const [propertyName, value] of Object.entries(params.overrides)) {
        if (instance.componentProperties && instance.componentProperties[propertyName] !== undefined) {
          instance.componentProperties[propertyName] = value;
        }
      }
    } catch (error) {
      logger.warn(`Failed to apply some overrides: ${error}`);
    }
  }

  // Add to current page
  figma.currentPage.appendChild(instance);

  return {
    ...formatNodeResponse(instance),
    sourceComponentId: targetComponent.id,
    sourceComponentName: targetComponent.name,
    sourceComponentSetId: node.type === 'COMPONENT_SET' ? node.id : undefined,
    sourceComponentSetName: node.type === 'COMPONENT_SET' ? node.name : undefined,
    usedDefaultComponent: node.type === 'COMPONENT_SET',
    appliedOverrides: params.overrides || {},
    message: 'Instance created successfully'
  };
}

async function updateInstance(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['instanceId']);

  const instance = findNodeById(params.instanceId);
  if (!instance) {
    throw new Error(`Instance with ID ${params.instanceId} not found`);
  }
  
  if (instance.type !== 'INSTANCE') {
    throw new Error(`Node ${params.instanceId} is not an instance`);
  }

  const instanceNode = instance as InstanceNode;
  const previousProperties = { ...instanceNode.componentProperties };
  const updates: any = {};
  
  // Update basic properties
  if (params.name) {
    instanceNode.name = params.name;
    updates.name = params.name;
  }
  
  if (params.x !== undefined) {
    instanceNode.x = params.x;
    updates.x = params.x;
  }
  
  if (params.y !== undefined) {
    instanceNode.y = params.y;
    updates.y = params.y;
  }
  
  // Apply overrides if provided
  if (params.overrides && typeof params.overrides === 'object') {
    try {
      for (const [propertyName, value] of Object.entries(params.overrides)) {
        if (instanceNode.componentProperties && instanceNode.componentProperties[propertyName] !== undefined) {
          instanceNode.componentProperties[propertyName] = value;
          updates[`override_${propertyName}`] = value;
        }
      }
    } catch (error) {
      logger.warn(`Failed to apply some overrides: ${error}`);
    }
  }

  return {
    instanceId: instanceNode.id,
    name: instanceNode.name,
    type: instanceNode.type,
    updates: updates,
    previousProperties: previousProperties,
    updatedProperties: instanceNode.componentProperties || {},
    message: `Successfully updated instance "${instanceNode.name}"`
  };
}

async function duplicateInstance(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['instanceId']);

  const instance = findNodeById(params.instanceId);
  if (!instance) {
    throw new Error(`Instance with ID ${params.instanceId} not found`);
  }
  
  if (instance.type !== 'INSTANCE') {
    throw new Error(`Node ${params.instanceId} is not an instance`);
  }

  const instanceNode = instance as InstanceNode;
  
  // Clone the instance
  const duplicatedInstance = instanceNode.clone();
  
  // Set position if provided, otherwise offset from original
  if (params.x !== undefined) {
    duplicatedInstance.x = params.x;
  } else {
    duplicatedInstance.x = instanceNode.x + 20; // Default offset
  }
  
  if (params.y !== undefined) {
    duplicatedInstance.y = params.y;
  } else {
    duplicatedInstance.y = instanceNode.y + 20; // Default offset
  }
  
  // Set name if provided, otherwise add "Copy" suffix
  if (params.name) {
    duplicatedInstance.name = params.name;
  } else {
    duplicatedInstance.name = `${instanceNode.name} Copy`;
  }

  // Add to current page
  figma.currentPage.appendChild(duplicatedInstance);

  return {
    ...formatNodeResponse(duplicatedInstance),
    originalInstanceId: instanceNode.id,
    originalInstanceName: instanceNode.name,
    sourceComponentId: instanceNode.mainComponent?.id,
    sourceComponentName: instanceNode.mainComponent?.name,
    message: `Successfully duplicated instance "${instanceNode.name}"`
  };
}

async function detachInstance(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['instanceId']);

  const instance = findNodeById(params.instanceId);
  if (!instance) {
    throw new Error(`Instance with ID ${params.instanceId} not found`);
  }
  
  if (instance.type !== 'INSTANCE') {
    throw new Error(`Node ${params.instanceId} is not an instance`);
  }

  const instanceNode = instance as InstanceNode;
  const mainComponentName = instanceNode.mainComponent?.name || 'Unknown';
  
  // Capture instance info before detaching (since detaching changes the node)
  const instanceInfo = {
    id: instanceNode.id,
    name: instanceNode.name,
    originalType: instanceNode.type
  };
  
  // Detach the instance
  const detachedNode = instanceNode.detachInstance();

  return {
    nodeId: instanceInfo.id,
    name: instanceInfo.name,
    type: detachedNode.type, // Use the detached node's new type
    previousMainComponent: mainComponentName,
    previousType: instanceInfo.originalType,
    message: `Successfully detached instance from component "${mainComponentName}"`
  };
}

async function swapInstance(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['instanceId', 'mainComponentId']);

  const instance = findNodeById(params.instanceId);
  if (!instance) {
    throw new Error(`Instance with ID ${params.instanceId} not found`);
  }
  
  if (instance.type !== 'INSTANCE') {
    throw new Error(`Node ${params.instanceId} is not an instance`);
  }

  const newComponent = findNodeById(params.mainComponentId);
  if (!newComponent) {
    throw new Error(`Component with ID ${params.mainComponentId} not found`);
  }
  
  if (newComponent.type !== 'COMPONENT') {
    throw new Error(`Node ${params.mainComponentId} is not a component`);
  }

  const instanceNode = instance as InstanceNode;
  const componentNode = newComponent as ComponentNode;
  const oldComponentName = instanceNode.mainComponent?.name || 'Unknown';
  
  // Swap the main component
  instanceNode.swapComponent(componentNode);

  return {
    instanceId: instanceNode.id,
    name: instanceNode.name,
    oldComponent: oldComponentName,
    newComponent: componentNode.name,
    newComponentId: componentNode.id,
    message: `Successfully swapped instance from "${oldComponentName}" to "${componentNode.name}"`
  };
}

async function resetInstanceOverrides(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['instanceId']);

  const instance = findNodeById(params.instanceId);
  if (!instance) {
    throw new Error(`Instance with ID ${params.instanceId} not found`);
  }
  
  if (instance.type !== 'INSTANCE') {
    throw new Error(`Node ${params.instanceId} is not an instance`);
  }

  const instanceNode = instance as InstanceNode;
  const previousOverrides = { ...instanceNode.componentProperties };
  
  // Reset all overrides by setting them to their default values
  if (instanceNode.componentProperties) {
    const mainComponent = instanceNode.mainComponent;
    if (mainComponent && mainComponent.componentPropertyDefinitions) {
      for (const [propertyName, definition] of Object.entries(mainComponent.componentPropertyDefinitions)) {
        if (instanceNode.componentProperties[propertyName] !== undefined) {
          instanceNode.componentProperties[propertyName] = definition.defaultValue;
        }
      }
    }
  }

  return {
    instanceId: instanceNode.id,
    name: instanceNode.name,
    previousOverrides: previousOverrides,
    currentOverrides: instanceNode.componentProperties || {},
    resetCount: Object.keys(previousOverrides).length,
    message: `Successfully reset ${Object.keys(previousOverrides).length} overrides for instance "${instanceNode.name}"`
  };
}

async function getInstance(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['instanceId']);

  const instance = findNodeById(params.instanceId);
  if (!instance) {
    throw new Error(`Instance with ID ${params.instanceId} not found`);
  }
  
  if (instance.type !== 'INSTANCE') {
    throw new Error(`Node ${params.instanceId} is not an instance`);
  }

  const instanceNode = instance as InstanceNode;
  
  try {
    // Get source component
    const mainComponent = await instanceNode.getMainComponentAsync();
    
    // Get component properties and overrides
    const componentProperties = instanceNode.componentProperties || {};
    const overrides: Record<string, any> = {};
    
    // Collect property overrides
    for (const [propName, propValue] of Object.entries(componentProperties)) {
      overrides[propName] = propValue;
    }
    
    return {
      id: instanceNode.id,
      name: instanceNode.name,
      type: instanceNode.type,
      x: instanceNode.x,
      y: instanceNode.y,
      width: instanceNode.width,
      height: instanceNode.height,
      rotation: instanceNode.rotation || 0, // Figma API stores degrees directly
      opacity: instanceNode.opacity || 1,
      visible: instanceNode.visible !== false,
      locked: instanceNode.locked || false,
      // Instance-specific fields
      sourceComponentId: mainComponent?.id || null,
      sourceComponentName: mainComponent?.name || null,
      sourceComponentType: mainComponent?.type || null,
      overrides: overrides,
      position: { x: instanceNode.x, y: instanceNode.y },
      dimensions: { width: instanceNode.width, height: instanceNode.height },
      componentPropertyNames: Object.keys(componentProperties),
      message: `Instance "${instanceNode.name}" retrieved with source component "${mainComponent?.name || 'unknown'}"`
    };
  } catch (error) {
    throw new Error(`Failed to get instance details: ${error.toString()}`);
  }
}

async function listInstances(params: any): Promise<any> {
  try {
    const instances: any[] = [];
    
    // Traverse all pages to find instances
    for (const page of figma.root.children) {
      if (page.type === 'PAGE') {
        const pageInstances = findInstancesRecursive(page);
        instances.push(...pageInstances);
      }
    }
    
    // Sort by creation time (approximate using name and position)
    instances.sort((a, b) => a.name.localeCompare(b.name));
    
    return {
      instances: instances,
      totalCount: instances.length,
      pages: figma.root.children.length,
      message: `Found ${instances.length} instances across ${figma.root.children.length} pages`
    };
  } catch (error) {
    throw new Error(`Failed to list instances: ${error.toString()}`);
  }
}

function findInstancesRecursive(node: PageNode | SceneNode): any[] {
  const instances: any[] = [];
  
  if (node.type === 'INSTANCE') {
    const instanceNode = node as InstanceNode;
    instances.push({
      id: instanceNode.id,
      name: instanceNode.name,
      type: instanceNode.type,
      x: instanceNode.x,
      y: instanceNode.y,
      width: instanceNode.width,
      height: instanceNode.height,
      sourceComponentId: instanceNode.mainComponent?.id || null,
      sourceComponentName: instanceNode.mainComponent?.name || null,
      overrideCount: instanceNode.componentProperties ? Object.keys(instanceNode.componentProperties).length : 0,
      parentId: instanceNode.parent?.id || null,
      parentName: instanceNode.parent?.name || null,
      parentType: instanceNode.parent?.type || null
    });
  }
  
  // Recursively search children
  if ('children' in node) {
    for (const child of node.children) {
      instances.push(...findInstancesRecursive(child));
    }
  }
  
  return instances;
}