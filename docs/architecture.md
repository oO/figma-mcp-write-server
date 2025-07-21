# Architecture Guide

This document provides deep technical implementation details for the Figma MCP Write Server, covering internal systems, design patterns, and implementation specifics.

## Table of Contents

1. [🗄️ Database Architecture](#-database-architecture)
2. [🎯 Implementation Principles](#-implementation-principles)
3. [📊 Type System](#-type-system)
4. [🛠️ Utility System](#-utility-system)
5. [📁 Project Structure](#-project-structure)
6. [🔧 Core Components](#-core-components)
7. [📚 Resources](#-resources)

---

## 🗄️ Database Architecture

The server implements a database-first approach for font management with graceful fallback to API-based operations.

### SQLite Font Database

**Schema Structure:**
- `fonts` table: Primary font metadata (family, style, technology, file paths)
- `font_styles` table: Style-specific properties (weight, width, slope)
- `sync_metadata` table: Synchronization tracking and cache management

**Full-Text Search Implementation:**
- FTS5 virtual table indexes font family names and metadata
- Tokenization optimized for font naming conventions
- Fuzzy matching for font discovery and suggestions

**Indexing Strategy:**
- Primary indices on font family and style combinations
- Composite indices for platform-specific paths
- Query optimization for common font lookup patterns

### Font Service Architecture

**Database-First Pattern:**
The font service prioritizes local database operations with API fallback:
```typescript
async getFontsByFamily(family: string): Promise<FontInfo[]> {
  try {
    return await this.database.queryFontsByFamily(family);
  } catch (error) {
    return await this.api.fetchFontsByFamily(family);
  }
}
```

**Background Synchronization Service:**
- Scheduled sync operations with system font directories
- Incremental updates to minimize I/O overhead
- Conflict resolution for font file changes

**Graceful Degradation:**
When database operations fail, the service automatically falls back to:
- Direct filesystem scanning for local fonts
- API-based font metadata retrieval
- In-memory caching for session-based operations

### Configuration System

**Platform-Specific Path Detection:**
- macOS: `/System/Library/Fonts`, `/Library/Fonts`, `~/Library/Fonts`
- Windows: `C:\\Windows\\Fonts`, `%LOCALAPPDATA%\\Microsoft\\Windows\\Fonts`
- Cross-platform user font directories

**YAML Config Merging Strategy:**
Configuration files are merged in order of precedence:
1. User-specific config files
2. Project-level configuration
3. System defaults
4. Built-in fallback values

**Auto-Generation of Config Files:**
- First-run detection creates default configurations
- Platform-appropriate default paths
- User preferences preserved across updates

### Testing Database Features

**Database Operation Testing:**
```typescript
describe('FontDatabase', () => {
  let testDb: FontDatabase;
  
  beforeEach(async () => {
    testDb = new FontDatabase(':memory:');
    await testDb.initialize();
  });
});
```

**Mock Strategies:**
- In-memory SQLite databases for unit tests
- Mock file system operations for path testing
- Stubbed API responses for fallback testing
- Transaction rollback for test isolation

## 🎯 Implementation Principles

### MCP Protocol Compliance
The server strictly adheres to Model Context Protocol standards:
- **Text-Based Responses**: All tools return `{ content: [{ type: 'text', text: string }], isError: boolean }`
- **Structured Data**: YAML format within text content for human-readable structured output
- **Error Handling**: Consistent error format with operation context and timestamps
- **Tool Definitions**: JSON Schema-based input validation for all parameters

#### Parameter Design Patterns

**Base Schema Inheritance:**
```typescript
// Shared base properties reduce duplication
export const BaseNodePropertiesSchema = BasePositionSchema
  .merge(BaseSizeSchema)
  .merge(BaseVisualSchema)
  .merge(BaseStrokeSchema)
  .merge(BaseCornerSchema)
  .extend({ name: z.string().optional() });

// Tools extend base schemas
export const CreateNodeSchema = BaseNodePropertiesSchema.extend({
  nodeType: z.enum(['rectangle', 'ellipse', 'text', 'frame', 'star', 'polygon'])
});
```

**Operation-Based Parameters:**
```typescript
// Tools use operation enum for different behaviors
{
  "operation": "group",           // Required discriminator
  "nodeIds": ["1", "2", "3"],    // Operation-specific parameters
  "name": "Navigation Group"      // Optional metadata
}

{
  "operation": "move",
  "nodeId": "123",
  "x": 100,
  "y": 50
}
```

**Smart Defaults:**
```typescript
// Sensible defaults reduce parameter complexity
export const CreateTextSchema = BaseTextSchema.extend({
  fontFamily: z.string().default("Inter"),      // Industry standard
  fontSize: z.number().default(16),             // Readable default
  lineHeightUnit: z.enum(["px", "percent"]).default("percent")
});
```

#### Error Handling Strategy

**Structured Error Responses:**
```typescript
// Consistent error format across all tools
const errorData = {
  error: 'Failed to create node: Invalid color format',
  operation: 'create_node',
  tool: 'create_node',
  timestamp: new Date().toISOString(),
  suggestion: 'Use hex format like #FF0000 for colors'
};

return {
  content: [{ type: 'text', text: yaml.dump(errorData) }],
  isError: true
};
```

**Validation-First Approach:**
```typescript
// All inputs validated before processing
try {
  const validatedParams = CreateNodeSchema.parse(args);
  // Process with guaranteed valid data
} catch (error) {
  if (error instanceof z.ZodError) {
    const issues = error.errors.map(issue =>
      `${issue.path.join('.')}: ${issue.message}`
    ).join(', ');
    throw new Error(`Validation failed: ${issues}`);
  }
}
```

#### Handler Organization Principles

**Domain-Driven Separation:**
- **NodeHandlers**: Creation, modification, basic operations
- **SelectionHandlers**: Page traversal, selection management, export
- **StyleHandlers**: Style system integration (paint, text, effect, grid)
- **LayoutHandlers**: Auto layout, constraints, hierarchy management

**Dependency Injection:**
```typescript
// Handlers receive communication function, not direct WebSocket
export class NodeHandlers implements ToolHandler {
  constructor(private sendToPlugin: (request: any) => Promise<any>) {}
}

// Enables testing and decoupling
const mockSend = jest.fn().mockResolvedValue({ success: true });
const handler = new NodeHandlers(mockSend);
```

#### Type Safety & Validation

**Runtime Type Checking:**
```typescript
// Zod schemas provide both TypeScript types and runtime validation
export const CreateNodeSchema = z.object({
  nodeType: z.enum(['rectangle', 'ellipse']),
  width: z.number().positive(),
  height: z.number().positive()
});

export type CreateNodeParams = z.infer<typeof CreateNodeSchema>;

// Usage guarantees type safety
function createNode(params: unknown): CreateNodeParams {
  return CreateNodeSchema.parse(params); // Throws on invalid input
}
```

**Generic Communication Types:**
```typescript
// Type-safe WebSocket communication
interface TypedPluginMessage<TPayload = unknown> {
  id: string;
  type: string;
  payload?: TPayload;
}

interface TypedPluginResponse<TData = unknown> {
  id: string;
  success: boolean;
  data?: TData;
  error?: string;
}
```

#### Performance Considerations

**Efficient Tool Discovery:**
```typescript
// Map-based handler lookup O(1) instead of linear search
private handlers = new Map<string, ToolHandler>();

// Handler registration during initialization
tools.forEach(tool => {
  this.handlers.set(tool.name, handler);
});
```

**Message Batching:**
```typescript
// Multiple operations can be batched for performance
if (this.shouldBatchRequests()) {
  this.processBatchedRequests();
} else {
  this.processIndividualRequest();
}
```

#### Figma-Specific Considerations

**ES2015 Compatibility:**
```typescript
// Plugin code must be ES2015 compatible (no spread operator)
// ❌ const newObj = { ...existingObj, newProp: 'value' };
// ✅ const newObj = Object.assign({}, existingObj, { newProp: 'value' });
```

**Font Loading:**
```typescript
// Fonts must be loaded before text operations
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
```

**Color Format Conversion:**
```typescript
// Figma uses 0-1 RGB values, users provide hex
function hexToRgb(hex: string): RGB {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}
```

#### Security & Robustness

**Input Sanitization:**
```typescript
// All inputs validated through Zod schemas
// No direct parameter access without validation
const params = CreateNodeSchema.parse(args); // Safe to use
```

**Timeout Management:**
```typescript
// Operation-specific timeouts prevent hanging
private getTimeoutForOperation(operationType: string): number {
  return this.config.communication.operationTimeouts[operationType] ||
         this.config.communication.defaultTimeout;
}
```

**Connection Health Monitoring:**
```typescript
// Continuous health checks and reconnection logic
private updateConnectionHealth(): void {
  if (!this.pluginConnection) {
    this.connectionStatus.connectionHealth = 'unhealthy';
  } else if (this.averageResponseTime > 10000) {
    this.connectionStatus.connectionHealth = 'degraded';
  } else {
    this.connectionStatus.connectionHealth = 'healthy';
  }
}
```

### Development Guidelines

**Adding Tools:**
1. **Schema First**: Define Zod schema in `types.ts`
2. **Handler Integration**: Add to appropriate handler class
3. **Tool Registration**: Update `getTools()` method
4. **Documentation**: Add examples to EXAMPLES.md
5. **Testing**: Validate with manual test suite

**Maintaining Consistency:**
- Use YAML response format for all tools
- Follow operation-based parameter patterns
- Include timestamps in error responses
- Provide actionable error messages
- Test with actual Figma plugin integration

**Performance Best Practices:**
- Batch related operations when possible
- Use efficient data structures (Maps over arrays for lookups)
- Implement proper timeout and retry logic
- Monitor WebSocket connection health
- Cache frequently accessed data when appropriate

## 📊 Type System

Type system with validation:

- **Strongly-Typed Schemas**: Replaced all `z.any()` usage with specific Figma API types
- **Base Schema Inheritance**: Reduced code duplication through reusable base schemas
- **Generic Communication Types**: `TypedPluginMessage<TPayload>`, `TypedPluginResponse<TData>`
- **Runtime Type Guards**: Safe type checking with detailed error reporting
- **Validation Helpers**: Utility functions for schema parsing and error handling

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

## 📁 Project Structure

```
figma-mcp-write-server/
├── src/                           # MCP Server source code
│   ├── mcp-server.ts             # Main MCP server implementation
│   ├── index.ts                  # CLI entry point and configuration
│   ├── types/                    # Type definitions and Zod schemas
│   │   ├── index.ts             # Main type exports
│   │   ├── schemas.ts           # Validation schemas
│   │   ├── figma-base.ts        # Figma API types
│   │   └── [operation types]    # Domain-specific type definitions
│   ├── handlers/                 # Domain-specific tool handlers
│   │   ├── index.ts             # Handler registry with auto-discovery
│   │   └── ... (handlers)       # Handlers for each tool
│   ├── utils/                    # Utility functions
│   │   ├── bulk-operations.ts   # Bulk operation parsing and execution
│   │   ├── color-utils.ts       # Color format conversions
│   │   └── port-utils.ts        # Network utilities
│   └── websocket/                # WebSocket communication layer
│       └── websocket-server.ts  # WebSocket server implementation
├── figma-plugin/                 # Figma plugin source and build
│   ├── src/                     # Plugin TypeScript source
│   │   ├── main.ts              # Plugin entry point
│   │   ├── router/              # Auto-discovering operation router
│   │   ├── operations/          # Plugin-side operation handlers
│   │   ├── utils/               # Plugin utilities (ES5 compatible)
│   │   └── websocket/           # Plugin WebSocket client
│   ├── manifest.json            # Plugin configuration
│   ├── code.js                  # Compiled plugin code (generated at build)
│   ├── ui.html                  # Plugin UI (generated from template)
│   ├── build.js                 # Plugin build script
│   └── tsconfig.json            # Plugin TypeScript config (ES2015 target)
├── tests/                        # Testing infrastructure
│   ├── unit/                    # Unit tests (handler & component coverage)
│   │   ├── handlers/            # Handler-specific tests
│   │   ├── types/               # Type validation tests
│   │   └── websocket/           # WebSocket communication tests
│   ├── integration/             # Integration tests (end-to-end workflows)
│   │   ├── mcp-server-integration.test.ts # End-to-end workflows
│   │   └── basic-integration.test.ts      # Basic functionality
│   ├── setup.ts                # Jest test configuration
│   ├── mcp-test-suite.md       # Manual testing procedures
│   └── connectivity-test.js    # WebSocket connection validation
├── tools/                        # Build and utility scripts
├── dist/                         # Compiled server output (generated at build)
├── coverage/                     # Test coverage reports (generated)
├── jest.config.js               # Unit test configuration
├── jest.integration.config.js   # Integration test configuration
└── [documentation files]
```

### Architecture Organization

**MCP Server (`src/`)**
- Main server orchestrates MCP protocol and WebSocket communication
- Handlers organize tools by domain (nodes, text, styles, layout, hierarchy, selection)
- Handler registry uses auto-discovery pattern for tool registration
- WebSocket server manages plugin communication with queuing and batching
- Type system provides validation with Zod schemas

**Figma Plugin (`figma-plugin/`)**
- TypeScript source compiled to ES2015 (Figma compatibility requirement)
- **Important**: No spread operator (`...`) usage - Figma's environment doesn't support it
- Build process generates `code.js` and `ui.html` from source and templates
- WebSocket client handles reconnection and message routing
- Plugin handlers execute actual Figma API operations

**Build Process**
- Server: TypeScript compilation to `dist/`
- Plugin: Custom build script compiles TypeScript and generates UI with configurable port injection
- UI generation: Injects version and WebSocket port from package.json and build arguments into template

## 🔧 Core Components

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

- **Connection Management**: Handles plugin connections on configurable port (default: 3000)
- **Message Routing**: Bidirectional communication with plugin
- **Status Monitoring**: Tracks plugin connection state
- **Error Recovery**: Automatic reconnection handling
- **Port Configuration**: Automatically uses server config port, overridable via command line

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

This architecture guide provides comprehensive technical implementation details for understanding, modifying, and extending the Figma MCP Write Server system at the lowest level.