import { ManageComponentsSchema, ToolHandler, ToolResult, Tool } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';

export class ComponentsHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_components',
        description: 'Create, manage component sets, and organize components with variant properties. Supported operations: create - Create new components from nodes, create_set - Create component sets from multiple components, update - Update component/set properties, delete - Delete components/sets, publish - Publish components, list - List components with filtering, get - Get component/set details',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['create', 'create_set', 'update', 'delete', 'publish', 'list', 'get'],
              description: 'Component operation to perform (case-insensitive): create - Create new components from nodes, create_set - Create component sets from multiple components, update - Update component/set properties, delete - Delete components/sets, publish - Publish components, list - List components with filtering, get - Get component/set details'
            },
            componentIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of component IDs for creating component sets'
            },
            name: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Component name(s) - single string or array for bulk operations'
            },
            description: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Component description(s) - single string or array for bulk operations'
            },
            x: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'X position(s) for component placement - single number or array for bulk operations'
            },
            y: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Y position(s) for component placement - single number or array for bulk operations'
            },
            variantProperties: {
              type: 'array',
              items: { type: 'string' },
              description: 'Flattened variant properties array parallel to componentIds (e.g., ["type=Primary, size=Small", "type=Secondary, size=Large"])'
            },
            properties: {
              type: 'object',
              additionalProperties: true,
              description: 'Component properties to update for instances or component sets'
            },
            variantName: {
              type: 'string',
              description: 'Variant property name to change (for change_variant operation)'
            },
            variantValue: {
              type: 'string',
              description: 'New variant property value (for change_variant operation)'
            },
            variants: {
              type: 'object',
              additionalProperties: { type: 'string' },
              description: 'Multiple variant properties to change as key-value pairs (for change_variant operation)'
            },
            includeInstances: {
              type: 'boolean',
              description: 'Include instances in component listing (default: false)'
            },
            filterType: {
              type: 'string',
              enum: ['all', 'components', 'component_sets'],
              description: 'Filter type for component listing (case-insensitive: all, components, component_sets) (default: all)'
            },
            componentId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Universal node ID for target operations (get, update, delete, publish) - works with any node type - single string or array for bulk operations'
            },
            failFast: { type: 'boolean', description: 'Stop on first error in bulk operations (default: false)' }
          },
          required: ['operation']
        },
        examples: [
          '{"operation": "create", "componentId": "123:456", "name": "Button Primary", "description": "Primary button component"}',
          '{"operation": "create_set", "componentIds": ["789:123", "789:456", "789:789", "789:101"], "name": "Button Variants", "variantProperties": ["type=Primary, size=Small", "type=Primary, size=Large", "type=Secondary, size=Small", "type=Secondary, size=Large"]}',
          '{"operation": "update", "componentId": "789:123", "name": "Updated Button", "description": "Updated button component"}',
          '{"operation": "delete", "componentId": "789:123"}',
          '{"operation": "publish", "componentId": "789:123", "description": "Published button component"}',
          '{"operation": "list", "includeInstances": true, "filterType": "components"}',
          '{"operation": "get", "componentId": "789:123"}',
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_components') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_components',
      operation: 'components',
      bulkParams: ['componentId', 'name', 'description', 'x', 'y'],
      paramConfigs: {
        ...UnifiedParamConfigs.withPositioning(),
        componentId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        name: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        description: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        componentIds: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: false },
        variantProperties: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: false },
        includeInstances: { expectedType: 'boolean' as const },
        filterType: { expectedType: 'string' as const },
        properties: { expectedType: 'object' as const },
        variantName: { expectedType: 'string' as const },
        variantValue: { expectedType: 'string' as const },
        variants: { expectedType: 'object' as const },
        failFast: { expectedType: 'boolean' as const }
      },
      pluginMessageType: 'MANAGE_COMPONENTS',
      schema: ManageComponentsSchema,
      operationParameters: {
        'create': ['componentId', 'name', 'description', 'x', 'y'],
        'create_set': ['componentIds', 'name', 'variantProperties'],
        'update': ['componentId', 'name', 'description', 'properties', 'x', 'y', 'variantName', 'variantValue', 'variants'],
        'delete': ['componentId'],
        'publish': ['componentId', 'description'],
        'list': ['includeInstances', 'filterType'],
        'get': ['componentId']
      }
    };

    return this.unifiedHandler.handle(args, config);
  }

}