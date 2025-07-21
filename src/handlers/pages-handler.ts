import { ToolHandler, ToolResult, Tool, ManagePagesSchema } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';

export class PagesHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_pages',
        description: 'Manage document pages with CRUD operations and advanced page properties',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { 
              type: 'string', 
              enum: ['list', 'get', 'create', 'update', 'delete', 'duplicate', 'switch', 'reorder', 'create_divider', 'get_current'], 
              description: 'Page operation to perform (case-insensitive: list, get, create, update, delete, duplicate, switch, reorder, create_divider, get_current)' 
            },
            pageId: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Page ID(s) for get/update/delete/duplicate/switch/reorder operations - single string or array for bulk operations' 
            },
            name: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Page name(s) - single string or array for bulk operations' 
            },
            detail: { 
              type: 'string', 
              enum: ['minimal', 'standard', 'full'], 
              description: 'Level of detail for list operation (case-insensitive: minimal, standard, full). Default: minimal' 
            },
            insertIndex: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Insert position(s) for create/create_divider operations - single number or array for bulk operations' 
            },
            backgroundColor: { 
              oneOf: [
                { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                { type: 'array', items: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' } }
              ],
              description: 'Page background color(s) in hex format - single string or array for bulk operations' 
            },
            backgroundOpacity: { 
              oneOf: [
                { type: 'number', minimum: 0, maximum: 1 },
                { type: 'array', items: { type: 'number', minimum: 0, maximum: 1 } }
              ],
              description: 'Page background opacity setting(s) from 0 to 1 - single number or array for bulk operations' 
            },
            prototypeBackgroundColor: { 
              oneOf: [
                { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                { type: 'array', items: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' } }
              ],
              description: 'Prototype background color(s) in hex format - single string or array for bulk operations' 
            },
            prototypeBackgroundOpacity: { 
              oneOf: [
                { type: 'number', minimum: 0, maximum: 1 },
                { type: 'array', items: { type: 'number', minimum: 0, maximum: 1 } }
              ],
              description: 'Prototype background opacity setting(s) from 0 to 1 - single number or array for bulk operations' 
            },
            guideAxis: { 
              oneOf: [
                { type: 'string', enum: ['x', 'y'] },
                { type: 'array', items: { type: 'string', enum: ['x', 'y'] } }
              ],
              description: 'Guide axis/axes (case-insensitive: x, y) - single value or array for bulk operations' 
            },
            guideOffset: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Guide offset position(s) - single number or array for bulk operations' 
            },
            switchToPageId: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Page ID(s) to switch to before deletion - required for delete operation' 
            },
            newIndex: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'New index position(s) for reorder operation - single number or array for bulk operations' 
            },
            backgrounds: { 
              type: 'array', 
              description: 'Advanced: Full background paint array (for complex backgrounds)' 
            },
            prototypeBackgrounds: { 
              type: 'array', 
              description: 'Advanced: Full prototype background paint array (for complex backgrounds)' 
            },
            guides: { 
              type: 'array', 
              description: 'Advanced: Full guides array (for complex guide setups)' 
            },
            flowStartingPoints: { 
              type: 'array', 
              description: 'Advanced: Flow starting points array for prototyping' 
            },
            failFast: { 
              type: 'boolean', 
              description: 'Stop on first error in bulk operations (default: false)' 
            }
          },
          required: ['operation']
        },
        examples: [
          '{"operation": "list"}',
          '{"operation": "list", "detail": "full"}',
          '{"operation": "get", "pageId": "page-123"}',
          '{"operation": "get_current"}',
          '{"operation": "create", "name": "New Page", "backgroundColor": "#F5F5F5"}',
          '{"operation": "create", "name": "Marketing Pages", "insertIndex": 2, "backgroundColor": "#FFFFFF", "backgroundOpacity": 0.95}',
          '{"operation": "update", "pageId": "page-123", "name": "Updated Page", "backgroundColor": "#E8F4FD"}',
          '{"operation": "update", "pageId": ["page-123", "page-456"], "backgroundColor": ["#F0F0F0", "#E0E0E0"]}',
          '{"operation": "delete", "pageId": "page-123", "switchToPageId": "page-456"}',
          '{"operation": "duplicate", "pageId": "page-123", "name": "Copy of Page"}',
          '{"operation": "switch", "pageId": "page-456"}',
          '{"operation": "reorder", "pageId": "page-123", "newIndex": 3}',
          '{"operation": "create_divider", "name": "--- Design System ---", "insertIndex": 1}',
          '{"operation": "create", "name": "Prototype Page", "prototypeBackgroundColor": "#1E1E1E", "prototypeBackgroundOpacity": 1}',
          '{"operation": "update", "pageId": "page-123", "guideAxis": ["x", "y"], "guideOffset": [100, 200]}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_pages') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_pages',
      operation: 'pages',
      bulkParams: ['pageId', 'name', 'insertIndex', 'backgroundColor', 'backgroundOpacity', 'prototypeBackgroundColor', 'prototypeBackgroundOpacity', 'guideAxis', 'guideOffset', 'switchToPageId', 'newIndex'],
      paramConfigs: {
        ...UnifiedParamConfigs.withNodeId(),
        pageId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        name: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        insertIndex: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        backgroundColor: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        backgroundOpacity: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        prototypeBackgroundColor: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        prototypeBackgroundOpacity: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        guideAxis: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        guideOffset: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        switchToPageId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        newIndex: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        detail: { expectedType: 'string' as const }
      },
      pluginMessageType: 'MANAGE_PAGES',
      schema: ManagePagesSchema,
      operationParameters: {
        list: ['detail'],
        get: ['pageId'],
        get_current: [],
        create: ['name', 'insertIndex', 'backgroundColor', 'backgroundOpacity', 'prototypeBackgroundColor', 'prototypeBackgroundOpacity', 'guideAxis', 'guideOffset', 'backgrounds', 'prototypeBackgrounds', 'guides', 'flowStartingPoints'],
        update: ['pageId', 'name', 'backgroundColor', 'backgroundOpacity', 'prototypeBackgroundColor', 'prototypeBackgroundOpacity', 'guideAxis', 'guideOffset', 'backgrounds', 'prototypeBackgrounds', 'guides', 'flowStartingPoints'],
        delete: ['pageId', 'switchToPageId'],
        duplicate: ['pageId', 'name'],
        switch: ['pageId'],
        reorder: ['pageId', 'newIndex'],
        create_divider: ['name', 'insertIndex']
      }
    };

    return this.unifiedHandler.handle(args, config);
  }
}