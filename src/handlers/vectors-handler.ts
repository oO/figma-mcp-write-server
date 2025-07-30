import { VectorsOperationsSchema } from '../types/vectors-operation.js';
import { ToolHandler, ToolResult, Tool } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';

export class VectorsHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_vectors',
        description: 'Vector operations for creating and manipulating vector shapes using sparse format or VectorNetwork.',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: [
                // VectorNetwork Format (Advanced) 
                'create_vector', 'get_vector', 'update_vector',
                // Line Format (Simple Lines)
                'create_line', 'get_line', 'update_line',
                // Utility Operations
                'flatten', 'convert_stroke', 'convert_shape', 'convert_text', 'extract_element'
              ],
              description: 'Vector operation to perform'
            },
            
            // Node identification
            nodeId: {
              type: 'string',
              description: 'Target node ID for operations. Supports arrays for bulk convert operations (each creates separate vector) or single IDs.'
            },
            nodeIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of node IDs for flatten operation (combines multiple nodes into single vector)'
            },


            // VectorNetwork Format parameters (sparse)
            vertices: {
              type: 'string',
              description: 'JSON array of vertex coordinates: "[x,y,x,y,x,y...]"'
            },
            regions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  loops: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of JSON vertex index arrays: ["[0,1,2,3]", "[4,5,6,7]"]'
                  },
                  windingRule: {
                    type: 'string',
                    enum: ['EVENODD', 'NONZERO']
                  },
                  fillIndex: {
                    type: 'number',
                    description: 'Reference to fills array index'
                  }
                },
                required: ['loops']
              },
              description: 'Array of closed regions for fills'
            },
            paths: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of open paths as JSON arrays: ["[0,1,2]", "[5,6,7]"]'
            },
            handles: {
              type: 'object',
              additionalProperties: { type: 'string' },
              description: 'Bezier handles per vertex as JSON arrays: {"1": "[inTangentX,inTangentY,outTangentX,outTangentY]"}'
            },
            vertexProps: {
              type: 'object',
              additionalProperties: { type: 'object' },
              description: 'Per-vertex properties like cornerRadius'
            },
            fills: {
              type: 'array',
              items: { type: 'array' },
              description: 'Fill palette (array of Paint arrays)'
            },
            vectorNetwork: {
              type: 'object',
              properties: {
                vertices: { type: 'string' },
                regions: { type: 'array' },
                paths: { type: 'array' },
                handles: { type: 'object' },
                vertexProps: { type: 'object' },
                fills: { type: 'array' }
              },
              description: 'Complete sparse vector network data'
            },

            // Line Format parameters (two styles)
            startX: { type: 'number', description: 'Line start X coordinate' },
            startY: { type: 'number', description: 'Line start Y coordinate' },
            endX: { type: 'number', description: 'Line end X coordinate' },
            endY: { type: 'number', description: 'Line end Y coordinate' },
            length: { type: 'number', description: 'Line length in pixels' },

            // Common parameters
            parentId: {
              type: 'string',
              description: 'Parent node ID for create operations (optional). If not specified, creates at page level.'
            },
            name: {
              type: 'string',
              description: 'Name for the created/updated node'
            },
            x: { type: 'number', description: 'X position' },
            y: { type: 'number', description: 'Y position' },
            fillColor: {
              type: 'string',
              description: 'Fill color as hex string (e.g., "#FF5733")'
            },
            strokeColor: {
              type: 'string', 
              description: 'Stroke color as hex string'
            },
            strokeWidth: {
              type: 'number',
              description: 'Stroke width in pixels'
            },
            strokeDashPattern: {
              type: 'array',
              items: { type: 'number' },
              description: 'Dash pattern for strokes (e.g., [5, 10] for dashed line)'
            },
            cornerRadius: {
              type: 'number',
              description: 'Corner radius for vector nodes (single value, min: 0)'
            },
            

            // Node-level transform parameters (for update_vector)
            width: {
              type: 'number',
              description: 'Vector width in pixels (for update_vector node-level transforms)'
            },
            height: {
              type: 'number',
              description: 'Vector height in pixels (for update_vector node-level transforms)'
            },
            rotation: {
              type: 'number',
              description: 'Vector rotation in degrees (for update_vector node-level transforms)'
            },
            transformMode: {
              type: 'string',
              enum: ['absolute', 'relative'],
              description: 'Transform mode: absolute (set values) or relative (adjust by values). Default: absolute. Note: Order of operations is vector network first, then node transforms'
            },

            // Operation-specific parameters
            replaceOriginal: {
              type: 'boolean',
              description: 'Replace/consume original node during conversion (default: true). When false, keeps original and creates new vector.'
            },
            pathIndex: {
              type: 'number',
              description: 'Index of path to extract or operate on. If both regionIndex and pathIndex are omitted, extracts all elements (explodes vector).'
            },
            tolerance: {
              type: 'number',
              description: 'Maximum deviation for simplify_path operation (default: 1.0)'
            },
            
            // Extract element parameters  
            regionIndex: {
              type: 'number',
              description: 'Index of region to extract. If both regionIndex and pathIndex are omitted, extracts all elements (explodes vector).'
            },
            removeFromSource: {
              type: 'boolean',
              description: 'Whether to remove the extracted element from the source vector (default: true)'
            }
          },
          required: ['operation']
        },
        examples: [
          // VectorNetwork Format examples (sparse JSON)
          '{"operation": "create_vector", "vertices": "[0,0,100,0,50,100]", "regions": [{"loops": ["[0,1,2]"]}]}',
          '{"operation": "create_vector", "vectorNetwork": {"vertices": "[0,0,100,0,50,100]", "regions": [{"loops": ["[0,1,2]"], "fillIndex": 0}], "fills": [[{"type": "SOLID", "color": {"r": 1, "g": 0, "b": 0}}]]}}',
          '{"operation": "create_vector", "vertices": "[0,0,100,0,100,100,0,100]", "regions": [{"loops": ["[0,1,2,3]"]}], "x": 200, "y": 150, "width": 150, "height": 100, "rotation": 45}',
          '{"operation": "get_vector", "nodeId": "123:456"}',
          '{"operation": "get_vector", "nodeId": ["123:456", "123:789"]}',
          '{"operation": "update_vector", "nodeId": "123:456", "vertices": "[0,0,200,0,100,200]"}',
          '{"operation": "update_vector", "nodeId": "123:456", "x": 200, "y": 150, "width": 150, "height": 100}',
          '{"operation": "update_vector", "nodeId": "123:456", "rotation": 45, "transformMode": "absolute"}',
          '{"operation": "update_vector", "nodeId": "123:456", "x": 10, "y": 10, "transformMode": "relative"}',
          
          // Line Format examples
          '{"operation": "create_line", "startX": 0, "startY": 0, "endX": 100, "endY": 100, "strokeColor": "#000000", "strokeWidth": 2}',
          '{"operation": "create_line", "x": 50, "y": 50, "length": 200, "rotation": 45, "strokeColor": "#0000FF"}',
          '{"operation": "get_line", "nodeId": "123:789"}',
          '{"operation": "update_line", "nodeId": "123:789", "endX": 150, "endY": 150, "strokeWidth": 4}',
          
          // Utility examples
          '{"operation": "flatten", "nodeIds": ["123:456", "123:789"], "name": "Flattened Shape"}',
          '{"operation": "convert_stroke", "nodeId": "123:456", "replaceOriginal": false}',
          '{"operation": "convert_shape", "nodeId": "123:456"}',
          '{"operation": "convert_shape", "nodeId": ["123:456", "123:789"], "name": ["Shape1 Vector", "Shape2 Vector"]}',
          '{"operation": "convert_text", "nodeId": "123:456"}',
          
          // Extract element examples
          '{"operation": "extract_element", "nodeId": "123:456", "regionIndex": 0}',
          '{"operation": "extract_element", "nodeId": "123:456", "pathIndex": 1, "removeFromSource": false}',
          '{"operation": "extract_element", "nodeId": "123:456", "regionIndex": 2, "name": "Extracted Shape"}',
          '{"operation": "extract_element", "nodeId": "123:456"}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_vectors') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_vectors',
      operation: 'manage_vectors',
      bulkParams: ['nodeId', 'parentId', 'name', 'x', 'y', 'fillColor', 'strokeColor', 'strokeWidth', 'strokeDashPattern',
                   'cornerRadius', 'width', 'height', 'rotation', 'transformMode',
                   'startX', 'startY', 'endX', 'endY', 'length',
                   'replaceOriginal', 'merge', 'pathIndex', 'tolerance',
                   'regionIndex', 'removeFromSource',  
                   'regions', 'paths'], // Support bulk operations
      paramConfigs: {
        ...UnifiedParamConfigs.basic(),
        
        // Node identification
        nodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        nodeIds: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: false },
        
        
        // VectorNetwork Format (sparse)
        vertices: { expectedType: 'string' as const, allowSingle: true },
        regions: { expectedType: 'array' as const, arrayItemType: 'object' as const, allowSingle: false },
        paths: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: false },
        handles: { expectedType: 'object' as const, allowSingle: true },
        vertexProps: { expectedType: 'object' as const, allowSingle: true },
        fills: { expectedType: 'array' as const, arrayItemType: 'array' as const, allowSingle: false },
        vectorNetwork: { expectedType: 'object' as const, allowSingle: true },
        
        // Line Format (coordinates)
        startX: { expectedType: 'number' as const, allowSingle: true },
        startY: { expectedType: 'number' as const, allowSingle: true },
        endX: { expectedType: 'number' as const, allowSingle: true },
        endY: { expectedType: 'number' as const, allowSingle: true },
        length: { expectedType: 'number' as const, allowSingle: true },
        
        // Common parameters
        parentId: { expectedType: 'string' as const, allowSingle: true },
        name: { expectedType: 'string' as const, allowSingle: true },
        x: { expectedType: 'number' as const, allowSingle: true },
        y: { expectedType: 'number' as const, allowSingle: true },
        fillColor: { expectedType: 'string' as const, allowSingle: true },
        strokeColor: { expectedType: 'string' as const, allowSingle: true },
        strokeWidth: { expectedType: 'number' as const, allowSingle: true },
        strokeDashPattern: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: false },
        cornerRadius: { expectedType: 'number' as const, allowSingle: true },
        
        // Node-level transform parameters
        width: { expectedType: 'number' as const, allowSingle: true },
        height: { expectedType: 'number' as const, allowSingle: true },
        rotation: { expectedType: 'number' as const, allowSingle: true },
        transformMode: { expectedType: 'string' as const, allowSingle: true },
        
        // Operation-specific
        replaceOriginal: { expectedType: 'boolean' as const, allowSingle: true },
        pathIndex: { expectedType: 'number' as const, allowSingle: true },
        tolerance: { expectedType: 'number' as const, allowSingle: true },
        
        // Extract element parameters
        regionIndex: { expectedType: 'number' as const, allowSingle: true },
        removeFromSource: { expectedType: 'boolean' as const, allowSingle: true }
      },
      operationParameters: {
        // VectorNetwork Format operations (sparse)
        create_vector: ['operation', 'vertices', 'regions', 'paths', 'handles', 'vertexProps', 'fills', 'vectorNetwork', 'parentId', 'name', 'x', 'y', 'fillColor', 'strokeColor', 'strokeWidth', 'cornerRadius', 'width', 'height', 'rotation', 'transformMode'],
        get_vector: ['operation', 'nodeId'],
        update_vector: ['operation', 'nodeId', 'vertices', 'regions', 'paths', 'handles', 'vertexProps', 'fills', 'vectorNetwork', 'cornerRadius', 'x', 'y', 'width', 'height', 'rotation', 'transformMode'],
        
        // Line Format operations
        create_line: ['operation', 'startX', 'startY', 'endX', 'endY', 'length', 'rotation', 'parentId', 'name', 'x', 'y', 'strokeColor', 'strokeWidth', 'strokeDashPattern'],
        get_line: ['operation', 'nodeId'],
        update_line: ['operation', 'nodeId', 'startX', 'startY', 'endX', 'endY', 'length', 'rotation', 'strokeColor', 'strokeWidth', 'strokeDashPattern'],
        
        // Utility operations
        flatten: ['operation', 'nodeIds', 'name'],
        convert_stroke: ['operation', 'nodeId', 'replaceOriginal', 'name'],
        convert_shape: ['operation', 'nodeId', 'replaceOriginal', 'name'],
        convert_text: ['operation', 'nodeId', 'replaceOriginal', 'name'],
        extract_element: ['operation', 'nodeId', 'regionIndex', 'pathIndex', 'removeFromSource', 'name'],
      },
      pluginMessageType: 'MANAGE_VECTORS',
      schema: VectorsOperationsSchema
    };

    return this.unifiedHandler.handle(args, config);
  }
}