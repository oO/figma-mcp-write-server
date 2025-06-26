import { 
  ManageComponentsSchema, 
  ManageInstancesSchema,
  ToolHandler, 
  ToolResult, 
  Tool,
  ManageComponentsParams,
  ManageInstancesParams
} from '../types/index.js';
import * as yaml from 'js-yaml';

export class ComponentHandlers implements ToolHandler {
  private sendToPlugin: (request: any) => Promise<any>;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.sendToPlugin = sendToPluginFn;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_components',
        description: 'Create and manage components and component sets',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['create', 'create_set', 'add_variant', 'remove_variant', 'update', 'delete', 'get'],
              description: 'Operation to perform'
            },
            nodeId: { 
              type: 'string', 
              description: 'Source node to convert (for create operation)' 
            },
            componentIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Components to combine (for create_set operation)'
            },
            componentId: {
              type: 'string',
              description: 'Target component (for modify operations)'
            },
            name: { 
              type: 'string', 
              description: 'Component/set name' 
            },
            description: { 
              type: 'string', 
              description: 'Component description' 
            },
            variantProperties: {
              type: 'object',
              description: 'Variant properties as key-value pairs',
              additionalProperties: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          },
          required: ['operation']
        },
        examples: [
          '{"operation": "create", "nodeId": "123:456", "name": "Button Component", "description": "Primary button for UI"}',
          '{"operation": "create_set", "componentIds": ["123:456", "123:457"], "variantProperties": {"Size": ["Small", "Medium", "Large"]}}',
          '{"operation": "add_variant", "componentId": "123:458", "variantProperties": {"State": ["Disabled"]}}'
        ]
      },
      {
        name: 'figma_instances',
        description: 'Create and manage component instances',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['create', 'swap', 'detach', 'reset_overrides', 'set_override', 'get'],
              description: 'Operation to perform on instance'
            },
            componentId: {
              type: 'string',
              description: 'Source component (for create operation)'
            },
            instanceId: {
              type: 'string',
              description: 'Target instance (for modify operations)'
            },
            overrides: {
              type: 'object',
              description: 'Property overrides',
              additionalProperties: true
            },
            swapTarget: {
              type: 'string',
              description: 'New component (for swap operation)'
            },
            x: {
              type: 'number',
              description: 'Position (for create operation)'
            },
            y: {
              type: 'number',
              description: 'Position (for create operation)'
            }
          },
          required: ['operation']
        },
        examples: [
          '{"operation": "create", "componentId": "123:456", "x": 100, "y": 200}',
          '{"operation": "swap", "instanceId": "123:459", "swapTarget": "123:460"}',
          '{"operation": "set_override", "instanceId": "123:459", "overrides": {"text": "New Label"}}',
          '{"operation": "reset_overrides", "instanceId": "123:459"}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'figma_components':
        return this.manageComponents(args);
      case 'figma_instances':
        return this.manageInstances(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  async manageComponents(args: any): Promise<any> {
    const validatedArgs = ManageComponentsSchema.parse(args);
    const { operation, nodeId, componentIds, componentId, name, description, variantProperties } = validatedArgs;

    // Validate operation-specific requirements
    if (operation === 'create' && !nodeId) {
      throw new Error('nodeId is required for create operation');
    }
    if (operation === 'create_set' && !componentIds) {
      throw new Error('componentIds is required for create_set operation');
    }
    if (['add_variant', 'remove_variant', 'update', 'delete', 'get'].includes(operation) && !componentId) {
      throw new Error('componentId is required for modify operations');
    }

    const response = await this.sendToPlugin({
      type: 'MANAGE_COMPONENTS',
      payload: {
        operation,
        nodeId,
        componentIds,
        componentId,
        name,
        description,
        variantProperties
      }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to manage components');
    }

    // Ensure response.data exists and is a valid object for YAML dumping
    const dataToReturn = response.data || { message: 'Operation completed successfully' };

    return {
      content: [{
        type: 'text',
        text: yaml.dump(dataToReturn, { indent: 2, lineWidth: 100 })
      }],
      isError: false
    };
  }

  async manageInstances(args: any): Promise<any> {
    const validatedArgs = ManageInstancesSchema.parse(args);
    const { operation, componentId, instanceId, overrides, swapTarget, x, y } = validatedArgs;

    // Validate operation-specific requirements
    if (operation === 'create' && !componentId) {
      throw new Error('componentId is required for create operation');
    }
    if (['swap', 'detach', 'reset_overrides', 'set_override', 'get'].includes(operation) && !instanceId) {
      throw new Error('instanceId is required for modify operations');
    }
    if (operation === 'swap' && !swapTarget) {
      throw new Error('swapTarget is required for swap operation');
    }
    if (operation === 'set_override' && !overrides) {
      throw new Error('overrides is required for set_override operation');
    }

    const response = await this.sendToPlugin({
      type: 'MANAGE_INSTANCES',
      payload: {
        operation,
        componentId,
        instanceId,
        overrides,
        swapTarget,
        x,
        y
      }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to manage instances');
    }

    // Ensure response.data exists and is a valid object for YAML dumping
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