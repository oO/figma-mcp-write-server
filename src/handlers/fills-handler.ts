import { ManageFillsSchema, ToolHandler, ToolResult, Tool } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';
import { debugLog } from '../utils/debug-log.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class FillsHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_fills',
        description: 'Manage fills (Paint objects) on Figma nodes including solid colors, gradients, and images. Returns YAML with compact notation: colors as rgb(r,g,b)/rgba(r,g,b,a), gradient stops as "color position%", and gradientTransform matrix is hidden from output for cleaner responses.',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { 
              type: 'string', 
              enum: ['get', 'add_solid', 'add_gradient', 'add_image', 'add_pattern', 'update', 'update_solid', 'update_gradient', 'update_image', 'update_pattern', 'delete', 'reorder', 'clear', 'duplicate'],
              description: 'Fill operation to perform' 
            },
            nodeId: { 
              oneOf: [
                { type: 'string', description: 'Single node ID' },
                { type: 'array', items: { type: 'string' }, description: 'Array of node IDs for bulk operations' }
              ],
              description: 'Node ID(s) to operate on'
            },
            fillIndex: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Fill array index(es) for operations - single number or array for bulk operations (optional - if not provided, returns all fills)'
            },
            filterType: { 
              type: 'string', 
              enum: ['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND', 'IMAGE'],
              description: 'Filter fills by Paint type' 
            },
            color: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Hex color(s) for solid fills - single string or array for bulk operations'
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
            transformOffsetX: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Transform horizontal offset(s) (-1 to 1, 0=center) - single number or array for bulk operations'
            },
            transformOffsetY: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Transform vertical offset(s) (-1 to 1, 0=center) - single number or array for bulk operations'
            },
            transformScale: { 
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Transform uniform scale factor(s) (1.0=original, 2.0=double) - used in TILE mode - single number or array for bulk operations'
            },
            transformScaleX: { 
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Transform horizontal scale factor(s) (1.0=original, 2.0=double) - used in CROP mode - single number or array for bulk operations'
            },
            transformScaleY: { 
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Transform vertical scale factor(s) (1.0=original, 2.0=double) - used in CROP mode - single number or array for bulk operations'
            },
            transformRotation: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Transform rotation(s) in degrees - single number or array for bulk operations'
            },
            transformSkewX: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Transform horizontal skew angle(s) in degrees - used in CROP mode only - single number or array for bulk operations'
            },
            transformSkewY: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Transform vertical skew angle(s) in degrees - used in CROP mode only - single number or array for bulk operations'
            },
            filterExposure: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Image exposure filter value(s) - single number or array for bulk operations'
            },
            filterContrast: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Image contrast filter value(s) - single number or array for bulk operations'
            },
            filterSaturation: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Image saturation filter value(s) - single number or array for bulk operations'
            },
            filterTemperature: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Image temperature filter value(s) - single number or array for bulk operations'
            },
            filterTint: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Image tint filter value(s) - single number or array for bulk operations'
            },
            filterHighlights: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Image highlights filter value(s) - single number or array for bulk operations'
            },
            filterShadows: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Image shadows filter value(s) - single number or array for bulk operations'
            },
            sourceNodeId: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Source node ID(s) for pattern fills - single string or array for bulk operations'
            },
            patternTileType: { 
              oneOf: [
                { type: 'string', enum: ['RECTANGULAR', 'HORIZONTAL_HEXAGONAL', 'VERTICAL_HEXAGONAL'] },
                { type: 'array', items: { type: 'string', enum: ['RECTANGULAR', 'HORIZONTAL_HEXAGONAL', 'VERTICAL_HEXAGONAL'] } }
              ],
              description: 'Pattern tile type(s) - single value or array for bulk operations'
            },
            patternScalingFactor: { 
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Pattern scaling factor(s) - single number or array for bulk operations'
            },
            patternSpacingX: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Pattern horizontal spacing value(s) - single number or array for bulk operations'
            },
            patternSpacingY: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Pattern vertical spacing value(s) - single number or array for bulk operations'
            },
            patternHorizontalAlignment: { 
              oneOf: [
                { type: 'string', enum: ['START', 'CENTER', 'END'] },
                { type: 'array', items: { type: 'string', enum: ['START', 'CENTER', 'END'] } }
              ],
              description: 'Pattern horizontal alignment(s) - single value or array for bulk operations'
            },
            opacity: { 
              oneOf: [
                { type: 'number', minimum: 0, maximum: 1 },
                { type: 'array', items: { type: 'number', minimum: 0, maximum: 1 } }
              ],
              description: 'Fill opacity setting(s) from 0 to 1 - single number or array for bulk operations'
            },
            visible: { 
              oneOf: [
                { type: 'boolean' },
                { type: 'array', items: { type: 'boolean' } }
              ],
              description: 'Fill visibility setting(s) - single boolean or array for bulk operations'
            },
            blendMode: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Fill blend mode(s) - single string or array for bulk operations'
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
              description: 'Overwrite mode: NONE=add to existing (default), SINGLE=replace at same index, ALL=replace all fills'
            },
            x: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'X coordinate(s) for node creation - single number or array for bulk operations'
            },
            y: { 
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Y coordinate(s) for node creation - single number or array for bulk operations'
            },
            failFast: { type: 'boolean', description: 'Stop on first error in bulk operations' }
          },
          required: ['operation', 'nodeId']
        },
        examples: [
          '{"operation": "get", "nodeId": "node123"}',
          '{"operation": "get", "nodeId": "node123", "fillIndex": 0}',
          '{"operation": "add_solid", "nodeId": "node123", "color": "#FF0000", "opacity": 1.0}',
          '{"operation": "add_gradient", "nodeId": "node123", "gradientType": "GRADIENT_LINEAR", "stopPositions": [0, 1], "stopColors": ["#FF0000", "#0000FF"]}',
          '{"operation": "add_gradient", "nodeId": "node123", "gradientType": "GRADIENT_LINEAR"}',
          '{"operation": "add_gradient", "nodeId": "node123", "gradientType": "GRADIENT_LINEAR", "gradientStartX": 0, "gradientStartY": 0.5, "gradientEndX": 1, "gradientEndY": 0.5, "gradientScale": 1}',
          '{"operation": "add_gradient", "nodeId": "node123", "gradientType": "GRADIENT_RADIAL", "gradientStartX": 0.5, "gradientStartY": 0.5, "gradientEndX": 1, "gradientEndY": 0.5, "gradientScale": 0.8}',
          '{"operation": "add_gradient", "nodeId": "node123", "gradientType": "GRADIENT_LINEAR", "gradientStartX": 0.2, "gradientEndX": 0.8}',
          '{"operation": "add_image", "nodeId": "node123", "imageUrl": "https://example.com/image.jpg", "imageScaleMode": "FILL"}',
          '{"operation": "add_image", "nodeId": "node123", "imagePath": "/path/to/local/image.jpg", "imageScaleMode": "FILL"}',
          '{"operation": "add_image", "nodeId": "node123", "imagePath": "./assets/logo.png", "transformOffsetX": 0.2, "transformOffsetY": -0.1, "transformScale": 1.5, "transformRotation": 45}',
          '{"operation": "add_image", "nodeId": "node123", "imageHash": "abc123", "transformOffsetX": 0.2, "transformOffsetY": -0.1, "transformScale": 1.5, "transformRotation": 45}',
          '{"operation": "add_image", "nodeId": "node123", "imageUrl": "https://example.com/wide.jpg", "transformScaleX": 2.0, "transformScaleY": 0.5}',
          '{"operation": "add_image", "nodeId": "node123", "imageHash": "def456", "transformSkewX": 15, "imageTranslateX": 20, "imageFlipHorizontal": true}',
          '{"operation": "add_image", "nodeId": "node123", "imageUrl": "https://example.com/matrix.jpg", "imageTransform": [2, 0.5, 0.2, 1.5, 10, -5]}',
          '{"operation": "add_pattern", "nodeId": "node123", "sourceNodeId": "pattern456", "patternTileType": "RECTANGULAR", "patternScalingFactor": 1.0}',
          '{"operation": "add_pattern", "nodeId": "node123", "sourceNodeId": "pattern789", "patternTileType": "HORIZONTAL_HEXAGONAL", "patternScalingFactor": 0.5, "patternSpacingX": 10, "patternSpacingY": 15, "patternHorizontalAlignment": "CENTER"}',
          '{"operation": "update", "nodeId": "node123", "fillIndex": 0, "opacity": 0.5}',
          '{"operation": "update_solid", "nodeId": "node123", "fillIndex": 0, "color": "#00FF00"}',
          '{"operation": "update_gradient", "nodeId": "node123", "fillIndex": 0, "stopColors": ["#FFFF00", "#FF0000"], "stopPositions": [0, 1]}',
          '{"operation": "update_gradient", "nodeId": "node123", "fillIndex": 0, "gradientStartX": 0.2, "gradientStartY": 0.2, "gradientEndX": 0.8, "gradientEndY": 0.8, "gradientScale": 1}',
          '{"operation": "update_image", "nodeId": "node123", "fillIndex": 0, "imageScaleMode": "FIT"}',
          '{"operation": "update_image", "nodeId": "node123", "fillIndex": 0, "filterExposure": 0.3, "filterContrast": -0.2, "filterSaturation": 0.1}',
          '{"operation": "update_pattern", "nodeId": "node123", "fillIndex": 0, "patternScalingFactor": 2.0, "patternHorizontalAlignment": "END"}',
          '{"operation": "delete", "nodeId": "node123", "fillIndex": 1}',
          '{"operation": "duplicate", "fromNodeId": "source123", "toNodeId": "target456"}',
          '{"operation": "duplicate", "fromNodeId": "source123", "toNodeId": "target456", "overwrite": "ALL"}',
          '{"operation": "duplicate", "fromNodeId": "source123", "toNodeId": "target456", "fillIndex": 1, "overwrite": "SINGLE"}',
          '{"operation": "duplicate", "fromNodeId": "source123", "toNodeId": "target456", "fillIndex": 1}',
          '{"operation": "duplicate", "fromNodeId": ["source123", "source456"], "toNodeId": "target789"}',
          '{"operation": "duplicate", "fromNodeId": ["source123", "source456"], "toNodeId": ["target789", "target999"], "overwrite": "NONE"}',
          '{"operation": "clear", "nodeId": "node123"}'
        ]
      }
    ];
    
    // Response format notes:
    // - All operations return YAML with compact formatting
    // - Colors: rgb(255,0,0) or rgba(255,0,0,0.5) instead of {r:1,g:0,b:0,a:1}
    // - Gradient stops: "rgb(255,0,0) 0%, rgb(0,0,255) 100%" instead of array objects
    // - gradientTransform matrix is hidden, but converted to user-friendly flattened parameters
    // - Gradient positioning included as: gradientStartX, gradientStartY, gradientEndX, gradientEndY, gradientScale
    // - Node names included in results as "nodeName" field
    // - Bulk operations return "results" array with individual node results
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_fills') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_fills',
      operation: 'fills',
      bulkParams: ['nodeId', 'fillIndex', 'filterType', 'color', 'gradientType', 'gradientStartX', 'gradientStartY', 'gradientEndX', 'gradientEndY', 'gradientScale', 'imageUrl', 'imagePath', 'imageBytes', 'imageHash', 'imageScaleMode', 'imageTransform', 'transformOffsetX', 'transformOffsetY', 'transformScale', 'transformScaleX', 'transformScaleY', 'transformRotation', 'transformSkewX', 'transformSkewY', 'filterExposure', 'filterContrast', 'filterSaturation', 'filterTemperature', 'filterTint', 'filterHighlights', 'filterShadows', 'sourceNodeId', 'patternTileType', 'patternScalingFactor', 'patternSpacingX', 'patternSpacingY', 'patternHorizontalAlignment', 'opacity', 'visible', 'blendMode', 'newIndex', 'fromNodeId', 'toNodeId', 'overwrite', 'x', 'y'],
      paramConfigs: {
        // Core parameters
        operation: { expectedType: 'string' as const, required: true },
        nodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        fillIndex: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        filterType: { expectedType: 'string' as const, allowSingle: true },
        
        // Fill creation parameters
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
        
        // Transform parameters (new naming)
        transformOffsetX: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        transformOffsetY: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        transformScale: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        transformScaleX: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        transformScaleY: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        transformRotation: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        transformSkewX: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        transformSkewY: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        filterExposure: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        filterContrast: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        filterSaturation: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        filterTemperature: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        filterTint: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        filterHighlights: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        filterShadows: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        
        // Pattern parameters
        sourceNodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        patternTileType: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        patternScalingFactor: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        patternSpacingX: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        patternSpacingY: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        patternHorizontalAlignment: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        
        // Common fill properties
        opacity: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        visible: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true },
        blendMode: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        
        // Operation-specific parameters
        newIndex: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        fromNodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        toNodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        overwrite: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        
        // Coordinate parameters
        x: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        y: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        
        // Standard parameters
        failFast: { expectedType: 'boolean' as const, allowSingle: true }
      },
      pluginMessageType: 'MANAGE_FILLS',
      schema: ManageFillsSchema
    };

    // Preprocess args to handle local image loading
    const processedArgs = await this.preprocessImagePaths(args);
    
    debugLog('FillsHandler.handle passing to unifiedHandler', {
      originalKeys: Object.keys(args),
      processedKeys: Object.keys(processedArgs),
      hasImageBytes: !!processedArgs.imageBytes,
      hasImagePath: !!processedArgs.imagePath
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
    debugLog('FillsHandler.preprocessImagePaths called', { 
      operation: args.operation, 
      hasImagePath: !!args.imagePath,
      imagePath: args.imagePath,
      allArgs: Object.keys(args)
    });

    // Only process add_image operations that have imagePath
    if (args.operation !== 'add_image' || !args.imagePath) {
      debugLog('FillsHandler.preprocessImagePaths skipping', { 
        reason: args.operation !== 'add_image' ? 'wrong operation' : 'no imagePath'
      });
      return args;
    }

    debugLog('FillsHandler.preprocessImagePaths processing imagePath', { imagePath: args.imagePath });
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
      
      debugLog('FillsHandler.preprocessImagePaths completed', { 
        base64Length: imageDataArray.length === 1 ? imageDataArray[0]?.length : imageDataArray.map(b => b?.length),
        imageBytesType: imageDataArray.length === 1 ? typeof imageDataArray[0] : 'array',
        processedKeys: Object.keys(processedArgs)
      });
    }
    
    return processedArgs;
  }
}