import { ToolHandler, ToolResult, Tool, ManageHierarchySchema } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';

export class HierarchyHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_hierarchy',
        description: 'Group, ungroup, parent, unparent, order by index/depth, or move nodes between pages',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { type: 'string', enum: ['group', 'ungroup', 'parent', 'unparent', 'order_by_index', 'order_by_depth', 'move_to_page'], description: 'Hierarchy operation to perform (case-insensitive: group, ungroup, parent, unparent, order_by_index, order_by_depth, move_to_page)' },
            nodeId: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Node ID(s) (for ungroup, parent, unparent, order_by_index, order_by_depth, move_to_page) - single string or array for bulk operations' 
            },
            nodeIds: { type: 'array', items: { type: 'string' }, description: 'Array of node IDs (for group)' },
            parentId: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Parent node ID(s) (for parent) - single string or array for bulk operations' 
            },
            index: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Index position(s) (for order_by_index, optional for move_to_page) - single number or array for bulk operations' 
            },
            name: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Group name(s) (for group operation) - single string or array for bulk operations' 
            },
            position: { 
              oneOf: [
                { type: 'string', enum: ['forward', 'backward', 'front', 'back'] },
                { type: 'array', items: { type: 'string', enum: ['forward', 'backward', 'front', 'back'] } }
              ],
              description: 'Depth position(s) (for order_by_depth: forward, backward, front, back) - single string or array for bulk operations' 
            },
            targetId: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Target page ID(s) (for move_to_page) - single string or array for bulk operations' 
            },
            failFast: { type: 'boolean', description: 'Stop on first error in bulk operations (default: false)' }
          },
          required: ['operation']
        },
        examples: [
          '{"operation": "group", "nodeIds": ["123:456", "123:789"], "name": "New Group"}',
          '{"operation": "ungroup", "nodeId": "123:456"}',
          '{"operation": "parent", "nodeId": "123:456", "parentId": "123:100"}',
          '{"operation": "unparent", "nodeId": "123:456"}',
          '{"operation": "order_by_index", "nodeId": "123:456", "index": 2}',
          '{"operation": "order_by_depth", "nodeId": "123:456", "position": "front"}',
          '{"operation": "order_by_depth", "nodeId": ["123:456", "123:789"], "position": "forward"}',
          '{"operation": "move_to_page", "nodeId": "123:456", "targetId": "page-2"}',
          '{"operation": "move_to_page", "nodeId": "123:456", "targetId": "page-2", "index": 1}',
          '{"operation": "group", "nodeIds": [["123:456", "123:789"], ["123:100", "123:200"]], "name": ["Group 1", "Group 2"]}',
          '{"operation": "parent", "nodeId": ["123:456", "123:789"], "parentId": ["123:100", "123:200"]}',
          '{"operation": "unparent", "nodeId": ["123:456", "123:789"]}',
          '{"operation": "order_by_index", "nodeId": ["123:456", "123:789"], "index": [2, 3]}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_hierarchy') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_hierarchy',
      operation: 'hierarchy',
      bulkParams: ['nodeId', 'parentId', 'index', 'name', 'position', 'targetId'],
      paramConfigs: {
        ...UnifiedParamConfigs.withNodeId(),
        nodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        nodeIds: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: false },
        parentId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        index: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        name: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        position: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        targetId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true }
      },
      pluginMessageType: 'MANAGE_HIERARCHY',
      schema: ManageHierarchySchema,
      operationParameters: {
        group: ['nodeIds', 'name'],
        ungroup: ['nodeId'],
        parent: ['nodeId', 'parentId'],
        unparent: ['nodeId'],
        order_by_index: ['nodeId', 'index'],
        order_by_depth: ['nodeId', 'position'],
        move_to_page: ['nodeId', 'targetId', 'index']
      }
    };

    return this.unifiedHandler.handle(args, config);
  }
}