import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import WebSocket, { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
import { 
  CreateNodeSchema,
  CreateTextSchema,
  UpdateNodeSchema,
  MoveNodeSchema,
  DeleteNodeSchema,
  DuplicateNodeSchema,
  SetSelectionSchema,
  ExportNodeSchema,
  ManageStylesSchema,
  ServerConfig,
  DEFAULT_CONFIG
} from './types.js';

export class FigmaMCPServer {
  private server: Server;
  private wsServer: WebSocketServer | null = null;
  private pluginConnection: WebSocket | null = null;
  private config: ServerConfig;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.server = new Server(
      {
        name: 'figma-mcp-write-server',
        version: '0.9.3',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private async checkPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const testServer = createServer();
      
      testServer.listen(port, () => {
        testServer.close(() => resolve(true));
      });
      
      testServer.on('error', () => resolve(false));
    });
  }

  private async findZombieProcesses(port: number): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`lsof -ti :${port}`);
      return stdout.trim().split('\n').filter(pid => pid);
    } catch (error) {
      // No processes found on port (which is good)
      return [];
    }
  }

  private async killZombieProcesses(pids: string[]): Promise<void> {
    for (const pid of pids) {
      try {
        console.error(`🧟 Killing zombie process ${pid} on port ${this.config.port}`);
        await execAsync(`kill -9 ${pid}`);
        // Wait a bit for process to actually die
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`⚠️ Could not kill process ${pid}:`, error);
      }
    }
  }

  private async findAvailablePort(startPort: number, maxTries: number = 10): Promise<number> {
    for (let port = startPort; port < startPort + maxTries; port++) {
      if (await this.checkPortAvailable(port)) {
        return port;
      }
    }
    throw new Error(`No available ports found in range ${startPort}-${startPort + maxTries - 1}`);
  }

  private async setupWebSocketServer(): Promise<void> {
    let port = this.config.port;
    let zombieProcesses: string[] = [];
    
    // Check if default port is available
    const isPortAvailable = await this.checkPortAvailable(port);
    
    if (!isPortAvailable) {
      console.error(`⚠️ Port ${port} is in use`);
      
      // Look for zombie processes
      zombieProcesses = await this.findZombieProcesses(port);
      
      if (zombieProcesses.length > 0) {
        console.error(`🧟 Found ${zombieProcesses.length} process(es) using port ${port}: ${zombieProcesses.join(', ')}`);
        console.error('🔪 Attempting to kill zombie processes...');
        
        await this.killZombieProcesses(zombieProcesses);
        
        // Check if port is now available
        if (await this.checkPortAvailable(port)) {
          console.error(`✅ Successfully freed port ${port}`);
        } else {
          console.error(`❌ Port ${port} still in use after cleanup`);
          
          // Find alternative port
          try {
            port = await this.findAvailablePort(port + 1);
            console.error(`🔄 Using alternative port ${port}`);
            this.config.port = port; // Update config
          } catch (error) {
            throw new Error(`Cannot start WebSocket server: ${error}`);
          }
        }
      } else {
        // Port in use but no zombie processes found - find alternative
        try {
          port = await this.findAvailablePort(port + 1);
          console.error(`🔄 Port ${this.config.port} in use, using alternative port ${port}`);
          this.config.port = port; // Update config
        } catch (error) {
          throw new Error(`Cannot start WebSocket server: ${error}`);
        }
      }
    }

    // Create WebSocket server
    this.wsServer = new WebSocketServer({ port });
    
    this.wsServer.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is still in use. Try a different port or kill existing processes.`);
        throw new Error(`WebSocket server failed to start: Port ${port} is in use`);
      } else {
        console.error('💥 WebSocket server error:', error);
        throw error;
      }
    });
    
    this.wsServer.on('connection', (ws) => {
      console.error('🔗 New WebSocket connection');
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(ws, message);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      });
      
      ws.on('close', () => {
        if (ws === this.pluginConnection) {
          console.error('❌ Figma plugin disconnected');
          this.pluginConnection = null;
        }
      });
      
      ws.on('error', (error) => {
        console.error('💥 WebSocket error:', error);
      });
    });
  }

  private handleWebSocketMessage(ws: WebSocket, message: any): void {
    if (message.type === 'PLUGIN_HELLO') {
      console.error('✅ Figma plugin connected');
      this.pluginConnection = ws;
      ws.send(JSON.stringify({ type: 'CONNECTED', role: 'plugin' }));
      return;
    }
    
    // Handle responses from plugin
    if (message.id && this.pendingRequests.has(message.id)) {
      const request = this.pendingRequests.get(message.id)!;
      clearTimeout(request.timeout);
      this.pendingRequests.delete(message.id);
      
      if (message.success) {
        request.resolve(message);
      } else {
        request.reject(new Error(message.error || 'Plugin operation failed'));
      }
    }
  }

  private async sendToPlugin(request: any): Promise<any> {
    if (!this.pluginConnection) {
      throw new Error('Figma plugin not connected. Please run the plugin in Figma.');
    }

    const id = uuidv4();
    const fullRequest = { ...request, id };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Plugin request timeout after 30s'));
      }, 30000);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      try {
        this.pluginConnection!.send(JSON.stringify(fullRequest));
        console.error('📤 Sent to plugin:', request.type);
      } catch (error) {
        this.pendingRequests.delete(id);
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  // Enhanced text node creation with typography features
  private async createTextNode(params: any): Promise<any> {
      try {
          console.error(`🔤 Creating text node with advanced typography`);
             
          // Validate required parameters
          if (!params.characters) {
              throw new Error('Text nodes must have characters content');
          }

          // Set name if not provided
          if (!params.name) {
              params.name = 'Text';
          }
             
          // Prepare line height in Figma's expected format
          let lineHeight = undefined;
          if (params.lineHeight) {
              lineHeight = {
                  value: params.lineHeight,
                  unit: (params.lineHeightUnit === 'px') ? 'PIXELS' : 'PERCENT'
              };
          }
             
          // Convert styleRanges to Figma's expected format
          const styleRanges = params.styleRanges?.map((range: any) => {
              const figmaRange: any = {
                  start: range.start,
                  end: range.end,
              };
                
              if (range.fontFamily || range.fontStyle) {
                  figmaRange.fontName = {
                      family: range.fontFamily || params.fontFamily || 'Inter',
                      style: range.fontStyle || 'Regular'
                  };
              }
                
              if (range.fontSize) figmaRange.fontSize = range.fontSize;
              if (range.textCase) figmaRange.textCase = range.textCase.toUpperCase();
              if (range.textDecoration) figmaRange.textDecoration = range.textDecoration.toUpperCase();
              if (range.letterSpacing) figmaRange.letterSpacing = range.letterSpacing;
              if (range.lineHeight) {
                  figmaRange.lineHeight = {
                      value: range.lineHeight,
                      unit: 'PERCENT' // Default to percent for ranges
                  };
              }
                
              if (range.fillColor) {
                  figmaRange.fills = [{
                      type: 'SOLID',
                      color: this.hexToRgb(range.fillColor)
                  }];
              }
                
              return figmaRange;
          });
            
          // Prepare Figma-compatible parameters
          const figmaParams: any = {
              nodeType: 'text',
              content: params.characters,
              x: params.x || 0,
              y: params.y || 0,
              width: params.width,
              height: params.height,
                
              // Font properties in Figma format
              fontName: {
                  family: params.fontFamily || 'Inter',
                  style: params.fontStyle || 'Regular'
              },
              fontSize: params.fontSize || 16,
                
              // Alignment (convert to uppercase for Figma)
              textAlignHorizontal: params.textAlignHorizontal?.toUpperCase(),
              textAlignVertical: params.textAlignVertical?.toUpperCase(),
                
              // Text case and decoration
              textCase: params.textCase?.toUpperCase(),
              textDecoration: params.textDecoration?.toUpperCase(),
                
              // Spacing
              letterSpacing: params.letterSpacing,
              lineHeight: lineHeight,
              paragraphIndent: params.paragraphIndent,
              paragraphSpacing: params.paragraphSpacing,
                
              // Style ranges
              styleRanges: styleRanges,
              
              // Style management
              createStyle: params.createStyle,
              styleName: params.styleName
          };
            
          // Set fill color if provided
          if (params.fillColor) {
              figmaParams.fills = [{
                  type: 'SOLID',
                  color: this.hexToRgb(params.fillColor)
              }];
          }
            
          // Send creation request to plugin
          const result = await this.sendToPlugin({
            type: 'CREATE_TEXT',
            payload: figmaParams
          });
            
          if (!result.success) {
              throw new Error(result.error || 'Failed to create text node');
          }
            
          // Build a user-friendly message
          let message = `Created text`;
            
          if (params.characters) {
              const previewText = params.characters.substring(0, 20) + 
                                 (params.characters.length > 20 ? '...' : '');
              message += ` with content "${previewText}"`;
          }
            
          if (params.fontFamily) {
              message += ` using ${params.fontFamily}`;
              if (params.fontSize) {
                  message += ` at ${params.fontSize}px`;
              }
          }
            
          if (params.styleRanges && params.styleRanges.length > 0) {
              message += ` with ${params.styleRanges.length} styled ranges`;
          }
            
          if (params.createStyle && params.styleName) {
              message += ` and created style "${params.styleName}"`;
          }
            
          return {
              content: [
                  {
                      type: "text",
                      text: `✅ ${message}`
                  }
              ]
          };
            
      } catch (error: any) {
          console.error('❌ Error creating text node:', error);
          return {
              content: [
                  {
                      type: "text",
                      text: `❌ Error: ${error.message || 'Failed to create text node'}`
                  }
              ],
              isError: true
          };
      }
  }
     
  // Helper to convert hex color to RGB
  private hexToRgb(hex: string): {r: number, g: number, b: number} {
      // Remove # if present
      hex = hex.replace(/^#/, '');
        
      // Parse hex values
      const bigint = parseInt(hex, 16);
      const r = ((bigint >> 16) & 255) / 255;
      const g = ((bigint >> 8) & 255) / 255;
      const b = (bigint & 255) / 255;
        
      return { r, g, b };
  }
    
  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
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
          },
          examples: [
            '{"characters": "Hello World", "fontSize": 24, "fontFamily": "Inter", "fontStyle": "Bold"}',
            '{"characters": "Mixed Styling Example", "fontSize": 20, "styleRanges": [{"start": 0, "end": 5, "fontStyle": "Bold"}, {"start": 6, "end": 13, "fillColor": "#FF0000"}]}'
          ]
        },
        {
          name: 'update_node',
          description: 'Update properties of an existing node in Figma',
          inputSchema: {
            type: 'object',
            properties: {
              nodeId: { type: 'string', description: 'ID of the node to update' },
              properties: { 
                type: 'object', 
                description: 'Properties to update (e.g., {name: "New Name", x: 100})' 
              }
            },
            required: ['nodeId', 'properties']
          },
        },
        {
          name: 'move_node',
          description: 'Move a node to a new position in Figma',
          inputSchema: {
            type: 'object',
            properties: {
              nodeId: { type: 'string', description: 'ID of the node to move' },
              x: { type: 'number', description: 'New X position' },
              y: { type: 'number', description: 'New Y position' }
            },
            required: ['nodeId', 'x', 'y']
          },
        },
        {
          name: 'delete_node',
          description: 'Delete a node from Figma',
          inputSchema: {
            type: 'object',
            properties: {
              nodeId: { type: 'string', description: 'ID of the node to delete' }
            },
            required: ['nodeId']
          },
        },
        {
          name: 'duplicate_node',
          description: 'Duplicate a node in Figma',
          inputSchema: {
            type: 'object',
            properties: {
              nodeId: { type: 'string', description: 'ID of the node to duplicate' },
              offsetX: { type: 'number', default: 10, description: 'X offset for duplicate' },
              offsetY: { type: 'number', default: 10, description: 'Y offset for duplicate' }
            },
            required: ['nodeId']
          },
        },
        {
          name: 'set_selection',
          description: 'Set the selection to specific nodes in Figma',
          inputSchema: {
            type: 'object',
            properties: {
              nodeIds: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Array of node IDs to select' 
              }
            },
            required: ['nodeIds']
          },
        },
        {
          name: 'get_selection',
          description: 'Get the current selection in Figma',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          },
        },
        {
          name: 'get_page_nodes',
          description: 'Get all nodes on the current page in Figma',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          },
        },
        {
          name: 'export_node',
          description: 'Export a node as an image from Figma',
          inputSchema: {
            type: 'object',
            properties: {
              nodeId: { type: 'string', description: 'ID of the node to export' },
              format: { 
                type: 'string', 
                enum: ['PNG', 'JPG', 'SVG', 'PDF'],
                default: 'PNG',
                description: 'Export format' 
              },
              scale: { 
                type: 'number', 
                default: 1, 
                description: 'Export scale (1 = 100%)' 
              }
            },
            required: ['nodeId']
          },
        },
        {
          name: 'manage_styles',
          description: 'Comprehensive style management for all Figma style types (paint, text, effect, grid)',
          inputSchema: {
            type: 'object',
            properties: {
              operation: { 
                type: 'string', 
                enum: ['create', 'list', 'apply', 'delete', 'get'],
                description: 'Style operation to perform'
              },
              styleType: { 
                type: 'string', 
                enum: ['paint', 'text', 'effect', 'grid'],
                description: 'Type of style (required for create/list operations)'
              },
              styleName: { type: 'string', description: 'Style name (required for create operations)' },
              styleId: { type: 'string', description: 'Style ID for apply/delete/get operations' },
              nodeId: { type: 'string', description: 'Target node ID (required for apply operation)' },
              
              // Paint Style Properties
              paintType: { 
                type: 'string', 
                enum: ['solid', 'gradient_linear', 'gradient_radial', 'gradient_angular', 'gradient_diamond', 'image'],
                description: 'Paint type for paint styles'
              },
              color: { type: 'string', description: 'Color (hex) for solid paints' },
              opacity: { type: 'number', description: 'Paint opacity (0-1)' },
              gradientStops: { 
                type: 'array',
                description: 'Gradient color stops',
                items: {
                  type: 'object',
                  properties: {
                    position: { type: 'number', description: 'Stop position (0-1)' },
                    color: { type: 'string', description: 'Stop color (hex)' },
                    opacity: { type: 'number', description: 'Stop opacity (0-1)', default: 1 }
                  }
                }
              },
              gradientTransform: { type: 'array', description: 'Gradient transformation matrix' },
              imageHash: { type: 'string', description: 'Image hash for image fills' },
              scaleMode: { type: 'string', enum: ['fill', 'fit', 'crop', 'tile'], description: 'Image scale mode' },
              
              // Text Style Properties  
              fontFamily: { type: 'string', description: 'Font family' },
              fontStyle: { type: 'string', description: 'Font style (Regular, Bold, etc.)' },
              fontSize: { type: 'number', description: 'Font size' },
              fontWeight: { type: 'number', description: 'Font weight' },
              textAlignHorizontal: { type: 'string', enum: ['left', 'center', 'right', 'justified'], description: 'Horizontal alignment' },
              textAlignVertical: { type: 'string', enum: ['top', 'center', 'bottom'], description: 'Vertical alignment' },
              textAutoResize: { type: 'string', enum: ['none', 'width_and_height', 'height'], description: 'Auto resize mode' },
              textCase: { type: 'string', enum: ['original', 'upper', 'lower', 'title'], description: 'Text case' },
              textDecoration: { type: 'string', enum: ['none', 'underline', 'strikethrough'], description: 'Text decoration' },
              letterSpacing: { type: 'number', description: 'Letter spacing' },
              lineHeight: { type: 'number', description: 'Line height value' },
              lineHeightUnit: { type: 'string', enum: ['pixels', 'percent', 'auto'], description: 'Line height unit' },
              paragraphIndent: { type: 'number', description: 'Paragraph indent' },
              paragraphSpacing: { type: 'number', description: 'Paragraph spacing' },
              listSpacing: { type: 'number', description: 'List spacing' },
              hangingPunctuation: { type: 'boolean', description: 'Hanging punctuation' },
              hangingList: { type: 'boolean', description: 'Hanging list' },
              textTruncation: { type: 'string', enum: ['disabled', 'ending'], description: 'Text truncation' },
              maxLines: { type: 'number', description: 'Maximum lines for truncation' },
              fillColor: { type: 'string', description: 'Text fill color (hex)' },
              
              // Effect Style Properties
              effects: {
                type: 'array',
                description: 'Array of effects',
                items: {
                  type: 'object',
                  properties: {
                    type: { 
                      type: 'string', 
                      enum: ['drop_shadow', 'inner_shadow', 'layer_blur', 'background_blur'],
                      description: 'Effect type'
                    },
                    visible: { type: 'boolean', description: 'Effect visibility' },
                    color: { type: 'string', description: 'Effect color (hex)' },
                    opacity: { type: 'number', description: 'Effect opacity (0-1)', default: 1 },
                    blendMode: { type: 'string', description: 'Blend mode' },
                    offset: {
                      type: 'object',
                      description: 'Shadow offset',
                      properties: {
                        x: { type: 'number', description: 'X offset' },
                        y: { type: 'number', description: 'Y offset' }
                      }
                    },
                    radius: { type: 'number', description: 'Blur radius' },
                    spread: { type: 'number', description: 'Shadow spread' },
                    showShadowBehindNode: { type: 'boolean', description: 'Show shadow behind node' }
                  }
                }
              },
              
              // Grid Style Properties
              layoutGrids: {
                type: 'array',
                description: 'Layout grid configurations',
                items: {
                  type: 'object',
                  properties: {
                    pattern: { type: 'string', enum: ['columns', 'rows', 'grid'], description: 'Grid pattern' },
                    sectionSize: { type: 'number', description: 'Section size' },
                    visible: { type: 'boolean', description: 'Grid visibility' },
                    color: { type: 'string', description: 'Grid color (hex)' },
                    alignment: { type: 'string', enum: ['min', 'max', 'center', 'stretch'], description: 'Grid alignment' },
                    gutterSize: { type: 'number', description: 'Gutter size' },
                    offset: { type: 'number', description: 'Grid offset' },
                    count: { type: 'number', description: 'Column/row count' }
                  }
                }
              }
            },
            required: ['operation']
          },
          examples: [
            '{"operation": "create", "styleType": "paint", "styleName": "Primary Blue", "paintType": "solid", "color": "#0066FF"}',
            '{"operation": "create", "styleType": "paint", "styleName": "Blue Gradient", "paintType": "gradient_linear", "gradientStops": [{"position": 0, "color": "#0066FF", "opacity": 1}, {"position": 1, "color": "#003399", "opacity": 0.8}]}',
            '{"operation": "create", "styleType": "effect", "styleName": "Drop Shadow", "effects": [{"type": "drop_shadow", "color": "#000000", "opacity": 0.25, "offset": {"x": 0, "y": 4}, "radius": 4}]}',
            '{"operation": "create", "styleType": "text", "styleName": "Heading/H1", "fontSize": 32, "fontFamily": "Inter", "fontStyle": "Bold"}',
            '{"operation": "apply", "styleId": "S:abc123", "nodeId": "1:2"}',
            '{"operation": "list", "styleType": "paint"}'
          ]
        },
        {
          name: 'manage_hierarchy',
          description: 'Comprehensive layer organization and hierarchy manipulation - grouping, depth sorting, and parent-child relationships',
          inputSchema: {
            type: 'object',
            properties: {
              operation: {
                type: 'string',
                enum: [
                  'group', 'ungroup', 'frame',
                  'bring_to_front', 'send_to_back', 'bring_forward', 'send_backward',
                  'reorder', 'move_above', 'move_below',
                  'move_to_parent', 'get_parent', 'get_children', 'get_siblings',
                  'get_ancestors', 'get_descendants', 'get_layer_index'
                ],
                description: 'Hierarchy operation to perform'
              },
              nodeId: {
                type: 'string',
                description: 'ID of the node to operate on (required for most operations)'
              },
              nodeIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of node IDs (required for group operations)'
              },
              targetNodeId: {
                type: 'string',
                description: 'Target node ID for relative operations (move_above, move_below)'
              },
              newParentId: {
                type: 'string',
                description: 'New parent node ID (required for move_to_parent)'
              },
              newIndex: {
                type: 'number',
                description: 'New index position for reorder or move_to_parent operations'
              },
              name: {
                type: 'string',
                description: 'Name for new groups or frames'
              },
              groupType: {
                type: 'string',
                enum: ['GROUP', 'FRAME'],
                default: 'GROUP',
                description: 'Type of container to create (for group operation)'
              }
            },
            required: ['operation']
          },
          examples: [
            '{"operation": "group", "nodeIds": ["1:2", "1:3", "1:4"], "name": "Navigation Bar", "groupType": "GROUP"}',
            '{"operation": "ungroup", "nodeId": "1:5"}',
            '{"operation": "frame", "nodeIds": ["1:2", "1:3"], "name": "Button Group"}',
            '{"operation": "bring_to_front", "nodeId": "1:2"}',
            '{"operation": "send_to_back", "nodeId": "1:3"}',
            '{"operation": "bring_forward", "nodeId": "1:4"}',
            '{"operation": "send_backward", "nodeId": "1:5"}',
            '{"operation": "reorder", "nodeId": "1:2", "newIndex": 0}',
            '{"operation": "move_above", "nodeId": "1:2", "targetNodeId": "1:3"}',
            '{"operation": "move_below", "nodeId": "1:2", "targetNodeId": "1:3"}',
            '{"operation": "move_to_parent", "nodeId": "1:2", "newParentId": "1:10", "newIndex": 0}',
            '{"operation": "get_parent", "nodeId": "1:2"}',
            '{"operation": "get_children", "nodeId": "1:5"}',
            '{"operation": "get_siblings", "nodeId": "1:2"}',
            '{"operation": "get_ancestors", "nodeId": "1:2"}',
            '{"operation": "get_descendants", "nodeId": "1:5"}',
            '{"operation": "get_layer_index", "nodeId": "1:2"}'
          ]
        },
        {
          name: 'get_plugin_status',
          description: 'Check if the Figma plugin is connected and ready',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          },
          outputSchema: {
            type: 'object',
            properties: {
              connected: { type: 'boolean' },
              lastHeartbeat: { type: 'string' }
            }
          }
        }
      ];
      
      return { tools };
    });
    
    // Handle tool requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { params } = request;
      const name = request.params.name;
      const args = request.params.arguments || {};
      console.error(`🔧 Executing tool: ${name}`);
      
      try {        
        switch (name) {
          case 'create_node':
            return await this.createNode(args);
                  
          case 'create_text':
            return await this.createTextNode(args);
          case 'update_node':
            return await this.updateNode(args);
          case 'move_node':
            return await this.moveNode(args);
          case 'delete_node':
            return await this.deleteNode(args);
          case 'duplicate_node':
            return await this.duplicateNode(args);
          case 'set_selection':
            return await this.setSelection(args);
          case 'get_selection':
            return await this.getSelection();
          case 'get_page_nodes':
            return await this.getPageNodes();
          case 'export_node':
            return await this.exportNode(args);
          case 'manage_styles':
            return await this.manageStyles(args);
          case 'manage_hierarchy':
            return await this.manageHierarchy(args);
          case 'get_plugin_status':
            return await this.getPluginStatus();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Tool execution error [${name}]:`, errorMessage);
        
        return {
          content: [
              {
                  type: "text",
                  text: `❌ Error: ${errorMessage}`
              }
          ],
          isError: true
        };
      }
    });
  }

  // Tool implementations

  private async manageStyles(args: any): Promise<any> {
    try {
      const validatedArgs = ManageStylesSchema.parse(args);
      
      const result = await this.sendToPlugin({
        type: 'MANAGE_STYLES',
        payload: validatedArgs
      });

      return {
        content: [
          {
            type: "text",
            text: `✅ Style operation ${validatedArgs.operation} completed successfully: ${JSON.stringify(result, null, 2)}`
          }
        ]
      };
    } catch (error) {
      console.error('❌ Error in manageStyles:', error);
      throw error;
    }
  }

  private async createNode(args: any): Promise<any> {
    try {
      const params = CreateNodeSchema.parse(args);
      
      // If this is a text node, forward to our enhanced typography handler
      if (params.nodeType === 'text') {
        // Map from old format to new typography format
        const textParams = {
          characters: params.content,
          x: params.x,
          y: params.y,
          width: params.width,
          height: params.height,
          fontFamily: params.fontFamily,
          fontSize: params.fontSize,
          fontStyle: params.fontStyle,
          textAlignHorizontal: params.textAlignHorizontal,
          fillColor: params.fillColor
        };
        return await this.createTextNode(textParams);
      }
      
      // Create a mutable copy for applying defaults
      const nodeParams = { ...params };

      // Set default names based on node type if not provided
      if (!nodeParams.name) {
        switch (nodeParams.nodeType) {
          case 'rectangle':
            nodeParams.name = 'Rectangle';
            break;
          case 'ellipse':
            nodeParams.name = 'Ellipse';
            break;
          case 'frame':
            nodeParams.name = 'Frame';
            break;
        }
      }

      // Set default dimensions for shape nodes if not provided
      if (nodeParams.nodeType === 'rectangle' || nodeParams.nodeType === 'ellipse') {
        if (nodeParams.width === undefined) nodeParams.width = 100;
        if (nodeParams.height === undefined) nodeParams.height = 100;
      } else if (nodeParams.nodeType === 'frame') {
        if (nodeParams.width === undefined) nodeParams.width = 200;
        if (nodeParams.height === undefined) nodeParams.height = 200;
      }

      // Send to plugin with standard operation type
      const response = await this.sendToPlugin({
        type: 'CREATE_NODE',
        payload: nodeParams
      });

      if (!response.success) {
        throw new Error(response.error || `Failed to create ${nodeParams.nodeType} node`);
      }

      // Generate appropriate success message based on node type
      let message = `Created ${nodeParams.nodeType} "${nodeParams.name}" at (${nodeParams.x}, ${nodeParams.y})`;
      
      if (nodeParams.width && nodeParams.height) {
        message += ` with size ${nodeParams.width}x${nodeParams.height}`;
      }
      
      if (nodeParams.fillColor) {
        message += ` with color ${nodeParams.fillColor}`;
      }

      return {
        content: [{
          type: 'text',
          text: message
        }]
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Text nodes must have non-empty content')) {
        throw new Error(`Text nodes require non-empty content. Please provide a 'content' property.`);
      }
      throw new Error(`Failed to create node: ${error instanceof Error ? error.message : String(error)}`);
    }
  }


  private async updateNode(args: any) {
    const params = UpdateNodeSchema.parse(args);
    
    const response = await this.sendToPlugin({
      type: 'UPDATE_NODE',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Updated node ${params.nodeId} with properties: ${JSON.stringify(params.properties)}`
      }]
    };
  }

  private async moveNode(args: any) {
    const params = MoveNodeSchema.parse(args);
    
    const response = await this.sendToPlugin({
      type: 'MOVE_NODE',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Moved node ${params.nodeId} to position (${params.x}, ${params.y})`
      }]
    };
  }

  private async deleteNode(args: any) {
    const params = DeleteNodeSchema.parse(args);
    
    const response = await this.sendToPlugin({
      type: 'DELETE_NODE',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Deleted node ${params.nodeId}`
      }]
    };
  }

  private async duplicateNode(args: any) {
    const params = DuplicateNodeSchema.parse(args);
    
    const response = await this.sendToPlugin({
      type: 'DUPLICATE_NODE',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Duplicated node ${params.nodeId} with offset (${params.offsetX}, ${params.offsetY})`
      }]
    };
  }

  private async setSelection(args: any) {
    const params = SetSelectionSchema.parse(args);
    
    const response = await this.sendToPlugin({
      type: 'SET_SELECTION',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Set selection to ${params.nodeIds.length} node(s): ${params.nodeIds.join(', ')}`
      }]
    };
  }

  private async getSelection() {
    const response = await this.sendToPlugin({
      type: 'GET_SELECTION'
    });

    return {
      content: [{
        type: 'text',
        text: `📋 Current selection: ${JSON.stringify(response.data, null, 2)}`
      }]
    };
  }

  private async getPageNodes() {
    const response = await this.sendToPlugin({
      type: 'GET_PAGE_NODES'
    });

    const data = response.data;
    let resultText = `📄 Page Hierarchy (${data?.totalCount || 0} total nodes, ${data?.topLevelCount || 0} top-level)\n\n`;
    
    if (data?.nodes && Array.isArray(data.nodes)) {
      // Group nodes by depth for better visualization
      const nodesByDepth: { [key: number]: any[] } = {};
      data.nodes.forEach((node: any) => {
        const depth = node.depth || 0;
        if (!nodesByDepth[depth]) nodesByDepth[depth] = [];
        nodesByDepth[depth].push(node);
      });

      // Display hierarchy with indentation
      Object.keys(nodesByDepth).sort((a, b) => parseInt(a) - parseInt(b)).forEach(depth => {
        const indent = '  '.repeat(parseInt(depth));
        const nodes = nodesByDepth[parseInt(depth)];
        
        if (!nodes || nodes.length === 0) return;
        
        if (parseInt(depth) === 0) {
          resultText += `🌳 Top Level (${nodes.length} nodes):\n`;
        } else {
          resultText += `${'  '.repeat(parseInt(depth) - 1)}📁 Level ${depth} (${nodes.length} nodes):\n`;
        }
        
        nodes.forEach((node: any) => {
          const childInfo = node.childCount > 0 ? ` [${node.childCount} children]` : '';
          const position = node.x !== undefined && node.y !== undefined ? ` at (${Math.round(node.x)}, ${Math.round(node.y)})` : '';
          resultText += `${indent}• ${node.name} (${node.type})${childInfo} - ID: ${node.id}${position}\n`;
        });
        resultText += '\n';
      });
    } else {
      resultText += '⚠️ No node data received or invalid format\n';
      resultText += `Raw response: ${JSON.stringify(data, null, 2)}`;
    }

    return {
      content: [{
        type: 'text',
        text: resultText
      }]
    };
  }

  private async exportNode(args: any) {
    const params = ExportNodeSchema.parse(args);
    
    const response = await this.sendToPlugin({
      type: 'EXPORT_NODE',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Exported node ${params.nodeId} as ${params.format} with scale ${params.scale}`
      }]
    };
  }

  private async manageHierarchy(args: any) {
    const { operation, nodeId, nodeIds, targetNodeId, newParentId, newIndex, name, groupType } = args;

    // Validate required parameters based on operation
    switch (operation) {
      case 'group':
      case 'frame':
        if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
          throw new Error(`${operation} operation requires nodeIds array`);
        }
        break;
      case 'ungroup':
      case 'bring_to_front':
      case 'send_to_back':
      case 'bring_forward':
      case 'send_backward':
      case 'get_parent':
      case 'get_children':
      case 'get_siblings':
      case 'get_ancestors':
      case 'get_descendants':
      case 'get_layer_index':
        if (!nodeId) {
          throw new Error(`${operation} operation requires nodeId`);
        }
        break;
      case 'reorder':
        if (!nodeId || newIndex === undefined) {
          throw new Error('reorder operation requires nodeId and newIndex');
        }
        break;
      case 'move_above':
      case 'move_below':
        if (!nodeId || !targetNodeId) {
          throw new Error(`${operation} operation requires nodeId and targetNodeId`);
        }
        break;
      case 'move_to_parent':
        if (!nodeId || !newParentId) {
          throw new Error('move_to_parent operation requires nodeId and newParentId');
        }
        break;
    }

    const response = await this.sendToPlugin({
      type: 'MANAGE_HIERARCHY',
      payload: {
        operation,
        nodeId,
        nodeIds,
        targetNodeId,
        newParentId,
        newIndex,
        name,
        groupType: groupType || 'GROUP'
      }
    });

    // Format response based on operation type
    let resultText = '';
    const data = response.data;
    
    switch (operation) {
      case 'group':
        resultText = `✅ Created ${groupType?.toLowerCase() || 'group'}: ${data?.id || 'Unknown ID'}${name ? ` (${name})` : ''}\n`;
        if (data?.children !== undefined) {
          resultText += `📦 Contains ${data.children} child nodes`;
        }
        if (data?.id) {
          resultText += `\n🆔 Node ID: ${data.id} (use this for future operations)`;
        }
        break;
      case 'ungroup':
        resultText = `✅ Ungrouped node: ${nodeId}`;
        if (data?.ungroupedContainer) {
          resultText += `\n📦 Ungrouped ${data.ungroupedContainer.type}: "${data.ungroupedContainer.name}"`;
        }
        if (data?.movedChildren !== undefined) {
          resultText += `\n📤 Moved ${data.movedChildren} children to parent`;
          if (data.childrenIds && data.childrenIds.length > 0) {
            resultText += `\n🆔 Child IDs: ${data.childrenIds.join(', ')} (now available for individual operations)`;
          }
        }
        if (data?.message) {
          resultText += `\n💡 ${data.message}`;
        }
        break;
      case 'frame':
        resultText = `✅ Created frame: ${data?.id || 'Unknown ID'}${name ? ` (${name})` : ''}\n`;
        if (data?.children !== undefined) {
          resultText += `📦 Contains ${data.children} child nodes`;
        }
        if (data?.id) {
          resultText += `\n🆔 Node ID: ${data.id} (use this for future operations)`;
        }
        break;
      case 'bring_to_front':
        resultText = `✅ Brought to front: ${nodeId}`;
        if (data?.newIndex !== undefined) {
          resultText += `\n📊 New index: ${data.newIndex}`;
          if (data.previousIndex !== undefined) {
            resultText += ` (was ${data.previousIndex})`;
          }
        }
        break;
      case 'send_to_back':
        resultText = `✅ Sent to back: ${nodeId}`;
        if (data?.newIndex !== undefined) {
          resultText += `\n📊 New index: ${data.newIndex}`;
          if (data.previousIndex !== undefined) {
            resultText += ` (was ${data.previousIndex})`;
          }
        }
        break;
      case 'bring_forward':
        resultText = `✅ Brought forward: ${nodeId}`;
        if (data?.newIndex !== undefined) {
          resultText += `\n📊 New index: ${data.newIndex}`;
          if (data.previousIndex !== undefined) {
            resultText += ` (was ${data.previousIndex})`;
          }
        }
        if (data?.message) {
          resultText += `\n💡 ${data.message}`;
        }
        break;
      case 'send_backward':
        resultText = `✅ Sent backward: ${nodeId}`;
        if (data?.newIndex !== undefined) {
          resultText += `\n📊 New index: ${data.newIndex}`;
          if (data.previousIndex !== undefined) {
            resultText += ` (was ${data.previousIndex})`;
          }
        }
        if (data?.message) {
          resultText += `\n💡 ${data.message}`;
        }
        break;
      case 'reorder':
        resultText = `✅ Reordered ${nodeId}`;
        if (data?.newIndex !== undefined && data?.requestedIndex !== undefined) {
          resultText += `\n📊 Requested index: ${data.requestedIndex}, Actual index: ${data.newIndex}`;
          if (data.requestedIndex !== data.newIndex) {
            resultText += ` (adjusted by Figma - use ${data.newIndex} for future references)`;
          }
        }
        break;
      case 'move_above':
        resultText = `✅ Moved ${nodeId} above ${targetNodeId}`;
        if (data?.newIndex !== undefined) {
          resultText += `\n📊 New index: ${data.newIndex}`;
          if (data.previousIndex !== undefined) {
            resultText += ` (was ${data.previousIndex})`;
          }
          if (data.targetIndex !== undefined) {
            resultText += `\n🎯 Target was at index: ${data.targetIndex}`;
          }
        }
        break;
      case 'move_below':
        resultText = `✅ Moved ${nodeId} below ${targetNodeId}`;
        if (data?.newIndex !== undefined) {
          resultText += `\n📊 New index: ${data.newIndex}`;
          if (data.previousIndex !== undefined) {
            resultText += ` (was ${data.previousIndex})`;
          }
          if (data.targetIndex !== undefined) {
            resultText += `\n🎯 Target was at index: ${data.targetIndex}`;
          }
        }
        break;
      case 'move_to_parent':
        resultText = `✅ Moved ${nodeId} to parent ${newParentId}`;
        if (data?.newIndex !== undefined) {
          resultText += `\n📊 Index in new parent: ${data.newIndex}`;
          if (data.requestedIndex !== undefined && data.requestedIndex !== data.newIndex) {
            resultText += ` (requested ${data.requestedIndex}, adjusted by Figma)`;
          }
        }
        break;
      case 'get_parent':
        if (data) {
          resultText = `🔍 Parent of ${nodeId}: ${data.name} (${data.type}) - ID: ${data.id}`;
        } else {
          resultText = `🔍 Node ${nodeId} has no parent (likely a root node)`;
        }
        break;
      case 'get_children':
        resultText = `🔍 Children of ${nodeId}: ${Array.isArray(data) ? data.length : 0} nodes`;
        if (Array.isArray(data) && data.length > 0) {
          resultText += `\n📋 ${data.map(child => `${child.name} (${child.type}) - ID: ${child.id}`).join(', ')}`;
        }
        break;
      case 'get_siblings':
        resultText = `🔍 Siblings of ${nodeId}: ${Array.isArray(data) ? data.length : 0} nodes`;
        if (Array.isArray(data) && data.length > 0) {
          resultText += `\n📋 ${data.map(sibling => `${sibling.name} (${sibling.type}) - ID: ${sibling.id}`).join(', ')}`;
        }
        break;
      case 'get_ancestors':
        resultText = `🔍 Ancestors of ${nodeId}: ${Array.isArray(data) ? data.length : 0} levels`;
        if (Array.isArray(data) && data.length > 0) {
          resultText += `\n🌳 ${data.map(ancestor => `${ancestor.name} (${ancestor.type}) - ID: ${ancestor.id}`).join(' ← ')}`;
        }
        break;
      case 'get_descendants':
        resultText = `🔍 Descendants of ${nodeId}: ${Array.isArray(data) ? data.length : 0} nodes`;
        if (Array.isArray(data) && data.length > 0) {
          const types = data.reduce((acc, desc) => {
            acc[desc.type] = (acc[desc.type] || 0) + 1;
            return acc;
          }, {});
          resultText += `\n📊 Types: ${Object.entries(types).map(([type, count]) => `${count} ${type}`).join(', ')}`;
        }
        break;
      case 'get_layer_index':
        resultText = `🔍 Layer index of ${nodeId}: ${data}`;
        if (typeof data === 'number') {
          resultText += ` (position in parent's children array)`;
        }
        break;
      default:
        resultText = `✅ ${operation} completed`;
        if (data) {
          resultText += `\n📋 Result: ${JSON.stringify(data, null, 2)}`;
        }
        break;
    }

    return {
      content: [{
        type: 'text',
        text: resultText
      }]
    };
  }

  private async getPluginStatus() {
    return {
      content: [{
        type: 'text',
        text: `🔌 Plugin Status:
- Connected: ${this.pluginConnection ? '✅' : '❌'}
- WebSocket Server: ${this.wsServer ? 'Running' : 'Stopped'} on port ${this.config.port}
- Pending Requests: ${this.pendingRequests.size}
- Server Address: ws://localhost:${this.config.port}

${!this.pluginConnection ? 
  '⚠️ To enable write operations:\n1. Open Figma Desktop\n2. Go to Plugins → Development → Import plugin from manifest\n3. Select figma-plugin/manifest.json\n4. Run the plugin\n\n💡 If plugin won\'t connect, try: node dist/index.js --check-port ' + this.config.port : 
  '🎉 Ready for Figma operations!'}`
      }]
    };
  }

  public async start(): Promise<void> {
    console.error('🎨 Figma MCP Write Server');
    console.error('============================');
    console.error('🚀 Starting server...');
    
    try {
      // Setup WebSocket server with port management
      await this.setupWebSocketServer();
      
      // Connect MCP transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      console.error('✅ MCP Server started successfully');
      console.error(`🔌 WebSocket server running on port ${this.config.port}`);
      console.error('💡 Available tools: 13 total - create/update/move/delete/duplicate elements, manage selection, hierarchy, export, status');
      console.error('📱 Run the Figma plugin to enable write operations');
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    console.error('🛑 Stopping server...');
    
    // Clear pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Server shutting down'));
    }
    this.pendingRequests.clear();
    
    // Close WebSocket server
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    // Close MCP server
    await this.server.close();
    console.error('✅ Server stopped');
  }

  public isPluginConnected(): boolean {
    return this.pluginConnection !== null;
  }
}
