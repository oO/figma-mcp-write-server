import { 
  ToolHandler, 
  ToolResult, 
  Tool,
  ManageCollectionsParams,
  ManageVariablesParams,
  ManageCollectionsSchema,
  ManageVariablesSchema
} from '../types/index.js';
import * as yaml from 'js-yaml';

export class VariableHandlers implements ToolHandler {
  private sendToPlugin: (request: any) => Promise<any>;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.sendToPlugin = sendToPluginFn;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'manage_collections',
        description: 'Create and manage variable collections and modes',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['create', 'update', 'delete', 'get', 'list', 'add_mode', 'remove_mode', 'rename_mode'],
              description: 'Operation to perform on collection'
            },
            collectionId: {
              type: 'string',
              description: 'Collection ID for modify operations'
            },
            collectionName: {
              type: 'string',
              description: 'Collection name'
            },
            modes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Mode names for creation'
            },
            modeId: {
              type: 'string',
              description: 'Specific mode ID for operations'
            },
            newModeName: {
              type: 'string',
              description: 'New mode name for rename operations'
            },
            description: {
              type: 'string',
              description: 'Collection description'
            },
            hiddenFromPublishing: {
              type: 'boolean',
              description: 'Whether collection is hidden from publishing'
            }
          },
          required: ['operation']
        },
        examples: [
          '{"operation": "create", "collectionName": "Colors", "modes": ["Light", "Dark"], "description": "Color tokens for theming"}',
          '{"operation": "add_mode", "collectionId": "123:456", "newModeName": "High Contrast"}',
          '{"operation": "list"}',
          '{"operation": "get", "collectionId": "123:456"}'
        ]
      },
      {
        name: 'manage_variables',
        description: 'Create variables and bind them to properties',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['create', 'update', 'delete', 'get', 'list', 'bind', 'unbind', 'get_bindings'],
              description: 'Operation to perform on variable'
            },
            variableId: {
              type: 'string',
              description: 'Variable ID for variable-specific operations'
            },
            collectionId: {
              type: 'string',
              description: 'Collection context for creation'
            },
            variableName: {
              type: 'string',
              description: 'Variable name'
            },
            variableType: {
              type: 'string',
              enum: ['COLOR', 'FLOAT', 'STRING', 'BOOLEAN'],
              description: 'Variable type'
            },
            modeValues: {
              type: 'object',
              description: 'Values per mode (modeId: value pairs)',
              additionalProperties: true
            },
            nodeId: {
              type: 'string',
              description: 'Target node for binding'
            },
            styleId: {
              type: 'string',
              description: 'Target style for binding'
            },
            property: {
              type: 'string',
              description: 'Property to bind (e.g., "fills", "width", "cornerRadius")'
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
            }
          },
          required: ['operation']
        },
        examples: [
          '{"operation": "create", "collectionId": "123:456", "variableName": "Primary Blue", "variableType": "COLOR", "modeValues": {"light": "#0066CC", "dark": "#4A9EFF"}}',
          '{"operation": "bind", "variableId": "123:789", "nodeId": "456:123", "property": "fills"}',
          '{"operation": "list", "collectionId": "123:456"}',
          '{"operation": "get_bindings", "nodeId": "456:123"}',
          '{"operation": "get_bindings", "variableId": "123:789"}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'manage_collections':
        return this.manageCollections(args);
      case 'manage_variables':
        return this.manageVariables(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  async manageCollections(args: any): Promise<any> {
    const validatedArgs = ManageCollectionsSchema.parse(args);
    const { operation, collectionId, collectionName, modes, modeId, newModeName, description, hiddenFromPublishing } = validatedArgs;

    if (!operation) {
      throw new Error('operation is required');
    }

    if (operation === 'create' && !collectionName) {
      throw new Error('collectionName is required for create operation');
    }

    if (['update', 'delete', 'get', 'add_mode', 'remove_mode', 'rename_mode'].includes(operation) && !collectionId) {
      throw new Error('collectionId is required for modify operations');
    }

    if (operation === 'remove_mode' && !modeId) {
      throw new Error('modeId is required for remove_mode operation');
    }

    if (operation === 'rename_mode' && (!modeId || !newModeName)) {
      throw new Error('modeId and newModeName are required for rename_mode operation');
    }

    if (operation === 'add_mode' && !newModeName) {
      throw new Error('newModeName is required for add_mode operation');
    }

    const response = await this.sendToPlugin({
      type: 'MANAGE_COLLECTIONS',
      payload: {
        operation,
        collectionId,
        collectionName,
        modes,
        modeId,
        newModeName,
        description,
        hiddenFromPublishing
      }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to manage collections');
    }

    const dataToReturn = response.data || { message: 'Operation completed successfully' };

    return {
      content: [{
        type: 'text',
        text: yaml.dump(dataToReturn, { indent: 2, lineWidth: 100 })
      }],
      isError: false
    };
  }

  async manageVariables(args: any): Promise<any> {
    const validatedArgs = ManageVariablesSchema.parse(args);
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
    } = validatedArgs;

    if (!operation) {
      throw new Error('operation is required');
    }

    if (operation === 'create' && (!collectionId || !variableName || !variableType)) {
      throw new Error('collectionId, variableName, and variableType are required for create operation');
    }

    if (['update', 'delete', 'get'].includes(operation) && !variableId) {
      throw new Error('variableId is required for variable-specific operations');
    }

    if (operation === 'list' && !collectionId) {
      throw new Error('collectionId is required for list operation');
    }

    if (operation === 'bind') {
      if (!variableId || !property) {
        throw new Error('variableId and property are required for bind operation');
      }
      if (!nodeId && !styleId) {
        throw new Error('Either nodeId or styleId is required for bind operation');
      }
    }

    if (operation === 'unbind') {
      if (!property) {
        throw new Error('property is required for unbind operation');
      }
      if (!nodeId && !styleId) {
        throw new Error('Either nodeId or styleId is required for unbind operation');
      }
    }

    if (operation === 'get_bindings') {
      if (!nodeId && !variableId) {
        throw new Error('Either nodeId or variableId is required for get_bindings operation');
      }
    }

    const response = await this.sendToPlugin({
      type: 'MANAGE_VARIABLES',
      payload: {
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
      }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to manage variables');
    }

    const dataToReturn = response.data || { message: 'Operation completed successfully' };

    return {
      content: [{
        type: 'text',
        text: yaml.dump(dataToReturn, { indent: 2, lineWidth: 100 })
      }],
      isError: false
    };
  }
}