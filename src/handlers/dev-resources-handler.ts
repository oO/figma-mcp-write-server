import { Tool, ToolHandler, ToolResult, ManageDevResourcesSchema } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';

export class DevResourcesHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_dev_resources',
        description: 'Generate CSS code and manage development resources and status',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['generate_css', 'set_dev_status', 'add_dev_link', 'remove_dev_link', 'get_dev_resources'],
              description: 'Dev resource operation to perform (case-insensitive)'
            },
            nodeId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Node ID(s) for CSS generation and status tracking - single string or array for bulk operations'
            },
            status: {
              oneOf: [
                { type: 'string', enum: ['ready_for_dev', 'in_progress', 'dev_complete'] },
                { type: 'array', items: { type: 'string', enum: ['ready_for_dev', 'in_progress', 'dev_complete'] } }
              ],
              description: 'Development status(es) for the node(s) - single value or array for bulk operations'
            },
            linkUrl: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'URL(s) for development resource link - single string or array for bulk operations'
            },
            linkTitle: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Title(s) for development resource link - single string or array for bulk operations'
            },
            linkId: {
              type: 'string',
              description: 'Link ID for remove operations'
            },
            cssOptions: {
              type: 'object',
              properties: {
                includeChildren: {
                  type: 'boolean',
                  default: false,
                  description: 'Include CSS for child nodes'
                },
                includeComments: {
                  type: 'boolean',
                  default: true,
                  description: 'Include descriptive comments in CSS'
                },
                useFlexbox: {
                  type: 'boolean',
                  default: true,
                  description: 'Use flexbox layout in generated CSS'
                }
              },
              description: 'Options for CSS generation'
            }
          },
          required: ['operation']
        }
      }
    ];
  }

  async handle(name: string, args: any): Promise<ToolResult> {
    if (name !== 'figma_dev_resources') {
      throw new Error(`Unknown tool: ${name}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_dev_resources',
      operation: 'dev_resources',
      bulkParams: ['nodeId', 'status', 'linkUrl', 'linkTitle'],
      paramConfigs: {
        ...UnifiedParamConfigs.forDevMode(),
        status: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        linkUrl: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        linkTitle: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        linkId: { expectedType: 'string' as const, allowSingle: true },
        cssOptions: { expectedType: 'object' as const, allowSingle: true }
      },
      pluginMessageType: 'DEV_RESOURCE_OPERATION',
      schema: ManageDevResourcesSchema
    };

    return this.unifiedHandler.handle(args, config);
  }
}