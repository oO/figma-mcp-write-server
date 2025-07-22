import { ManageBooleanOperationsSchema } from '../types/boolean-operation.js';
import { ToolHandler, ToolResult, Tool } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';

export class BooleanOperationsHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_boolean_operations',
        description: 'Perform boolean operations (union, subtract, intersect, exclude) on vector nodes',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['union', 'subtract', 'intersect', 'exclude'],
              description: 'Boolean operation to perform (case-insensitive)',
            },
            nodeIds: {
              type: 'array',
              items: { type: 'string' },
              minItems: 2,
              description: 'Array of node IDs to combine (minimum 2 required)'
            },
            name: {
              type: 'string',
              description: 'Name for the resulting boolean operation node'
            },
            preserveOriginal: {
              type: 'boolean',
              default: false,
              description: 'Whether to preserve the original nodes (default: false)'
            }
          },
          required: ['operation', 'nodeIds']
        },
        examples: [
          '{"operation": "union", "nodeIds": ["123:456", "123:789"], "name": "Combined Shape"}',
          '{"operation": "subtract", "nodeIds": ["123:456", "123:789"], "name": "Cutout Shape", "preserveOriginal": true}',
          '{"operation": "intersect", "nodeIds": ["123:456", "123:789", "123:012"], "name": "Intersection"}',
          '{"operation": "exclude", "nodeIds": ["123:456", "123:789"], "name": "Excluded Shape"}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_boolean_operations') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_boolean_operations',
      operation: 'boolean_operations',
      bulkParams: [], // Bulk operations not needed: boolean operations require multi-node input by design (nodeIds array)
      paramConfigs: {
        ...UnifiedParamConfigs.basic(),
        nodeIds: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: false },
        name: { expectedType: 'string' as const, allowSingle: true },
        preserveOriginal: { expectedType: 'boolean' as const, allowSingle: true }
      },
      pluginMessageType: 'BOOLEAN_OPERATION',
      schema: ManageBooleanOperationsSchema
    };

    return this.unifiedHandler.handle(args, config);
  }
}