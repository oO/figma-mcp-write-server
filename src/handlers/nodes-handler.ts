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
        description: 'Create, get, update, delete, and duplicate geometric shape nodes. Returns YAML with node properties. Supports specialized operations for each node type: rectangles, ellipses, frames, sections, slices, stars, and polygons.',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['get', 'list', 'update', 'delete', 'duplicate', 'create_rectangle', 'create_ellipse', 'create_frame', 'create_section', 'create_slice', 'create_star', 'create_polygon', 'update_rectangle', 'update_ellipse', 'update_frame', 'update_section', 'update_slice', 'update_star', 'update_polygon'],
              description: 'Node operation to perform'
            },
            nodeId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Node ID(s) for update/delete/duplicate operations - single string or array for bulk operations'
            },
            parentId: {
              type: 'string',
              description: 'Optional parent container ID for create operations. When provided, the node will be created inside this container and coordinates will be relative to the parent.'
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
              description: 'Corner radius setting(s) for rectangles and frames - single number or array for bulk operations'
            },
            topLeftRadius: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Top-left corner radius setting(s) for rectangles and frames - single number or array for bulk operations'
            },
            topRightRadius: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Top-right corner radius setting(s) for rectangles and frames - single number or array for bulk operations'
            },
            bottomLeftRadius: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Bottom-left corner radius setting(s) for rectangles and frames - single number or array for bulk operations'
            },
            bottomRightRadius: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Bottom-right corner radius setting(s) for rectangles and frames - single number or array for bulk operations'
            },
            cornerSmoothing: {
              oneOf: [
                { type: 'number', minimum: 0, maximum: 1 },
                { type: 'array', items: { type: 'number', minimum: 0, maximum: 1 } }
              ],
              description: 'Corner smoothing setting(s) from 0 to 1 for rectangles and frames - single number or array for bulk operations'
            },
            clipsContent: {
              oneOf: [
                { type: 'boolean' },
                { type: 'array', items: { type: 'boolean' } }
              ],
              description: 'Clips content setting(s) for frame nodes - single boolean or array for bulk operations'
            },
            sectionContentsHidden: {
              oneOf: [
                { type: 'boolean' },
                { type: 'array', items: { type: 'boolean' } }
              ],
              description: 'Section contents hidden setting(s) for section nodes - single boolean or array for bulk operations'
            },
            devStatus: {
              oneOf: [
                { type: 'string', enum: ['READY_FOR_DEV', 'IN_DEVELOPMENT', 'COMPLETED'] },
                { type: 'array', items: { type: 'string', enum: ['READY_FOR_DEV', 'IN_DEVELOPMENT', 'COMPLETED'] } }
              ],
              description: 'Development status setting(s) for section nodes - single value or array for bulk operations'
            },
            pointCount: {
              oneOf: [
                { type: 'number', minimum: 3 },
                { type: 'array', items: { type: 'number', minimum: 3 } }
              ],
              description: 'Point count setting(s) for star and polygon nodes - single number or array for bulk operations'
            },
            innerRadius: {
              oneOf: [
                { type: 'number', minimum: 0, maximum: 1 },
                { type: 'array', items: { type: 'number', minimum: 0, maximum: 1 } }
              ],
              description: 'Inner radius setting(s) for star nodes from 0 to 1 - single number or array for bulk operations'
            },
            blendMode: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Blend mode setting(s) - single string or array for bulk operations'
            },
            rotation: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Rotation angle(s) in degrees - single number or array for bulk operations'
            },
            offsetX: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'X offset(s) for duplicate operations - single number or array for bulk operations'
            },
            offsetY: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Y offset(s) for duplicate operations - single number or array for bulk operations'
            },
            count: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              description: 'Number of nodes to create for bulk operations (1-100)'
            },
            // List operation filtering parameters
            filterByName: {
              type: 'string',
              description: 'Filter nodes by name using regex pattern (for list operation)'
            },
            filterByType: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter nodes by type(s) - array of node types (for list operation)'
            },
            filterByVisibility: {
              type: 'string',
              enum: ['visible', 'hidden', 'all'],
              description: 'Filter nodes by visibility state (for list operation)'
            },
            filterByLockedState: {
              type: 'boolean',
              description: 'Filter nodes by locked state (for list operation)'
            },
            traversal: {
              type: 'string',
              enum: ['children', 'descendants', 'ancestors', 'siblings'],
              description: 'Traversal type for node discovery (for list operation)'
            },
            maxDepth: {
              type: 'number',
              minimum: 0,
              description: 'Maximum depth for traversal (for list operation)'
            },
            maxResults: {
              type: 'number',
              minimum: 1,
              description: 'Maximum number of results to return (for list operation)'
            },
            includeAllPages: {
              type: 'boolean',
              description: 'Search across all pages instead of current page (for list operation)'
            },
            detail: {
              type: 'string',
              enum: ['minimal', 'standard', 'detailed'],
              description: 'Level of detail in response (for list operation)'
            },
            pageId: {
              type: 'string',
              description: 'Specific page ID to search within (for list operation)'
            }
          },
          required: ['operation']
        },
        examples: [
          '{"operation": "get", "nodeId": "123:456"}',
          '{"operation": "get", "nodeId": ["123:456", "123:789"]}',
          '{"operation": "list"}',
          '{"operation": "list", "filterByName": "Rectangle"}',
          '{"operation": "list", "filterByType": ["RECTANGLE", "ELLIPSE"]}',
          '{"operation": "list", "filterByName": "Button", "detail": "detailed"}',
          '{"operation": "update", "nodeId": "123:456", "name": "Updated Rectangle", "fillColor": "#3357FF"}',
          '{"operation": "update", "nodeId": ["123:456", "123:789"], "x": [150, 350], "y": [150, 150]}',
          '{"operation": "duplicate", "nodeId": "123:456", "count": 3, "offsetX": 20, "offsetY": 20}',
          '{"operation": "delete", "nodeId": ["123:456", "123:789"]}',
          '{"operation": "create_rectangle", "name": "My Rectangle", "x": 100, "y": 100, "width": 200, "height": 150, "fillColor": "#FF5733"}',
          '{"operation": "create_rectangle", "name": ["Rect 1", "Rect 2"], "x": [100, 300], "y": [100, 100], "width": [200, 150], "height": [150, 150], "fillColor": ["#FF5733", "#33FF57"]}',
          '{"operation": "create_rectangle", "cornerRadius": 10, "fillColor": "#FF5733", "strokeColor": "#000000", "strokeWeight": 2}',
          '{"operation": "create_rectangle", "topLeftRadius": 20, "topRightRadius": 5, "bottomLeftRadius": 5, "bottomRightRadius": 20, "cornerSmoothing": 0.5}',
          '{"operation": "create_ellipse", "name": "My Circle", "x": 200, "y": 200, "width": 100, "height": 100, "fillColor": "#33FF57"}',
          '{"operation": "create_frame", "name": "Test Frame", "x": 100, "y": 100, "width": 200, "height": 150, "fillColor": "#F0F0F0", "clipsContent": false}',
          '{"operation": "create_section", "name": "My Section", "width": 300, "height": 200, "sectionContentsHidden": false, "devStatus": "READY_FOR_DEV"}',
          '{"operation": "create_slice", "name": "Export Slice", "x": 50, "y": 50, "width": 200, "height": 100}',
          '{"operation": "create_star", "name": "My Star", "pointCount": 6, "innerRadius": 0.4, "fillColor": "#FF0000", "strokeColor": "#0000FF", "strokeWeight": 3}',
          '{"operation": "create_polygon", "name": "Octagon", "pointCount": 8, "fillColor": "#00FF00"}',
          '{"operation": "update_rectangle", "nodeId": "123:456", "cornerRadius": 15, "topLeftRadius": 25}',
          '{"operation": "update_frame", "nodeId": "123:789", "clipsContent": true, "cornerRadius": 8}',
          '{"operation": "update_star", "nodeId": "123:999", "pointCount": 8, "innerRadius": 0.6}',
          '{"operation": "update_section", "nodeId": "123:111", "devStatus": "IN_DEVELOPMENT"}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_nodes') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_nodes',
      operation: 'nodes',
      bulkParams: ['operation', 'nodeId', 'parentId', 'name', 'x', 'y', 'width', 'height', 'fillColor', 'strokeColor', 'fillOpacity', 'strokeOpacity', 'strokeWeight', 'strokeAlign', 'visible', 'locked', 'opacity', 'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'cornerSmoothing', 'clipsContent', 'sectionContentsHidden', 'devStatus', 'pointCount', 'innerRadius', 'blendMode', 'rotation', 'offsetX', 'offsetY'],
      paramConfigs: {
        ...UnifiedParamConfigs.basic(),
        nodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        parentId: { expectedType: 'string' as const },
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
        sectionContentsHidden: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true },
        devStatus: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        pointCount: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        innerRadius: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        blendMode: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        rotation: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        offsetX: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        offsetY: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        count: { expectedType: 'number' as const },
        // List operation filter parameters
        filterByName: { expectedType: 'string' as const },
        filterByType: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        filterByVisibility: { expectedType: 'string' as const },
        filterByLockedState: { expectedType: 'boolean' as const },
        traversal: { expectedType: 'string' as const },
        maxDepth: { expectedType: 'number' as const },
        maxResults: { expectedType: 'number' as const },
        includeAllPages: { expectedType: 'boolean' as const },
        detail: { expectedType: 'string' as const },
        pageId: { expectedType: 'string' as const }
      },
      pluginMessageType: 'MANAGE_NODES',
      schema: UnifiedNodeOperationsSchema,
      operationParameters: {
        get: ['nodeId'],
        list: ['pageId', 'nodeId', 'traversal', 'filterByType', 'filterByName', 'filterByVisibility', 'filterByLockedState', 'maxDepth', 'maxResults', 'includeAllPages', 'detail'],
        update: ['nodeId', 'name', 'x', 'y', 'width', 'height', 'rotation', 'visible', 'locked', 'opacity', 'blendMode', 'fillOpacity', 'strokeOpacity', 'strokeWeight', 'strokeAlign'],
        delete: ['nodeId'],
        duplicate: ['nodeId', 'offsetX', 'offsetY', 'count'],
        
        // Specialized create operations
        create_rectangle: ['parentId', 'name', 'x', 'y', 'width', 'height', 'rotation', 'visible', 'locked', 'opacity', 'blendMode', 'fillColor', 'strokeColor', 'fillOpacity', 'strokeOpacity', 'strokeWeight', 'strokeAlign', 'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'cornerSmoothing'],
        create_ellipse: ['parentId', 'name', 'x', 'y', 'width', 'height', 'rotation', 'visible', 'locked', 'opacity', 'blendMode', 'fillColor', 'strokeColor', 'fillOpacity', 'strokeOpacity', 'strokeWeight', 'strokeAlign'],
        create_frame: ['parentId', 'name', 'x', 'y', 'width', 'height', 'rotation', 'visible', 'locked', 'opacity', 'blendMode', 'fillColor', 'strokeColor', 'fillOpacity', 'strokeOpacity', 'strokeWeight', 'strokeAlign', 'clipsContent', 'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'cornerSmoothing'],
        create_section: ['parentId', 'name', 'x', 'y', 'width', 'height', 'rotation', 'visible', 'locked', 'opacity', 'blendMode', 'fillColor', 'strokeColor', 'fillOpacity', 'strokeOpacity', 'strokeWeight', 'strokeAlign', 'sectionContentsHidden', 'devStatus'],
        create_slice: ['parentId', 'name', 'x', 'y', 'width', 'height', 'rotation', 'visible', 'locked', 'opacity', 'blendMode'],
        create_star: ['parentId', 'name', 'x', 'y', 'width', 'height', 'rotation', 'visible', 'locked', 'opacity', 'blendMode', 'fillColor', 'strokeColor', 'fillOpacity', 'strokeOpacity', 'strokeWeight', 'strokeAlign', 'pointCount', 'innerRadius'],
        create_polygon: ['parentId', 'name', 'x', 'y', 'width', 'height', 'rotation', 'visible', 'locked', 'opacity', 'blendMode', 'fillColor', 'strokeColor', 'fillOpacity', 'strokeOpacity', 'strokeWeight', 'strokeAlign', 'pointCount'],
        
        // Specialized update operations
        update_rectangle: ['nodeId', 'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'cornerSmoothing'],
        update_ellipse: ['nodeId'],
        update_frame: ['nodeId', 'clipsContent', 'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'cornerSmoothing'],
        update_section: ['nodeId', 'sectionContentsHidden', 'devStatus'],
        update_slice: ['nodeId'],
        update_star: ['nodeId', 'pointCount', 'innerRadius'],
        update_polygon: ['nodeId', 'pointCount']
      }
    };

    return this.unifiedHandler.handle(args, config);
  }

}