# Figma MCP Write Server - Project Summary

## Overview

This MCP server provides write access to Figma through the Plugin API. Unlike existing Figma MCP servers that use the read-only REST API, this implementation uses Figma's Plugin API to enable creation and modification of design elements.

## Architecture

### Problem with Existing Solutions
- Current Figma MCP servers use the REST API
- REST API only supports read operations
- Cannot create or modify design elements

### This Solution
- Uses Figma's Plugin API which has full read/write access
- **NEW: Simplified architecture** with direct MCP server to plugin communication
- **Legacy: WebSocket bridge** connects MCP server to Figma plugin (more complex)
- Enables AI agents to create and modify Figma designs

## Project Structure

### Simplified Architecture (Recommended)
```
figma-mcp-write-server/
├── src/                        # MCP Server (Node.js/TypeScript)
│   ├── simple-mcp-server.ts   # Direct MCP server with plugin communication
│   ├── simple-plugin-client.ts # WebSocket client with exponential backoff
│   ├── index-simple.ts        # Entry point for simplified architecture
│   └── types.ts               # Shared types and schemas
├── figma-plugin/              # Figma Plugin (JavaScript)
│   ├── code-simple.js         # Self-contained plugin with built-in server
│   ├── ui-simple.html         # Enhanced plugin UI
│   └── manifest.json          # Plugin configuration
└── package.json               # Dependencies and scripts
```

### Legacy Architecture
```
figma-mcp-write-server/
├── src/                     # MCP Server (Node.js/TypeScript)
│   ├── types.ts            # Shared types and schemas
│   ├── bridge-client.ts    # WebSocket bridge client
│   ├── mcp-server.ts       # MCP server implementation
│   ├── index-websocket.ts  # WebSocket bridge server
│   └── index.ts            # CLI entry point
├── figma-plugin/           # Figma Plugin (JavaScript)
│   ├── manifest.json       # Plugin configuration
│   ├── code.js             # Plugin main thread
│   └── ui.html             # Plugin UI
└── package.json            # Dependencies and scripts
```

## How It Works

### Simplified Architecture (Recommended)
The system has two components:

1. **Simple MCP Server** - Direct communication with plugin, better error handling
2. **Self-Contained Figma Plugin** - Runs own WebSocket server, handles all operations

Communication flow:
```
AI Agent → Simple MCP Server → Figma Plugin (Built-in Server) → Figma API
```

**Benefits:**
- Single process instead of multiple processes
- Direct WebSocket connection with exponential backoff reconnection
- Better error handling and status reporting
- Eliminates bridge complexity and potential failure points

### Legacy Architecture
The system has three components:

1. **MCP Server** - Implements the Model Context Protocol and provides tools
2. **WebSocket Bridge** - Handles communication between server and plugin
3. **Figma Plugin** - Executes operations using Figma's Plugin API

Communication flow:
```
AI Agent → MCP Server → WebSocket Bridge → Figma Plugin → Figma API
```

## Available Tools

| Tool | Description | Access |
|------|-------------|--------|
| `create_rectangle` | Create rectangle shapes | Write |
| `create_ellipse` | Create ellipse/circle shapes | Write |
| `create_text` | Create text elements | Write |
| `create_frame` | Create frame containers | Write |
| `update_node` | Update node properties | Write |
| `move_node` | Move nodes | Write |
| `delete_node` | Delete nodes | Write |
| `duplicate_node` | Duplicate nodes | Write |
| `get_selection` | Get selected nodes | Read |
| `set_selection` | Set node selection | Write |
| `get_page_nodes` | List page nodes | Read |
| `export_node` | Export nodes as images | Read |
| `get_plugin_status` | Check plugin connection | Status |

## Use Cases

- Create design elements programmatically
- Generate design system components
- Batch update existing designs
- Automate repetitive design tasks

## Setup

### Simplified Architecture (Recommended)
1. Install dependencies: `npm install`
2. Build the server: `npm run build`
3. Start the simplified server: `npm run start-simple`
4. Install the Figma plugin from the `figma-plugin/` directory
5. Load `ui-simple.html` in the plugin in Figma
6. Configure your MCP client to use `dist/index-simple.js`

### Legacy Architecture
1. Install dependencies: `npm install`
2. Build the server: `npm run build`
3. Start WebSocket bridge: `npx tsx src/index-websocket.ts`
4. Start MCP server: `npm start`
5. Install the Figma plugin from the `figma-plugin/` directory
6. Run the plugin in Figma
7. Configure your MCP client to use `dist/index.js`

## Comparison with REST API Approach

| Feature | REST API | Plugin API (Legacy) | Plugin API (Simplified) |
|---------|----------|---------------------|-------------------------|
| Read operations | ✅ | ✅ | ✅ |
| Write operations | ❌ | ✅ | ✅ |
| Rate limits | Yes (15k/hour) | No | No |
| Setup complexity | Low | High | Medium |
| Process count | 1 | 3 | 1 |
| Reliability | Medium | Low | High |
| Auto-reconnection | N/A | Manual | Automatic |

## Technical Details

- Built with TypeScript and Node.js
- Uses Zod for parameter validation
- WebSocket communication for real-time operations
- Plugin runs in Figma's sandboxed environment
- Handles connection management and error recovery

## Limitations

### Simplified Architecture
- Requires Figma Desktop (plugin needed)
- Plugin must be manually installed and run
- Limited to operations available in Plugin API

### Legacy Architecture
- Requires Figma Desktop (plugin needed)
- Plugin must be manually installed and run
- WebSocket bridge adds complexity and potential failure points
- Multiple processes must be managed
- Limited to operations available in Plugin API

## Recent Improvements

### v1.1 - Simplified Architecture
- **Single Process**: Eliminated complex multi-process setup
- **Direct Communication**: MCP server connects directly to plugin (port 8765)
- **Auto-Reconnection**: Exponential backoff reconnection logic
- **Better Error Handling**: Improved status reporting and error recovery
- **Self-Contained Plugin**: Plugin runs own server, eliminating bridge dependency

### Backwards Compatibility
- Legacy architecture still available for existing setups
- Use `npm run start-simple` for new simplified architecture
- Use `npm start` for legacy multi-process architecture

## Contributing

This is a working implementation that demonstrates write access to Figma via MCP. The simplified architecture makes the system much more reliable and easier to maintain. See the code for implementation details.
