import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { NodeHandlers } from './node-handlers.js';
import { SelectionHandlers } from './selection-handlers.js';
import { StyleHandlers } from './style-handlers.js';
import { LayoutHandlers } from './layout-handlers.js';

export class HandlerRegistry {
  private nodeHandlers: NodeHandlers;
  private selectionHandlers: SelectionHandlers;
  private styleHandlers: StyleHandlers;
  private layoutHandlers: LayoutHandlers;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.nodeHandlers = new NodeHandlers(sendToPluginFn);
    this.selectionHandlers = new SelectionHandlers(sendToPluginFn);
    this.styleHandlers = new StyleHandlers(sendToPluginFn);
    this.layoutHandlers = new LayoutHandlers(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'create_node',
        description: 'Create a new node in Figma (rectangle, ellipse, text, or frame)',
        inputSchema: {
          type: 'object',
          properties: {
            nodeType: {
              type: 'string',
              enum: ['rectangle', 'ellipse', 'text', 'frame'],
              description: 'Type of node to create'
            },
            name: { type: 'string', description: 'Node name' },
            width: { type: 'number', description: 'Width (required for rectangle, ellipse, frame)' },
            height: { type: 'number', description: 'Height (required for rectangle, ellipse, frame)' },
            fillColor: { type: 'string', description: 'Fill color (hex) - Use for all node types including text and frame fills' },
            strokeColor: { type: 'string', description: 'Stroke color (hex)' },
            strokeWidth: { type: 'number', description: 'Stroke width' },
            content: { type: 'string', description: 'Text content (required for text nodes)' },
            fontSize: { type: 'number', default: 16, description: 'Font size (for text nodes)' },
            fontFamily: { type: 'string', default: 'Inter', description: 'Font family (for text nodes)' },
            fontStyle: { type: 'string', description: 'Font style (for text nodes, e.g., Regular, Bold)' },
            textAlignHorizontal: { type: 'string', enum: ['left', 'center', 'right', 'justified'], description: 'Text alignment (for text nodes)' }
          },
          required: ['nodeType']
        },
        annotations: {
          description_extra: "For advanced typography features, use the create_text tool instead."
        },
        examples: [
          '{"nodeType": "rectangle", "width": 100, "height": 100, "fillColor": "#FF0000"}',
          '{"nodeType": "text", "content": "Hello, World!", "fontSize": 24}'
        ]
      },
      {
        name: 'create_text',
        description: 'Create a text node with advanced typography features',
        inputSchema: {
          type: 'object',
          properties: {
            characters: { type: 'string', description: 'Text content' },
            x: { type: 'number', default: 0, description: 'X position' },
            y: { type: 'number', default: 0, description: 'Y position' },
            width: { type: 'number', description: 'Width (optional, for fixed width text)' },
            height: { type: 'number', description: 'Height (optional)' },
            fontFamily: { type: 'string', default: 'Inter', description: 'Font family' },
            fontStyle: { type: 'string', default: 'Regular', description: 'Font style (e.g., Regular, Bold, Medium, Italic)' },
            fontSize: { type: 'number', default: 16, description: 'Font size in pixels' },
            textAlignHorizontal: { type: 'string', enum: ['left', 'center', 'right', 'justified'], description: 'Horizontal text alignment' },
            textAlignVertical: { type: 'string', enum: ['top', 'center', 'bottom'], description: 'Vertical text alignment' },
            textCase: { type: 'string', enum: ['original', 'upper', 'lower', 'title'], description: 'Text case transformation' },
            textDecoration: { type: 'string', enum: ['none', 'underline', 'strikethrough'], description: 'Text decoration' },
            letterSpacing: { type: 'number', description: 'Letter spacing in pixels' },
            lineHeight: { type: 'number', description: 'Line height value' },
            lineHeightUnit: { type: 'string', enum: ['px', 'percent'], default: 'percent', description: 'Line height unit' },
            fillColor: { type: 'string', description: 'Text color (hex)' },
            styleRanges: { 
              type: 'array', 
              description: 'Styled text ranges for mixed formatting',
              items: {
                type: 'object',
                properties: {
                  start: { type: 'number', description: 'Start index (0-based)' },
                  end: { type: 'number', description: 'End index (exclusive)' },
                  fontFamily: { type: 'string', description: 'Font family for this range' },
                  fontStyle: { type: 'string', description: 'Font style for this range' },
                  fontSize: { type: 'number', description: 'Font size for this range' },
                  fillColor: { type: 'string', description: 'Text color for this range (hex)' },
                  textDecoration: { type: 'string', description: 'Text decoration for this range' }
                },
                required: ['start', 'end']
              }
            },
            createStyle: { type: 'boolean', description: 'Whether to create a text style' },
            styleName: { type: 'string', description: 'Name for the created style (e.g., "Heading/H1")' }
          },
          required: ['characters']
        }
      },
      {
        name: 'update_node',
        description: 'Update properties of an existing node',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: { type: 'string', description: 'ID of the node to update' },
            width: { type: 'number', description: 'Width of the node' },
            height: { type: 'number', description: 'Height of the node' },
            x: { type: 'number', description: 'X position' },
            y: { type: 'number', description: 'Y position' },
            cornerRadius: { type: 'number', minimum: 0, description: 'Corner radius (applies to all corners)' },
            topLeftRadius: { type: 'number', minimum: 0, description: 'Top left corner radius' },
            topRightRadius: { type: 'number', minimum: 0, description: 'Top right corner radius' },
            bottomLeftRadius: { type: 'number', minimum: 0, description: 'Bottom left corner radius' },
            bottomRightRadius: { type: 'number', minimum: 0, description: 'Bottom right corner radius' },
            cornerSmoothing: { type: 'number', minimum: 0, maximum: 1, description: 'Corner smoothing (0-1)' },
            fillColor: { type: 'string', description: 'Fill color (hex)' },
            opacity: { type: 'number', minimum: 0, maximum: 1, description: 'Opacity (0-1)' },
            visible: { type: 'boolean', description: 'Visibility' },
            strokeColor: { type: 'string', description: 'Stroke color (hex)' },
            strokeWidth: { type: 'number', minimum: 0, description: 'Stroke width' },
            rotation: { type: 'number', description: 'Rotation in degrees' },
            locked: { type: 'boolean', description: 'Lock state' },
            clipsContent: { type: 'boolean', description: 'Clips content (frames only)' },
            content: { type: 'string', description: 'Text content (text nodes only)' },
            fontFamily: { type: 'string', description: 'Font family (text nodes)' },
            fontSize: { type: 'number', description: 'Font size (text nodes)' },
            fontStyle: { type: 'string', description: 'Font style (text nodes)' },
            textAlignHorizontal: { type: 'string', enum: ['left', 'center', 'right', 'justified'], description: 'Horizontal text alignment' },
            textAlignVertical: { type: 'string', enum: ['top', 'center', 'bottom'], description: 'Vertical text alignment' }
          },
          required: ['nodeId']
        }
      },
      {
        name: 'move_node',
        description: 'Move a node to a new position',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: { type: 'string', description: 'ID of the node to move' },
            x: { type: 'number', description: 'New X position' },
            y: { type: 'number', description: 'New Y position' }
          },
          required: ['nodeId', 'x', 'y']
        }
      },
      {
        name: 'delete_node',
        description: 'Delete a node from the design',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: { type: 'string', description: 'ID of the node to delete' }
          },
          required: ['nodeId']
        }
      },
      {
        name: 'duplicate_node',
        description: 'Duplicate an existing node',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: { type: 'string', description: 'ID of the node to duplicate' },
            offsetX: { type: 'number', default: 10, description: 'X offset for the duplicate' },
            offsetY: { type: 'number', default: 10, description: 'Y offset for the duplicate' }
          },
          required: ['nodeId']
        }
      },
      {
        name: 'get_selection',
        description: 'Get the currently selected nodes',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'set_selection',
        description: 'Set the selection to specific nodes',
        inputSchema: {
          type: 'object',
          properties: {
            nodeIds: { type: 'array', items: { type: 'string' }, description: 'Array of node IDs to select' }
          },
          required: ['nodeIds']
        }
      },
      {
        name: 'get_page_nodes',
        description: 'Get all nodes in the current page with hierarchy information',
        inputSchema: {
          type: 'object',
          properties: {
            detail: {
              type: 'string',
              enum: ['simple', 'standard', 'detailed'],
              default: 'standard',
              description: 'Level of detail: simple (id, name, type), standard (includes position/size), detailed (all properties)'
            },
            includeHidden: {
              type: 'boolean',
              default: false,
              description: 'Include hidden/invisible nodes'
            },
            includePages: {
              type: 'boolean',
              default: false,
              description: 'Include the page node itself in results'
            },
            nodeTypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by specific node types (e.g., ["FRAME", "TEXT"])'
            },
            maxDepth: {
              type: 'number',
              description: 'Maximum traversal depth (null for unlimited)'
            }
          }
        }
      },
      {
        name: 'export_node',
        description: 'Export a node as an image',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: { type: 'string', description: 'ID of the node to export' },
            format: { type: 'string', enum: ['PNG', 'JPG', 'SVG', 'PDF'], default: 'PNG', description: 'Export format' },
            scale: { type: 'number', default: 1, description: 'Export scale factor' }
          },
          required: ['nodeId']
        }
      },
      {
        name: 'manage_styles',
        description: 'Create, list, apply, or delete Figma styles (paint, text, effect, grid)',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { type: 'string', enum: ['create', 'list', 'apply', 'delete', 'get'], description: 'Style operation to perform' },
            styleType: { type: 'string', enum: ['paint', 'text', 'effect', 'grid'], description: 'Type of style' },
            styleName: { type: 'string', description: 'Name of the style' },
            styleId: { type: 'string', description: 'ID of the style' },
            nodeId: { type: 'string', description: 'Node ID (for apply operation)' }
          },
          required: ['operation']
        }
      },
      {
        name: 'manage_auto_layout',
        description: 'Enable, disable, update, or get auto layout properties for frames',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { type: 'string', enum: ['enable', 'disable', 'update', 'get_properties'], description: 'Auto layout operation' },
            nodeId: { type: 'string', description: 'Frame node ID' },
            direction: { type: 'string', enum: ['horizontal', 'vertical'], description: 'Layout direction' },
            spacing: { type: 'number', description: 'Spacing between children' },
            primaryAlignment: { type: 'string', enum: ['min', 'center', 'max', 'space_between'], description: 'Primary axis alignment' },
            counterAlignment: { type: 'string', enum: ['min', 'center', 'max'], description: 'Counter axis alignment' }
          },
          required: ['operation', 'nodeId']
        }
      },
      {
        name: 'manage_constraints',
        description: 'Set, get, or reset layout constraints for nodes',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { type: 'string', enum: ['set', 'get', 'reset', 'get_info'], description: 'Constraint operation' },
            nodeId: { type: 'string', description: 'Node ID' },
            horizontal: { type: 'string', enum: ['left', 'right', 'left_right', 'center', 'scale'], description: 'Horizontal constraint' },
            vertical: { type: 'string', enum: ['top', 'bottom', 'top_bottom', 'center', 'scale'], description: 'Vertical constraint' }
          },
          required: ['operation', 'nodeId']
        }
      },
      {
        name: 'manage_hierarchy',
        description: 'Group, ungroup, move, or reorder nodes in the hierarchy',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { type: 'string', enum: ['group', 'ungroup', 'move', 'reorder'], description: 'Hierarchy operation' },
            nodeId: { type: 'string', description: 'Node ID (for ungroup, move, reorder)' },
            nodeIds: { type: 'array', items: { type: 'string' }, description: 'Array of node IDs (for group)' },
            newParentId: { type: 'string', description: 'New parent node ID (for move)' },
            newIndex: { type: 'number', description: 'New index position (for reorder)' },
            name: { type: 'string', description: 'Group name (for group operation)' }
          },
          required: ['operation']
        }
      },
      {
        name: 'get_plugin_status',
        description: 'Get the current status of the Figma plugin connection',
        inputSchema: { type: 'object', properties: {} }
      }
    ];
  }

  async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
      case 'create_node':
        return await this.nodeHandlers.createNode(args);
      case 'create_text':
        return await this.nodeHandlers.createTextNode(args);
      case 'update_node':
        return await this.nodeHandlers.updateNode(args);
      case 'move_node':
        return await this.nodeHandlers.moveNode(args);
      case 'delete_node':
        return await this.nodeHandlers.deleteNode(args);
      case 'duplicate_node':
        return await this.nodeHandlers.duplicateNode(args);
      case 'get_selection':
        return await this.selectionHandlers.getSelection();
      case 'set_selection':
        return await this.selectionHandlers.setSelection(args);
      case 'get_page_nodes':
        return await this.selectionHandlers.getPageNodes(args);
      case 'export_node':
        return await this.selectionHandlers.exportNode(args);
      case 'manage_styles':
        return await this.styleHandlers.manageStyles(args);
      case 'manage_auto_layout':
        return await this.layoutHandlers.manageAutoLayout(args);
      case 'manage_constraints':
        return await this.layoutHandlers.manageConstraints(args);
      case 'manage_hierarchy':
        return await this.layoutHandlers.manageHierarchy(args);
      case 'get_plugin_status':
        return await this.getPluginStatus();
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async getPluginStatus() {
    return {
      content: [{
        type: 'text',
        text: '🟢 Plugin connection status: Active'
      }]
    };
  }
}