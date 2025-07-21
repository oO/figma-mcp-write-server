import { ManageVectorOperationsSchema } from '../types/vector-operations.js';
import { ToolHandler, ToolResult, Tool } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';

export class VectorOperationsHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_vector_operations',
        description: 'Perform vector path operations like flattening, outlining strokes, and creating vectors',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['create_vector', 'flatten', 'outline_stroke', 'get_vector_paths'],
              description: 'Vector operation to perform'
            },
            nodeId: {
              type: 'string',
              description: 'Target node ID for vector operation'
            },
            vectorPaths: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  windingRule: {
                    type: 'string',
                    enum: ['EVENODD', 'NONZERO'],
                    description: 'Winding rule for the path'
                  },
                  data: {
                    type: 'string',
                    description: 'SVG path data'
                  }
                },
                required: ['data']
              },
              description: 'Array of vector path objects for create_vector operation'
            },
            name: {
              type: 'string',
              description: 'Name for the resulting vector node'
            },
            strokeWidth: {
              type: 'number',
              description: 'Stroke width for outline operations (default: current stroke width)'
            },
            x: {
              type: 'number',
              description: 'X position for created vector'
            },
            y: {
              type: 'number',
              description: 'Y position for created vector'
            },
            preserveOriginal: {
              type: 'boolean',
              default: false,
              description: 'Whether to preserve the original node (default: false)'
            }
          },
          required: ['operation']
        },
        examples: [
          '{"operation": "flatten", "nodeId": "123:456", "name": "Flattened Vector"}',
          '{"operation": "outline_stroke", "nodeId": "123:789", "strokeWidth": 2, "name": "Outlined Shape"}',
          '{"operation": "create_vector", "vectorPaths": [{"windingRule": "EVENODD", "data": "M 0 0 L 100 0 L 100 100 L 0 100 Z"}], "name": "Custom Vector", "x": 100, "y": 100}',
          '{"operation": "get_vector_paths", "nodeId": "123:012"}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_vector_operations') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_vector_operations',
      operation: 'vector_operations',
      bulkParams: [], // Bulk operations not supported: vector operations require individual node processing for path manipulation
      paramConfigs: {
        ...UnifiedParamConfigs.basic(),
        nodeId: { expectedType: 'string' as const, allowSingle: true },
        vectorPaths: { expectedType: 'array' as const, arrayItemType: 'object' as const, allowSingle: false },
        name: { expectedType: 'string' as const, allowSingle: true },
        strokeWidth: { expectedType: 'number' as const, allowSingle: true },
        x: { expectedType: 'number' as const, allowSingle: true },
        y: { expectedType: 'number' as const, allowSingle: true },
        preserveOriginal: { expectedType: 'boolean' as const, allowSingle: true }
      },
      pluginMessageType: 'VECTOR_OPERATION',
      schema: ManageVectorOperationsSchema
    };

    return this.unifiedHandler.handle(args, config);
  }
}