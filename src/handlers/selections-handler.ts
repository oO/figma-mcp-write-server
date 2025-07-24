import { ToolHandler, ToolResult, Tool } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';
import { ManageSelectionSchema } from '../types/selection-operations.js';

export class SelectionHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_selection',
        description: 'Advanced selection management with filtering, search, and hierarchy navigation',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['get_selection', 'set_selection', 'list_nodes'],
              description: 'Selection operation to perform'
            },
            pageId: {
              type: 'string',
              description: 'Specific page ID to search within (default: current page)'
            },
            nodeId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Starting point node ID(s) - single string or array for bulk operations'
            },
            traversal: {
              type: 'string',
              enum: ['children', 'ancestors', 'siblings', 'descendants'],
              description: 'Traversal type from starting point(s)'
            },
            detail: {
              type: 'string',
              enum: ['minimal', 'standard', 'full'],
              description: 'Level of detail for node information (default: standard)'
            },
            includeAllPages: {
              type: 'boolean',
              description: 'Search across all pages in the document - requires loading all pages (default: false)'
            },
            filterByType: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Filter by specific node types - single string or array'
            },
            filterByName: {
              type: 'string',
              description: 'Filter by node name pattern (supports regex)'
            },
            filterByVisibility: {
              type: 'string',
              enum: ['visible', 'hidden', 'all'],
              description: 'Filter by visibility state (default: visible)'
            },
            filterByLockedState: {
              type: 'boolean',
              description: 'Filter by locked state (true=locked, false=unlocked)'
            },
            maxDepth: {
              type: 'number',
              minimum: 1,
              description: 'Maximum depth for node traversal'
            },
            maxResults: {
              type: 'number',
              minimum: 1,
              maximum: 1000,
              description: 'Maximum number of results to return (default: 100)'
            },
            focus: {
              type: 'boolean',
              description: 'Whether to focus on selected nodes (default: true)'
            },
            failFast: {
              type: 'boolean',
              description: 'Stop on first error in bulk operations (default: false)'
            }
          },
          required: ['operation']
        },
        examples: [
          '{"operation": "get_selection"}',
          '{"operation": "get_selection", "detail": "minimal"}',
          '{"operation": "get_selection", "detail": "full"}',
          '{"operation": "set_selection", "filterByType": "TEXT"}',
          '{"operation": "set_selection", "filterByName": "Button.*"}',
          '{"operation": "set_selection", "filterByVisibility": "visible"}',
          '{"operation": "set_selection", "filterByType": ["FRAME", "TEXT"], "filterByVisibility": "visible"}',
          '{"operation": "set_selection", "nodeId": "123:456", "traversal": "children"}',
          '{"operation": "set_selection", "nodeId": "123:456", "traversal": "siblings"}',
          '{"operation": "set_selection", "nodeId": ["123:456", "123:789"], "traversal": "descendants"}',
          '{"operation": "set_selection", "filterByLockedState": false, "maxResults": 50}',
          '{"operation": "list_nodes", "detail": "minimal"}',
          '{"operation": "list_nodes", "detail": "full", "filterByType": ["FRAME", "TEXT"]}',
          '{"operation": "list_nodes", "nodeId": "123:456", "traversal": "ancestors"}',
          '{"operation": "list_nodes", "filterByName": ".*Header.*", "maxDepth": 3}',
          '{"operation": "list_nodes", "filterByVisibility": "hidden", "includeAllPages": true}',
          '{"operation": "list_nodes", "pageId": "123:0", "filterByType": "TEXT"}',
          '{"operation": "list_nodes", "pageId": "123:0", "nodeId": "123:456", "traversal": "children"}',
          '{"operation": "set_selection", "pageId": "123:0", "filterByName": "Button.*"}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_selection') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_selection',
      operation: 'selection',
      bulkParams: [], // Bulk operations not needed: selection management operates on nodeIds array inherently (multi-node by design)
      paramConfigs: {
        ...UnifiedParamConfigs.basic(),
        pageId: { expectedType: 'string' as const },
        nodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        traversal: { expectedType: 'string' as const },
        filterByType: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        filterByName: { expectedType: 'string' as const },
        filterByVisibility: { expectedType: 'string' as const },
        filterByLockedState: { expectedType: 'boolean' as const },
        detail: { expectedType: 'string' as const },
        includeAllPages: { expectedType: 'boolean' as const },
        maxDepth: { expectedType: 'number' as const },
        maxResults: { expectedType: 'number' as const },
        focus: { expectedType: 'boolean' as const }
      },
      pluginMessageType: 'MANAGE_SELECTION',
      schema: ManageSelectionSchema,
      operationParameters: {
        get_selection: ['detail', 'focus'],
        set_selection: ['pageId', 'nodeId', 'traversal', 'filterByType', 'filterByName', 'filterByVisibility', 'filterByLockedState', 'maxDepth', 'maxResults', 'includeAllPages', 'focus', 'failFast'],
        list_nodes: ['pageId', 'nodeId', 'traversal', 'filterByType', 'filterByName', 'filterByVisibility', 'filterByLockedState', 'maxDepth', 'maxResults', 'includeAllPages', 'detail', 'failFast']
      }
    };

    return this.unifiedHandler.handle(args, config);
  }
}