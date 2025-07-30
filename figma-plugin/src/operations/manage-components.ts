import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById, formatNodeResponse } from '../utils/node-utils.js';

/**
 * Handle MANAGE_COMPONENTS operation
 * Supports: create, create_set, update, delete, publish, list, get
 */
export async function MANAGE_COMPONENTS(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('manageComponents', params, async () => {
    BaseOperation.validateParams(params, ['operation']);
    
    const validOperations = ['create', 'create_set', 'update', 'delete', 'publish', 'list', 'get'];
    if (!validOperations.includes(params.operation)) {
      throw new Error(`Unknown component operation: ${params.operation}. Valid operations: ${validOperations.join(', ')}`);
    }

    switch (params.operation) {
      case 'create':
        return await createComponent(params);
      case 'create_set':
        return await createComponentSet(params);
      case 'update':
        return await updateComponent(params);
      case 'delete':
        return await deleteComponent(params);
      case 'publish':
        return await publishComponent(params);
      case 'list':
        return await listComponents(params);
      case 'get':
        return await getComponent(params);
      default:
        throw new Error(`Unknown component operation: ${params.operation}`);
    }
  });
}

async function createComponent(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['componentId']);

  // Find the node to convert
  const node = findNodeById(params.componentId);
  if (!node) {
    throw new Error(`Node with ID ${params.componentId} not found`);
  }

  // Check if node can be converted to component
  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
    throw new Error('Node is already a component or component set');
  }

  // Create component from the existing node (preserves all properties including auto layout)
  const component = figma.createComponentFromNode(node);
  
  // Set name and description if provided
  if (params.name) component.name = params.name;
  if (params.description) component.description = params.description;

  return {
    componentId: component.id,
    name: component.name,
    type: component.type,
    description: component.description,
    message: `Successfully created component "${component.name}"`
  };
}

async function createComponentSet(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['componentIds']);
  
  if (!params.componentIds || params.componentIds.length === 0) {
    throw new Error('componentIds is required for create_set operation');
  }

  if (params.componentIds.length < 2) {
    throw new Error('At least 2 components are required to create a component set');
  }

  // Validate parallel arrays if variantProperties provided
  if (params.variantProperties) {
    if (params.variantProperties.length !== params.componentIds.length) {
      throw new Error(`variantProperties array length (${params.variantProperties.length}) must match componentIds array length (${params.componentIds.length})`);
    }
  }

  // Find all components
  const components: ComponentNode[] = [];
  for (const id of params.componentIds) {
    const componentNode = findNodeById(id);
    if (!componentNode) {
      throw new Error(`Component with ID ${id} not found`);
    }
    if (componentNode.type !== 'COMPONENT') {
      throw new Error(`Node ${id} is not a component`);
    }
    components.push(componentNode as ComponentNode);
  }

  // Store original names for rollback if needed
  const originalNames = components.map(comp => comp.name);

  try {
    // Apply variant naming using parallel arrays
    if (params.variantProperties) {
      for (let i = 0; i < components.length; i++) {
        const component = components[i];
        const variantString = params.variantProperties[i];
        
        // Apply Figma's naming convention: either use base name or just variant properties
        if (params.name) {
          component.name = `${params.name}, ${variantString}`;
        } else {
          component.name = variantString;
        }
      }
    }

    // Create component set using Figma's combineAsVariants API
    const componentSet = figma.combineAsVariants(components, figma.currentPage);
    
    // Set component set name if provided (this will be the display name, not affecting variants)
    if (params.name) {
      componentSet.name = params.name;
    }

    // Extract variant properties from the created component set
    const extractedVariantProperties = extractVariantPropertiesFromSet(componentSet);

    return {
      componentSetId: componentSet.id,
      name: componentSet.name,
      type: componentSet.type,
      componentCount: componentSet.children.length,
      componentIds: componentSet.children.map(child => child.id),
      variantProperties: extractedVariantProperties,
      childComponents: componentSet.children.map(child => ({
        id: child.id,
        name: child.name,
        variantProperties: (child as ComponentNode).variantProperties || {}
      })),
      appliedVariantStrings: params.variantProperties || [],
      message: `Successfully created component set "${componentSet.name}" with ${componentSet.children.length} variants`
    };
  } catch (error) {
    // Rollback component names on failure
    for (let i = 0; i < components.length; i++) {
      if (originalNames[i]) {
        components[i].name = originalNames[i];
      }
    }
    throw new Error(`Failed to create component set: ${error.toString()}`);
  }
}


async function updateComponent(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['componentId']);

  const node = findNodeById(params.componentId);
  if (!node) {
    throw new Error(`Node with ID ${params.componentId} not found`);
  }
  
  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
    // Handle component/component set updates
    return await updateComponentNode(node as ComponentNode | ComponentSetNode, params);
  } else {
    throw new Error(`Node ${params.componentId} must be a component or component set`);
  }
}

async function updateComponentNode(component: ComponentNode | ComponentSetNode, params: any): Promise<any> {
  // Update name if provided
  if (params.name) component.name = params.name;
  
  // Update description if provided
  if (params.description !== undefined) component.description = params.description;

  return {
    componentId: component.id,
    name: component.name,
    type: component.type,
    description: component.description,
    message: `Successfully updated ${component.type.toLowerCase()} "${component.name}"`
  };
}


async function deleteComponent(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['componentId']);

  const node = findNodeById(params.componentId);
  if (!node) {
    throw new Error(`Node with ID ${params.componentId} not found`);
  }
  
  // Support deletion of components and component sets
  if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') {
    throw new Error(`Node ${params.componentId} is not a component or component set (found: ${node.type})`);
  }

  const nodeName = node.name;
  const nodeType = node.type;
  
  let additionalInfo = {};
  
  // Remove the node
  node.remove();

  return {
    deletedNodeId: params.componentId,
    name: nodeName,
    type: nodeType,
    ...additionalInfo,
    message: `Successfully deleted ${nodeType.toLowerCase()} "${nodeName}"`
  };
}

async function publishComponent(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['componentId']);

  const component = findNodeById(params.componentId);
  if (!component) {
    throw new Error(`Node with ID ${params.componentId} not found`);
  }
  
  if (component.type !== 'COMPONENT' && component.type !== 'COMPONENT_SET') {
    throw new Error(`Node ${params.componentId} is not a component or component set`);
  }

  // Note: Actual publishing requires team library access
  // This operation primarily sets the component as publishable
  try {
    // Set description for publishing if provided
    if (params.description) {
      component.description = params.description;
    }
    
    return {
      componentId: component.id,
      name: component.name,
      type: component.type,
      status: 'ready_for_publishing',
      message: `Component "${component.name}" is ready for publishing to team library`
    };
  } catch (error) {
    throw new Error(`Failed to prepare component for publishing: ${error.toString()}`);
  }
}

async function listComponents(params: any): Promise<any> {
  const { includeInstances = false, filterType = 'all' } = params;
  
  // Find all components in the document
  const components: any[] = [];
  const instances: any[] = [];
  
  function traverseNode(node: BaseNode) {
    if (node.type === 'COMPONENT') {
      const comp = node as ComponentNode;
      components.push({
        id: comp.id,
        name: comp.name,
        type: 'COMPONENT',
        description: comp.description || '',
        parent: comp.parent?.name || 'Page',
        instanceCount: comp.instances?.length || 0
      });
    } else if (node.type === 'COMPONENT_SET') {
      const compSet = node as ComponentSetNode;
      components.push({
        id: compSet.id,
        name: compSet.name,
        type: 'COMPONENT_SET',
        description: compSet.description || '',
        parent: compSet.parent?.name || 'Page',
        variantCount: compSet.children.length,
        componentPropertyDefinitions: compSet.componentPropertyDefinitions
      });
    } else if (node.type === 'INSTANCE' && includeInstances) {
      const inst = node as InstanceNode;
      instances.push({
        id: inst.id,
        name: inst.name,
        type: 'INSTANCE',
        mainComponentId: inst.mainComponent?.id,
        mainComponentName: inst.mainComponent?.name || 'Unknown',
        parent: inst.parent?.name || 'Page'
      });
    }
    
    if ('children' in node) {
      for (const child of node.children) {
        traverseNode(child);
      }
    }
  }

  // Search through all pages
  for (const page of figma.root.children) {
    traverseNode(page);
  }

  // Apply filter
  let filteredComponents = components;
  if (filterType === 'components') {
    filteredComponents = components.filter(c => c.type === 'COMPONENT');
  } else if (filterType === 'component_sets') {
    filteredComponents = components.filter(c => c.type === 'COMPONENT_SET');
  }

  const result: any = {
    components: filteredComponents,
    summary: {
      totalComponents: components.filter(c => c.type === 'COMPONENT').length,
      totalComponentSets: components.filter(c => c.type === 'COMPONENT_SET').length,
      totalFiltered: filteredComponents.length
    }
  };

  if (includeInstances) {
    result.instances = instances;
    result.summary.totalInstances = instances.length;
  }

  return result;
}




async function getComponent(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['componentId']);

  const node = findNodeById(params.componentId);
  if (!node) {
    throw new Error(`Node with ID ${params.componentId} not found`);
  }

  // Auto-detect node type and return appropriate structure
  switch (node.type) {
    case 'COMPONENT':
      return await getComponentDetails(node as ComponentNode);
    case 'COMPONENT_SET':
      return await getComponentSetDetails(node as ComponentSetNode);
    default:
      throw new Error(`Node ${params.componentId} is not a component or component set (found: ${node.type})`);
  }
}

// Type-specific helper functions for polymorphic returns

async function getComponentDetails(component: ComponentNode): Promise<any> {
  try {
    // Get instances of this component
    const instances = await component.getInstancesAsync();
    const instanceIds = instances.map(inst => inst.id);
    
    return {
      id: component.id,
      name: component.name,
      type: component.type,
      description: component.description || '',
      x: component.x,
      y: component.y,
      width: component.width,
      height: component.height,
      rotation: component.rotation || 0, // Figma API stores degrees directly
      opacity: component.opacity || 1,
      visible: component.visible !== false,
      locked: component.locked || false,
      // Component-specific fields
      instanceCount: instances.length,
      instanceIds: instanceIds,
      parentSet: component.parent?.type === 'COMPONENT_SET' ? component.parent.id : undefined,
      variantProperties: component.variantProperties || undefined,
      message: `Component "${component.name}" retrieved with ${instances.length} instances`
    };
  } catch (error) {
    throw new Error(`Failed to get component details: ${error.toString()}`);
  }
}

async function getComponentSetDetails(componentSet: ComponentSetNode): Promise<any> {
  try {
    // Get child components
    const childComponents = componentSet.children.filter(child => child.type === 'COMPONENT');
    
    // Get total instance count across all child components
    let totalInstanceCount = 0;
    for (const child of childComponents) {
      if (child.type === 'COMPONENT') {
        const instances = await (child as ComponentNode).getInstancesAsync();
        totalInstanceCount += instances.length;
      }
    }
    
    return {
      id: componentSet.id,
      name: componentSet.name,
      type: componentSet.type,
      description: componentSet.description || '',
      x: componentSet.x,
      y: componentSet.y,
      width: componentSet.width,
      height: componentSet.height,
      rotation: componentSet.rotation || 0, // Figma API stores degrees directly
      opacity: componentSet.opacity || 1,
      visible: componentSet.visible !== false,
      locked: componentSet.locked || false,
      // Component set-specific fields
      variantProperties: componentSet.variantProperties,
      childComponents: childComponents.map(comp => ({
        id: comp.id,
        name: comp.name,
        variantProperties: (comp as ComponentNode).variantProperties || {}
      })),
      instanceCount: totalInstanceCount,
      message: `Component set "${componentSet.name}" retrieved with ${childComponents.length} variants and ${totalInstanceCount} total instances`
    };
  } catch (error) {
    throw new Error(`Failed to get component set details: ${error.toString()}`);
  }
}


// Helper function to extract variant properties from component set

function extractVariantPropertiesFromSet(componentSet: ComponentSetNode): Record<string, string[]> {
  let variantProperties: Record<string, string[]> = {};
  
  try {
    // Use Figma's built-in variantProperties if available
    const figmaVariantProps = componentSet.variantProperties;
    if (figmaVariantProps && Object.keys(figmaVariantProps).length > 0) {
      // Convert Figma's variant properties to our expected format
      for (const [propName, propValue] of Object.entries(figmaVariantProps)) {
        // Figma stores variant values as strings, we need to parse them into arrays
        if (typeof propValue === 'string') {
          variantProperties[propName] = [propValue];
        }
      }
    } else {
      // Fallback: extract from component names if Figma's properties aren't available
      const componentNames = componentSet.children.map(child => child.name);
      variantProperties = parseVariantPropertiesFromNames(componentNames);
    }
  } catch (error) {
    // If extraction fails, return empty object
    logger.warn('Failed to extract variant properties:', error);
  }
  
  return variantProperties;
}

function parseVariantPropertiesFromNames(componentNames: string[]): Record<string, string[]> {
  const properties: Record<string, Set<string>> = {};
  
  for (const name of componentNames) {
    // Split by comma and parse property=value pairs
    const pairs = name.split(',').map(pair => pair.trim());
    
    for (const pair of pairs) {
      const equalIndex = pair.indexOf('=');
      if (equalIndex > 0) {
        const propName = pair.substring(0, equalIndex).trim();
        const propValue = pair.substring(equalIndex + 1).trim();
        
        if (!properties[propName]) {
          properties[propName] = new Set();
        }
        properties[propName].add(propValue);
      }
    }
  }
  
  // Convert Sets to arrays
  const result: Record<string, string[]> = {};
  for (const [propName, valueSet] of Object.entries(properties)) {
    result[propName] = Array.from(valueSet).sort();
  }
  
  return result;
}


// Helper function to find a specific variant component within a component set
function findVariantComponent(
  componentSet: ComponentSetNode, 
  desiredProperties: Record<string, string>,
  currentComponent: ComponentNode
): ComponentNode | null {
  try {
    // Get all component children in the set
    const variantComponents = componentSet.children.filter(child => child.type === 'COMPONENT') as ComponentNode[];
    
    if (variantComponents.length === 0) {
      return null;
    }
    
    // Look for a component that matches all desired properties
    for (const variantComponent of variantComponents) {
      const componentProperties = variantComponent.variantProperties || {};
      
      // Check if this component matches all desired properties
      const matchesAll = Object.entries(desiredProperties).every(([propName, propValue]) => {
        return componentProperties[propName] === propValue;
      });
      
      if (matchesAll) {
        return variantComponent;
      }
    }
    
    // If no exact match found, try finding a component that matches some properties
    // and can be updated with setProperties for the remaining ones
    let bestMatch: ComponentNode | null = null;
    let bestMatchScore = 0;
    
    for (const variantComponent of variantComponents) {
      const componentProperties = variantComponent.variantProperties || {};
      
      // Count matching properties
      const matchingProps = Object.entries(desiredProperties).filter(([propName, propValue]) => {
        return componentProperties[propName] === propValue;
      }).length;
      
      if (matchingProps > bestMatchScore) {
        bestMatchScore = matchingProps;
        bestMatch = variantComponent;
      }
    }
    
    // Only return a match if it's better than the current component
    if (bestMatch && bestMatchScore > 0) {
      const currentMatchScore = Object.entries(desiredProperties).filter(([propName, propValue]) => {
        const currentProperties = currentComponent.variantProperties || {};
        return currentProperties[propName] === propValue;
      }).length;
      
      if (bestMatchScore > currentMatchScore) {
        return bestMatch;
      }
    }
    
    return null;
  } catch (error) {
    logger.warn('Error finding variant component:', error);
    return null;
  }
}