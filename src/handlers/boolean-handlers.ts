import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolHandler, ToolResult } from '../types/index.js';
import * as yaml from 'js-yaml';
import { 
  ManageBooleanOperationsSchema, 
  ManageVectorOperationsSchema 
} from '../types/schemas.js';
import { validateAndParse } from '../types/validation-utils.js';

export class BooleanHandlers implements ToolHandler {
  constructor(private sendToPlugin: (request: any) => Promise<any>) {}

  getTools(): Tool[] {
    return [
      {
        name: 'manage_boolean_operations',
        description: 'Perform boolean operations (union, subtract, intersect, exclude) on shapes',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['union', 'subtract', 'intersect', 'exclude'],
              description: 'Boolean operation to perform'
            },
            nodeIds: {
              type: 'array',
              items: { type: 'string' },
              minItems: 2,
              description: 'Array of node IDs to combine (minimum 2 nodes)'
            },
            name: {
              type: 'string',
              description: 'Name for the resulting boolean operation node'
            },
            preserveOriginal: {
              type: 'boolean',
              default: false,
              description: 'Keep original nodes after operation'
            }
          },
          required: ['operation', 'nodeIds']
        }
      },
      {
        name: 'manage_vector_operations',
        description: 'Create and manipulate vector nodes and paths',
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
              description: 'Node ID for existing node operations'
            },
            vectorPaths: {
              type: 'array',
              description: 'Vector paths for vector creation'
            },
            name: {
              type: 'string',
              description: 'Name for the vector node'
            },
            strokeWidth: {
              type: 'number',
              description: 'Stroke width for outline operations'
            },
            x: {
              type: 'number',
              description: 'X position for vector node'
            },
            y: {
              type: 'number',
              description: 'Y position for vector node'
            }
          },
          required: ['operation']
        }
      }
    ];
  }

  async handle(name: string, args: any): Promise<ToolResult> {
    switch (name) {
      case 'manage_boolean_operations':
        return this.manageBooleanOperations(args);
      case 'manage_vector_operations':
        return this.manageVectorOperations(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async manageBooleanOperations(params: any): Promise<ToolResult> {
    const validation = validateAndParse(ManageBooleanOperationsSchema, params, 'manageBooleanOperations');
    
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.error}`);
    }
    
    const validated = validation.data;

    const response = await this.sendToPlugin({
      type: 'BOOLEAN_OPERATION',
      payload: validated
    });

    if (!response.success) {
      throw new Error(response.error || 'Boolean operation failed');
    }

    return {
      content: [{
        type: 'text',
        text: yaml.dump({
          operation: 'boolean_operation',
          booleanType: validated.operation,
          resultNodeId: response.data.nodeId,
          processedNodes: response.data.processedNodes,
          preservedOriginals: validated.preserveOriginal,
          message: `${validated.operation} operation completed successfully`
        }, { indent: 2, lineWidth: 100 })
      }],
      isError: false
    };
  }

  private async manageVectorOperations(params: any): Promise<ToolResult> {
    const validation = validateAndParse(ManageVectorOperationsSchema, params, 'manageVectorOperations');
    
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.error}`);
    }
    
    const validated = validation.data;

    const response = await this.sendToPlugin({
      type: 'VECTOR_OPERATION',
      payload: validated
    });

    if (!response.success) {
      throw new Error(response.error || 'Vector operation failed');
    }

    return {
      content: [{
        type: 'text',
        text: yaml.dump({
          operation: 'vector_operation',
          vectorType: validated.operation,
          result: response.data,
          message: `${validated.operation} operation completed successfully`
        }, { indent: 2, lineWidth: 100 })
      }],
      isError: false
    };
  }
}