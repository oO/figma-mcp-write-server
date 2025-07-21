import { ManageInstancesSchema, ToolHandler, ToolResult, Tool } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';

export class InstancesHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_instances',
        description: 'Create, update, duplicate, detach, swap, and manage component instances with override handling',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['create', 'update', 'duplicate', 'detach', 'swap', 'reset_overrides', 'get', 'list'],
              description: 'Instance operation to perform: create - Create instances from components, update - Update instance properties and overrides, duplicate - Duplicate existing instances, detach - Detach instances from main components, swap - Swap instance to different component, reset_overrides - Reset instance overrides to default, get - Get instance details, list - List instances in document'
            },
            componentId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Component ID(s) to instantiate - single string or array for bulk operations'
            },
            instanceId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Instance ID(s) for target operations - single string or array for bulk operations'
            },
            mainComponentId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'New main component ID(s) for swap operations - single string or array for bulk operations'
            },
            x: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'X position(s) for instance placement - single number or array for bulk operations'
            },
            y: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Y position(s) for instance placement - single number or array for bulk operations'
            },
            name: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Instance name(s) - single string or array for bulk operations'
            },
            overrides: {
              type: 'object',
              description: 'Property overrides for the instance',
              additionalProperties: true
            },
            failFast: { type: 'boolean', description: 'Stop on first error in bulk operations (default: false)' }
          },
          required: ['operation']
        },
        examples: [
          '{"operation": "create", "componentId": "789:123", "x": 100, "y": 200}',
          '{"operation": "create", "componentId": ["789:123", "789:456"], "x": [100, 200], "y": [200, 250]}',
          '{"operation": "swap", "instanceId": "456:789", "mainComponentId": "789:999"}',
          '{"operation": "update", "instanceId": ["456:789", "456:012"], "name": ["Button Instance 1", "Button Instance 2"]}',
          '{"operation": "detach", "instanceId": "456:789"}',
          '{"operation": "get", "instanceId": "456:789"}',
          '{"operation": "reset_overrides", "instanceId": "456:789"}',
          '{"operation": "duplicate", "instanceId": "456:789", "name": "Copy of Instance"}',
          '{"operation": "list"}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_instances') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_instances',
      operation: 'instances',
      bulkParams: ['componentId', 'instanceId', 'mainComponentId', 'x', 'y', 'name'],
      paramConfigs: {
        ...UnifiedParamConfigs.withPositioning(),
        componentId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        instanceId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        mainComponentId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        name: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        overrides: { expectedType: 'object' as const },
        failFast: { expectedType: 'boolean' as const }
      },
      pluginMessageType: 'MANAGE_INSTANCES',
      schema: ManageInstancesSchema,
      operationParameters: {
        create: ['componentId', 'name', 'x', 'y', 'overrides'],
        update: ['instanceId', 'name', 'x', 'y', 'overrides'],
        duplicate: ['instanceId', 'name', 'x', 'y'],
        detach: ['instanceId'],
        swap: ['instanceId', 'mainComponentId'],
        reset_overrides: ['instanceId'],
        get: ['instanceId'],
        list: []
      }
    };

    return this.unifiedHandler.handle(args, config);
  }
}