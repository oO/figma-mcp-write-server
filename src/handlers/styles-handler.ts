import { ManageStylesSchema, ToolHandler, ToolResult, Tool } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';

export class StyleHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_styles',
        description: 'Create, update, list, apply, delete, get, and duplicate paint, text, effect, and grid styles',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { 
              type: 'string', 
              enum: ['create', 'update', 'list', 'apply', 'delete', 'get', 'duplicate'], 
              description: 'Style operation to perform (case-insensitive: create, update, list, apply, delete, get, duplicate)'
            },
            nodeId: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Node ID(s) to apply styles to - single string or array for bulk operations' 
            },
            type: { 
              oneOf: [
                { type: 'string', enum: ['paint', 'text', 'effect', 'grid'] },
                { type: 'array', items: { type: 'string', enum: ['paint', 'text', 'effect', 'grid'] } }
              ],
              description: 'Style type(s) for create/list operations (case-insensitive: paint, text, effect, grid) - single value or array for bulk operations' 
            },
            name: { 
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Style name(s) for create/apply operations. Use forward slashes for folders: "Typography/Headers/H1" creates nested folder structure. Moving styles between folders changes their names - single string or array for bulk operations' 
            },
            description: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Style description(s) for create/update operations - single string or array for bulk operations'
            },
            styleId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Style ID(s) for update/apply/delete/get operations - single string or array for bulk operations'
            },
            color: {
              oneOf: [
                { type: 'string', pattern: '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$' },
                { type: 'array', items: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$' } }
              ],
              description: 'Color(s) in hex format for paint styles - single string or array for bulk operations'
            },
            paintType: {
              oneOf: [
                { type: 'string', enum: ['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND'] },
                { type: 'array', items: { type: 'string', enum: ['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND'] } }
              ],
              description: 'Paint type(s) for paint styles using Figma API values - single value or array for bulk operations'
            },
            opacity: {
              oneOf: [
                { type: 'number', minimum: 0, maximum: 1 },
                { type: 'array', items: { type: 'number', minimum: 0, maximum: 1 } }
              ],
              description: 'Opacity value(s) from 0 to 1 for paint styles - single number or array for bulk operations'
            },
            fontFamily: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Font family name(s) for text styles - single string or array for bulk operations'
            },
            fontStyle: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Font style(s) (e.g., Regular, Bold, Italic) for text styles - single string or array for bulk operations'
            },
            fontSize: {
              oneOf: [
                { type: 'number', minimum: 1 },
                { type: 'array', items: { type: 'number', minimum: 1 } }
              ],
              description: 'Font size(s) for text styles - single number or array for bulk operations'
            },
            letterSpacing: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Letter spacing value(s) for text styles - single number or array for bulk operations'
            },
            lineHeight: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Line height value(s) for text styles - single number or array for bulk operations'
            },
            paragraphSpacing: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Paragraph spacing value(s) for text styles - single number or array for bulk operations'
            },
            textCase: {
              oneOf: [
                { type: 'string', enum: ['ORIGINAL', 'UPPER', 'LOWER', 'TITLE'] },
                { type: 'array', items: { type: 'string', enum: ['ORIGINAL', 'UPPER', 'LOWER', 'TITLE'] } }
              ],
              description: 'Text case value(s) for text styles - single value or array for bulk operations'
            },
            textDecoration: {
              oneOf: [
                { type: 'string', enum: ['NONE', 'UNDERLINE', 'STRIKETHROUGH'] },
                { type: 'array', items: { type: 'string', enum: ['NONE', 'UNDERLINE', 'STRIKETHROUGH'] } }
              ],
              description: 'Text decoration value(s) for text styles - single value or array for bulk operations'
            },
            gradientStops: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  position: { type: 'number', minimum: 0, maximum: 1 },
                  color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                  opacity: { type: 'number', minimum: 0, maximum: 1 }
                },
                required: ['position', 'color']
              },
              description: 'Gradient stops for gradient paint styles'
            },
            layoutGrids: {
              oneOf: [
                {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      pattern: { type: 'string', enum: ['COLUMNS', 'ROWS', 'GRID'] },
                      sectionSize: { type: 'number', minimum: 1 },
                      color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$' },
                      alignment: { type: 'string', enum: ['MIN', 'CENTER', 'MAX', 'STRETCH'] },
                      gutterSize: { type: 'number', minimum: 0 },
                      offset: { type: 'number' },
                      count: { type: 'number', minimum: 1 },
                      visible: { type: 'boolean' }
                    },
                    required: ['pattern']
                  }
                },
                {
                  type: 'array',
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        pattern: { type: 'string', enum: ['COLUMNS', 'ROWS', 'GRID'] },
                        sectionSize: { type: 'number', minimum: 1 },
                        color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$' },
                        alignment: { type: 'string', enum: ['MIN', 'CENTER', 'MAX', 'STRETCH'] },
                        gutterSize: { type: 'number', minimum: 0 },
                        offset: { type: 'number' },
                        count: { type: 'number', minimum: 1 },
                        visible: { type: 'boolean' }
                      },
                      required: ['pattern']
                    }
                  }
                }
              ],
              description: 'Layout grids for grid styles - single array or array of arrays for bulk operations'
            },
            failFast: { 
              type: 'boolean', 
              description: 'Stop on first error in bulk operations (default: false)' 
            }
          },
          required: ['operation']
        },
        examples: [
          '{"operation": "create", "type": "paint", "name": "Brand/Colors/Primary", "color": "#FF5733"}',
          '{"operation": "create", "type": "paint", "name": "UI/Components/Button/Primary", "description": "Primary brand color for buttons and links", "color": "#0066CC"}',
          '{"operation": "create", "type": "text", "name": "Typography/Body/Regular", "fontFamily": "Inter", "fontStyle": "Regular", "fontSize": 16}',
          '{"operation": "create", "type": "text", "name": "Typography/Headers/H1", "description": "Large headline text", "fontFamily": "Inter", "fontStyle": "Bold", "fontSize": 32, "letterSpacing": -0.5, "lineHeight": 38}',
          '{"operation": "list", "type": "paint"}',
          '{"operation": "apply", "nodeId": "123:456", "styleId": "S:abc123"}',
          '{"operation": "apply", "nodeId": "123:456", "name": "Brand/Colors/Primary"}',
          '{"operation": "update", "styleId": "S:abc123", "name": "Brand/Colors/Updated", "color": "#33FF57"}',
          '{"operation": "get", "styleId": "S:abc123"}',
          '{"operation": "delete", "styleId": "S:abc123"}',
          '{"operation": "duplicate", "styleId": "S:abc123", "name": "Brand/Colors/Primary Copy"}',
          '{"operation": "duplicate", "styleId": "S:def456", "name": "Typography/Body/Bold", "description": "Duplicated from regular body text"}',
          '{"operation": "create", "type": "effect", "name": "UI/Effects/Drop Shadow", "description": "Empty effect style - use figma_effects to add effects"}',
          '{"operation": "create", "type": "grid", "name": "Layout/Grids/12 Column", "layoutGrids": [{"pattern": "COLUMNS", "count": 12, "gutterSize": 20, "color": "#FF0000"}]}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_styles') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_styles',
      operation: 'styles',
      bulkParams: ['nodeId', 'type', 'name', 'description', 'styleId', 'color', 'paintType', 'opacity', 'fontFamily', 'fontStyle', 'fontSize', 'letterSpacing', 'lineHeight', 'paragraphSpacing', 'textCase', 'textDecoration', 'layoutGrids'],
      paramConfigs: {
        ...UnifiedParamConfigs.withNodeId(),
        type: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        name: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        description: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        styleId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        color: { 
          expectedType: 'array' as const, 
          arrayItemType: 'string' as const, 
          allowSingle: true,
          validator: (v: any) => typeof v === 'string' && /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(v) 
        },
        paintType: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        opacity: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        fontFamily: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        fontStyle: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        fontSize: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        letterSpacing: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        lineHeight: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        paragraphSpacing: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        textCase: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        textDecoration: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        layoutGrids: { expectedType: 'array' as const, arrayItemType: 'array' as const, allowSingle: true }
      },
      pluginMessageType: 'MANAGE_STYLES',
      schema: ManageStylesSchema,
      operationParameters: {
        create: ['type', 'name', 'description', 'color', 'paintType', 'opacity', 'fontFamily', 'fontStyle', 'fontSize', 'letterSpacing', 'lineHeight', 'paragraphSpacing', 'textCase', 'textDecoration', 'gradientStops', 'layoutGrids', 'failFast'],
        update: ['styleId', 'name', 'description', 'color', 'paintType', 'opacity', 'fontFamily', 'fontStyle', 'fontSize', 'letterSpacing', 'lineHeight', 'paragraphSpacing', 'textCase', 'textDecoration', 'gradientStops', 'layoutGrids', 'failFast'],
        list: ['type', 'failFast'],
        apply: ['nodeId', 'styleId', 'type', 'failFast'],
        delete: ['styleId', 'failFast'],
        get: ['styleId', 'failFast'],
        duplicate: ['styleId', 'name', 'description', 'failFast']
      }
    };

    return this.unifiedHandler.handle(args, config);
  }
}