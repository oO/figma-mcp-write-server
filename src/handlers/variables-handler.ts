import { ManageVariablesSchema, ToolHandler, ToolResult, Tool } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';
import { BulkOperationsParser } from '../utils/bulk-operations.js';

// Simple case-insensitive enum helper
function caseInsensitiveEnum<T extends string>(
  value: string | undefined, 
  validValues: readonly T[], 
  paramName: string
): T {
  if (!value) {
    throw new Error(`${paramName} is required`);
  }
  
  const normalizedValue = value.toUpperCase();
  const normalizedValidValues = validValues.map(v => v.toUpperCase());
  
  const index = normalizedValidValues.indexOf(normalizedValue);
  if (index === -1) {
    throw new Error(`Invalid ${paramName}: ${value}. Valid values: ${validValues.join(', ')}`);
  }
  
  return validValues[index] as T;
}

export class VariablesHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_variables',
        description: 'Create variables and bind them to properties, and manage variable collections. Note: get_variable now includes binding information (previously from get_variable_bindings)',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['create_variable', 'update_variable', 'delete_variable', 'get_variable', 'list_variables', 'bind_variable', 'unbind_variable', 'create_collection', 'update_collection', 'delete_collection', 'duplicate_collection', 'get_collection', 'list_collections', 'add_mode', 'remove_mode', 'rename_mode'],
              description: 'Operation to perform (case-insensitive: create_variable, update_variable, delete_variable, get_variable [includes bindings], list_variables, bind_variable, unbind_variable, create_collection, update_collection, delete_collection, duplicate_collection, get_collection, list_collections, add_mode, remove_mode, rename_mode)'
            },
            variableId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Variable ID(s) - single string or array for bulk operations'
            },
            collectionId: {
              type: 'string',
              description: 'Collection ID (required for: create; optional for: list - if not provided, lists all variables across all collections)'
            },
            variableName: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Variable name(s) - single string or array for bulk operations'
            },
            variableType: {
              oneOf: [
                { type: 'string', enum: ['COLOR', 'FLOAT', 'STRING', 'BOOLEAN'] },
                { type: 'array', items: { type: 'string', enum: ['COLOR', 'FLOAT', 'STRING', 'BOOLEAN'] } }
              ],
              description: 'Variable type(s) (case-insensitive: COLOR, FLOAT, STRING, BOOLEAN) - single value or array for bulk operations'
            },
            modeValues: {
              type: 'object',
              description: 'Values per mode (modeId: value pairs)',
              additionalProperties: true
            },
            id: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Target node ID(s) for binding - single string or array for bulk operations'
            },
            styleId: {
              type: 'string',
              description: 'Target style for binding'
            },
            property: {
              type: 'string',
              description: 'Property to bind (case-insensitive: fills, strokes, width, height, cornerRadius, opacity, etc.)'
            },
            description: {
              type: 'string',
              description: 'Variable description'
            },
            scopes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Property scopes for variable'
            },
            codeSyntax: {
              type: 'object',
              description: 'Platform code syntax mappings',
              additionalProperties: { type: 'string' }
            },
            hiddenFromPublishing: {
              type: 'boolean',
              description: 'Whether variable is hidden from publishing'
            },
            // Collection-specific parameters
            name: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Collection name(s) - single string or array for bulk operations'
            },
            modes: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } },
                { type: 'array', items: { type: 'array', items: { type: 'string' } } }
              ],
              description: 'Mode names for creation - string, array of strings, or array of arrays for bulk operations'
            },
            modeId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Specific mode ID(s) for operations - single string or array for bulk operations'
            },
            modeName: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Mode name(s) for add operations - single string or array for bulk operations'
            },
            newModeName: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'New mode name(s) for rename operations - single string or array for bulk operations'
            }
          },
          required: ['operation']
        },
        examples: [
          // Variable operations
          '{"operation": "create_variable", "collectionId": "123:456", "variableName": "Primary Blue", "variableType": "COLOR", "modeValues": {"light": "#0066CC", "dark": "#4A9EFF"}}',
          '{"operation": "bind_variable", "variableId": "123:789", "id": "456:123", "property": "fills"}',
          '{"operation": "bind_variable", "variableId": "123:789", "id": "456:123", "property": "effects", "effectField": "radius"}',
          '{"operation": "bind_variable", "variableId": "123:789", "id": "456:123", "property": "layoutGrids", "gridField": "sectionSize"}',
          '{"operation": "unbind_variable", "id": "456:123", "property": "fills"}',
          '{"operation": "unbind_variable", "id": "456:123"}',
          '{"operation": "unbind_variable", "id": "456:123", "variableId": "123:789"}',
          '{"operation": "list_variables", "collectionId": "123:456"}',
          '{"operation": "list_variables"}',
          '{"operation": "get_variable", "variableId": "123:789"}',
          // Collection operations
          '{"operation": "create_collection", "name": "Colors", "modes": ["Light", "Dark"], "description": "Color tokens for theming"}',
          '{"operation": "duplicate_collection", "collectionId": "123:456", "newName": "Colors Copy"}',
          '{"operation": "add_mode", "collectionId": "123:456", "modeName": "High Contrast"}',
          '{"operation": "list_collections"}',
          '{"operation": "get_collection", "collectionId": "123:456"}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_variables') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_variables',
      operation: 'variables',
      bulkParams: ['variableId', 'id', 'variableName', 'variableType', 'collectionId', 'name', 'modeId', 'modeName', 'newModeName'],
      paramConfigs: {
        // Core operational parameters
        operation: { expectedType: 'string' as const, allowSingle: true },
        // Variable-specific parameters
        variableId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        collectionId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        variableName: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        variableType: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        // Binding parameters
        id: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        styleId: { expectedType: 'string' as const, allowSingle: true },
        property: { expectedType: 'string' as const, allowSingle: true },
        effectField: { expectedType: 'string' as const, allowSingle: true },
        gridField: { expectedType: 'string' as const, allowSingle: true },
        // Optional parameters
        modeValues: { expectedType: 'object' as const, allowSingle: true },
        description: { expectedType: 'string' as const, allowSingle: true },
        scopes: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        codeSyntax: { expectedType: 'object' as const, allowSingle: true },
        hiddenFromPublishing: { expectedType: 'boolean' as const, allowSingle: true },
        // Collection-specific parameters
        name: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        newName: { expectedType: 'string' as const, allowSingle: true },
        modes: { expectedType: 'array' as const, allowSingle: true, validator: this.validateModes.bind(this) },
        modeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        modeName: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        newModeName: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true }
      },
      pluginMessageType: 'MANAGE_VARIABLES',
      customValidator: this.validateVariableArgs.bind(this),
      specialBulkHandler: this.createCollectionBulkHandler.bind(this)
    };

    return this.unifiedHandler.handle(args, config);
  }

  private validateModes(modes: any): boolean {
    if (!modes) return true; // modes is optional
    
    // Single string
    if (typeof modes === 'string') return true;
    
    // Array of strings
    if (Array.isArray(modes)) {
      if (modes.length === 0) return true;
      
      // Check if it's array of arrays (bulk format)
      if (Array.isArray(modes[0])) {
        return modes.every(subArray => 
          Array.isArray(subArray) && subArray.every(item => typeof item === 'string')
        );
      }
      
      // Regular array of strings
      return modes.every(item => typeof item === 'string');
    }
    
    return false;
  }

  private createCollectionBulkHandler(args: any, maxLength: number): any[] {
    const collectionBulkParams = ['variableId', 'id', 'variableName', 'variableType', 'collectionId', 'name', 'newName', 'modeId', 'modeName', 'newModeName', 'description', 'hiddenFromPublishing'];
    
    // Check if modes is array of arrays and update maxLength accordingly
    if (args.modes && Array.isArray(args.modes) && args.modes.length > 0 && Array.isArray(args.modes[0])) {
      maxLength = Math.max(maxLength, args.modes.length);
    }
    
    // Build operations array
    const operations: any[] = [];
    for (let i = 0; i < maxLength; i++) {
      const operation = { ...args };
      
      // Expand each collection bulk parameter
      for (const param of collectionBulkParams) {
        if (args[param] !== undefined) {
          const expandedValues = BulkOperationsParser.expandArrayParam(args[param], maxLength);
          operation[param] = expandedValues[i];
        }
      }
      
      // Special handling for modes parameter - don't process it through bulk params
      if (args.modes !== undefined) {
        if (Array.isArray(args.modes) && args.modes.length > 0 && Array.isArray(args.modes[0])) {
          // Array of arrays - use cycling
          const expandedModes = BulkOperationsParser.expandArrayParam(args.modes, maxLength);
          operation.modes = expandedModes[i];
        } else {
          // Single array or other format - repeat for all operations
          operation.modes = args.modes;
        }
      }
      
      operations.push(operation);
    }
    
    return operations;
  }

  private validateVariableArgs(args: any): any {
    const validatedArgs = ManageVariablesSchema.parse(args);
    const { 
      operation, 
      variableId, 
      collectionId, 
      variableName, 
      variableType, 
      modeValues,
      id, 
      styleId, 
      property, 
      description, 
      scopes, 
      codeSyntax, 
      hiddenFromPublishing,
      // Collection parameters
      name,
      modes,
      modeId,
      modeName,
      newModeName
    } = validatedArgs;

    // Normalize operation to uppercase for case-insensitive handling
    const normalizedOperation = caseInsensitiveEnum(operation, 
      ['create_variable', 'update_variable', 'delete_variable', 'get_variable', 'list_variables', 'bind_variable', 'unbind_variable', 'create_collection', 'update_collection', 'delete_collection', 'duplicate_collection', 'get_collection', 'list_collections', 'add_mode', 'remove_mode', 'rename_mode'], 
      'operation'
    ) as 'create_variable' | 'update_variable' | 'delete_variable' | 'get_variable' | 'list_variables' | 'bind_variable' | 'unbind_variable' | 'create_collection' | 'update_collection' | 'delete_collection' | 'duplicate_collection' | 'get_collection' | 'list_collections' | 'add_mode' | 'remove_mode' | 'rename_mode';

    // Normalize variableType if provided
    let normalizedVariableType = variableType;
    if (variableType) {
      if (Array.isArray(variableType)) {
        normalizedVariableType = variableType.map(type => 
          caseInsensitiveEnum(type, ['COLOR', 'FLOAT', 'STRING', 'BOOLEAN'], 'variableType')
        ) as ('COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN')[];
      } else {
        normalizedVariableType = caseInsensitiveEnum(variableType, ['COLOR', 'FLOAT', 'STRING', 'BOOLEAN'], 'variableType') as 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
      }
    }

    // Validation logic
    if (!normalizedOperation) {
      throw new Error('operation is required');
    }

    if (normalizedOperation === 'create_variable' && (!collectionId || !variableName || !normalizedVariableType)) {
      throw new Error('collectionId, variableName, and variableType are required for create_variable operation');
    }

    if (['update_variable', 'delete_variable', 'get_variable'].includes(normalizedOperation) && !variableId) {
      throw new Error('variableId is required for variable-specific operations');
    }

    // collectionId is optional for list_variables operation - if not provided, lists all variables across all collections

    if (normalizedOperation === 'bind_variable') {
      if (!variableId || !property) {
        throw new Error('variableId and property are required for bind_variable operation');
      }
      if (!id && !styleId) {
        throw new Error('Either id or styleId is required for bind_variable operation');
      }
    }

    if (normalizedOperation === 'unbind_variable') {
      if (!id && !styleId) {
        throw new Error('Either id or styleId is required for unbind_variable operation');
      }
      // property is optional - if not provided, all variable bindings will be cleared
    }


    // Collection operation validation
    if (normalizedOperation === 'create_collection' && !name) {
      throw new Error('name is required for create_collection operation');
    }

    if (['update_collection', 'delete_collection', 'duplicate_collection', 'get_collection', 'add_mode', 'remove_mode', 'rename_mode'].includes(normalizedOperation) && !collectionId) {
      throw new Error('collectionId is required for collection modify operations');
    }

    if (normalizedOperation === 'remove_mode' && !modeId) {
      throw new Error('modeId is required for remove_mode operation');
    }

    if (normalizedOperation === 'rename_mode' && (!modeId || !newModeName)) {
      throw new Error('modeId and newModeName are required for rename_mode operation');
    }

    if (normalizedOperation === 'add_mode' && !modeName) {
      throw new Error('modeName is required for add_mode operation');
    }

    // Handle modes parameter for single operations: convert single-element arrays to single values
    let processedModes = modes;
    if (Array.isArray(modes) && modes.length === 1 && typeof modes[0] === 'string') {
      processedModes = modes[0];
    }

    return {
      operation: normalizedOperation,
      variableId,
      collectionId,
      variableName,
      variableType: normalizedVariableType,
      modeValues,
      id,
      styleId,
      property,
      description,
      scopes,
      codeSyntax,
      hiddenFromPublishing,
      // Collection parameters
      name,
      modes: processedModes,
      modeId,
      modeName,
      newModeName
    };
  }

}