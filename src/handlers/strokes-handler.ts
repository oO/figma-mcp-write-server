import { ManageStrokesSchema, ToolHandler, Tool } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';
import { debugLog } from '../utils/debug-log.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class StrokesHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_strokes',
        description: 'Manage the stroke and its paints on Figma nodes. Each node has ONE stroke (with weight, alignment, caps, etc.) that can be painted with multiple Paint objects (solid colors, gradients, images, patterns). Returns YAML with stroke properties and paint layers.',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { 
              type: 'string', 
              enum: ['get', 'add_solid', 'add_gradient', 'add_image', 'add_pattern', 'update', 'update_solid', 'update_gradient', 'update_image', 'update_pattern', 'delete', 'reorder', 'clear', 'duplicate'],
              description: 'Stroke operation to perform' 
            },
            nodeId: { 
              oneOf: [
                { type: 'string', description: 'Single node ID' },
                { type: 'array', items: { type: 'string' }, description: 'Array of node IDs for bulk operations' }
              ],
              description: 'Node ID(s) to operate on'
            },
            paintIndex: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Paint array index(es) in strokes array - single number or array for bulk operations (optional - if not provided, returns all paints)'
            },
            filterType: { 
              type: 'string', 
              enum: ['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND', 'IMAGE', 'PATTERN'],
              description: 'Filter stroke paints by Paint type' 
            },
            // Stroke properties (affect entire stroke)
            strokeWeight: { 
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Stroke thickness in pixels - single number or array for bulk operations'
            },
            strokeAlign: { 
              oneOf: [
                { type: 'string', enum: ['INSIDE', 'OUTSIDE', 'CENTER'] },
                { type: 'array', items: { type: 'string', enum: ['INSIDE', 'OUTSIDE', 'CENTER'] } }
              ],
              description: 'Stroke alignment relative to shape boundary - single value or array for bulk operations'
            },
            strokeCap: { 
              oneOf: [
                { type: 'string', enum: ['NONE', 'ROUND', 'SQUARE', 'ARROW_LINES', 'ARROW_EQUILATERAL'] },
                { type: 'array', items: { type: 'string', enum: ['NONE', 'ROUND', 'SQUARE', 'ARROW_LINES', 'ARROW_EQUILATERAL'] } }
              ],
              description: 'Stroke endpoint style - single value or array for bulk operations'
            },
            strokeJoin: { 
              oneOf: [
                { type: 'string', enum: ['MITER', 'BEVEL', 'ROUND'] },
                { type: 'array', items: { type: 'string', enum: ['MITER', 'BEVEL', 'ROUND'] } }
              ],
              description: 'Stroke corner style - single value or array for bulk operations'
            },
            strokeMiterLimit: { 
              oneOf: [
                { type: 'number', minimum: 1 },
                { type: 'array', items: { type: 'number', minimum: 1 } }
              ],
              description: 'Miter join limit - single number or array for bulk operations'
            },
            dashPattern: { 
              oneOf: [
                { type: 'array', items: { type: 'number' } },
                { type: 'array', items: { type: 'array', items: { type: 'number' } } }
              ],
              description: 'Dash pattern array - single array or array of arrays for bulk operations'
            },
            // Paint properties (same as fills)
            color: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Hex color(s) for solid stroke paints - single string or array for bulk operations'
            },
            gradientType: { 
              oneOf: [
                { type: 'string', enum: ['GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND'] },
                { type: 'array', items: { type: 'string', enum: ['GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND'] } }
              ],
              description: 'Gradient type(s) - single value or array for bulk operations'
            },
            stopPositions: { type: 'array', items: { type: 'number' }, description: 'Gradient stop positions (optional - defaults to [0, 1])' },
            stopColors: { type: 'array', items: { type: 'string' }, description: 'Gradient stop colors (optional - defaults to white to black)' },
            gradientStartX: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Gradient start X coordinate(s) (0-1) - single number or array for bulk operations'
            },
            gradientStartY: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Gradient start Y coordinate(s) (0-1) - single number or array for bulk operations'
            },
            gradientEndX: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Gradient end X coordinate(s) (0-1) - single number or array for bulk operations'
            },
            gradientEndY: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Gradient end Y coordinate(s) (0-1) - single number or array for bulk operations'
            },
            gradientScale: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Gradient scale factor(s) - single number or array for bulk operations'
            },
            imageUrl: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Image URL(s) - single string or array for bulk operations'
            },
            imagePath: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Local image file path(s) - single string or array for bulk operations'
            },
            imageBytes: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Base64 encoded image data - single string or array for bulk operations'
            },
            imageHash: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Existing image hash(es) - single string or array for bulk operations'
            },
            imageScaleMode: { 
              oneOf: [
                { type: 'string', enum: ['FILL', 'FIT', 'CROP', 'TILE'] },
                { type: 'array', items: { type: 'string', enum: ['FILL', 'FIT', 'CROP', 'TILE'] } }
              ],
              description: 'Image scale mode(s) - single value or array for bulk operations'
            },
            imageTransform: { 
              oneOf: [
                { type: 'array', items: { type: 'number' }, minItems: 6, maxItems: 6 },
                { type: 'array', items: { type: 'array', items: { type: 'number' }, minItems: 6, maxItems: 6 } }
              ],
              description: 'Image transformation matrix(es) - flat [a,b,c,d,e,f] array where a,b=scale/rotation, c,d=skew, e,f=translation - single array or array of arrays for bulk operations'
            },
            sourceNodeId: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Source node ID(s) for pattern paints - single string or array for bulk operations'
            },
            patternTileType: { 
              oneOf: [
                { type: 'string', enum: ['RECTANGULAR', 'HORIZONTAL_HEXAGONAL', 'VERTICAL_HEXAGONAL'] },
                { type: 'array', items: { type: 'string', enum: ['RECTANGULAR', 'HORIZONTAL_HEXAGONAL', 'VERTICAL_HEXAGONAL'] } }
              ],
              description: 'Pattern tile type(s) - single value or array for bulk operations'
            },
            opacity: { 
              oneOf: [
                { type: 'number', minimum: 0, maximum: 1 },
                { type: 'array', items: { type: 'number', minimum: 0, maximum: 1 } }
              ],
              description: 'Paint opacity setting(s) from 0 to 1 - single number or array for bulk operations'
            },
            visible: { 
              oneOf: [
                { type: 'boolean' },
                { type: 'array', items: { type: 'boolean' } }
              ],
              description: 'Paint visibility setting(s) - single boolean or array for bulk operations'
            },
            blendMode: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Paint blend mode(s) - single string or array for bulk operations'
            },
            newIndex: { type: 'number', description: 'Target position for reorder' },
            fromNodeId: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Source node ID(s) for duplicate - single string or array for bulk source operations'
            },
            toNodeId: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Target node ID(s) for duplicate'
            },
            overwrite: { 
              type: 'string', 
              enum: ['NONE', 'SINGLE', 'ALL'],
              description: 'Overwrite mode: NONE=add to existing (default), SINGLE=replace at same index, ALL=replace all paints'
            },
            failFast: { type: 'boolean', description: 'Stop on first error in bulk operations' }
          },
          required: ['operation', 'nodeId']
        },
        examples: [
          '{"operation": "get", "nodeId": "node123"}',
          '{"operation": "get", "nodeId": "node123", "paintIndex": 0}',
          '{"operation": "update", "nodeId": "node123", "strokeWeight": 2.0, "strokeAlign": "center"}',
          '{"operation": "add_solid", "nodeId": "node123", "color": "#FF0000", "opacity": 1.0}',
          '{"operation": "add_gradient", "nodeId": "node123", "gradientType": "GRADIENT_LINEAR", "stopPositions": [0, 1], "stopColors": ["#FF0000", "#0000FF"]}',
          '{"operation": "update_solid", "nodeId": "node123", "paintIndex": 0, "color": "#00FF00"}',
          '{"operation": "update", "nodeId": "node123", "paintIndex": 0, "opacity": 0.8}',
          '{"operation": "delete", "nodeId": "node123", "paintIndex": 1}',
          '{"operation": "clear", "nodeId": "node123"}',
          '{"operation": "duplicate", "fromNodeId": "source123", "toNodeId": "target456"}'
        ]
      }
    ];
    
    // Response format notes:
    // - All operations return YAML with stroke properties and paint array
    // - Stroke properties: strokeWeight, strokeAlign, strokeCap, strokeJoin, etc.
    // - Paint array: Multiple paint objects that color the stroke
    // - Colors: rgb(255,0,0) or rgba(255,0,0,0.5) instead of {r:1,g:0,b:0,a:1}
    // - Gradient stops: "rgb(255,0,0) 0%, rgb(0,0,255) 100%" instead of array objects
    // - Node names included in results as "nodeName" field
    // - Bulk operations return "results" array with individual node results
  }

  private validateOperationParameters(args: any): void {
    const { operation } = args;
    const strokeProperties = ['strokeWeight', 'strokeAlign', 'strokeCap', 'strokeJoin', 'strokeMiterLimit', 'dashPattern'];
    const paintProperties = ['color', 'opacity', 'visible', 'blendMode', 'gradientType', 'gradientStartX', 'gradientStartY', 'gradientEndX', 'gradientEndY', 'gradientScale', 'stopPositions', 'stopColors', 'imageUrl', 'imagePath', 'imageBytes', 'imageHash', 'imageScaleMode', 'imageTransform', 'sourceNodeId', 'patternTileType'];
    
    const providedStrokeProps = strokeProperties.filter(prop => args[prop] !== undefined);
    const providedPaintProps = paintProperties.filter(prop => args[prop] !== undefined);

    // Paint operations (add_*, update_*) should NOT include stroke properties  
    const paintOnlyOperations = ['add_solid', 'add_gradient', 'add_image', 'add_pattern', 'update_solid', 'update_gradient', 'update_image', 'update_pattern'];
    
    if (paintOnlyOperations.includes(operation) && providedStrokeProps.length > 0) {
      const providedPropsStr = providedStrokeProps.join(', ');
      throw new Error(
        `Stroke properties (${providedPropsStr}) are not allowed in '${operation}' operation.\n\n` +
        `Three-tier stroke system:\n` +
        `• For basic stroke setup: Use 'figma_nodes' with strokeColor, strokeWeight, strokeAlign\n` +
        `• For stroke properties: Use 'figma_strokes' with operation='update'\n` +
        `• For paint management: Use 'figma_strokes' with operation='${operation}' (paint-only parameters)\n\n` +
        `Current operation '${operation}' only accepts paint parameters (color, opacity, visible, blendMode, etc.)`
      );
    }

    // Smart update validation - handle paint params with safety guard
    if (operation === 'update' && providedPaintProps.length > 0) {
      // This will be handled in the plugin operation with proper safety checks
      // We allow paint parameters in update but the plugin will validate stroke state
    }
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_strokes') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    // Validate parameter usage for three-tier stroke system
    this.validateOperationParameters(args);

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_strokes',
      operation: 'strokes',
      bulkParams: ['nodeId', 'paintIndex', 'filterType', 'strokeWeight', 'strokeAlign', 'strokeCap', 'strokeJoin', 'strokeMiterLimit', 'dashPattern', 'color', 'gradientType', 'gradientStartX', 'gradientStartY', 'gradientEndX', 'gradientEndY', 'gradientScale', 'imageUrl', 'imagePath', 'imageBytes', 'imageHash', 'imageScaleMode', 'imageTransform', 'sourceNodeId', 'patternTileType', 'opacity', 'visible', 'blendMode', 'newIndex', 'fromNodeId', 'toNodeId', 'overwrite'],
      paramConfigs: {
        // Core parameters
        operation: { expectedType: 'string' as const, required: true },
        nodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        paintIndex: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        filterType: { expectedType: 'string' as const, allowSingle: true },
        
        // Stroke properties
        strokeWeight: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        strokeAlign: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        strokeCap: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        strokeJoin: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        strokeMiterLimit: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        dashPattern: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: false },
        
        // Paint creation parameters
        color: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        gradientType: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        stopPositions: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        stopColors: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        gradientStartX: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        gradientStartY: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        gradientEndX: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        gradientEndY: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        gradientScale: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        
        // Image parameters
        imageUrl: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        imagePath: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        imageBytes: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        imageHash: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        imageScaleMode: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        imageTransform: { expectedType: 'array' as const, arrayItemType: 'array' as const, allowSingle: true },
        
        // Pattern parameters
        sourceNodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        patternTileType: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        
        // Common paint properties
        opacity: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        visible: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true },
        blendMode: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        
        // Operation-specific parameters
        newIndex: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        fromNodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        toNodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        overwrite: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        
        // Standard parameters
        failFast: { expectedType: 'boolean' as const, allowSingle: true }
      },
      pluginMessageType: 'MANAGE_STROKES',
      schema: ManageStrokesSchema
    };

    // Preprocess args to handle local image loading
    const processedArgs = await this.preprocessImagePaths(args);
    
    debugLog('StrokesHandler.handle passing to unifiedHandler', {
      originalKeys: args ? Object.keys(args) : [],
      processedKeys: processedArgs ? Object.keys(processedArgs) : [],
      hasImageBytes: !!processedArgs?.imageBytes,
      hasImagePath: !!processedArgs?.imagePath
    });
    
    return this.unifiedHandler.handle(processedArgs, config);
  }

  /**
   * Preprocess arguments to load local image files and convert them to Base64
   * 
   * CRITICAL: This converts local images to Base64 strings (not byte arrays) because:
   * 1. Large byte arrays (681K+ numbers) cause JSON serialization to hang
   * 2. Base64 strings serialize efficiently and avoid performance issues
   * 3. Plugin UI thread handles Base64→Uint8Array conversion using window.atob
   * 
   * DO NOT change this to return byte arrays - it will cause hanging.
   */
  private async preprocessImagePaths(args: any): Promise<any> {
    debugLog('StrokesHandler.preprocessImagePaths called', { 
      operation: args?.operation, 
      hasImagePath: !!args?.imagePath,
      imagePath: args?.imagePath,
      allArgs: args ? Object.keys(args) : []
    });

    // Handle null/undefined args
    if (!args || typeof args !== 'object') {
      return args || {};
    }

    // Only process add_image operations that have imagePath
    if (args.operation !== 'add_image' || !args.imagePath) {
      debugLog('StrokesHandler.preprocessImagePaths skipping', { 
        reason: args.operation !== 'add_image' ? 'wrong operation' : 'no imagePath'
      });
      return args;
    }

    debugLog('StrokesHandler.preprocessImagePaths processing imagePath', { imagePath: args.imagePath });
    const processedArgs = { ...args };
    
    // Handle imagePath parameter (single or array)
    if (args.imagePath) {
      const imagePaths = Array.isArray(args.imagePath) ? args.imagePath : [args.imagePath];
      const imageDataArray: string[] = [];
      
      for (const imagePath of imagePaths) {
        try {
          // Expand tilde and resolve relative paths
          const expandedPath = imagePath.startsWith('~') ? 
            path.join(os.homedir(), imagePath.slice(1)) : 
            imagePath;
          const resolvedPath = path.resolve(expandedPath);
          
          // Check if file exists and is readable
          if (!fs.existsSync(resolvedPath)) {
            throw new Error(`Image file not found: ${imagePath}`);
          }
          
          const stats = fs.statSync(resolvedPath);
          if (!stats.isFile()) {
            throw new Error(`Path is not a file: ${imagePath}`);
          }
          
          // Read the image file as bytes and encode as Base64 for efficient JSON serialization
          const imageBytes = fs.readFileSync(resolvedPath);
          const base64Data = imageBytes.toString('base64');
          imageDataArray.push(base64Data);
          
        } catch (error) {
          throw new Error(`Failed to load image from ${imagePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      // Add imageBytes and keep operation as add_image
      processedArgs.imageBytes = imageDataArray.length === 1 ? imageDataArray[0] : imageDataArray;
      
      // Remove imagePath since we're now using imageBytes
      delete processedArgs.imagePath;
      
      debugLog('StrokesHandler.preprocessImagePaths completed', { 
        base64Length: imageDataArray.length === 1 ? imageDataArray[0]?.length : imageDataArray.map(b => b?.length),
        imageBytesType: imageDataArray.length === 1 ? typeof imageDataArray[0] : 'array',
        processedKeys: Object.keys(processedArgs)
      });
    }
    
    return processedArgs;
  }
}