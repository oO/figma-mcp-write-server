import { Tool, ToolHandler, ToolResult, ManageAnnotationsSchema } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';

export class AnnotationsHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_annotations',
        description: 'Create and manage design annotations using Figma native API - annotations are stored directly on nodes and auto-cleanup when nodes are deleted',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['add_annotation', 'edit_annotation', 'remove_annotation', 'list_annotations', 'list_categories', 'cleanup_orphaned'],
              description: 'Annotation operation to perform (case-insensitive). Use list_categories to get valid categoryId values. Note: edit/remove operations identify annotations by label or categoryId since Figma API does not provide annotation IDs',
            },
            annotationId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Node ID(s) to annotate (required for add/edit operations) - single string or array for bulk operations'
            },
            label: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Annotation label text(s) - single string or array for bulk operations'
            },
            labelMarkdown: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Annotation label(s) with markdown formatting - single string or array for bulk operations'
            },
            pinProperty: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['width', 'height', 'maxWidth', 'minWidth', 'maxHeight', 'minHeight', 'fills', 'strokes', 'effects', 'strokeWeight', 'cornerRadius', 'opacity', 'textStyleId', 'textAlignHorizontal', 'fontFamily', 'fontStyle', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'itemSpacing', 'padding', 'layoutMode', 'alignItems', 'mainComponent']
              },
              description: 'Array of property names to pin in the annotation (e.g., ["fills", "width", "height"])'
            },
            categoryId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Category ID(s) for grouping annotations - must be valid Figma category IDs. Use operation "list_categories" to get available category IDs and labels. Single string or array for bulk operations'
            }
          },
          required: ['operation']
        }
      }
    ];
  }

  async handle(name: string, args: any): Promise<ToolResult> {
    if (name !== 'figma_annotations') {
      throw new Error(`Unknown tool: ${name}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_annotations',
      operation: 'annotations',
      bulkParams: ['annotationId', 'label', 'labelMarkdown', 'categoryId'],
      paramConfigs: {
        ...UnifiedParamConfigs.basic(),
        annotationId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        label: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        labelMarkdown: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        categoryId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        pinProperty: { expectedType: 'object' as const, allowSingle: true }
      },
      pluginMessageType: 'ANNOTATION_OPERATION',
      schema: ManageAnnotationsSchema
    };

    return this.unifiedHandler.handle(args, config);
  }
}