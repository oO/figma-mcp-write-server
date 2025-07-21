import { ManageEffectsSchema, ToolHandler, ToolResult, Tool, Color } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';
import { EffectTransformUtils, EffectParams } from '../utils/effects-utils.js';

export class EffectsHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_effects',
        description: 'Create, update, delete, get, reorder, and duplicate effects on nodes or styles',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['create', 'update', 'delete', 'get', 'reorder', 'duplicate'],
              description: 'Effect operation to perform (case-insensitive)'
            },
            owner: {
              oneOf: [
                { type: 'string', pattern: '^(node|style):.+' },
                { type: 'array', items: { type: 'string', pattern: '^(node|style):.+' } }
              ],
              description: 'Target container in format "node:ID" or "style:ID" - single string or array for bulk operations'
            },
            effectType: {
              oneOf: [
                { type: 'string', enum: ['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR', 'NOISE', 'TEXTURE'] },
                { type: 'array', items: { type: 'string', enum: ['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR', 'NOISE', 'TEXTURE'] } }
              ],
              description: 'Effect type(s) for create operations - single value or array for bulk operations'
            },
            effectIndex: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Effect index(es) for update/delete/duplicate operations - single number or array for bulk operations'
            },
            newIndex: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Target position(s) for reorder/duplicate operations - single number or array for bulk operations'
            },
            // Color parameters (hex format)
            color: {
              oneOf: [
                { type: 'string', pattern: '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$' },
                { type: 'array', items: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$' } }
              ],
              description: 'Color(s) in hex format (#RRGGBB or #RRGGBBAA) - single string or array for bulk operations'
            },
            secondaryColor: {
              oneOf: [
                { type: 'string', pattern: '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$' },
                { type: 'array', items: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$' } }
              ],
              description: 'Secondary color(s) in hex format (#RRGGBB or #RRGGBBAA) - single string or array for bulk operations'
            },
            // Offset parameters (separated x and y)
            offsetX: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Offset X value(s) for shadow effects - single number or array for bulk operations'
            },
            offsetY: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Offset Y value(s) for shadow effects - single number or array for bulk operations'
            },
            // Numeric parameters
            radius: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Radius value(s) for blur/shadow effects - single number or array for bulk operations'
            },
            spread: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Spread value(s) for shadow effects - single number or array for bulk operations'
            },
            size: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Size value(s) for noise/texture effects - single number or array for bulk operations'
            },
            density: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Density value(s) for noise effects - single number or array for bulk operations'
            },
            opacity: {
              oneOf: [
                { type: 'number', minimum: 0, maximum: 1 },
                { type: 'array', items: { type: 'number', minimum: 0, maximum: 1 } }
              ],
              description: 'Opacity value(s) from 0 to 1 - single number or array for bulk operations'
            },
            // Boolean parameters
            visible: {
              oneOf: [
                { type: 'boolean' },
                { type: 'array', items: { type: 'boolean' } }
              ],
              description: 'Visibility setting(s) for effects - single boolean or array for bulk operations'
            },
            showShadowBehindNode: {
              oneOf: [
                { type: 'boolean' },
                { type: 'array', items: { type: 'boolean' } }
              ],
              description: 'Show shadow behind node setting(s) for drop shadow effects - single boolean or array for bulk operations'
            },
            // Enum parameters
            blendMode: {
              oneOf: [
                { type: 'string', enum: ['NORMAL', 'DARKEN', 'MULTIPLY', 'LINEAR_BURN', 'COLOR_BURN', 'LIGHTEN', 'SCREEN', 'LINEAR_DODGE', 'COLOR_DODGE', 'OVERLAY', 'SOFT_LIGHT', 'HARD_LIGHT', 'DIFFERENCE', 'EXCLUSION', 'HUE', 'SATURATION', 'COLOR', 'LUMINOSITY'] },
                { type: 'array', items: { type: 'string', enum: ['NORMAL', 'DARKEN', 'MULTIPLY', 'LINEAR_BURN', 'COLOR_BURN', 'LIGHTEN', 'SCREEN', 'LINEAR_DODGE', 'COLOR_DODGE', 'OVERLAY', 'SOFT_LIGHT', 'HARD_LIGHT', 'DIFFERENCE', 'EXCLUSION', 'HUE', 'SATURATION', 'COLOR', 'LUMINOSITY'] } }
              ],
              description: 'Blend mode(s) for effects - single value or array for bulk operations'
            },
            noiseType: {
              oneOf: [
                { type: 'string', enum: ['MONOTONE', 'DUOTONE', 'MULTITONE'] },
                { type: 'array', items: { type: 'string', enum: ['MONOTONE', 'DUOTONE', 'MULTITONE'] } }
              ],
              description: 'Noise type(s) for noise effects - single value or array for bulk operations'
            },
            clipToShape: {
              oneOf: [
                { type: 'boolean' },
                { type: 'array', items: { type: 'boolean' } }
              ],
              description: 'Clip to shape for texture effects - single value or array for bulk operations'
            },
            // Bulk operation controls
            failFast: {
              type: 'boolean',
              description: 'Stop on first error in bulk operations (default: false)'
            }
          },
          required: ['operation', 'owner']
        },
        examples: [
          // Create operations
          '{"operation": "create", "owner": "node:123:456", "effectType": "DROP_SHADOW", "color": "#00000040", "offsetX": 0, "offsetY": 2, "radius": 4}',
          '{"operation": "create", "owner": "style:S:abc123", "effectType": "INNER_SHADOW", "color": "#FF000080", "offsetX": 2, "offsetY": 2, "radius": 3, "spread": 1}',
          '{"operation": "create", "owner": "node:123:456", "effectType": "LAYER_BLUR", "radius": 8, "visible": true}',
          '{"operation": "create", "owner": "node:123:456", "effectType": "NOISE", "size": 2, "density": 0.8, "noiseType": "MONOTONE", "color": "#000000", "opacity": 0.3}',
          
          // Bulk create operations
          '{"operation": "create", "owner": ["node:123:456", "node:123:789"], "effectType": ["DROP_SHADOW", "INNER_SHADOW"], "color": ["#00000040", "#FF000080"], "offsetX": [0, 2], "offsetY": [2, 2], "radius": [4, 3]}',
          
          // Update operations
          '{"operation": "update", "owner": "node:123:456", "effectIndex": 0, "color": "#0000FF4D", "radius": 6}',
          '{"operation": "update", "owner": "style:S:abc123", "effectIndex": 1, "visible": false}',
          
          // Other operations
          '{"operation": "get", "owner": "node:123:456"}',
          '{"operation": "delete", "owner": "node:123:456", "effectIndex": 0}',
          '{"operation": "reorder", "owner": "node:123:456", "effectIndex": 2, "newIndex": 0}',
          '{"operation": "duplicate", "owner": "node:123:456", "effectIndex": 0, "newIndex": 2}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_effects') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_effects',
      operation: 'effects',
      bulkParams: ['owner', 'effectType', 'effectIndex', 'newIndex', 'color', 'secondaryColor', 'offsetX', 'offsetY', 'radius', 'spread', 'size', 'density', 'opacity', 'visible', 'showShadowBehindNode', 'blendMode', 'noiseType', 'clipToShape'],
      paramConfigs: {
        ...UnifiedParamConfigs.basic(),
        owner: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        effectType: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        effectIndex: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        newIndex: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        color: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        secondaryColor: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        offsetX: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        offsetY: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        radius: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        spread: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        size: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        density: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        opacity: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        visible: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true },
        showShadowBehindNode: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true },
        blendMode: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        noiseType: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        clipToShape: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true }
      },
      pluginMessageType: 'MANAGE_EFFECTS', // Will be overridden by customHandler
      schema: ManageEffectsSchema,
      operationParameters: {
        create: ['owner', 'effectType', 'color', 'secondaryColor', 'offsetX', 'offsetY', 'radius', 'spread', 'size', 'density', 'opacity', 'visible', 'showShadowBehindNode', 'blendMode', 'noiseType', 'clipToShape', 'failFast'],
        update: ['owner', 'effectIndex', 'color', 'secondaryColor', 'offsetX', 'offsetY', 'radius', 'spread', 'size', 'density', 'opacity', 'visible', 'showShadowBehindNode', 'blendMode', 'noiseType', 'clipToShape', 'failFast'],
        delete: ['owner', 'effectIndex', 'failFast'],
        get: ['owner', 'failFast'],
        reorder: ['owner', 'effectIndex', 'newIndex', 'failFast'],
        duplicate: ['owner', 'effectIndex', 'failFast']
      },
      customHandler: async (normalizedArgs) => {
        // Transform flat parameters to structured effect parameters
        const transformedArgs = EffectTransformUtils.transformFlatParamsToEffectParams(normalizedArgs);
        
        // Route to appropriate plugin operation based on operation type
        const operationMap: Record<string, string> = {
          'create': 'CREATE_EFFECT',
          'update': 'UPDATE_EFFECT',
          'delete': 'DELETE_EFFECT',
          'get': 'GET_EFFECTS',
          'reorder': 'REORDER_EFFECT',
          'duplicate': 'DUPLICATE_EFFECT'
        };

        const pluginMessageType = operationMap[transformedArgs.operation];
        if (!pluginMessageType) {
          throw new Error(`Unknown effects operation: ${transformedArgs.operation}`);
        }

        // Send to plugin with appropriate message type
        return this.unifiedHandler.sendPluginRequest({
          type: pluginMessageType,
          payload: transformedArgs
        });
      }
    };

    return this.unifiedHandler.handle(args, config);
  }

  // Complex transformation logic moved to effects-utils.ts for better maintainability
}