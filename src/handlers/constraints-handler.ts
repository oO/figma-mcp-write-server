import { ManageConstraintsSchema, ToolHandler, ToolResult, Tool } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';

export class ConstraintsHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_constraints',
        description: 'Set, get, or reset layout constraints for nodes',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { type: 'string', enum: ['get', 'set', 'reset'], description: 'Constraint operation (case-insensitive)' },
            nodeId: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Node ID(s) - single string or array for bulk operations' 
            },
            horizontalConstraint: { 
              oneOf: [
                { type: 'string', enum: ['MIN', 'MAX', 'STRETCH', 'CENTER', 'SCALE'] },
                { type: 'array', items: { type: 'string', enum: ['MIN', 'MAX', 'STRETCH', 'CENTER', 'SCALE'] } }
              ],
              description: 'Horizontal constraint(s): MIN (left), MAX (right), STRETCH (left+right), CENTER, SCALE - single value or array for bulk operations' 
            },
            verticalConstraint: { 
              oneOf: [
                { type: 'string', enum: ['MIN', 'MAX', 'STRETCH', 'CENTER', 'SCALE'] },
                { type: 'array', items: { type: 'string', enum: ['MIN', 'MAX', 'STRETCH', 'CENTER', 'SCALE'] } }
              ],
              description: 'Vertical constraint(s): MIN (top), MAX (bottom), STRETCH (top+bottom), CENTER, SCALE - single value or array for bulk operations' 
            }
          },
          required: ['operation', 'nodeId']
        }
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_constraints') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_constraints',
      operation: 'constraints',
      bulkParams: ['nodeId', 'horizontalConstraint', 'verticalConstraint'],
      paramConfigs: {
        ...UnifiedParamConfigs.basic(),
        nodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        horizontalConstraint: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        verticalConstraint: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true }
      },
      pluginMessageType: 'MANAGE_CONSTRAINTS',
      schema: ManageConstraintsSchema
    };

    return this.unifiedHandler.handle(args, config);
  }
}