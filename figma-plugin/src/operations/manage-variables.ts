import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById } from '../utils/node-utils.js';
import { bindingValidator } from '../utils/variable-binding-validator.js';

/**
 * Handle MANAGE_VARIABLES operation
 * Supports: create, update, delete, get, list, bind, unbind, get_bindings
 */
export async function MANAGE_VARIABLES(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('manageVariables', params, async () => {
    BaseOperation.validateParams(params, ['operation']);
    
    const operation = BaseOperation.validateStringParam(
      params.operation,
      'operation',
      ['create_variable', 'update_variable', 'delete_variable', 'get_variable', 'list_variables', 'bind_variable', 'unbind_variable', 'create_collection', 'update_collection', 'delete_collection', 'duplicate_collection', 'get_collection', 'list_collections', 'add_mode', 'remove_mode', 'rename_mode']
    );

    switch (operation) {
      // Variable operations
      case 'create_variable':
        return await createVariable(params);
      case 'update_variable':
        return await updateVariable(params);
      case 'delete_variable':
        return await deleteVariable(params);
      case 'get_variable':
        return await getVariable(params);
      case 'list_variables':
        return await listVariables(params);
      case 'bind_variable':
        return await bindVariable(params);
      case 'unbind_variable':
        return await unbindVariable(params);
      // Collection operations
      case 'create_collection':
        return await createCollection(params);
      case 'update_collection':
        return await updateCollection(params);
      case 'delete_collection':
        return await deleteCollection(params);
      case 'duplicate_collection':
        return await duplicateCollection(params);
      case 'get_collection':
        return await getCollection(params);
      case 'list_collections':
        return await listCollections(params);
      case 'add_mode':
        return await addMode(params);
      case 'remove_mode':
        return await removeMode(params);
      case 'rename_mode':
        return await renameMode(params);
      default:
        throw new Error(`Unknown variable operation: ${operation}`);
    }
  });
}

// Helper function to normalize collection ID format
function normalizeCollectionId(collectionId: string): string {
  return collectionId.startsWith('VariableCollectionId:') 
    ? collectionId 
    : `VariableCollectionId:${collectionId}`;
}

// Helper function to normalize variable ID format  
function normalizeVariableId(variableId: string): string {
  return variableId.startsWith('VariableID:') 
    ? variableId 
    : `VariableID:${variableId}`;
}

// Helper function to get variable bindings for a specific variable
async function getVariableBindings(variableId: string): Promise<{
  nodeBindings: any[];
  styleBindings: any[];
}> {
  const nodeBindings: any[] = [];
  const styleBindings: any[] = [];

  // Scan all nodes for variable usage
  const allNodes = figma.currentPage.findAll();
  for (const node of allNodes) {
    if (node.boundVariables) {
      Object.entries(node.boundVariables).forEach(([property, binding]) => {
        if (Array.isArray(binding)) {
          // Handle array properties (fills, strokes) - API structure confirmed
          binding.forEach((b, index) => {
            if (b && b.id === variableId) {
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
        } else if (binding && binding.id === variableId) {
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

  // Check paint styles
  const paintStyles = figma.getLocalPaintStyles();
  paintStyles.forEach(style => {
    if (style.boundVariables && style.boundVariables.paints) {
      const paintBinding = style.boundVariables.paints;
      if (paintBinding.id === variableId) {
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
        if (binding && binding.id === variableId) {
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

  return { nodeBindings, styleBindings };
}

// Helper method to parse color strings
function parseColor(colorString: string): RGB {
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

async function createVariable(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['collectionId', 'variableName', 'variableType']);
  
  const { collectionId, variableName, variableType, modeValues, description, scopes, codeSyntax, hiddenFromPublishing } = params;

  const collection = await figma.variables.getVariableCollectionByIdAsync(normalizeCollectionId(collectionId));
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
          processedValue = parseColor(value);
        }
        
        variable.setValueForMode(targetModeId, processedValue);
      } catch (error) {
        // Handle Figma plan limitations
        if (error.toString().includes('Limited to 1 modes only')) {
          throw new Error('Cannot set variable value for multiple modes: Your Figma plan is limited to 1 mode per collection. Upgrade to a paid plan to use multiple modes.');
        }
        logger.warn(`Failed to set value for mode ${modeKey}:`, error);
      }
    }
  }

  return {
    variableId: variable.id,
    name: variable.name,
    type: variable.resolvedType,
    collectionId: variable.variableCollectionId,
    description: variable.description,
    scopes: variable.scopes,
    codeSyntax: variable.codeSyntax,
    hiddenFromPublishing: variable.hiddenFromPublishing,
    message: `Successfully created ${variableType.toLowerCase()} variable "${variableName}"`
  };
}

async function updateVariable(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['variableId']);
  
  const { variableId, variableName, description, scopes, codeSyntax, hiddenFromPublishing, modeValues } = params;

  const updateVariable = await figma.variables.getVariableByIdAsync(normalizeVariableId(variableId));
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
    const varCollection = await figma.variables.getVariableCollectionByIdAsync(updateVariable.variableCollectionId);
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
            processedValue = parseColor(value);
          }
          
          updateVariable.setValueForMode(targetModeId, processedValue);
        } catch (error) {
          // Handle Figma plan limitations
          if (error.toString().includes('Limited to 1 modes only')) {
            throw new Error('Cannot update variable value for multiple modes: Your Figma plan is limited to 1 mode per collection. Upgrade to a paid plan to use multiple modes.');
          }
          logger.warn(`Failed to update value for mode ${modeKey}:`, error);
        }
      }
    }
  }

  return {
    variableId: updateVariable.id,
    name: updateVariable.name,
    type: updateVariable.resolvedType,
    message: `Successfully updated variable "${updateVariable.name}"`
  };
}

async function deleteVariable(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['variableId']);
  
  const { variableId } = params;

  const deleteVariable = await figma.variables.getVariableByIdAsync(normalizeVariableId(variableId));
  if (!deleteVariable) {
    throw new Error('Variable not found');
  }

  const deletedVariableName = deleteVariable.name;
  deleteVariable.remove();

  return {
    deletedVariableId: variableId,
    deletedName: deletedVariableName,
    message: `Successfully deleted variable "${deletedVariableName}"`
  };
}

async function getVariable(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['variableId']);
  
  const { variableId } = params;

  const getVariable = await figma.variables.getVariableByIdAsync(normalizeVariableId(variableId));
  if (!getVariable) {
    throw new Error('Variable not found');
  }

  // Get collection to include mode information
  const getVarCollection = await figma.variables.getVariableCollectionByIdAsync(getVariable.variableCollectionId);
  const modes = getVarCollection ? getVarCollection.modes : [];

  // Get values by mode
  const valuesByMode: Record<string, any> = {};
  for (const mode of modes) {
    try {
      const value = getVariable.valuesByMode[mode.modeId];
      valuesByMode[mode.name] = value;
    } catch (error) {
      logger.warn(`Failed to get value for mode ${mode.name}:`, error);
    }
  }

  // Get binding information for this variable
  const { nodeBindings, styleBindings } = await getVariableBindings(getVariable.id);
  const allBindings = [...nodeBindings, ...styleBindings];

  return {
    id: getVariable.id,
    name: getVariable.name,
    type: getVariable.resolvedType,
    collectionId: getVariable.variableCollectionId,
    collectionName: getVarCollection?.name,
    description: getVariable.description,
    scopes: getVariable.scopes,
    codeSyntax: getVariable.codeSyntax,
    hiddenFromPublishing: getVariable.hiddenFromPublishing,
    valuesByMode: valuesByMode,
    // Binding information (previously from get_variable_bindings)
    bindings: allBindings,
    totalBindings: allBindings.length,
    nodeBindings: nodeBindings.length,
    styleBindings: styleBindings.length,
    bindingSummary: `${allBindings.length} binding${allBindings.length !== 1 ? 's' : ''} (${nodeBindings.length} node${nodeBindings.length !== 1 ? 's' : ''}, ${styleBindings.length} style${styleBindings.length !== 1 ? 's' : ''})`
  };
}

async function listVariables(params: any): Promise<any> {
  const { collectionId } = params;

  // If collectionId is provided, list variables from specific collection
  if (collectionId) {
    const listCollection = await figma.variables.getVariableCollectionByIdAsync(normalizeCollectionId(collectionId));
    if (!listCollection) {
      throw new Error('Variable collection not found');
    }

    const variables = await Promise.all(
      listCollection.variableIds.map(async id => {
        const variable = await figma.variables.getVariableByIdAsync(id);
        if (!variable) return null;
        
        return {
          id: variable.id,
          name: variable.name,
          type: variable.resolvedType,
          description: variable.description,
          scopes: variable.scopes,
          hiddenFromPublishing: variable.hiddenFromPublishing,
          collectionId: listCollection.id,
          collectionName: listCollection.name
        };
      })
    );

    return {
      collectionId: listCollection.id,
      collectionName: listCollection.name,
      variables: variables.filter(Boolean),
      totalCount: variables.filter(Boolean).length
    };
  }

  // If no collectionId provided, list variables from all collections
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const allVariables = [];

  for (const collection of collections) {
    const variables = await Promise.all(
      collection.variableIds.map(async id => {
        const variable = await figma.variables.getVariableByIdAsync(id);
        if (!variable) return null;
        
        return {
          id: variable.id,
          name: variable.name,
          type: variable.resolvedType,
          description: variable.description,
          scopes: variable.scopes,
          hiddenFromPublishing: variable.hiddenFromPublishing,
          collectionId: collection.id,
          collectionName: collection.name
        };
      })
    );
    
    allVariables.push(...variables.filter(Boolean));
  }

  return {
    variables: allVariables,
    totalCount: allVariables.length,
    collectionsCount: collections.length
  };
}

async function bindVariable(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['variableId', 'property']);
  
  const { variableId, id, styleId, property } = params;
  
  if (!id && !styleId) {
    throw new Error('Either id or styleId is required for bind operation');
  }

  const bindVariable = await figma.variables.getVariableByIdAsync(normalizeVariableId(variableId));
  if (!bindVariable) {
    throw new Error('Variable not found');
  }

  if (id) {
    // Bind to node property
    const node = findNodeById(id);
    if (!node) {
      throw new Error('Node not found');
    }

    try {
      // Handle different property types correctly
      if (property === 'fills') {
        // Validate fills binding using validation service
        const validationResult = await bindingValidator.validateBinding(
          node.type,
          property,
          bindVariable.resolvedType,
          'node'
        );
        
        if (!validationResult.isValid) {
          let errorMessage = validationResult.error || `Cannot bind ${bindVariable.resolvedType} variable to fills property`;
          
          if (validationResult.suggestions) {
            const suggestions = validationResult.suggestions;
            const errorDetails: string[] = [];
            
            if (suggestions.validVariables && suggestions.validVariables.length > 0) {
              const variableList = suggestions.validVariables
                .slice(0, 3)
                .map(v => `"${v.name}" (${v.type})`)
                .join(', ');
              errorDetails.push(`Valid variables: ${variableList}`);
            }
            
            if (suggestions.explanation) {
              errorDetails.push(`Tip: ${suggestions.explanation}`);
            }
            
            if (errorDetails.length > 0) {
              errorMessage += `\n\nSuggestions:\n${errorDetails.map(detail => `• ${detail}`).join('\n')}`;
            }
          }
          
          throw new Error(errorMessage);
        }

        // For fills, we need to handle paint arrays properly
        const currentFills = (node as any).fills || [];
        
        if (currentFills.length === 0) {
          throw new Error(`Cannot bind variable to fills: Node "${node.name}" has no fills. Use figma_paint tool to add fills first, then bind variables.`);
        }
        
        if (currentFills.length > 1) {
          throw new Error(`Cannot bind variable to fills: Node "${node.name}" has ${currentFills.length} fill paints. Multiple fills create ambiguity - specify which paint index to bind using a more specific tool or operation.`);
        }
        
        const targetFill = currentFills[0];
        if (targetFill.type !== 'SOLID') {
          throw new Error(`Cannot bind variable to fills: Node "${node.name}" has ${targetFill.type} fill. Variables can only be bound to SOLID paint types.`);
        }
        
        // Use setBoundVariableForPaint for color variables in fills
        const boundFill = figma.variables.setBoundVariableForPaint(targetFill, 'color', bindVariable);
        (node as any).fills = [boundFill];
      } else if (property === 'strokes') {
        // Validate strokes binding using validation service
        const validationResult = await bindingValidator.validateBinding(
          node.type,
          property,
          bindVariable.resolvedType,
          'node'
        );
        
        if (!validationResult.isValid) {
          let errorMessage = validationResult.error || `Cannot bind ${bindVariable.resolvedType} variable to strokes property`;
          
          if (validationResult.suggestions) {
            const suggestions = validationResult.suggestions;
            const errorDetails: string[] = [];
            
            if (suggestions.validVariables && suggestions.validVariables.length > 0) {
              const variableList = suggestions.validVariables
                .slice(0, 3)
                .map(v => `"${v.name}" (${v.type})`)
                .join(', ');
              errorDetails.push(`Valid variables: ${variableList}`);
            }
            
            if (suggestions.explanation) {
              errorDetails.push(`Tip: ${suggestions.explanation}`);
            }
            
            if (errorDetails.length > 0) {
              errorMessage += `\n\nSuggestions:\n${errorDetails.map(detail => `• ${detail}`).join('\n')}`;
            }
          }
          
          throw new Error(errorMessage);
        }

        // Similar handling for strokes
        const currentStrokes = (node as any).strokes || [];
        
        if (currentStrokes.length === 0) {
          throw new Error(`Cannot bind variable to strokes: Node "${node.name}" has no strokes. Use figma_paint tool to add strokes first, then bind variables.`);
        }
        
        if (currentStrokes.length > 1) {
          throw new Error(`Cannot bind variable to strokes: Node "${node.name}" has ${currentStrokes.length} stroke paints. Multiple strokes create ambiguity - specify which paint index to bind using a more specific tool or operation.`);
        }
        
        const targetStroke = currentStrokes[0];
        if (targetStroke.type !== 'SOLID') {
          throw new Error(`Cannot bind variable to strokes: Node "${node.name}" has ${targetStroke.type} stroke. Variables can only be bound to SOLID paint types.`);
        }
        
        const boundStroke = figma.variables.setBoundVariableForPaint(targetStroke, 'color', bindVariable);
        (node as any).strokes = [boundStroke];
      } else if (property === 'effects') {
        // For effects, we need additional field specification
        const effectField = params.effectField || 'color'; // Default to color field
        
        // Validate effects binding using validation service
        const validationResult = await bindingValidator.validateBinding(
          node.type,
          property,
          bindVariable.resolvedType,
          'node'
        );
        
        if (!validationResult.isValid) {
          let errorMessage = validationResult.error || `Cannot bind ${bindVariable.resolvedType} variable to effects property`;
          
          if (validationResult.suggestions) {
            const suggestions = validationResult.suggestions;
            const errorDetails: string[] = [];
            
            if (suggestions.validVariables && suggestions.validVariables.length > 0) {
              const variableList = suggestions.validVariables
                .slice(0, 3)
                .map(v => `"${v.name}" (${v.type})`)
                .join(', ');
              errorDetails.push(`Valid variables: ${variableList}`);
            }
            
            if (suggestions.explanation) {
              errorDetails.push(`Tip: ${suggestions.explanation}`);
            }
            
            if (errorDetails.length > 0) {
              errorMessage += `\n\nSuggestions:\n${errorDetails.map(detail => `• ${detail}`).join('\n')}`;
            }
          }
          
          throw new Error(errorMessage);
        }

        // Get current effects - must exist to bind variables
        const currentEffects = (node as any).effects || [];
        
        if (currentEffects.length === 0) {
          throw new Error(`Cannot bind variable to effects: Node "${node.name}" has no effects. Use figma_effects tool to add effects first, then bind variables.`);
        }
        
        if (currentEffects.length > 1) {
          throw new Error(`Cannot bind variable to effects: Node "${node.name}" has ${currentEffects.length} effects. Multiple effects create ambiguity - specify which effect index to bind using a more specific tool or operation.`);
        }
        
        const targetEffect = currentEffects[0];
        
        // Use setBoundVariableForEffect to bind the variable
        const boundEffect = figma.variables.setBoundVariableForEffect(targetEffect, effectField as any, bindVariable);
        
        // Update the effects array
        const newEffects = [...currentEffects];
        newEffects[0] = boundEffect;
        (node as any).effects = newEffects;
      } else if (property === 'layoutGrids') {
        // For layout grids, we need additional field specification
        const gridField = params.gridField || 'sectionSize'; // Default to sectionSize field
        
        // Validate grid binding using validation service
        const validationResult = await bindingValidator.validateBinding(
          node.type,
          property,
          bindVariable.resolvedType,
          'node'
        );
        
        if (!validationResult.isValid) {
          let errorMessage = validationResult.error || `Cannot bind ${bindVariable.resolvedType} variable to layoutGrids property`;
          
          if (validationResult.suggestions) {
            const suggestions = validationResult.suggestions;
            const errorDetails: string[] = [];
            
            if (suggestions.validVariables && suggestions.validVariables.length > 0) {
              const variableList = suggestions.validVariables
                .slice(0, 3)
                .map(v => `"${v.name}" (${v.type})`)
                .join(', ');
              errorDetails.push(`Valid variables: ${variableList}`);
            }
            
            if (suggestions.explanation) {
              errorDetails.push(`Tip: ${suggestions.explanation}`);
            }
            
            if (errorDetails.length > 0) {
              errorMessage += `\n\nSuggestions:\n${errorDetails.map(detail => `• ${detail}`).join('\n')}`;
            }
          }
          
          throw new Error(errorMessage);
        }

        // Get current layout grids - must exist to bind variables
        const currentGrids = (node as any).layoutGrids || [];
        
        if (currentGrids.length === 0) {
          throw new Error(`Cannot bind variable to layoutGrids: Node "${node.name}" has no layout grids. Use figma_layout tool to add grids first, then bind variables.`);
        }
        
        if (currentGrids.length > 1) {
          throw new Error(`Cannot bind variable to layoutGrids: Node "${node.name}" has ${currentGrids.length} layout grids. Multiple grids create ambiguity - specify which grid index to bind using a more specific tool or operation.`);
        }
        
        const targetGrid = currentGrids[0];
        
        // Use setBoundVariableForLayoutGrid to bind the variable
        const boundGrid = figma.variables.setBoundVariableForLayoutGrid(targetGrid, gridField as any, bindVariable);
        
        // Update the layout grids array
        const newGrids = [...currentGrids];
        newGrids[0] = boundGrid;
        (node as any).layoutGrids = newGrids;
      } else {
        // Use declarative validation for simple properties
        const validationResult = await bindingValidator.validateBinding(
          node.type,
          property,
          bindVariable.resolvedType,
          'node'
        );
        
        if (!validationResult.isValid) {
          // Create enhanced error with suggestions
          let errorMessage = validationResult.error || `Cannot bind ${bindVariable.resolvedType} variable to property "${property}" on ${node.type} node`;
          
          if (validationResult.suggestions) {
            const suggestions = validationResult.suggestions;
            const errorDetails: string[] = [];
            
            if (suggestions.validVariables && suggestions.validVariables.length > 0) {
              const variableList = suggestions.validVariables
                .slice(0, 5) // Limit to first 5 suggestions
                .map(v => `"${v.name}" (${v.type}${v.collectionName ? ` from ${v.collectionName}` : ''})`)
                .join(', ');
              errorDetails.push(`Valid variables: ${variableList}${suggestions.validVariables.length > 5 ? '...' : ''}`);
            }
            
            if (suggestions.validProperties && suggestions.validProperties.length > 0) {
              const propertyList = suggestions.validProperties.slice(0, 8).join(', ');
              errorDetails.push(`Valid properties for ${bindVariable.resolvedType} on ${node.type}: ${propertyList}${suggestions.validProperties.length > 8 ? '...' : ''}`);
            }
            
            if (suggestions.alternativeNodeTypes && suggestions.alternativeNodeTypes.length > 0) {
              errorDetails.push(`Alternative node types: ${suggestions.alternativeNodeTypes.join(', ')}`);
            }
            
            if (suggestions.explanation) {
              errorDetails.push(`Tip: ${suggestions.explanation}`);
            }
            
            if (errorDetails.length > 0) {
              errorMessage += `\n\nSuggestions:\n${errorDetails.map(detail => `• ${detail}`).join('\n')}`;
            }
          }
          
          throw new Error(errorMessage);
        }
        
        try {
          (node as any).setBoundVariable(property, bindVariable);
        } catch (error) {
          throw new Error(`Failed to bind variable: ${error.toString()}`);
        }
      }

      return {
        variableId: bindVariable.id,
        nodeId: node.id,
        property: property,
        variableType: bindVariable.resolvedType,
        message: `Successfully bound ${bindVariable.resolvedType} variable "${bindVariable.name}" to ${property} of node "${node.name}"`
      };
    } catch (error) {
      throw new Error(`Failed to bind variable to node property ${property}: ${error.toString()}`);
    }
  }

  if (styleId) {
    // Bind to style property
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
      // Use declarative validation for style properties
      const validationResult = await bindingValidator.validateBinding(
        '', // nodeType not needed for style validation
        property,
        bindVariable.resolvedType,
        'style',
        style.type
      );
      
      if (!validationResult.isValid) {
        // Create enhanced error with suggestions
        let errorMessage = validationResult.error || `Cannot bind ${bindVariable.resolvedType} variable to property "${property}" on ${style.type} style`;
        
        if (validationResult.suggestions) {
          const suggestions = validationResult.suggestions;
          const errorDetails: string[] = [];
          
          if (suggestions.validVariables && suggestions.validVariables.length > 0) {
            const variableList = suggestions.validVariables
              .slice(0, 5) // Limit to first 5 suggestions
              .map(v => `"${v.name}" (${v.type}${v.collectionName ? ` from ${v.collectionName}` : ''})`)
              .join(', ');
            errorDetails.push(`Valid variables: ${variableList}${suggestions.validVariables.length > 5 ? '...' : ''}`);
          }
          
          if (suggestions.validProperties && suggestions.validProperties.length > 0) {
            const propertyList = suggestions.validProperties.slice(0, 8).join(', ');
            errorDetails.push(`Valid properties for ${bindVariable.resolvedType} on ${style.type} styles: ${propertyList}${suggestions.validProperties.length > 8 ? '...' : ''}`);
          }
          
          if (suggestions.explanation) {
            errorDetails.push(`Tip: ${suggestions.explanation}`);
          }
          
          if (errorDetails.length > 0) {
            errorMessage += `\n\nSuggestions:\n${errorDetails.map(detail => `• ${detail}`).join('\n')}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      // Handle different style types with API-correct patterns
      if (style.type === 'PAINT') {
        const paintStyle = style as PaintStyle;
        
        if (property === 'color' || property === 'paints') {
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
        }
      } else if (style.type === 'TEXT') {
        // For text styles, handle various text properties
        const textStyle = style as TextStyle;
        textStyle.setBoundVariable(property as any, bindVariable);
      }

      return {
        variableId: bindVariable.id,
        styleId: style.id,
        styleType: style.type,
        property: property,
        variableType: bindVariable.resolvedType,
        message: `Successfully bound ${bindVariable.resolvedType} variable "${bindVariable.name}" to ${property} of ${style.type.toLowerCase()} style "${style.name}"`
      };
    } catch (error) {
      throw new Error(`Failed to bind variable to style property ${property}: ${error.toString()}`);
    }
  }

  throw new Error('No valid binding target found');
}

async function unbindVariable(params: any): Promise<any> {
  BaseOperation.validateParams(params, []); // No required parameters - id/styleId checked below
  
  const { id, styleId, property, variableId } = params;
  
  if (!id && !styleId) {
    throw new Error('Either id or styleId is required for unbind operation');
  }

  if (id) {
    const unbindNode = findNodeById(id);
    if (!unbindNode) {
      throw new Error('Node not found');
    }

    try {
      // If no property specified, clear ALL variable bindings
      if (!property) {
        const boundVars = (unbindNode as any).boundVariables;
        if (!boundVars || Object.keys(boundVars).length === 0) {
          return {
            nodeId: unbindNode.id,
            message: `No variable bindings found on node "${unbindNode.name}" - no unbinding needed`,
            clearedProperties: []
          };
        }

        const clearedProperties: string[] = [];
        const failedProperties: string[] = [];

        // Clear each bound property
        for (const prop of Object.keys(boundVars)) {
          try {
            if (variableId) {
              // Only clear if this specific variable is bound to this property
              const boundVar = boundVars[prop];
              const boundVarId = boundVar?.id || boundVar;
              if (boundVarId === variableId) {
                await unbindSingleProperty(unbindNode, prop);
                clearedProperties.push(prop);
              }
            } else {
              // Clear all bindings for this property regardless of variable
              await unbindSingleProperty(unbindNode, prop);
              clearedProperties.push(prop);
            }
          } catch (error) {
            failedProperties.push(`${prop}: ${error.toString()}`);
          }
        }

        const message = clearedProperties.length > 0 
          ? `Successfully cleared variable bindings from ${clearedProperties.length} properties on node "${unbindNode.name}"`
          : `No matching variable bindings found on node "${unbindNode.name}"`;

        return {
          nodeId: unbindNode.id,
          message,
          clearedProperties,
          failedProperties: failedProperties.length > 0 ? failedProperties : undefined
        };
      }

      // Single property unbinding
      const boundVars = (unbindNode as any).boundVariables;
      if (!boundVars || !boundVars[property]) {
        return {
          nodeId: unbindNode.id,
          property: property,
          message: `Property ${property} was not bound on node "${unbindNode.name}" - no unbinding needed`
        };
      }

      // If variableId is specified, only unbind if that specific variable is bound
      if (variableId) {
        const boundVar = boundVars[property];
        const boundVarId = boundVar?.id || boundVar;
        if (boundVarId !== variableId) {
          return {
            nodeId: unbindNode.id,
            property: property,
            message: `Property ${property} is not bound to variable ${variableId} on node "${unbindNode.name}" - no unbinding needed`
          };
        }
      }

      await unbindSingleProperty(unbindNode, property);

      return {
        nodeId: unbindNode.id,
        property: property,
        message: `Successfully unbound variable from ${property} of node "${unbindNode.name}"`
      };
    } catch (error) {
      throw new Error(`Failed to unbind variable from node: ${error.toString()}`);
    }
  }

  if (styleId) {
    // Find the style using the same approach as binding
    let unbindStyle: BaseStyle | null = null;
    
    try {
      unbindStyle = await figma.getStyleByIdAsync(styleId);
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
        styleId: unbindStyle.id,
        styleType: unbindStyle.type,
        property: property,
        message: `Successfully unbound variable from ${property} of ${unbindStyle.type.toLowerCase()} style "${unbindStyle.name}"`
      };
    } catch (error) {
      throw new Error(`Failed to unbind variable from style property ${property}: ${error.toString()}`);
    }
  }

  throw new Error('No valid unbinding target found');
}

// Note: getBindings function removed - functionality now integrated into getVariable

// Helper function to unbind a single property
async function unbindSingleProperty(node: SceneNode, property: string): Promise<void> {
  try {
    // Handle different property types for unbinding
    if (property === 'fills') {
      // For fills, need to replace with unbound fills
      const currentFills = (node as any).fills || [];
      const unboundFills = currentFills.map((fill: any) => {
        // Remove any variable bindings and return a static fill
        if (fill.type === 'SOLID') {
          return { type: 'SOLID', color: fill.color || { r: 0.5, g: 0.5, b: 0.5 }, opacity: fill.opacity || 1 };
        }
        return fill; // For other fill types, return as-is for now
      });
      (node as any).fills = unboundFills.length > 0 ? unboundFills : [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
    } else if (property === 'strokes') {
      // For strokes, similar approach
      const currentStrokes = (node as any).strokes || [];
      const unboundStrokes = currentStrokes.map((stroke: any) => {
        if (stroke.type === 'SOLID') {
          return { type: 'SOLID', color: stroke.color || { r: 0, g: 0, b: 0 }, opacity: stroke.opacity || 1 };
        }
        return stroke;
      });
      (node as any).strokes = unboundStrokes;
    } else if (property === 'effects') {
      // For effects, remove variable bindings and keep static effects
      const currentEffects = (node as any).effects || [];
      const unboundEffects = currentEffects.map((effect: any) => {
        // Create static copy of effect without variable bindings
        const staticEffect = { ...effect };
        // Ensure color is static if it was bound
        if (effect.color) {
          staticEffect.color = effect.color;
        }
        return staticEffect;
      });
      (node as any).effects = unboundEffects;
    } else if (property === 'layoutGrids') {
      // For layout grids, remove variable bindings and keep static grids
      const currentGrids = (node as any).layoutGrids || [];
      const unboundGrids = currentGrids.map((grid: any) => {
        // Create static copy of grid without variable bindings
        return { ...grid };
      });
      (node as any).layoutGrids = unboundGrids;
    } else {
      // For unbinding, we need to check what type of variable is currently bound
      // to validate properly, or just check if the property can accept any variable type
      const boundVars = (node as any).boundVariables;
      let isValidProperty = false;
      
      if (boundVars && boundVars[property]) {
        // Property is bound, so it must be valid - safe to unbind
        isValidProperty = true;
      } else {
        // Property not bound, check if it's a valid bindable property for any variable type
        const { BINDING_RULES } = await import('../utils/variable-binding-validator.js');
        const nodeTypeRules = BINDING_RULES[node.type];
        if (nodeTypeRules) {
          for (const varType of ['FLOAT', 'STRING', 'COLOR', 'BOOLEAN']) {
            if (nodeTypeRules[varType] && nodeTypeRules[varType].includes(property)) {
              isValidProperty = true;
              break;
            }
          }
        }
      }
      
      if (!isValidProperty) {
        // Use validation service to get suggestions for invalid properties
        const validationResult = await bindingValidator.validateBinding(
          node.type,
          property,
          'FLOAT', // Use FLOAT as representative type for error suggestions
          'node'
        );
        
        let errorMessage = `Property "${property}" is not supported for variable unbinding on ${node.type} nodes`;
        
        if (validationResult.suggestions && validationResult.suggestions.validProperties) {
          const propertyList = validationResult.suggestions.validProperties.slice(0, 8).join(', ');
          errorMessage += `\n\nValid properties for ${node.type}: ${propertyList}`;
        }
        
        throw new Error(errorMessage);
      }
      
      // Standard unbinding for supported properties
      try {
        (node as any).setBoundVariable(property, null);
      } catch (error) {
        throw new Error(`Cannot unbind ${property} from ${node.type} node: ${error.toString()}`);
      }
    }
  } catch (error) {
    throw new Error(`Failed to unbind property ${property}: ${error.toString()}`);
  }
}

// Collection Operations
async function createCollection(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['name']);
  
  const { name, modes, description, hiddenFromPublishing } = params;
  
  const collection = figma.variables.createVariableCollection(name);
  
  if (description) {
    collection.description = description;
  }
  
  if (hiddenFromPublishing !== undefined) {
    collection.hiddenFromPublishing = hiddenFromPublishing;
  }

  // Normalize modes to array (handles single string, single array, or multi array)
  const normalizedModes = modes ? (Array.isArray(modes) ? modes : [modes]) : null;

  if (normalizedModes && normalizedModes.length > 1) {
    try {
      for (let i = 1; i < normalizedModes.length; i++) {
        collection.addMode(normalizedModes[i]);
      }
      
      if (normalizedModes[0] && collection.modes.length > 0) {
        collection.renameMode(collection.modes[0].modeId, normalizedModes[0]);
      }
    } catch (error) {
      // Handle Figma plan limitations
      if (error.toString().includes('Limited to 1 modes only')) {
        throw new Error('Cannot create collection with multiple modes: Your Figma plan is limited to 1 mode per collection. Upgrade to a paid plan to use multiple modes.');
      }
      throw error;
    }
  } else if (normalizedModes && normalizedModes.length === 1) {
    // Rename the default mode if only one mode is specified
    if (collection.modes.length > 0) {
      collection.renameMode(collection.modes[0].modeId, normalizedModes[0]);
    }
  }

  return {
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
  };
}

async function updateCollection(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['collectionId']);
  
  const { collectionId, name, description, hiddenFromPublishing } = params;
  
  const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
  if (!collection) {
    throw new Error('Variable collection not found');
  }

  if (name) {
    collection.name = name;
  }
  if (description !== undefined) {
    collection.description = description;
  }
  if (hiddenFromPublishing !== undefined) {
    collection.hiddenFromPublishing = hiddenFromPublishing;
  }

  return {
    collectionId: collection.id,
    name: collection.name,
    description: collection.description,
    hiddenFromPublishing: collection.hiddenFromPublishing,
    message: `Successfully updated collection "${collection.name}"`
  };
}

async function deleteCollection(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['collectionId']);
  
  const { collectionId } = params;
  
  const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
  if (!collection) {
    throw new Error('Variable collection not found');
  }

  const deletedName = collection.name;
  collection.remove();

  return {
    deletedCollectionId: collectionId,
    deletedName: deletedName,
    message: `Successfully deleted collection "${deletedName}"`
  };
}

async function duplicateCollection(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['collectionId']);
  
  const { collectionId, newName } = params;
  
  // Get the source collection
  const sourceCollection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
  if (!sourceCollection) {
    throw new Error('Source collection not found');
  }

  // Create new collection with appropriate name
  const duplicateName = newName || `${sourceCollection.name} Copy`;
  const newCollection = figma.variables.createVariableCollection(duplicateName);
  
  // Copy collection properties
  if (sourceCollection.description) {
    newCollection.description = sourceCollection.description;
  }
  if (sourceCollection.hiddenFromPublishing !== undefined) {
    newCollection.hiddenFromPublishing = sourceCollection.hiddenFromPublishing;
  }

  // Copy modes (first remove default mode, then add all source modes)
  const sourceModes = sourceCollection.modes;
  if (sourceModes.length > 1) {
    try {
      // Add additional modes beyond the default
      for (let i = 1; i < sourceModes.length; i++) {
        newCollection.addMode(sourceModes[i].name);
      }
      
      // Rename the default mode to match source
      if (sourceModes.length > 0) {
        newCollection.renameMode(newCollection.modes[0].modeId, sourceModes[0].name);
      }
    } catch (error) {
      // Handle Figma plan limitations
      if (error.toString().includes('Limited to 1 modes only')) {
        throw new Error('Cannot duplicate collection with multiple modes: Your Figma plan is limited to 1 mode per collection. Only the first mode will be duplicated.');
      }
      throw error;
    }
  } else if (sourceModes.length === 1) {
    // Just rename the default mode
    newCollection.renameMode(newCollection.modes[0].modeId, sourceModes[0].name);
  }

  // Get all variables from the source collection
  const sourceVariables = await Promise.all(
    sourceCollection.variableIds.map(id => figma.variables.getVariableByIdAsync(id))
  );

  const copiedVariables: any[] = [];
  const failedVariables: any[] = [];

  // Duplicate each variable
  for (const sourceVar of sourceVariables) {
    if (!sourceVar) continue;

    try {
      // Create new variable in the new collection
      const newVariable = figma.variables.createVariable(
        sourceVar.name,
        newCollection,
        sourceVar.resolvedType
      );

      // Copy variable properties
      if (sourceVar.description) {
        newVariable.description = sourceVar.description;
      }
      if (sourceVar.hiddenFromPublishing !== undefined) {
        newVariable.hiddenFromPublishing = sourceVar.hiddenFromPublishing;
      }
      if (sourceVar.scopes && sourceVar.scopes.length > 0) {
        newVariable.scopes = sourceVar.scopes;
      }
      if (sourceVar.codeSyntax && Object.keys(sourceVar.codeSyntax).length > 0) {
        newVariable.codeSyntax = sourceVar.codeSyntax;
      }

      // Copy values for each mode
      const modeMapping: Record<string, string> = {};
      for (let i = 0; i < Math.min(sourceModes.length, newCollection.modes.length); i++) {
        modeMapping[sourceModes[i].modeId] = newCollection.modes[i].modeId;
      }

      for (const [sourceModeId, targetModeId] of Object.entries(modeMapping)) {
        const sourceValue = sourceVar.valuesByMode[sourceModeId];
        if (sourceValue !== undefined) {
          try {
            newVariable.setValueForMode(targetModeId, sourceValue);
          } catch (error) {
            logger.warn(`Failed to copy value for mode ${sourceModeId}:`, error);
          }
        }
      }

      copiedVariables.push({
        originalId: sourceVar.id,
        originalName: sourceVar.name,
        newId: newVariable.id,
        newName: newVariable.name,
        type: newVariable.resolvedType
      });

    } catch (error) {
      failedVariables.push({
        originalId: sourceVar.id,
        originalName: sourceVar.name,
        error: error.toString()
      });
    }
  }

  return {
    sourceCollectionId: collectionId,
    sourceCollectionName: sourceCollection.name,
    newCollectionId: newCollection.id,
    newCollectionName: newCollection.name,
    modesCount: newCollection.modes.length,
    modes: newCollection.modes.map(mode => ({
      id: mode.modeId,
      name: mode.name
    })),
    variablesCopied: copiedVariables.length,
    variablesFailed: failedVariables.length,
    copiedVariables: copiedVariables,
    failedVariables: failedVariables.length > 0 ? failedVariables : undefined,
    message: `Successfully duplicated collection "${sourceCollection.name}" as "${newCollection.name}" with ${copiedVariables.length} variables`
  };
}

async function getCollection(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['collectionId']);
  
  const { collectionId } = params;
  
  const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
  if (!collection) {
    throw new Error('Variable collection not found');
  }

  const variableIds = collection.variableIds;

  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    modes: collection.modes.map(mode => ({
      id: mode.modeId,
      name: mode.name
    })),
    defaultModeId: collection.defaultModeId,
    hiddenFromPublishing: collection.hiddenFromPublishing,
    variableIds: variableIds,
    variableCount: variableIds.length
  };
}

async function listCollections(params: any): Promise<any> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  
  return {
    collections: collections.map(collection => ({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      modeCount: collection.modes.length,
      variableCount: collection.variableIds.length,
      hiddenFromPublishing: collection.hiddenFromPublishing
    })),
    totalCount: collections.length
  };
}

async function addMode(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['collectionId', 'modeName']);
  
  const { collectionId, modeName } = params;
  
  const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
  if (!collection) {
    throw new Error('Variable collection not found');
  }

  try {
    const newModeId = collection.addMode(modeName);

    return {
      collectionId: collection.id,
      modeId: newModeId,
      modeName: modeName,
      totalModes: collection.modes.length,
      message: `Successfully added mode "${modeName}" to collection "${collection.name}"`
    };
  } catch (error) {
    // Handle Figma plan limitations
    if (error.toString().includes('Limited to 1 modes only')) {
      throw new Error('Cannot add mode: Your Figma plan is limited to 1 mode per collection. Upgrade to a paid plan to use multiple modes.');
    }
    throw error;
  }
}

async function removeMode(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['collectionId', 'modeId']);
  
  const { collectionId, modeId } = params;
  
  const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
  if (!collection) {
    throw new Error('Variable collection not found');
  }

  const modeToRemove = collection.modes.find(mode => mode.modeId === modeId);
  const modeName = modeToRemove ? modeToRemove.name : 'Unknown';

  collection.removeMode(modeId);

  return {
    collectionId: collection.id,
    removedModeId: modeId,
    removedModeName: modeName,
    remainingModes: collection.modes.length,
    message: `Successfully removed mode "${modeName}" from collection "${collection.name}"`
  };
}

async function renameMode(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['collectionId', 'modeId', 'newModeName']);
  
  const { collectionId, modeId, newModeName } = params;
  
  const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
  if (!collection) {
    throw new Error('Variable collection not found');
  }

  const modeToRename = collection.modes.find(mode => mode.modeId === modeId);
  if (!modeToRename) {
    throw new Error('Mode not found in collection');
  }

  const oldModeName = modeToRename.name;
  collection.renameMode(modeId, newModeName);

  return {
    collectionId: collection.id,
    modeId: modeId,
    oldModeName: oldModeName,
    newModeName: newModeName,
    message: `Successfully renamed mode from "${oldModeName}" to "${newModeName}"`
  };
}

// Alias for collection operations - both MANAGE_VARIABLES and MANAGE_COLLECTIONS use the same handler
export const MANAGE_COLLECTIONS = MANAGE_VARIABLES;