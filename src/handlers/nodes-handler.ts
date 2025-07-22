import { UnifiedNodeOperationsSchema, ToolHandler, Tool } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';
import { CommonParamConfigs } from '../utils/bulk-operations.js';

export class NodeHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_nodes',
        description: 'Create, get, update, delete, and duplicate nodes',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['create', 'get', 'update', 'delete', 'duplicate'],
              description: 'Node operation to perform (case-insensitive: create, get, update, delete, duplicate)'
            },
            nodeId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Node ID(s) for update/delete/duplicate/export operations - single string or array for bulk operations'
            },
            nodeType: {
              oneOf: [
                { type: 'string', enum: ['rectangle', 'ellipse', 'frame', 'star', 'polygon', 'line'] },
                { type: 'array', items: { type: 'string', enum: ['rectangle', 'ellipse', 'frame', 'star', 'polygon', 'line'] } }
              ],
              description: 'Node type(s) for creation (case-insensitive: rectangle, ellipse, frame, star, polygon, line) - single value or array for bulk operations. Note: Use figma_text tool for text node creation.'
            },
            name: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Node name(s) - single string or array for bulk operations'
            },
            x: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'X position(s) - single number or array for bulk operations'
            },
            y: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Y position(s) - single number or array for bulk operations'
            },
            width: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Width(s) - single number or array for bulk operations'
            },
            height: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Height(s) - single number or array for bulk operations'
            },
            fillColor: {
              oneOf: [
                { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                { type: 'array', items: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' } }
              ],
              description: 'Fill color(s) in hex format - single string or array for bulk operations'
            },
            strokeColor: {
              oneOf: [
                { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                { type: 'array', items: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' } }
              ],
              description: 'Stroke color(s) in hex format - single string or array for bulk operations'
            },
            fillOpacity: {
              oneOf: [
                { type: 'number', minimum: 0, maximum: 1 },
                { type: 'array', items: { type: 'number', minimum: 0, maximum: 1 } }
              ],
              description: 'Fill opacity setting(s) from 0 (transparent) to 1 (opaque) - single number or array for bulk operations'
            },
            strokeOpacity: {
              oneOf: [
                { type: 'number', minimum: 0, maximum: 1 },
                { type: 'array', items: { type: 'number', minimum: 0, maximum: 1 } }
              ],
              description: 'Stroke opacity setting(s) from 0 (transparent) to 1 (opaque) - single number or array for bulk operations'
            },
            strokeWeight: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Stroke weight setting(s) in pixels - single number or array for bulk operations'
            },
            strokeAlign: {
              oneOf: [
                { type: 'string', enum: ['CENTER', 'INSIDE', 'OUTSIDE'] },
                { type: 'array', items: { type: 'string', enum: ['CENTER', 'INSIDE', 'OUTSIDE'] } }
              ],
              description: 'Stroke alignment setting(s) - single value or array for bulk operations'
            },
            visible: {
              oneOf: [
                { type: 'boolean' },
                { type: 'array', items: { type: 'boolean' } }
              ],
              description: 'Visibility setting(s) - single boolean or array for bulk operations'
            },
            locked: {
              oneOf: [
                { type: 'boolean' },
                { type: 'array', items: { type: 'boolean' } }
              ],
              description: 'Lock setting(s) - single boolean or array for bulk operations'
            },
            opacity: {
              oneOf: [
                { type: 'number', minimum: 0, maximum: 1 },
                { type: 'array', items: { type: 'number', minimum: 0, maximum: 1 } }
              ],
              description: 'Opacity setting(s) from 0 (transparent) to 1 (opaque) - single number or array for bulk operations'
            },
            cornerRadius: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Corner radius setting(s) - single number or array for bulk operations'
            },
            topLeftRadius: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Top-left corner radius setting(s) - single number or array for bulk operations'
            },
            topRightRadius: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Top-right corner radius setting(s) - single number or array for bulk operations'
            },
            bottomLeftRadius: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Bottom-left corner radius setting(s) - single number or array for bulk operations'
            },
            bottomRightRadius: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Bottom-right corner radius setting(s) - single number or array for bulk operations'
            },
            cornerSmoothing: {
              oneOf: [
                { type: 'number', minimum: 0, maximum: 1 },
                { type: 'array', items: { type: 'number', minimum: 0, maximum: 1 } }
              ],
              description: 'Corner smoothing setting(s) from 0 to 1 - single number or array for bulk operations'
            },
            clipsContent: {
              oneOf: [
                { type: 'boolean' },
                { type: 'array', items: { type: 'boolean' } }
              ],
              description: 'Clips content setting(s) for FRAME nodes - single boolean or array for bulk operations'
            },
            pointCount: {
              oneOf: [
                { type: 'number', minimum: 3 },
                { type: 'array', items: { type: 'number', minimum: 3 } }
              ],
              description: 'Point count setting(s) for STAR and POLYGON nodes - single number or array for bulk operations'
            },
            innerRadius: {
              oneOf: [
                { type: 'number', minimum: 0, maximum: 1 },
                { type: 'array', items: { type: 'number', minimum: 0, maximum: 1 } }
              ],
              description: 'Inner radius setting(s) for STAR nodes from 0 to 1 - single number or array for bulk operations'
            },
            blendMode: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Blend mode setting(s) - single string or array for bulk operations'
            },
            startX: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Line start X coordinate(s) - single number or array for bulk operations'
            },
            startY: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Line start Y coordinate(s) - single number or array for bulk operations'
            },
            endX: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Line end X coordinate(s) - single number or array for bulk operations'
            },
            endY: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Line end Y coordinate(s) - single number or array for bulk operations'
            },
            startCap: {
              oneOf: [
                { type: 'string', enum: ['NONE', 'ROUND', 'SQUARE', 'ARROW_LINES', 'ARROW_EQUILATERAL', 'DIAMOND_FILLED', 'TRIANGLE_FILLED', 'CIRCLE_FILLED'] },
                { type: 'array', items: { type: 'string', enum: ['NONE', 'ROUND', 'SQUARE', 'ARROW_LINES', 'ARROW_EQUILATERAL', 'DIAMOND_FILLED', 'TRIANGLE_FILLED', 'CIRCLE_FILLED'] } }
              ],
              description: 'Line start cap/arrow style(s) - single string or array for bulk operations'
            },
            endCap: {
              oneOf: [
                { type: 'string', enum: ['NONE', 'ROUND', 'SQUARE', 'ARROW_LINES', 'ARROW_EQUILATERAL', 'DIAMOND_FILLED', 'TRIANGLE_FILLED', 'CIRCLE_FILLED'] },
                { type: 'array', items: { type: 'string', enum: ['NONE', 'ROUND', 'SQUARE', 'ARROW_LINES', 'ARROW_EQUILATERAL', 'DIAMOND_FILLED', 'TRIANGLE_FILLED', 'CIRCLE_FILLED'] } }
              ],
              description: 'Line end cap/arrow style(s) - single string or array for bulk operations'
            },
            length: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Line length setting(s) in pixels - single number or array for bulk operations. Alternative to endX/endY.'
            },
            rotation: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Rotation angle(s) in degrees - single number or array for bulk operations. Alternative to endX/endY.'
            },
            count: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              description: 'Number of nodes to create for bulk operations (1-100)'
            },
            failFast: {
              type: 'boolean',
              description: 'Stop on first error in bulk operations (default: false)'
            }
          },
          required: ['operation']
        },
        examples: [
          '{"operation": "create", "nodeType": "rectangle", "name": "My Rectangle", "x": 100, "y": 100, "width": 200, "height": 150, "fillColor": "#FF5733"}',
          '{"operation": "create", "nodeType": "rectangle", "name": "Semi-transparent Rectangle", "fillColor": "#FF573380", "strokeColor": "#00FF00A0"}',
          '{"operation": "create", "nodeType": ["rectangle", "ellipse"], "name": ["Rect 1", "Circle 1"], "x": [100, 300], "y": [100, 100], "width": [200, 150], "height": [150, 150], "fillColor": ["#FF5733", "#33FF57"]}',
          '{"operation": "get", "nodeId": "123:456"}',
          '{"operation": "get", "nodeId": ["123:456", "123:789"]}',
          '{"operation": "update", "nodeId": "123:456", "name": "Updated Rectangle", "fillColor": "#3357FF"}',
          '{"operation": "create", "nodeType": "rectangle", "fillColor": "#FF000080", "strokeColor": "#0000FF", "strokeOpacity": 0.3, "opacity": 0.8, "width": 100, "height": 100}',
          '{"operation": "create", "nodeType": "star", "fillColor": "#FF0000A0", "strokeColor": "#0000FF80", "strokeWeight": 3, "strokeAlign": "CENTER", "pointCount": 6, "innerRadius": 0.4}',
          '{"operation": "update", "nodeId": ["123:456", "123:789"], "x": [150, 350], "y": [150, 150]}',
          '{"operation": "duplicate", "nodeId": "123:456", "count": 3}',
          '{"operation": "delete", "nodeId": ["123:456", "123:789"]}',
          '{"operation": "create", "nodeType": "rectangle", "cornerRadius": 10, "fillColor": "#FF5733"}',
          '{"operation": "create", "nodeType": "rectangle", "topLeftRadius": 20, "topRightRadius": 5, "bottomLeftRadius": 5, "bottomRightRadius": 20, "cornerSmoothing": 0.5}',
          '{"operation": "create", "nodeType": "frame", "clipsContent": true, "fillColor": "#CCCCCC", "width": 300, "height": 200}',
          '{"operation": "create", "nodeType": "polygon", "pointCount": 8, "fillColor": "#00FF00"}',
          '{"operation": "create", "nodeType": "frame", "name": "Test Frame", "x": 100, "y": 100, "width": 200, "height": 150, "fillColor": "#F0F0F0", "clipsContent": false}',
          '{"operation": "create", "nodeType": "line", "name": "Horizontal Line", "startX": 100, "startY": 100, "endX": 300, "endY": 100, "strokeColor": "#000000", "strokeWeight": 2}',
          '{"operation": "create", "nodeType": "line", "name": "Arrow Line", "startX": 50, "startY": 50, "endX": 200, "endY": 100, "strokeColor": "#FF0000", "endCap": "ARROW_LINES"}',
          '{"operation": "create", "nodeType": "line", "name": "Connector", "startX": 100, "startY": 200, "endX": 250, "endY": 300, "startCap": "CIRCLE_FILLED", "endCap": "ARROW_EQUILATERAL", "strokeWeight": 3}',
          '{"operation": "create", "nodeType": ["line", "line"], "name": ["Line 1", "Line 2"], "startX": [100, 200], "startY": [100, 150], "endX": [200, 350], "endY": [120, 200], "strokeColor": ["#000000", "#0000FF"]}',
          '{"operation": "create", "nodeType": "line", "name": "Angled Line", "x": 100, "y": 100, "length": 150, "rotation": 30, "strokeColor": "#00FF00", "strokeWeight": 3}',
          '{"operation": "create", "nodeType": "line", "name": "Vertical Arrow", "x": 200, "y": 50, "length": 100, "rotation": 90, "endCap": "ARROW_EQUILATERAL"}',
          '{"operation": "update", "nodeId": ["123:456", "123:789"], "blendMode": ["MULTIPLY", "SCREEN"]}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_nodes') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    // Use custom handler that routes to specific operation types
    const config: UnifiedHandlerConfig = {
      toolName: 'figma_nodes',
      operation: 'nodes',
      bulkParams: ['operation', 'nodeId', 'nodeType', 'name', 'x', 'y', 'width', 'height', 'fillColor', 'strokeColor', 'fillOpacity', 'strokeOpacity', 'strokeWeight', 'strokeAlign', 'characters', 'visible', 'locked', 'opacity', 'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'cornerSmoothing', 'clipsContent', 'pointCount', 'innerRadius', 'blendMode', 'startX', 'startY', 'endX', 'endY', 'startCap', 'endCap', 'length', 'rotation', 'offsetX', 'offsetY'],
      paramConfigs: {
        ...UnifiedParamConfigs.basic(),
        nodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        name: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        x: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        y: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        fillColor: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        strokeColor: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        fillOpacity: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        strokeOpacity: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        strokeWeight: CommonParamConfigs.strokeWeight,
        strokeAlign: CommonParamConfigs.strokeAlign,
        opacity: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        nodeType: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        width: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        height: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        visible: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true },
        locked: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true },
        cornerRadius: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        topLeftRadius: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        topRightRadius: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        bottomLeftRadius: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        bottomRightRadius: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        cornerSmoothing: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        clipsContent: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true },
        pointCount: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        innerRadius: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        blendMode: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        startX: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        startY: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        endX: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        endY: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        startCap: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        endCap: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        length: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        rotation: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        offsetX: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        offsetY: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        count: { expectedType: 'number' as const }
      },
      pluginMessageType: 'MANAGE_NODES',
      schema: UnifiedNodeOperationsSchema,
      
    };

    return this.unifiedHandler.handle(args, config);
  }

}