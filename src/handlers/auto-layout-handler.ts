import { ManageAutoLayoutSchema, ToolHandler, ToolResult, Tool } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';

export class AutoLayoutHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_auto_layout',
        description: 'Enable, disable, update, or get auto layout properties for frames',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { type: 'string', enum: ['enable', 'disable', 'update', 'get_properties'], description: 'Auto layout operation to perform (case-insensitive: enable, disable, update, get_properties)' },
            nodeId: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Frame node ID(s) - single string or array for bulk operations' 
            },
            direction: { 
              oneOf: [
                { type: 'string', enum: ['horizontal', 'vertical'] },
                { type: 'array', items: { type: 'string', enum: ['horizontal', 'vertical'] } }
              ],
              description: 'Layout direction(s) (case-insensitive: horizontal, vertical) - single value or array for bulk operations' 
            },
            spacing: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Spacing between children - single value or array for bulk operations' 
            },
            paddingTop: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Top padding - single value or array for bulk operations' 
            },
            paddingRight: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Right padding - single value or array for bulk operations' 
            },
            paddingBottom: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Bottom padding - single value or array for bulk operations' 
            },
            paddingLeft: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Left padding - single value or array for bulk operations' 
            },
            primaryAlignment: { type: 'string', enum: ['min', 'center', 'max', 'space_between'], description: 'Primary axis alignment (case-insensitive: min, center, max, space_between)' },
            counterAlignment: { type: 'string', enum: ['min', 'center', 'max'], description: 'Counter axis alignment (case-insensitive: min, center, max)' },
            resizingWidth: { type: 'string', enum: ['hug', 'fill', 'fixed'], description: 'Width resizing behavior (case-insensitive: hug, fill, fixed)' },
            resizingHeight: { type: 'string', enum: ['hug', 'fill', 'fixed'], description: 'Height resizing behavior (case-insensitive: hug, fill, fixed)' },
            strokesIncludedInLayout: { type: 'boolean', description: 'Whether strokes are included in layout calculations' },
            layoutWrap: { type: 'string', enum: ['no_wrap', 'wrap'], description: 'Layout wrap behavior (case-insensitive: no_wrap, wrap)' },
            failFast: { type: 'boolean', description: 'Stop on first error in bulk operations (default: false)' }
          },
          required: ['operation', 'nodeId']
        },
        examples: [
          '{"operation": "enable", "nodeId": "123:456", "direction": "horizontal", "spacing": 10}',
          '{"operation": "update", "nodeId": "123:456", "spacing": 20, "paddingTop": 15, "paddingLeft": 15}',
          '{"operation": "enable", "nodeId": ["123:456", "123:789"], "direction": ["horizontal", "vertical"], "spacing": [10, 15]}',
          '{"operation": "disable", "nodeId": "123:456"}',
          '{"operation": "get_properties", "nodeId": "123:456"}',
          '{"operation": "enable", "nodeId": "123:456", "direction": "vertical", "primaryAlignment": "center", "counterAlignment": "min"}',
          '{"operation": "update", "nodeId": ["123:456", "123:789"], "resizingWidth": "hug", "resizingHeight": "fixed"}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_auto_layout') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_auto_layout',
      operation: 'auto_layout',
      bulkParams: ['nodeId', 'direction', 'spacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
      paramConfigs: {
        ...UnifiedParamConfigs.withNodeId(),
        nodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        direction: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        spacing: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        paddingTop: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        paddingRight: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        paddingBottom: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        paddingLeft: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        primaryAlignment: { expectedType: 'string' as const },
        counterAlignment: { expectedType: 'string' as const },
        resizingWidth: { expectedType: 'string' as const },
        resizingHeight: { expectedType: 'string' as const },
        strokesIncludedInLayout: { expectedType: 'boolean' as const },
        layoutWrap: { expectedType: 'string' as const }
      },
      pluginMessageType: 'MANAGE_AUTO_LAYOUT',
      schema: ManageAutoLayoutSchema,
      operationParameters: {
        enable: ['nodeId', 'direction', 'spacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'primaryAlignment', 'counterAlignment', 'resizingWidth', 'resizingHeight', 'strokesIncludedInLayout', 'layoutWrap'],
        disable: ['nodeId'],
        update: ['nodeId', 'direction', 'spacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'primaryAlignment', 'counterAlignment', 'resizingWidth', 'resizingHeight', 'strokesIncludedInLayout', 'layoutWrap'],
        get_properties: ['nodeId']
      }
    };

    return this.unifiedHandler.handle(args, config);
  }
}