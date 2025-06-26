import { BaseHandler } from './base-handler.js';
import { OperationResult } from '../types.js';

export class ComponentHandler extends BaseHandler {
  
  getOperations() {
    return {
      'MANAGE_COMPONENTS': this.manageComponents.bind(this),
      'MANAGE_INSTANCES': this.manageInstances.bind(this)
    };
  }

  async manageComponents(payload: any): Promise<OperationResult> {
    const { operation, nodeId, componentIds, componentId, name, description, variantProperties } = payload;

    switch (operation) {
      case 'create':
        if (!nodeId) {
          throw new Error('nodeId is required for create operation');
        }

        // Find the node to convert
        const node = figma.getNodeById(nodeId);
        if (!node) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }

        // Check if node can be converted to component
        if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
          throw new Error('Node is already a component or component set');
        }

        // Create component from the existing node (preserves all properties including auto layout)
        const component = figma.createComponentFromNode(node);
        
        // Set name and description if provided
        if (name) component.name = name;
        if (description) component.description = description;

        return {
          success: true,
          data: {
            componentId: component.id,
            name: component.name,
            type: component.type,
            description: component.description,
            message: `Successfully created component "${component.name}"`
          }
        };

      case 'create_set':
        if (!componentIds || componentIds.length === 0) {
          throw new Error('componentIds is required for create_set operation');
        }

        // Find all components
        const components: ComponentNode[] = [];
        for (const id of componentIds) {
          const componentNode = figma.getNodeById(id);
          if (!componentNode) {
            throw new Error(`Component with ID ${id} not found`);
          }
          if (componentNode.type !== 'COMPONENT') {
            throw new Error(`Node ${id} is not a component`);
          }
          components.push(componentNode as ComponentNode);
        }

        // Create component set
        const componentSet = figma.combineAsVariants(components, figma.currentPage);
        
        // Set name if provided
        if (name) componentSet.name = name;
        
        // Add variant properties if provided
        if (variantProperties) {
          for (const [propName, values] of Object.entries(variantProperties)) {
            if (Array.isArray(values) && values.length > 0) {
              componentSet.addComponentProperty(propName, 'VARIANT', values[0]);
              const propertyDefs = componentSet.componentPropertyDefinitions || {};
              const componentProperty = propertyDefs[propName];
              if (componentProperty && componentProperty.type === 'VARIANT') {
                componentProperty.variantOptions = values;
              }
            }
          }
        }

        return {
          success: true,
          data: {
            componentSetId: componentSet.id,
            name: componentSet.name,
            type: componentSet.type,
            components: (componentSet.children || []).map(child => ({
              id: child.id,
              name: child.name
            })),
            message: `Successfully created component set with ${(componentSet.children || []).length} variants`
          }
        };

      case 'add_variant':
        if (!componentId) {
          throw new Error('componentId is required for add_variant operation');
        }

        const targetComponent = figma.getNodeById(componentId);
        if (!targetComponent) {
          throw new Error('Component not found');
        }
        
        let targetComponentSet: ComponentSetNode;
        if (targetComponent.type === 'COMPONENT_SET') {
          targetComponentSet = targetComponent as ComponentSetNode;
        } else if (targetComponent.type === 'COMPONENT') {
          // Convert single component to component set first
          targetComponentSet = figma.combineAsVariants([targetComponent as ComponentNode], figma.currentPage);
        } else {
          throw new Error('Target is not a component or component set');
        }

        // Add variant properties
        if (variantProperties) {
          for (const [propName, values] of Object.entries(variantProperties)) {
            if (Array.isArray(values)) {
              const propertyDefs = targetComponentSet.componentPropertyDefinitions || {};
              const existingProperty = propertyDefs[propName];
              if (existingProperty && existingProperty.type === 'VARIANT') {
                // Add new values to existing property
                const currentOptions = existingProperty.variantOptions || [];
                const newOptions = [...new Set([...currentOptions, ...values])];
                existingProperty.variantOptions = newOptions;
              } else {
                // Create new variant property
                targetComponentSet.addComponentProperty(propName, 'VARIANT', values[0]);
                const updatedPropertyDefs = targetComponentSet.componentPropertyDefinitions || {};
                const newProperty = updatedPropertyDefs[propName];
                if (newProperty && newProperty.type === 'VARIANT') {
                  newProperty.variantOptions = values;
                }
              }
            }
          }
        }

        return {
          success: true,
          data: {
            componentSetId: targetComponentSet.id,
            variantProperties: Object.fromEntries(
              Object.entries(targetComponentSet.componentPropertyDefinitions || {}).map(([name, prop]) => [
                name,
                (prop && prop.type === 'VARIANT') ? (prop.variantOptions || []) : []
              ])
            ),
            message: 'Successfully added variant properties'
          }
        };

      case 'get':
        if (!componentId) {
          throw new Error('componentId is required for get operation');
        }

        const getComponent = figma.getNodeById(componentId);
        if (!getComponent) {
          throw new Error('Component not found');
        }
        if (getComponent.type !== 'COMPONENT' && getComponent.type !== 'COMPONENT_SET') {
          throw new Error('Node is not a component or component set');
        }

        const componentData: any = {
          id: getComponent.id,
          name: getComponent.name,
          type: getComponent.type,
          description: getComponent.description
        };

        if (getComponent.type === 'COMPONENT_SET') {
          // Safely handle component property definitions
          const propertyDefinitions = getComponent.componentPropertyDefinitions || {};
          componentData.variantProperties = Object.fromEntries(
            Object.entries(propertyDefinitions).map(([name, prop]) => [
              name,
              (prop && prop.type === 'VARIANT') ? (prop.variantOptions || []) : []
            ])
          );
          
          // Safely handle children
          const children = getComponent.children || [];
          componentData.components = children.map(child => ({
            id: child.id,
            name: child.name
          }));
        }

        return {
          success: true,
          data: componentData
        };

      case 'update':
        if (!componentId) {
          throw new Error('componentId is required for update operation');
        }

        const updateComponent = figma.getNodeById(componentId);
        if (!updateComponent) {
          throw new Error('Component not found');
        }
        if (updateComponent.type !== 'COMPONENT' && updateComponent.type !== 'COMPONENT_SET') {
          throw new Error('Node is not a component or component set');
        }

        // Update name if provided
        if (name !== undefined) {
          updateComponent.name = name;
        }

        // Update description if provided
        if (description !== undefined) {
          updateComponent.description = description;
        }

        return {
          success: true,
          data: {
            componentId: updateComponent.id,
            name: updateComponent.name,
            type: updateComponent.type,
            description: updateComponent.description,
            message: `Successfully updated component "${updateComponent.name}"`
          }
        };

      case 'delete':
        if (!componentId) {
          throw new Error('componentId is required for delete operation');
        }

        const deleteComponent = figma.getNodeById(componentId);
        if (!deleteComponent) {
          throw new Error('Component not found');
        }
        if (deleteComponent.type !== 'COMPONENT' && deleteComponent.type !== 'COMPONENT_SET') {
          throw new Error('Node is not a component or component set');
        }

        const deletedName = deleteComponent.name;
        const deletedId = deleteComponent.id;
        deleteComponent.remove();

        return {
          success: true,
          data: {
            deletedComponentId: deletedId,
            deletedName: deletedName,
            message: `Successfully deleted component "${deletedName}"`
          }
        };

      case 'remove_variant':
        if (!componentId) {
          throw new Error('componentId is required for remove_variant operation');
        }
        if (!variantProperties) {
          throw new Error('variantProperties is required for remove_variant operation');
        }

        const targetComponentForRemoval = figma.getNodeById(componentId);
        if (!targetComponentForRemoval) {
          throw new Error('Component not found');
        }
        if (targetComponentForRemoval.type !== 'COMPONENT_SET') {
          throw new Error('Node is not a component set');
        }

        const componentSetForRemoval = targetComponentForRemoval as ComponentSetNode;
        
        // Remove variant properties
        for (const propName of Object.keys(variantProperties)) {
          try {
            componentSetForRemoval.removeComponentProperty(propName);
          } catch (error) {
            console.warn(`Failed to remove variant property ${propName}:`, error);
          }
        }

        return {
          success: true,
          data: {
            componentSetId: componentSetForRemoval.id,
            removedProperties: Object.keys(variantProperties),
            remainingProperties: Object.keys(componentSetForRemoval.componentPropertyDefinitions || {}),
            message: `Successfully removed variant properties: ${Object.keys(variantProperties).join(', ')}`
          }
        };

      default:
        throw new Error(`Unknown component operation: ${operation}`);
    }
  }

  async manageInstances(payload: any): Promise<OperationResult> {
    const { operation, componentId, instanceId, x, y, overrides, swapTarget } = payload;

    switch (operation) {
      case 'create':
        if (!componentId) {
          throw new Error('componentId is required for create operation');
        }

        const component = figma.getNodeById(componentId);
        if (!component) {
          throw new Error(`Component with ID ${componentId} not found`);
        }
        if (component.type !== 'COMPONENT') {
          throw new Error(`Node ${componentId} is not a component`);
        }

        // Create instance
        const instance = (component as ComponentNode).createInstance();
        
        // Set position if provided
        if (x !== undefined) instance.x = x;
        if (y !== undefined) instance.y = y;
        
        // Add to current page
        figma.currentPage.appendChild(instance);

        // Apply overrides if provided
        if (overrides) {
          for (const [key, value] of Object.entries(overrides)) {
            try {
              if (key in instance && typeof (instance as any)[key] !== 'function') {
                (instance as any)[key] = value;
              }
            } catch (error) {
              console.warn(`Failed to apply override ${key}:`, error);
            }
          }
        }

        return {
          success: true,
          data: {
            instanceId: instance.id,
            name: instance.name,
            type: instance.type,
            componentId: instance.mainComponent?.id,
            position: { x: instance.x, y: instance.y },
            message: `Successfully created instance of "${component.name}"`
          }
        };

      case 'swap':
        if (!instanceId) {
          throw new Error('instanceId is required for swap operation');
        }
        if (!swapTarget) {
          throw new Error('swapTarget is required for swap operation');
        }

        const targetInstance = figma.getNodeById(instanceId);
        if (!targetInstance || targetInstance.type !== 'INSTANCE') {
          throw new Error('Instance not found');
        }

        const newComponent = figma.getNodeById(swapTarget);
        if (!newComponent || newComponent.type !== 'COMPONENT') {
          throw new Error('Target component not found');
        }

        // Perform component swap
        (targetInstance as InstanceNode).swapComponent(newComponent as ComponentNode);

        return {
          success: true,
          data: {
            instanceId: targetInstance.id,
            newComponentId: swapTarget,
            message: `Successfully swapped component for instance "${targetInstance.name}"`
          }
        };

      case 'detach':
        if (!instanceId) {
          throw new Error('instanceId is required for detach operation');
        }

        const instanceToDetach = figma.getNodeById(instanceId);
        if (!instanceToDetach || instanceToDetach.type !== 'INSTANCE') {
          throw new Error('Instance not found');
        }

        // Detach instance
        const detachedNode = (instanceToDetach as InstanceNode).detachInstance();

        return {
          success: true,
          data: {
            nodeId: detachedNode.id,
            originalInstanceId: instanceId,
            message: `Successfully detached instance "${detachedNode.name}"`
          }
        };

      case 'reset_overrides':
        if (!instanceId) {
          throw new Error('instanceId is required for reset_overrides operation');
        }

        const instanceToReset = figma.getNodeById(instanceId);
        if (!instanceToReset || instanceToReset.type !== 'INSTANCE') {
          throw new Error('Instance not found');
        }

        // Reset all overrides
        (instanceToReset as InstanceNode).resetOverrides();

        return {
          success: true,
          data: {
            instanceId: instanceToReset.id,
            message: `Successfully reset overrides for instance "${instanceToReset.name}"`
          }
        };

      case 'set_override':
        if (!instanceId) {
          throw new Error('instanceId is required for set_override operation');
        }
        if (!overrides) {
          throw new Error('overrides is required for set_override operation');
        }

        const instanceToOverride = figma.getNodeById(instanceId);
        if (!instanceToOverride || instanceToOverride.type !== 'INSTANCE') {
          throw new Error('Instance not found');
        }

        // Apply overrides
        for (const [key, value] of Object.entries(overrides)) {
          try {
            if (key in instanceToOverride && typeof (instanceToOverride as any)[key] !== 'function') {
              (instanceToOverride as any)[key] = value;
            }
          } catch (error) {
            console.warn(`Failed to apply override ${key}:`, error);
          }
        }

        return {
          success: true,
          data: {
            instanceId: instanceToOverride.id,
            appliedOverrides: overrides,
            message: `Successfully applied overrides to instance "${instanceToOverride.name}"`
          }
        };

      case 'get':
        if (!instanceId) {
          throw new Error('instanceId is required for get operation');
        }

        const getInstance = figma.getNodeById(instanceId);
        if (!getInstance || getInstance.type !== 'INSTANCE') {
          throw new Error('Instance not found');
        }

        const instanceData = {
          id: getInstance.id,
          name: getInstance.name,
          type: getInstance.type,
          componentId: getInstance.mainComponent?.id,
          position: { x: getInstance.x, y: getInstance.y },
          detached: getInstance.mainComponent === null
        };

        return {
          success: true,
          data: instanceData
        };

      default:
        throw new Error(`Unknown instance operation: ${operation}`);
    }
  }

}