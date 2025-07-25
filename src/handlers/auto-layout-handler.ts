import { ManageAutoLayoutSchema, ToolHandler, ToolResult, Tool } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';
import * as yaml from 'js-yaml';

export class AutoLayoutHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;
  private sendToPluginFn: (request: any) => Promise<any>;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.sendToPluginFn = sendToPluginFn;
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_auto_layout',
        description: 'Comprehensive auto layout management with 7 operations: get layout info, set horizontal/vertical/grid/freeform layouts, configure child properties, and reorder children',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { type: 'string', enum: ['get', 'set_horizontal', 'set_vertical', 'set_grid', 'set_freeform', 'set_child', 'reorder_children'], description: 'Auto layout operation to perform: get (retrieve layout info), set_horizontal/set_vertical/set_grid/set_freeform (container layouts), set_child (child properties), reorder_children (child reordering)' },
            nodeId: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Frame node ID(s) for container operations OR child node ID for set_child operation (alternative to childIndex) - single string or array for bulk operations' 
            },
            containerId: { 
              type: 'string',
              description: 'Container frame ID for single-container child operations. Optional for set_child when nodeId provided (enables cross-parent bulk operations)' 
            },
            horizontalSpacing: { 
              oneOf: [
                { type: 'number' },
                { type: 'string', enum: ['AUTO'] },
                { type: 'array', items: { oneOf: [{ type: 'number' }, { type: 'string', enum: ['AUTO'] }] } }
              ],
              description: 'Horizontal spacing between items or AUTO for space-between distribution - single value or array for bulk operations' 
            },
            verticalSpacing: { 
              oneOf: [
                { type: 'number' },
                { type: 'string', enum: ['AUTO'] },
                { type: 'array', items: { oneOf: [{ type: 'number' }, { type: 'string', enum: ['AUTO'] }] } }
              ],
              description: 'Vertical spacing between items or AUTO for space-between distribution - single value or array for bulk operations' 
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
            horizontalAlignment: { type: 'string', enum: ['LEFT', 'CENTER', 'RIGHT', 'AUTO'], description: 'Horizontal alignment: LEFT (packed), CENTER, RIGHT (end), AUTO (space between)' },
            verticalAlignment: { type: 'string', enum: ['TOP', 'MIDDLE', 'BOTTOM', 'BASELINE', 'LEFT', 'CENTER', 'RIGHT'], description: 'Vertical alignment: TOP/LEFT (packed), MIDDLE/CENTER, BOTTOM/RIGHT (end), BASELINE (horizontal only)' },
            fixedWidth: { type: 'boolean', description: 'Whether container has fixed width (true) or hugs contents (false)' },
            fixedHeight: { type: 'boolean', description: 'Whether container has fixed height (true) or hugs contents (false)' },
            wrapLayout: { type: 'boolean', description: 'Whether layout wraps to new rows/columns when space is insufficient' },
            rows: { type: 'number', minimum: 1, description: 'Number of rows for grid layout' },
            columns: { type: 'number', minimum: 1, description: 'Number of columns for grid layout' },
            rowSpacing: { 
              oneOf: [
                { type: 'number' },
                { type: 'string', enum: ['AUTO'] }
              ],
              description: 'Gap between grid rows or AUTO for distribution' 
            },
            columnSpacing: { 
              oneOf: [
                { type: 'number' },
                { type: 'string', enum: ['AUTO'] }
              ],
              description: 'Gap between grid columns or AUTO for distribution' 
            },
            strokesIncludedInLayout: { type: 'boolean', description: 'Whether strokes are included in layout calculations' },
            lastOnTop: { type: 'boolean', description: 'Whether last child appears on top (reverse z-index)' },
            childIndex: { 
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Child index for set_child operation (0-based) - optional if nodeId is provided, supports arrays for bulk operations' 
            },
            fromIndex: { type: 'number', minimum: 0, description: 'Source index for reorder_children operation (0-based)' },
            toIndex: { type: 'number', minimum: 0, description: 'Target index for reorder_children operation (0-based)' },
            layoutGrow: { 
              oneOf: [
                { type: 'number', enum: [0, 1] },
                { type: 'array', items: { type: 'number', enum: [0, 1] } }
              ],
              description: 'Child layout grow: 0 (fixed size) or 1 (fill available space) - supports arrays for bulk operations' 
            },
            layoutAlign: { 
              oneOf: [
                { type: 'string', enum: ['min', 'center', 'max', 'stretch', 'inherit'] },
                { type: 'array', items: { type: 'string', enum: ['min', 'center', 'max', 'stretch', 'inherit'] } }
              ],
              description: 'Child alignment within container - supports arrays for bulk operations' 
            },
            horizontalSizing: { 
              oneOf: [
                { type: 'string', enum: ['fixed', 'hug', 'fill'] },
                { type: 'array', items: { type: 'string', enum: ['fixed', 'hug', 'fill'] } }
              ],
              description: 'Child horizontal sizing behavior - supports arrays for bulk operations' 
            },
            verticalSizing: { 
              oneOf: [
                { type: 'string', enum: ['fixed', 'hug', 'fill'] },
                { type: 'array', items: { type: 'string', enum: ['fixed', 'hug', 'fill'] } }
              ],
              description: 'Child vertical sizing behavior - supports arrays for bulk operations' 
            },
            rowSpan: { type: 'number', minimum: 1, description: 'Grid child row span' },
            columnSpan: { type: 'number', minimum: 1, description: 'Grid child column span' },
            rowAnchor: { type: 'number', minimum: 0, description: 'Grid child row anchor position' },
            columnAnchor: { type: 'number', minimum: 0, description: 'Grid child column anchor position' },
            horizontalAlign: { type: 'string', enum: ['left', 'center', 'right', 'stretch'], description: 'Grid child horizontal alignment within cell' },
            verticalAlign: { type: 'string', enum: ['top', 'middle', 'bottom', 'stretch'], description: 'Grid child vertical alignment within cell' },
            failFast: { type: 'boolean', description: 'Stop on first error in bulk operations (default: false)' }
          },
          required: ['operation']
        },
        examples: [
          '{"operation": "get", "nodeId": "123:456"}',
          '{"operation": "set_horizontal", "nodeId": "123:456", "horizontalSpacing": 10, "paddingTop": 15}',
          '{"operation": "set_vertical", "nodeId": ["123:456", "123:789"], "verticalSpacing": [10, 15], "horizontalAlignment": "CENTER"}',
          '{"operation": "set_grid", "nodeId": "123:456", "rows": 3, "columns": 2, "rowSpacing": 10, "columnSpacing": 15}',
          '{"operation": "set_freeform", "nodeId": "123:456"}',
          '{"operation": "set_child", "containerId": "123:456", "childIndex": 0, "layoutGrow": 1, "horizontalSizing": "fill"}',
          '{"operation": "set_child", "containerId": "123:456", "nodeId": "123:789", "layoutGrow": 1, "horizontalSizing": "fill"}',
          '{"operation": "set_child", "nodeId": ["123:789", "456:123"], "horizontalSizing": ["fill", "hug"], "layoutGrow": [1, 0]}',
          '{"operation": "reorder_children", "containerId": "123:456", "fromIndex": 2, "toIndex": 0}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_auto_layout') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    // Handle cross-parent set_child operations directly
    if (args.operation === 'set_child' && !args.containerId && args.nodeId) {
      const result = await this.sendToPluginFn({
        type: 'MANAGE_AUTO_LAYOUT',
        payload: args
      });
      
      // Format result as YAML for consistency
      const yamlContent = yaml.dump(result);
      return {
        content: [{ type: 'text', text: yamlContent }]
      };
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_auto_layout',
      operation: 'auto_layout',
      bulkParams: ['nodeId', 'horizontalSpacing', 'verticalSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
      // Note: set_child handles its own bulk operations internally
      paramConfigs: {
        ...UnifiedParamConfigs.withNodeId(),
        nodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        horizontalSpacing: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        verticalSpacing: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        paddingTop: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        paddingRight: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        paddingBottom: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        paddingLeft: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        horizontalAlignment: { expectedType: 'string' as const },
        verticalAlignment: { expectedType: 'string' as const },
        fixedWidth: { expectedType: 'boolean' as const },
        fixedHeight: { expectedType: 'boolean' as const },
        wrapLayout: { expectedType: 'boolean' as const },
        rows: { expectedType: 'number' as const },
        columns: { expectedType: 'number' as const },
        rowSpacing: { expectedType: 'number' as const },
        columnSpacing: { expectedType: 'number' as const },
        strokesIncludedInLayout: { expectedType: 'boolean' as const },
        lastOnTop: { expectedType: 'boolean' as const },
        childIndex: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        fromIndex: { expectedType: 'number' as const },
        toIndex: { expectedType: 'number' as const },
        layoutGrow: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        layoutAlign: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        horizontalSizing: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        verticalSizing: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        rowSpan: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        columnSpan: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        rowAnchor: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        columnAnchor: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        horizontalAlign: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        verticalAlign: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        containerId: { expectedType: 'string' as const }
      },
      pluginMessageType: 'MANAGE_AUTO_LAYOUT',
      schema: ManageAutoLayoutSchema,
      operationParameters: {
        get: ['nodeId'],
        set_horizontal: ['nodeId', 'horizontalSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'horizontalAlignment', 'verticalAlignment', 'fixedWidth', 'fixedHeight', 'wrapLayout', 'verticalSpacing', 'strokesIncludedInLayout', 'lastOnTop'],
        set_vertical: ['nodeId', 'verticalSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'verticalAlignment', 'horizontalAlignment', 'fixedHeight', 'fixedWidth', 'wrapLayout', 'horizontalSpacing', 'strokesIncludedInLayout', 'lastOnTop'],
        set_grid: ['nodeId', 'rows', 'columns', 'rowSpacing', 'columnSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'fixedWidth', 'fixedHeight', 'strokesIncludedInLayout'],
        set_freeform: ['nodeId'],
        set_child: ['containerId', 'childIndex', 'nodeId', 'layoutGrow', 'layoutAlign', 'horizontalSizing', 'verticalSizing', 'rowSpan', 'columnSpan', 'rowAnchor', 'columnAnchor', 'horizontalAlign', 'verticalAlign'],
        reorder_children: ['containerId', 'fromIndex', 'toIndex']
      }
    };

    return this.unifiedHandler.handle(args, config);
  }
}