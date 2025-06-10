import { BaseHandler } from './base-handler.js';
import { OperationResult } from '../types.js';

export class VariableHandler extends BaseHandler {
  
  getOperations() {
    return {
      'MANAGE_COLLECTIONS': this.manageCollections.bind(this),
      'MANAGE_VARIABLES': this.manageVariables.bind(this)
    };
  }

  // Helper function to normalize collection ID format
  private normalizeCollectionId(collectionId: string): string {
    return collectionId.startsWith('VariableCollectionId:') 
      ? collectionId 
      : `VariableCollectionId:${collectionId}`;
  }

  // Helper function to normalize variable ID format  
  private normalizeVariableId(variableId: string): string {
    return variableId.startsWith('VariableID:') 
      ? variableId 
      : `VariableID:${variableId}`;
  }

  async manageCollections(payload: any): Promise<OperationResult> {
    const { operation, collectionId, collectionName, modes, modeId, newModeName, description, hiddenFromPublishing } = payload;

    switch (operation) {
      case 'create':
        if (!collectionName) {
          throw new Error('collectionName is required for create operation');
        }

        // Create new variable collection
        const collection = figma.variables.createVariableCollection(collectionName);
        
        // Set description if provided
        if (description) {
          collection.description = description;
        }
        
        // Set publishing visibility if provided
        if (hiddenFromPublishing !== undefined) {
          collection.hiddenFromPublishing = hiddenFromPublishing;
        }

        // Add additional modes if provided
        if (modes && modes.length > 1) {
          // The first mode is created by default, add the rest
          for (let i = 1; i < modes.length; i++) {
            collection.addMode(modes[i]);
          }
          
          // Rename the default mode to the first name in the array
          if (modes[0] && collection.modes.length > 0) {
            collection.renameMode(collection.modes[0].modeId, modes[0]);
          }
        }

        return {
          success: true,
          data: {
            collectionId: collection.id,
            name: collection.name,
            description: collection.description,
            modes: collection.modes.map(mode => ({
              id: mode.modeId,
              name: mode.name
            })),
            defaultModeId: collection.defaultModeId,
            hiddenFromPublishing: collection.hiddenFromPublishing,
            message: `Successfully created variable collection "${collection.name}" with ${collection.modes.length} modes`
          }
        };

      case 'add_mode':
        if (!collectionId) {
          throw new Error('collectionId is required for add_mode operation');
        }
        if (!newModeName) {
          throw new Error('newModeName is required for add_mode operation');
        }

        const targetCollection = figma.variables.getVariableCollectionById(this.normalizeCollectionId(collectionId));
        if (!targetCollection) {
          throw new Error('Variable collection not found');
        }

        const newMode = targetCollection.addMode(newModeName);

        return {
          success: true,
          data: {
            collectionId: targetCollection.id,
            modeId: newMode,
            modeName: newModeName,
            totalModes: targetCollection.modes.length,
            message: `Successfully added mode "${newModeName}" to collection "${targetCollection.name}"`
          }
        };

      case 'remove_mode':
        if (!collectionId) {
          throw new Error('collectionId is required for remove_mode operation');
        }
        if (!modeId) {
          throw new Error('modeId is required for remove_mode operation');
        }

        const removeCollection = figma.variables.getVariableCollectionById(this.normalizeCollectionId(collectionId));
        if (!removeCollection) {
          throw new Error('Variable collection not found');
        }

        // Find the mode to get its name for the response
        const modeToRemove = removeCollection.modes.find(mode => mode.modeId === modeId);
        const modeName = modeToRemove ? modeToRemove.name : 'Unknown';

        removeCollection.removeMode(modeId);

        return {
          success: true,
          data: {
            collectionId: removeCollection.id,
            removedModeId: modeId,
            removedModeName: modeName,
            remainingModes: removeCollection.modes.length,
            message: `Successfully removed mode "${modeName}" from collection "${removeCollection.name}"`
          }
        };

      case 'rename_mode':
        if (!collectionId) {
          throw new Error('collectionId is required for rename_mode operation');
        }
        if (!modeId) {
          throw new Error('modeId is required for rename_mode operation');
        }
        if (!newModeName) {
          throw new Error('newModeName is required for rename_mode operation');
        }

        const renameCollection = figma.variables.getVariableCollectionById(this.normalizeCollectionId(collectionId));
        if (!renameCollection) {
          throw new Error('Variable collection not found');
        }

        const oldMode = renameCollection.modes.find(mode => mode.modeId === modeId);
        const oldModeName = oldMode ? oldMode.name : 'Unknown';

        renameCollection.renameMode(modeId, newModeName);

        return {
          success: true,
          data: {
            collectionId: renameCollection.id,
            modeId: modeId,
            oldName: oldModeName,
            newName: newModeName,
            message: `Successfully renamed mode "${oldModeName}" to "${newModeName}"`
          }
        };

      case 'update':
        if (!collectionId) {
          throw new Error('collectionId is required for update operation');
        }

        const updateCollection = figma.variables.getVariableCollectionById(this.normalizeCollectionId(collectionId));
        if (!updateCollection) {
          throw new Error('Variable collection not found');
        }

        // Update properties if provided
        if (collectionName) {
          updateCollection.name = collectionName;
        }
        if (description !== undefined) {
          updateCollection.description = description;
        }
        if (hiddenFromPublishing !== undefined) {
          updateCollection.hiddenFromPublishing = hiddenFromPublishing;
        }

        return {
          success: true,
          data: {
            collectionId: updateCollection.id,
            name: updateCollection.name,
            description: updateCollection.description,
            hiddenFromPublishing: updateCollection.hiddenFromPublishing,
            message: `Successfully updated collection "${updateCollection.name}"`
          }
        };

      case 'delete':
        if (!collectionId) {
          throw new Error('collectionId is required for delete operation');
        }

        const deleteCollection = figma.variables.getVariableCollectionById(this.normalizeCollectionId(collectionId));
        if (!deleteCollection) {
          throw new Error('Variable collection not found');
        }

        const deletedName = deleteCollection.name;
        deleteCollection.remove();

        return {
          success: true,
          data: {
            deletedCollectionId: collectionId,
            deletedName: deletedName,
            message: `Successfully deleted collection "${deletedName}"`
          }
        };

      case 'get':
        if (!collectionId) {
          throw new Error('collectionId is required for get operation');
        }

        const getCollection = figma.variables.getVariableCollectionById(this.normalizeCollectionId(collectionId));
        if (!getCollection) {
          throw new Error('Variable collection not found');
        }

        // Get variables in this collection
        const variableIds = getCollection.variableIds;

        return {
          success: true,
          data: {
            id: getCollection.id,
            name: getCollection.name,
            description: getCollection.description,
            modes: getCollection.modes.map(mode => ({
              id: mode.modeId,
              name: mode.name
            })),
            defaultModeId: getCollection.defaultModeId,
            hiddenFromPublishing: getCollection.hiddenFromPublishing,
            variableIds: variableIds,
            variableCount: variableIds.length
          }
        };

      case 'list':
        const collections = figma.variables.getLocalVariableCollections();
        
        return {
          success: true,
          data: {
            collections: collections.map(collection => ({
              id: collection.id,
              name: collection.name,
              description: collection.description,
              modeCount: collection.modes.length,
              variableCount: collection.variableIds.length,
              hiddenFromPublishing: collection.hiddenFromPublishing
            })),
            totalCount: collections.length
          }
        };

      default:
        throw new Error(`Unknown collection operation: ${operation}`);
    }
  }

  async manageVariables(payload: any): Promise<OperationResult> {
    const { 
      operation, 
      variableId, 
      collectionId, 
      variableName, 
      variableType, 
      modeValues,
      nodeId, 
      styleId, 
      property, 
      description, 
      scopes, 
      codeSyntax, 
      hiddenFromPublishing 
    } = payload;

    switch (operation) {
      case 'create':
        if (!collectionId) {
          throw new Error('collectionId is required for create operation');
        }
        if (!variableName) {
          throw new Error('variableName is required for create operation');
        }
        if (!variableType) {
          throw new Error('variableType is required for create operation');
        }

        const collection = figma.variables.getVariableCollectionById(this.normalizeCollectionId(collectionId));
        if (!collection) {
          throw new Error('Variable collection not found');
        }

        // Create variable
        const variable = figma.variables.createVariable(variableName, collection, variableType);
        
        // Set description if provided
        if (description) {
          variable.description = description;
        }
        
        // Set scopes if provided
        if (scopes && Array.isArray(scopes)) {
          variable.scopes = scopes as VariableScope[];
        }
        
        // Set code syntax if provided
        if (codeSyntax) {
          variable.codeSyntax = codeSyntax;
        }
        
        // Set publishing visibility if provided
        if (hiddenFromPublishing !== undefined) {
          variable.hiddenFromPublishing = hiddenFromPublishing;
        }

        // Set values for modes if provided
        if (modeValues) {
          for (const [modeKey, value] of Object.entries(modeValues)) {
            // Try to find mode by ID first, then by name
            let targetModeId = modeKey;
            
            // If modeKey doesn't match any mode ID, try to find by name
            const mode = collection.modes.find(m => m.modeId === modeKey || m.name === modeKey);
            if (mode) {
              targetModeId = mode.modeId;
            }
            
            try {
              // Parse color values if it's a COLOR variable
              let processedValue = value;
              if (variableType === 'COLOR' && typeof value === 'string') {
                processedValue = this.parseColor(value);
              }
              
              variable.setValueForMode(targetModeId, processedValue);
            } catch (error) {
              console.warn(`Failed to set value for mode ${modeKey}:`, error);
            }
          }
        }

        return {
          success: true,
          data: {
            variableId: variable.id,
            name: variable.name,
            type: variable.resolvedType,
            collectionId: variable.variableCollectionId,
            description: variable.description,
            scopes: variable.scopes,
            codeSyntax: variable.codeSyntax,
            hiddenFromPublishing: variable.hiddenFromPublishing,
            message: `Successfully created ${variableType.toLowerCase()} variable "${variableName}"`
          }
        };

      case 'update':
        if (!variableId) {
          throw new Error('variableId is required for update operation');
        }

        const updateVariable = figma.variables.getVariableById(this.normalizeVariableId(variableId));
        if (!updateVariable) {
          throw new Error('Variable not found');
        }

        // Update properties if provided
        if (variableName) {
          updateVariable.name = variableName;
        }
        if (description !== undefined) {
          updateVariable.description = description;
        }
        if (scopes && Array.isArray(scopes)) {
          updateVariable.scopes = scopes as VariableScope[];
        }
        if (codeSyntax) {
          updateVariable.codeSyntax = codeSyntax;
        }
        if (hiddenFromPublishing !== undefined) {
          updateVariable.hiddenFromPublishing = hiddenFromPublishing;
        }

        // Update mode values if provided
        if (modeValues) {
          const varCollection = figma.variables.getVariableCollectionById(updateVariable.variableCollectionId);
          if (varCollection) {
            for (const [modeKey, value] of Object.entries(modeValues)) {
              let targetModeId = modeKey;
              const mode = varCollection.modes.find(m => m.modeId === modeKey || m.name === modeKey);
              if (mode) {
                targetModeId = mode.modeId;
              }
              
              try {
                let processedValue = value;
                if (updateVariable.resolvedType === 'COLOR' && typeof value === 'string') {
                  processedValue = this.parseColor(value);
                }
                
                updateVariable.setValueForMode(targetModeId, processedValue);
              } catch (error) {
                console.warn(`Failed to update value for mode ${modeKey}:`, error);
              }
            }
          }
        }

        return {
          success: true,
          data: {
            variableId: updateVariable.id,
            name: updateVariable.name,
            type: updateVariable.resolvedType,
            message: `Successfully updated variable "${updateVariable.name}"`
          }
        };

      case 'delete':
        if (!variableId) {
          throw new Error('variableId is required for delete operation');
        }

        const deleteVariable = figma.variables.getVariableById(this.normalizeVariableId(variableId));
        if (!deleteVariable) {
          throw new Error('Variable not found');
        }

        const deletedVariableName = deleteVariable.name;
        deleteVariable.remove();

        return {
          success: true,
          data: {
            deletedVariableId: variableId,
            deletedName: deletedVariableName,
            message: `Successfully deleted variable "${deletedVariableName}"`
          }
        };

      case 'get':
        if (!variableId) {
          throw new Error('variableId is required for get operation');
        }

        const getVariable = figma.variables.getVariableById(this.normalizeVariableId(variableId));
        if (!getVariable) {
          throw new Error('Variable not found');
        }

        // Get collection to include mode information
        const getVarCollection = figma.variables.getVariableCollectionById(getVariable.variableCollectionId);
        const modes = getVarCollection ? getVarCollection.modes : [];

        // Get values by mode
        const valuesByMode: Record<string, any> = {};
        for (const mode of modes) {
          try {
            const value = getVariable.valuesByMode[mode.modeId];
            valuesByMode[mode.name] = value;
          } catch (error) {
            console.warn(`Failed to get value for mode ${mode.name}:`, error);
          }
        }

        return {
          success: true,
          data: {
            id: getVariable.id,
            name: getVariable.name,
            type: getVariable.resolvedType,
            collectionId: getVariable.variableCollectionId,
            collectionName: getVarCollection?.name,
            description: getVariable.description,
            scopes: getVariable.scopes,
            codeSyntax: getVariable.codeSyntax,
            hiddenFromPublishing: getVariable.hiddenFromPublishing,
            valuesByMode: valuesByMode
          }
        };

      case 'list':
        if (!collectionId) {
          throw new Error('collectionId is required for list operation');
        }

        const listCollection = figma.variables.getVariableCollectionById(this.normalizeCollectionId(collectionId));
        if (!listCollection) {
          throw new Error('Variable collection not found');
        }

        const variables = listCollection.variableIds.map(id => {
          const variable = figma.variables.getVariableById(id);
          if (!variable) return null;
          
          return {
            id: variable.id,
            name: variable.name,
            type: variable.resolvedType,
            description: variable.description,
            scopes: variable.scopes,
            hiddenFromPublishing: variable.hiddenFromPublishing
          };
        }).filter(Boolean);

        return {
          success: true,
          data: {
            collectionId: listCollection.id,
            collectionName: listCollection.name,
            variables: variables,
            totalCount: variables.length
          }
        };

      case 'bind':
        if (!variableId) {
          throw new Error('variableId is required for bind operation');
        }
        if (!property) {
          throw new Error('property is required for bind operation');
        }
        if (!nodeId && !styleId) {
          throw new Error('Either nodeId or styleId is required for bind operation');
        }

        const bindVariable = figma.variables.getVariableById(this.normalizeVariableId(variableId));
        if (!bindVariable) {
          throw new Error('Variable not found');
        }

        if (nodeId) {
          // Bind to node property
          const node = figma.getNodeById(nodeId);
          if (!node) {
            throw new Error('Node not found');
          }

          try {
            // Handle different property types correctly
            if (property === 'fills') {
              // For fills, we need to handle paint arrays properly
              if (bindVariable.resolvedType === 'COLOR') {
                const currentFills = (node as any).fills || [];
                const targetFill = currentFills[0] || { type: 'SOLID', color: { r: 0, g: 0, b: 0 } };
                
                // Use setBoundVariableForPaint for color variables in fills
                const boundFill = figma.variables.setBoundVariableForPaint(targetFill, 'color', bindVariable);
                (node as any).fills = [boundFill];
              } else {
                throw new Error(`Cannot bind ${bindVariable.resolvedType} variable to fills property`);
              }
            } else if (property === 'strokes') {
              // Similar handling for strokes
              if (bindVariable.resolvedType === 'COLOR') {
                const currentStrokes = (node as any).strokes || [];
                const targetStroke = currentStrokes[0] || { type: 'SOLID', color: { r: 0, g: 0, b: 0 } };
                
                const boundStroke = figma.variables.setBoundVariableForPaint(targetStroke, 'color', bindVariable);
                (node as any).strokes = [boundStroke];
              } else {
                throw new Error(`Cannot bind ${bindVariable.resolvedType} variable to strokes property`);
              }
            } else {
              // For simple properties, use setBoundVariable
              const validSimpleProperties = [
                'width', 'height', 'x', 'y', 
                'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius',
                'opacity', 'rotation', 'strokeWidth',
                'spacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'
              ];
              
              if (validSimpleProperties.includes(property)) {
                // Validate variable type matches property requirements
                if (['width', 'height', 'x', 'y', 'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'opacity', 'rotation', 'strokeWidth', 'spacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].includes(property)) {
                  if (bindVariable.resolvedType !== 'FLOAT') {
                    throw new Error(`Property "${property}" requires a FLOAT variable, got ${bindVariable.resolvedType}`);
                  }
                }
                
                // Check if this property is valid for this node type
                const nodeType = node.type;
                const sizeProperties = ['width', 'height'];
                const positionProperties = ['x', 'y'];
                
                // Validate property compatibility with node type
                if (sizeProperties.includes(property) && !['RECTANGLE', 'ELLIPSE', 'FRAME', 'COMPONENT', 'INSTANCE', 'TEXT'].includes(nodeType)) {
                  throw new Error(`Property "${property}" is not supported on ${nodeType} nodes`);
                }
                
                if (positionProperties.includes(property) && nodeType === 'PAGE') {
                  throw new Error(`Property "${property}" is not supported on ${nodeType} nodes`);
                }
                
                try {
                  (node as any).setBoundVariable(property, bindVariable);
                } catch (error) {
                  throw new Error(`Cannot bind ${property} to ${nodeType} node: ${error.message}`);
                }
              } else {
                throw new Error(`Property "${property}" is not supported for variable binding`);
              }
            }

            return {
              success: true,
              data: {
                variableId: bindVariable.id,
                nodeId: node.id,
                property: property,
                variableType: bindVariable.resolvedType,
                message: `Successfully bound ${bindVariable.resolvedType} variable "${bindVariable.name}" to ${property} of node "${node.name}"`
              }
            };
          } catch (error) {
            throw new Error(`Failed to bind variable to node property ${property}: ${error}`);
          }
        }

        if (styleId) {
          // API-Correct Pattern: Use getStyleByIdAsync
          let style: BaseStyle | null = null;
          
          try {
            // API-validated implementation: getStyleByIdAsync
            style = await figma.getStyleByIdAsync(styleId);
          } catch (error) {
            // Fallback: search through local styles if async fails
            const allPaintStyles = figma.getLocalPaintStyles();
            const allTextStyles = figma.getLocalTextStyles();
            const allEffectStyles = figma.getLocalEffectStyles();
            
            style = [...allPaintStyles, ...allTextStyles, ...allEffectStyles]
              .find(s => s.id === styleId || s.id.endsWith(styleId) || styleId.endsWith(s.id)) || null;
          }
          
          if (!style) {
            throw new Error(`Style not found. Searched for ID: ${styleId}`);
          }

          try {
            // Handle different style types with API-correct patterns
            if (style.type === 'PAINT') {
              const paintStyle = style as PaintStyle;
              
              if (property === 'color' || property === 'paints') {
                if (bindVariable.resolvedType === 'COLOR') {
                  // API-Correct Pattern for paint style binding
                  const paintsCopy = [...paintStyle.paints];  // Clone array
                  
                  if (paintsCopy.length === 0) {
                    // Create a default solid paint if none exists
                    paintsCopy.push({ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } });
                  }
                  
                  // Use setBoundVariableForPaint to create bound paint
                  paintsCopy[0] = figma.variables.setBoundVariableForPaint(
                    paintsCopy[0], 
                    'color',  // property
                    bindVariable
                  );
                  
                  // Reassign to style
                  paintStyle.paints = paintsCopy;
                } else {
                  throw new Error(`Cannot bind ${bindVariable.resolvedType} variable to paint style`);
                }
              } else {
                throw new Error(`Property "${property}" is not supported for paint styles. Use "color" or "paints"`);
              }
            } else if (style.type === 'TEXT') {
              // For text styles, handle various text properties
              const textStyle = style as TextStyle;
              const validTextProperties = ['fontSize', 'letterSpacing', 'lineHeight', 'paragraphSpacing', 'paragraphIndent'];
              
              if (validTextProperties.includes(property)) {
                if (bindVariable.resolvedType === 'FLOAT') {
                  textStyle.setBoundVariable(property as any, bindVariable);
                } else {
                  throw new Error(`Property "${property}" requires a FLOAT variable, got ${bindVariable.resolvedType}`);
                }
              } else {
                throw new Error(`Property "${property}" is not supported for text styles. Supported: ${validTextProperties.join(', ')}`);
              }
            } else {
              throw new Error(`Style type ${style.type} is not supported for variable binding`);
            }

            return {
              success: true,
              data: {
                variableId: bindVariable.id,
                styleId: style.id,
                styleType: style.type,
                property: property,
                variableType: bindVariable.resolvedType,
                message: `Successfully bound ${bindVariable.resolvedType} variable "${bindVariable.name}" to ${property} of ${style.type.toLowerCase()} style "${style.name}"`
              }
            };
          } catch (error) {
            throw new Error(`Failed to bind variable to style property ${property}: ${error}`);
          }
        }

        break;

      case 'unbind':
        if (!property) {
          throw new Error('property is required for unbind operation');
        }
        if (!nodeId && !styleId) {
          throw new Error('Either nodeId or styleId is required for unbind operation');
        }

        if (nodeId) {
          const unbindNode = figma.getNodeById(nodeId);
          if (!unbindNode) {
            throw new Error('Node not found');
          }

          try {
            // Handle different property types for unbinding
            if (property === 'fills') {
              // For fills, need to replace with unbound fills
              const currentFills = (unbindNode as any).fills || [];
              const unboundFills = currentFills.map((fill: any) => {
                // Remove any variable bindings and return a static fill
                if (fill.type === 'SOLID') {
                  return { type: 'SOLID', color: fill.color || { r: 0.5, g: 0.5, b: 0.5 }, opacity: fill.opacity || 1 };
                }
                return fill; // For other fill types, return as-is for now
              });
              (unbindNode as any).fills = unboundFills.length > 0 ? unboundFills : [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
            } else if (property === 'strokes') {
              // For strokes, similar approach
              const currentStrokes = (unbindNode as any).strokes || [];
              const unboundStrokes = currentStrokes.map((stroke: any) => {
                if (stroke.type === 'SOLID') {
                  return { type: 'SOLID', color: stroke.color || { r: 0, g: 0, b: 0 }, opacity: stroke.opacity || 1 };
                }
                return stroke;
              });
              (unbindNode as any).strokes = unboundStrokes;
            } else {
              // For simple properties, use setBoundVariable with null to unbind (API-confirmed pattern)
              const validSimpleProperties = [
                'width', 'height', 'x', 'y', 
                'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius',
                'opacity', 'rotation', 'strokeWidth',
                'spacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'
              ];
              
              if (validSimpleProperties.includes(property)) {
                // Check if the property is actually bound before trying to unbind
                const boundVars = (unbindNode as any).boundVariables;
                if (!boundVars || !boundVars[property]) {
                  // Property is not bound, so "unbinding" is already complete
                  return {
                    success: true,
                    data: {
                      nodeId: unbindNode.id,
                      property: property,
                      message: `Property ${property} was not bound on node "${unbindNode.name}" - no unbinding needed`
                    }
                  };
                }
                
                // Standard unbinding for supported properties
                try {
                  (unbindNode as any).setBoundVariable(property, null);
                } catch (error) {
                  throw new Error(`Cannot unbind ${property} from ${unbindNode.type} node: ${error.message}`);
                }
              } else {
                throw new Error(`Property "${property}" is not supported for variable unbinding`);
              }
            }

            return {
              success: true,
              data: {
                nodeId: unbindNode.id,
                property: property,
                message: `Successfully unbound variable from ${property} of node "${unbindNode.name}"`
              }
            };
          } catch (error) {
            throw new Error(`Failed to unbind variable from node property ${property}: ${error}`);
          }
        }

        if (styleId) {
          // Find the style using the same approach as binding
          let unbindStyle: BaseStyle | null = null;
          
          try {
            unbindStyle = figma.getStyleById(styleId);
          } catch (error) {
            const allPaintStyles = figma.getLocalPaintStyles();
            const allTextStyles = figma.getLocalTextStyles();
            const allEffectStyles = figma.getLocalEffectStyles();
            
            unbindStyle = [...allPaintStyles, ...allTextStyles, ...allEffectStyles]
              .find(s => s.id === styleId || s.id.endsWith(styleId) || styleId.endsWith(s.id)) || null;
          }
          
          if (!unbindStyle) {
            throw new Error(`Style not found. Searched for ID: ${styleId}`);
          }

          try {
            // Handle different style types for unbinding
            if (unbindStyle.type === 'PAINT') {
              // For paint styles, use setBoundVariable with null
              const paintStyle = unbindStyle as PaintStyle;
              if (property === 'color' || property === 'paints') {
                paintStyle.setBoundVariable('paints', null);
              } else {
                throw new Error(`Property "${property}" is not supported for paint style unbinding. Use "color" or "paints"`);
              }
            } else if (unbindStyle.type === 'TEXT') {
              // For text styles, use setBoundVariable with null
              const textStyle = unbindStyle as TextStyle;
              const validTextProperties = ['fontSize', 'letterSpacing', 'lineHeight', 'paragraphSpacing', 'paragraphIndent'];
              
              if (validTextProperties.includes(property)) {
                textStyle.setBoundVariable(property as any, null);
              } else {
                throw new Error(`Property "${property}" is not supported for text style unbinding. Supported: ${validTextProperties.join(', ')}`);
              }
            } else {
              throw new Error(`Style type ${unbindStyle.type} is not supported for variable unbinding`);
            }

            return {
              success: true,
              data: {
                styleId: unbindStyle.id,
                styleType: unbindStyle.type,
                property: property,
                message: `Successfully unbound variable from ${property} of ${unbindStyle.type.toLowerCase()} style "${unbindStyle.name}"`
              }
            };
          } catch (error) {
            throw new Error(`Failed to unbind variable from style property ${property}: ${error}`);
          }
        }

        break;

      case 'get_bindings':
        if (!variableId && !nodeId) {
          throw new Error('Either variableId or nodeId is required for get_bindings operation');
        }

        if (variableId) {
          // Get bindings for a specific variable
          const bindingsVariable = figma.variables.getVariableById(this.normalizeVariableId(variableId));
          if (!bindingsVariable) {
            throw new Error('Variable not found');
          }

          // API-Correct Pattern: Scan all nodes for variable usage
          const allNodes = figma.currentPage.findAll();
          const nodeBindings: any[] = [];

          for (const node of allNodes) {
            if (node.boundVariables) {
              Object.entries(node.boundVariables).forEach(([property, binding]) => {
                if (Array.isArray(binding)) {
                  // Handle array properties (fills, strokes) - API structure confirmed
                  binding.forEach((b, index) => {
                    if (b && b.id === bindingsVariable.id) {
                      nodeBindings.push({
                        type: 'node',
                        nodeId: node.id, 
                        nodeName: node.name,
                        nodeType: node.type,
                        property: `${property}[${index}]`,
                        bindingId: b.id
                      });
                    }
                  });
                } else if (binding && binding.id === bindingsVariable.id) {
                  // Handle single properties (width, cornerRadius) - API structure confirmed
                  nodeBindings.push({
                    type: 'node',
                    nodeId: node.id, 
                    nodeName: node.name,
                    nodeType: node.type,
                    property: property,
                    bindingId: binding.id
                  });
                }
              });
            }
          }

          // Method 2: Search all styles for this variable binding
          const styleBindings: any[] = [];
          
          // Check paint styles
          const paintStyles = figma.getLocalPaintStyles();
          paintStyles.forEach(style => {
            if (style.boundVariables && style.boundVariables.paints) {
              const paintBinding = style.boundVariables.paints;
              if (paintBinding.id === bindingsVariable.id) {
                styleBindings.push({
                  type: 'style',
                  styleId: style.id,
                  styleName: style.name,
                  styleType: 'PAINT',
                  property: 'paints',
                  bindingId: paintBinding.id
                });
              }
            }
          });
          
          // Check text styles
          const textStyles = figma.getLocalTextStyles();
          textStyles.forEach(style => {
            if (style.boundVariables) {
              const boundVars = style.boundVariables;
              Object.entries(boundVars).forEach(([property, binding]) => {
                if (binding && binding.id === bindingsVariable.id) {
                  styleBindings.push({
                    type: 'style',
                    styleId: style.id,
                    styleName: style.name,
                    styleType: 'TEXT',
                    property: property,
                    bindingId: binding.id
                  });
                }
              });
            }
          });

          const allBindings = [...nodeBindings, ...styleBindings];

          return {
            success: true,
            data: {
              variableId: bindingsVariable.id,
              variableName: bindingsVariable.name,
              bindings: allBindings,
              totalBindings: allBindings.length,
              nodeBindings: nodeBindings.length,
              styleBindings: styleBindings.length,
              message: `Found ${allBindings.length} bindings for variable "${bindingsVariable.name}"`
            }
          };
        } else if (nodeId) {
          // Get all bindings for a specific node
          const targetNode = figma.getNodeById(nodeId);
          if (!targetNode) {
            throw new Error('Node not found');
          }

          const nodeBindings: any[] = [];
          
          if ((targetNode as any).boundVariables) {
            const boundVars = (targetNode as any).boundVariables;
            Object.entries(boundVars).forEach(([property, binding]) => {
              if (Array.isArray(binding)) {
                // Handle array properties (fills, strokes)
                binding.forEach((b, index) => {
                  if (b && b.id) {
                    nodeBindings.push({
                      type: 'node',
                      nodeId: targetNode.id,
                      nodeName: targetNode.name,
                      nodeType: targetNode.type,
                      property: `${property}[${index}]`,
                      bindingId: b.id,
                      variableId: b.id
                    });
                  }
                });
              } else if (binding && binding.id) {
                // Handle single properties (width, cornerRadius)
                nodeBindings.push({
                  type: 'node',
                  nodeId: targetNode.id,
                  nodeName: targetNode.name,
                  nodeType: targetNode.type,
                  property: property,
                  bindingId: binding.id,
                  variableId: binding.id
                });
              }
            });
          }

          return {
            success: true,
            data: {
              nodeId: targetNode.id,
              nodeName: targetNode.name,
              nodeType: targetNode.type,
              bindings: nodeBindings,
              totalBindings: nodeBindings.length,
              message: `Found ${nodeBindings.length} variable bindings on node "${targetNode.name}"`
            }
          };
        }

      default:
        throw new Error(`Unknown variable operation: ${operation}`);
    }
  }

  // Helper method to parse color strings
  private parseColor(colorString: string): RGB {
    // Remove # if present
    const hex = colorString.replace('#', '');
    
    // Handle 3-digit hex
    let normalizedHex = hex;
    if (hex.length === 3) {
      normalizedHex = hex.split('').map(char => char + char).join('');
    }
    
    if (normalizedHex.length !== 6) {
      throw new Error(`Invalid color format: ${colorString}`);
    }
    
    const r = parseInt(normalizedHex.substr(0, 2), 16) / 255;
    const g = parseInt(normalizedHex.substr(2, 2), 16) / 255;
    const b = parseInt(normalizedHex.substr(4, 2), 16) / 255;
    
    return { r, g, b };
  }
}