import { ManageAlignmentSchema, ToolHandler, ToolResult, Tool } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';

export class AlignmentHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_alignment',
        description: 'Align, position, distribute, or spread nodes with professional precision',
        inputSchema: {
          type: 'object',
          properties: {
            horizontalOperation: { type: 'string', enum: ['position', 'align', 'distribute', 'spread'], description: 'Horizontal operation type' },
            horizontalDirection: { type: 'string', enum: ['left', 'center', 'right'], description: 'Horizontal alignment direction' },
            horizontalReferencePoint: { type: 'string', enum: ['left', 'center', 'right'], description: 'Which part of reference to align to' },
            horizontalAlignmentPoint: { type: 'string', enum: ['left', 'center', 'right'], description: 'Which part of moving node to use for alignment' },
            horizontalSpacing: { type: 'number', description: 'Horizontal spacing for position/distribute operations' },
            verticalOperation: { type: 'string', enum: ['position', 'align', 'distribute', 'spread'], description: 'Vertical operation type' },
            verticalDirection: { type: 'string', enum: ['top', 'middle', 'bottom'], description: 'Vertical alignment direction' },
            verticalReferencePoint: { type: 'string', enum: ['top', 'middle', 'bottom'], description: 'Which part of reference to align to' },
            verticalAlignmentPoint: { type: 'string', enum: ['top', 'middle', 'bottom'], description: 'Which part of moving node to use for alignment' },
            verticalSpacing: { type: 'number', description: 'Vertical spacing for position/distribute operations' },
            nodeIds: { type: 'array', items: { type: 'string' }, description: 'Array of node IDs to align' },
            referenceMode: { type: 'string', enum: ['bounds', 'key_object', 'relative'], description: 'Reference calculation mode' },
            referenceNodeId: { type: 'string', description: 'Reference node ID for key_object or relative modes' },
            spreadDirection: { type: 'string', enum: ['horizontal', 'vertical'], description: 'Direction for spread operation' },
            spacing: { type: 'number', description: 'Exact pixel spacing between node bounding boxes for spread operation' },
            margin: { type: 'number', description: 'Additional margin for positioning operations' }
          },
          required: ['nodeIds']
        },
        examples: [
          '{"nodeIds": ["123:456", "123:789"], "horizontalOperation": "align", "horizontalDirection": "center"}',
          '{"nodeIds": ["123:456", "123:789", "123:012"], "verticalOperation": "distribute", "verticalSpacing": 20}',
          '{"nodeIds": ["123:456", "123:789", "123:012"], "spreadDirection": "horizontal", "spacing": 15}',
          '{"nodeIds": ["123:456", "123:789"], "spreadDirection": "vertical", "spacing": 30}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_alignment') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_alignment',
      operation: 'alignment',
      bulkParams: [], // Bulk operations not needed: alignment operates on nodeIds array inherently (multi-node by design)
      paramConfigs: {
        // Core alignment parameters
        nodeIds: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: false },
        
        // Horizontal alignment
        horizontalOperation: { expectedType: 'string' as const, allowSingle: true },
        horizontalDirection: { expectedType: 'string' as const, allowSingle: true },
        horizontalReferencePoint: { expectedType: 'string' as const, allowSingle: true },
        horizontalAlignmentPoint: { expectedType: 'string' as const, allowSingle: true },
        horizontalSpacing: { expectedType: 'number' as const, allowSingle: true },
        
        // Vertical alignment
        verticalOperation: { expectedType: 'string' as const, allowSingle: true },
        verticalDirection: { expectedType: 'string' as const, allowSingle: true },
        verticalReferencePoint: { expectedType: 'string' as const, allowSingle: true },
        verticalAlignmentPoint: { expectedType: 'string' as const, allowSingle: true },
        verticalSpacing: { expectedType: 'number' as const, allowSingle: true },
        
        // Reference configuration
        referenceMode: { expectedType: 'string' as const, allowSingle: true },
        referenceNodeId: { expectedType: 'string' as const, allowSingle: true },
        margin: { expectedType: 'number' as const, allowSingle: true },
        
        // Spread operation parameters
        spreadDirection: { expectedType: 'string' as const, allowSingle: true },
        spacing: { expectedType: 'number' as const, allowSingle: true },
        
        // Standard parameters
        failFast: { expectedType: 'boolean' as const, allowSingle: true }
      },
      pluginMessageType: 'MANAGE_ALIGNMENT',
      schema: ManageAlignmentSchema
    };

    return this.unifiedHandler.handle(args, config);
  }
}