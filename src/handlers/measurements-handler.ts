import { ManageMeasurementsSchema } from '../types/measurement-operations.js';
import { Tool, ToolHandler, ToolResult } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';

export class MeasurementsHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_measurements',
        description: 'Add and manage spacing/sizing measurements for design specs',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['add_measurement', 'edit_measurement', 'remove_measurement', 'list_measurements'],
              description: 'Measurement operation to perform'
            },
            measurementId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Measurement ID(s) for edit/remove operations - single string or array for bulk operations'
            },
            fromNodeId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Source node(s) for measurement - single string or array for bulk operations'
            },
            toNodeId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Target node(s) for measurement - single string or array for bulk operations'
            },
            direction: {
              oneOf: [
                { type: 'string', enum: ['horizontal', 'vertical', 'distance'] },
                { type: 'array', items: { type: 'string', enum: ['horizontal', 'vertical', 'distance'] } }
              ],
              description: 'Measurement direction(s) - single value or array for bulk operations'
            },
            label: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Custom label(s) for the measurement - single string or array for bulk operations'
            },
            customValue: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Custom value(s) to display instead of calculated value - single string or array for bulk operations'
            },
            pageId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Page ID(s) for listing measurements - single string or array for bulk operations'
            }
          },
          required: ['operation']
        }
      }
    ];
  }

  async handle(name: string, args: any): Promise<ToolResult> {
    if (name !== 'figma_measurements') {
      throw new Error(`Unknown tool: ${name}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_measurements',
      operation: 'measurements',
      bulkParams: ['measurementId', 'fromNodeId', 'toNodeId', 'direction', 'label', 'customValue', 'pageId'],
      paramConfigs: {
        ...UnifiedParamConfigs.forDevMode(),
        measurementId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        fromNodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        toNodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        customValue: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        pageId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true }
      },
      pluginMessageType: 'MEASUREMENT_OPERATION',
      schema: ManageMeasurementsSchema
    };

    return this.unifiedHandler.handle(args, config);
  }
}