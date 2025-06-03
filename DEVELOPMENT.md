# Development Guide

## 🏗️ Architecture Overview

The Figma MCP Write Server implements a three-layer architecture connecting AI agents to Figma through the Plugin API:

```mermaid
graph TB
    subgraph "AI Layer"
        AI[AI Agent/Client]
        MCP_CLIENT[Claude Desktop<br/>MCP Client]
    end
    
    subgraph "Server Layer"
        MCP_SERVER[Figma MCP Server]
        MCP_PROTOCOL[MCP Protocol Layer<br/>stdio transport]
        WS_SERVER[WebSocket Server<br/>Port 8765]
        REGISTRY[Handler Registry]
        
        subgraph "Handlers"
            NODE_H[Node Handler]
            TEXT_H[Text Handler] 
            STYLE_H[Style Handler]
            LAYOUT_H[Layout Handler]
            HIERARCHY_H[Hierarchy Handler]
            SELECTION_H[Selection Handler]
        end
    end
    
    subgraph "Figma Layer"
        PLUGIN[Figma Plugin<br/>WebSocket Client]
        FIGMA_API[Figma API]
    end
    
    AI -->|Natural Language| MCP_CLIENT
    MCP_CLIENT -->|MCP Protocol| MCP_PROTOCOL
    MCP_PROTOCOL --> MCP_SERVER
    MCP_SERVER --> REGISTRY
    REGISTRY --> NODE_H
    REGISTRY --> TEXT_H
    REGISTRY --> STYLE_H
    REGISTRY --> LAYOUT_H
    REGISTRY --> HIERARCHY_H
    REGISTRY --> SELECTION_H
    
    NODE_H --> WS_SERVER
    TEXT_H --> WS_SERVER
    STYLE_H --> WS_SERVER
    LAYOUT_H --> WS_SERVER
    HIERARCHY_H --> WS_SERVER
    SELECTION_H --> WS_SERVER
    
    WS_SERVER -->|JSON Messages| PLUGIN
    PLUGIN -->|Plugin API| FIGMA_API
```

## 📁 Project Structure

```
figma-mcp-write-server/
├── src/                           # MCP Server source code
│   ├── mcp-server.ts             # Main MCP server implementation
│   ├── index.ts                  # CLI entry point and configuration
│   ├── types.ts                  # Type definitions and Zod schemas
│   ├── handlers/                 # MCP tool handlers organized by domain
│   │   ├── index.ts             # Handler registry and tool definitions
│   │   ├── node-handler.ts      # Node creation and manipulation
│   │   ├── text-handler.ts      # Text and typography operations
│   │   ├── selection-handler.ts # Selection and page management
│   │   ├── style-handler.ts     # Figma style management
│   │   ├── layout-handler.ts    # Auto layout and constraints
│   │   ├── hierarchy-handler.ts # Node hierarchy operations
│   │   └── base-handler.ts      # Shared handler functionality
│   ├── utils/                    # Utility functions
│   │   ├── node-utils.ts        # Node traversal and utilities
│   │   ├── color-utils.ts       # Color format conversions
│   │   ├── font-utils.ts        # Typography and font handling
│   │   └── response-utils.ts    # Response formatting helpers
│   └── websocket/                # WebSocket communication layer
│       └── websocket-server.ts  # WebSocket server for plugin communication
├── figma-plugin/                 # Figma plugin source code
│   ├── src/                     # Plugin TypeScript source
│   │   ├── main.ts              # Plugin entry point
│   │   ├── types.ts             # Plugin type definitions
│   │   ├── handlers/            # Plugin-side operation handlers
│   │   ├── utils/               # Plugin utilities
│   │   └── websocket/           # Plugin WebSocket client
│   ├── manifest.json            # Plugin configuration
│   ├── code.js                  # Compiled plugin code (auto-generated)
│   ├── ui.html                  # Plugin user interface
│   ├── build.js                 # Plugin build script
│   └── tsconfig.json            # Plugin TypeScript config
├── tests/                        # Testing infrastructure
│   ├── mcp-test-suite.md        # Comprehensive manual test guide
│   └── connectivity-test.js     # Automated connectivity verification
├── tools/                        # Build and utility scripts
├── dist/                         # Compiled JavaScript output
├── EXAMPLES.md                   # Usage examples and guides
├── package.json                  # Node.js dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # Project documentation
```

## 🔧 Development Environment Setup

### Prerequisites
- Node.js 18+ with npm
- TypeScript knowledge
- Figma account and desktop app
- Understanding of MCP protocol

### Initial Setup
```bash
# Clone the repository
git clone <repository-url>
cd figma-mcp-write-server

# Install dependencies
npm install

# Build everything
npm run build

# Start development server with watch mode
npm run dev
```

### Development Scripts
```bash
npm run build              # Build everything (TypeScript + Plugin)
npm run build:ts          # Build TypeScript only
npm run build:plugin      # Build Figma plugin only
npm run build:plugin:watch # Watch mode for plugin development
npm run dev               # Development mode with auto-restart
npm start                 # Start production server
npm test                  # Run connectivity tests
npm run type-check        # TypeScript validation only
```

## 🏗️ Core Components

### MCP Server (`src/mcp-server.ts`)
The main orchestrator implementing the Model Context Protocol:

- **Protocol Implementation**: Handles MCP tool registration and execution
- **Transport Layer**: Uses stdio transport for MCP client communication
- **WebSocket Integration**: Manages communication with Figma plugin
- **Lifecycle Management**: Coordinates startup/shutdown of all components

### CLI Entry Point (`src/index.ts`)
Command-line interface and application bootstrap:

- **Argument Parsing**: Handles --port, --help, --check-port flags
- **Port Management**: Automatic port detection and conflict resolution
- **Process Management**: Graceful shutdown and error handling
- **Help System**: Usage documentation

### WebSocket Server (`src/websocket/websocket-server.ts`)
Dedicated server for Figma plugin communication:

- **Connection Management**: Handles plugin connections on port 8765
- **Message Routing**: Bidirectional communication with plugin
- **Status Monitoring**: Tracks plugin connection state
- **Error Recovery**: Automatic reconnection handling

## 📋 Handler System

### Handler Registry (`src/handlers/index.ts`)
Central registry managing all MCP tools:

- **Tool Registration**: Defines 15 MCP tools with schemas
- **Request Routing**: Dispatches tool calls to appropriate handlers
- **Schema Validation**: Parameter validation
- **Response Formatting**: Standardizes return values

### Available MCP Tools (v0.13.1)

| Category | Tool | Handler | Description |
|----------|------|---------|-------------|
| **Node Creation** | `create_node` | NodeHandler | Create rectangles, ellipses, frames |
| | `create_text` | TextHandler | Create text with typography |
| **Node Modification** | `update_node` | NodeHandler | Update node properties |
| | `move_node` | NodeHandler | Change node position |
| | `delete_node` | NodeHandler | Remove nodes |
| | `duplicate_node` | NodeHandler | Copy nodes with offset |
| **Style Management** | `manage_styles` | StyleHandler | Create, apply, delete styles |
| **Layout System** | `manage_auto_layout` | LayoutHandler | Configure auto layout |
| | `manage_constraints` | LayoutHandler | Set positioning constraints |
| **Hierarchy** | `manage_hierarchy` | HierarchyHandler | Group, ungroup, reorder nodes |
| **Selection** | `get_selection` | SelectionHandler | Get selected nodes |
| | `set_selection` | SelectionHandler | Set node selection |
| | `get_page_nodes` | SelectionHandler | List all page nodes |
| **Export** | `export_node` | SelectionHandler | Export nodes as images |
| **Status** | `get_plugin_status` | Registry | Check plugin connection |

### Handler Classes

#### Base Handler (`src/handlers/base-handler.ts`)
Shared functionality for all handlers:
- **Parameter Validation**: Common validation patterns using Zod schemas
- **Error Handling**: Standardized error responses with logging
- **Operation Wrapping**: Consistent async operation patterns
- **Default Values**: Parameter default handling

#### Node Handler (`src/handlers/node-handler.ts`)
Core Figma node operations:
- **Node Creation**: Rectangle, ellipse, frame creation with styling
- **Property Updates**: Modify existing node properties
- **Positioning**: Move and position nodes
- **Lifecycle**: Delete and duplicate operations

#### Text Handler (`src/handlers/text-handler.ts`)
Typography and text management:
- **Text Creation**: Rich text with mixed styling support
- **Style Ranges**: Apply different styles to text segments
- **Font Management**: Load and apply custom fonts
- **Typography**: Font size, weight, alignment, spacing

#### Style Handler (`src/handlers/style-handler.ts`)
Figma style system integration:
- **Style Types**: Paint, text, effect, and grid styles
- **CRUD Operations**: Create, read, update, delete styles
- **Style Application**: Apply styles to compatible nodes
- **Style Discovery**: List and search existing styles

#### Layout Handler (`src/handlers/layout-handler.ts`)
Auto layout and constraint system:
- **Auto Layout**: Enable and configure responsive layouts
- **Constraints**: Pin elements and control resizing behavior
- **Spacing**: Configure padding, gaps, and alignment
- **Responsive Design**: Create layouts that adapt to content

#### Hierarchy Handler (`src/handlers/hierarchy-handler.ts`)
Node organization and structure:
- **Grouping**: Create and dissolve groups
- **Layer Order**: Reorder nodes in layer hierarchy
- **Parent-Child**: Move nodes between containers
- **Depth Management**: Control node nesting

#### Selection Handler (`src/handlers/selection-handler.ts`)
Selection and data retrieval:
- **Selection Management**: Get and set selected nodes
- **Page Traversal**: Navigate node hierarchy
- **Data Export**: Extract design information
- **Node Discovery**: Find nodes by criteria

## 🛠️ Utility System

### Node Utilities (`src/utils/node-utils.ts`)
Node traversal and manipulation:
```typescript
findNodeById(id: string): SceneNode | null
getAllNodes(node: BaseNode, depth: number): NodeInfo[]
getNodeIndex(node: SceneNode): number
```

### Color Utilities (`src/utils/color-utils.ts`)
Color format conversions:
```typescript
hexToRgb(hex: string): RGB
hexToRgba(hex: string, alpha: number): RGBA
rgbToHex(color: RGB): string
```

### Font Utilities (`src/utils/font-utils.ts`)
Typography support:
```typescript
loadFont(fontName: FontName): Promise<void>
ensureFontLoaded(fontName: FontName): Promise<void>
getFontFromParams(params: TextParams): FontName
```

### Response Utilities (`src/utils/response-utils.ts`)
Response formatting and validation:
```typescript
createSuccessResponse(data?: any): OperationResult
createErrorResponse(error: string | Error): OperationResult
formatNodeInfo(node: SceneNode): NodeInfo
```

## 📊 Type System (`src/types.ts`)

Comprehensive TypeScript definitions using Zod schemas for runtime validation:

### Configuration
```typescript
interface ServerConfig {
  port: number;
  enableHeartbeat: boolean;
  heartbeatInterval: number;
  maxReconnectAttempts: number;
}
```

### Operation Parameters
```typescript
interface NodeParams {
  nodeType: 'rectangle' | 'ellipse' | 'frame';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fillColor?: string;
  // ... additional properties
}
```

### Response Types
```typescript
interface OperationResult {
  success: boolean;
  data?: any;
  error?: string;
}
```

## 🔄 Communication Protocol

### MCP Tool Execution Flow

```mermaid
sequenceDiagram
    participant AI as AI Agent
    participant MCP as MCP Client
    participant Server as MCP Server
    participant Handler as Handler
    participant WS as WebSocket Server
    participant Plugin as Figma Plugin
    participant Figma as Figma API

    AI->>MCP: Natural language request
    MCP->>Server: MCP tool call (stdio)
    Server->>Handler: Route to handler
    Handler->>Handler: Validate parameters
    Handler->>WS: Send message
    WS->>Plugin: JSON over WebSocket
    Plugin->>Figma: Plugin API call
    Figma-->>Plugin: Result
    Plugin-->>WS: Response
    WS-->>Handler: Response
    Handler-->>Server: Formatted result
    Server-->>MCP: MCP response
    MCP-->>AI: Natural language result
```

### WebSocket Message Format
```typescript
// Request to plugin
{
  id: "uuid",
  type: "CREATE_NODE",
  operation: "createNode", 
  payload: {
    nodeType: "rectangle",
    x: 0, y: 0,
    width: 100, height: 100,
    fillColor: "#FF0000"
  }
}

// Response from plugin
{
  id: "uuid",
  success: true,
  data: {
    nodeId: "figma-node-id",
    message: "Rectangle created successfully"
  }
}
```

## 🧪 Development Workflow

### Adding New MCP Tools

1. **Define Schema** in `src/types.ts`:
```typescript
export const CreateComponentSchema = z.object({
  name: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
});
```

2. **Register Tool** in `src/handlers/index.ts`:
```typescript
{
  name: 'create_component',
  description: 'Create a new component',
  inputSchema: zodToJsonSchema(CreateComponentSchema),
}
```

3. **Implement Handler** method:
```typescript
async createComponent(params: any): Promise<OperationResult> {
  const validated = CreateComponentSchema.parse(params);
  // Implementation
}
```

4. **Add Plugin Handler** in `figma-plugin/src/handlers/`:
```typescript
export async function createComponent(payload: any): Promise<any> {
  const component = figma.createComponent();
  // Implementation
}
```

### Testing New Features

1. **Unit Tests** for handlers:
```typescript
describe('NodeHandler', () => {
  it('should create rectangle', async () => {
    const handler = new NodeHandler(mockSendToPlugin);
    const result = await handler.createNode({
      nodeType: 'rectangle',
      width: 100,
      height: 100
    });
    expect(result.success).toBe(true);
  });
});
```

2. **Integration Tests** with actual plugin:
```bash
# Start development server
npm run dev

# In separate terminal, run connectivity test
npm test

# Manual testing through MCP client
```

3. **Manual Testing** using test suite:
Follow procedures in `tests/mcp-test-suite.md` for validation.

## 🐛 Debugging

### Server-Side Debugging
```bash
# Enable debug logging
DEBUG=* npm run dev

# Check WebSocket connections
netstat -an | grep 8765

# Monitor process health
ps aux | grep figma-mcp
```

### Plugin-Side Debugging
1. **Figma Console**: Plugins → Development → Open Console
2. **WebSocket Status**: Check plugin UI connection indicator
3. **Message Flow**: Monitor request/response logs
4. **Network Tab**: Verify WebSocket connection in browser dev tools

### Common Issues

#### Plugin Connection Failures
- **Port Conflicts**: Use `--check-port 8765` to identify conflicts
- **Firewall**: Ensure localhost connections allowed
- **Plugin State**: Restart plugin if connection stuck
- **Server State**: Restart server to clear zombie processes

#### Tool Execution Errors
- **Parameter Validation**: Check Zod schema compliance
- **Node Access**: Verify node IDs exist and are accessible
- **Permissions**: Ensure plugin has required Figma permissions
- **File State**: Check file isn't in Dev Mode or locked

#### Performance Issues
- **Message Queue**: Monitor WebSocket message backlog
- **Memory Usage**: Check for memory leaks in long-running sessions
- **Connection Stability**: Monitor reconnection frequency
- **Batch Operations**: Group multiple operations when possible

## 📊 Performance Optimization

### Message Batching
```typescript
// Instead of individual calls
await createNode(params1);
await createNode(params2);

// Batch operations when possible
await batchCreateNodes([params1, params2]);
```

### Connection Management
```typescript
class WebSocketServer {
  private ensureConnection() {
    if (!this.isConnected()) {
      this.reconnect();
    }
  }
}
```

### Caching Strategies
```typescript
class NodeCache {
  private cache = new Map<string, NodeInfo>();
  
  async getNode(id: string): Promise<NodeInfo> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }
    // Fetch and cache
  }
}
```

## 🔒 Security Best Practices

### Input Validation
All inputs validated with Zod schemas:
```typescript
const params = CreateRectangleSchema.parse(args);
```

### Connection Security
- **Localhost Only**: WebSocket server binds to localhost
- **No Authentication**: Local development only
- **Sandbox**: Plugin runs in Figma's security sandbox
- **Process Isolation**: Server runs as separate process

### Error Handling
Never expose internal errors:
```typescript
catch (error) {
  console.error('Internal error:', error);
  return createErrorResponse('Operation failed');
}
```

## 🚀 Deployment

### Development Mode
```bash
npm run dev          # Auto-restart on changes
npm run dev:plugin   # Plugin watch mode
```

### Production Build
```bash
npm run build        # Build everything
npm start           # Start production server
```

### Environment Configuration
```bash
# Set custom WebSocket port
FIGMA_MCP_PORT=9000 npm start

# Enable debug logging
DEBUG=figma-mcp:* npm start
```

### Monitoring
```bash
# Check server status
curl -f http://localhost:8765/health || echo "Server down"

# Monitor WebSocket connections
ss -tulpn | grep :8765

# Check process health
pgrep -f figma-mcp-write-server
```

## 🧪 Testing Strategy

### Automated Tests
```bash
npm test                    # Run all tests
npm run test:connectivity   # WebSocket connection test
npm run test:manual        # Display manual test guide
```

### Manual Testing Workflow
1. **Setup**: Start server and load plugin
2. **Basic Operations**: Test core functionality
3. **Advanced Features**: Test auto layout, styles, hierarchy
4. **Error Handling**: Test invalid inputs and edge cases
5. **Performance**: Test with large files and many operations

### Test Coverage Areas
- **Parameter Validation**: All Zod schemas
- **Tool Execution**: Each MCP tool
- **Error Handling**: Invalid inputs and failures
- **Connection Management**: WebSocket reliability
- **Plugin Integration**: Figma API compatibility

## 📚 Resources

### Figma Plugin Development
- [Plugin API Reference](https://www.figma.com/plugin-docs/api/api-reference/)
- [Plugin Development Guide](https://www.figma.com/plugin-docs/how-plugins-run/)
- [TypeScript for Plugins](https://www.figma.com/plugin-docs/typescript/)

### Model Context Protocol
- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Server Examples](https://github.com/modelcontextprotocol/servers)

### Development Tools
- [WebSocket Testing](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zod Validation](https://zod.dev/)

This development guide provides information for understanding, modifying, and extending the Figma MCP Write Server system.