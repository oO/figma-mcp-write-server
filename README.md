# Figma MCP Write Server

A Model Context Protocol (MCP) server that provides **write access** to Figma through the Plugin API, enabling AI agents to create, modify, and manage Figma designs programmatically.

## 🚀 Overview

Because the Figma REST API is mostly read-only, this project uses the Plugin API to enable full write operations. This allows AI agents to:

- ✅ **Create** design elements (rectangles, ellipses, text, frames)
- ✅ **Modify** existing nodes (properties, position, styling)
- ✅ **Delete** and duplicate design elements
- ✅ **Manage** selections and page content
- ✅ **Export** designs programmatically

## 🏗️ Architecture

Direct communication design eliminates complexity and improves reliability.

### Components

#### 1. MCP Server (`src/`)
- **MCP Server** (`mcp-server.ts`) - Direct plugin communication with robust error handling
- **Plugin Client** (`plugin-client.ts`) - WebSocket client with exponential backoff reconnection
- **Entry Point** (`index.ts`) - Streamlined startup with comprehensive documentation
- **Type Definitions** (`types.ts`) - Shared types and schemas

#### 2. Figma Plugin (`figma-plugin/`)
- **Plugin** (`code.js`) - Handles WebSocket communication and Figma API operations
- **UI** (`ui.html`) - Real-time status monitoring and connection feedback
- **Plugin Manifest** (`manifest.json`) - Standard Figma plugin configuration

## 🔄 How It Works

```mermaid
graph LR
    A[AI Agent/Claude] --> B[MCP Client]
    B --> C[MCP Server]
    C --> D[Figma Plugin]
    D --> E[Figma Design]
```

**Architecture Benefits:**
- Single process design
- Direct WebSocket connection with exponential backoff reconnection
- Robust error handling and status reporting
- Plugin runs its own server
- No complex bridges or multiple processes

1. **AI Agent** calls MCP tools (e.g., `create_rectangle`)
2. **MCP Server** validates parameters and connects to plugin
3. **Figma Plugin** receives message and executes operation using Plugin API
4. **Results** are sent back to the MCP server and then to the AI agent

## 📋 Available MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `create_rectangle` | Create rectangle shapes | x, y, width, height, fillColor, strokeColor |
| `create_ellipse` | Create ellipse/circle shapes | x, y, width, height, fillColor, strokeColor |
| `create_text` | Create text elements | x, y, content, fontSize, fontFamily, textColor |
| `create_frame` | Create frame containers | x, y, width, height, backgroundColor |
| `update_node` | Update node properties | nodeId, properties |
| `move_node` | Move nodes to new positions | nodeId, x, y |
| `delete_node` | Delete nodes | nodeId |
| `duplicate_node` | Duplicate nodes | nodeId, offsetX, offsetY |
| `get_selection` | Get currently selected nodes | - |
| `set_selection` | Set node selection | nodeIds |
| `get_page_nodes` | List all nodes on current page | - |
| `export_node` | Export nodes as images | nodeId, format, scale |
| `get_plugin_status` | Check plugin connection | - |

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+
- Figma desktop app or browser access
- MCP-compatible client (Claude Desktop, Cursor, etc.)

### 1. Install Dependencies
```bash
cd figma-mcp-write-server
npm install
```

### 2. Build the Project
```bash
npm run build
```

### 3. Start the Server

**Production:**
```bash
# Single command starts everything
npm start
```

**Development with Watch Mode:**
```bash
# Auto-restart on code changes
npm run dev
```

### 4. Install Figma Plugin
1. Open Figma
2. Go to **Plugins** → **Development** → **Import plugin from manifest**
3. Select `figma-plugin/manifest.json`
4. Run the plugin to establish connection

### 5. Configure MCP Client

For **Claude Desktop**, add to `~/.claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "figma-write": {
      "command": "node",
      "args": ["/path/to/figma-mcp-write-server/dist/index.js"],
      "env": {
        "FIGMA_MCP_PORT": "8765"
      }
    }
  }
}
```

For **Cursor**, add to MCP configuration:
```json
{
  "mcpServers": {
    "figma-write": {
      "command": "node",
      "args": ["/path/to/figma-mcp-write-server/dist/index.js"]
    }
  }
}
```

## 🎯 Usage Examples

### Create a Simple Layout
```
Create a header frame at the top of the page, then add a title and subtitle inside it.
```

The AI agent will:
1. Use `create_frame` to create the header container
2. Use `create_text` twice for title and subtitle
3. Position elements appropriately

### Design System Operations
```
Create 5 button variants with different colors and update their corner radius to 8px.
```

The AI agent will:
1. Use `create_rectangle` multiple times for button bases
2. Use `create_text` for button labels
3. Use `update_node` to set corner radius and colors

### Batch Operations
```
Select all text elements and change their font size to 16px.
```

The AI agent will:
1. Use `get_page_nodes` to find all text nodes
2. Use `set_selection` to select them
3. Use `update_node` to modify font size

## 🔧 Configuration

### Command Line Options
- `--port <number>` - Server port (default: 3001)
- `--cors-origin <string>` - CORS origin (default: *)
- `--plugin-id <string>` - Plugin authentication ID
- `--max-message-size <number>` - Max WebSocket message size
- `--heartbeat-interval <number>` - Connection heartbeat interval

### Environment Variables
- `FIGMA_MCP_PORT` - Server port
- `FIGMA_MCP_CORS_ORIGIN` - CORS configuration

## 🚦 Connection Status

The system provides real-time connection monitoring:

- **MCP Server**: Logs all client connections and tool calls
- **Figma Plugin UI**: Shows WebSocket connection status
- **Status Tool**: Use `get_plugin_status` to check connectivity

## 🔍 Troubleshooting

### Plugin Won't Connect
1. Check WebSocket port (default: 8765)
2. Verify Figma plugin is running
3. Check plugin console for connection logs
4. Plugin automatically reconnects with exponential backoff

### Write Operations Fail
1. Ensure plugin is connected (`get_plugin_status`)
2. Check node IDs are valid
3. Verify Figma file is not in Dev Mode
4. Check plugin permissions

### Performance Issues
1. Reduce heartbeat interval
2. Limit concurrent operations
3. Use batch operations when possible
4. Monitor WebSocket message size

## 🆚 Comparison with REST API MCP Servers

| Feature | REST API MCP | Plugin API MCP (This Project) |
|---------|--------------|-------------------------------|
| **Read Operations** | ✅ Full access | ✅ Full access |
| **Write Operations** | ❌ Not supported | ✅ Full support |
| **Real-time Updates** | ❌ Polling only | ✅ Live connection |
| **Authentication** | API Token | Plugin permissions |
| **Setup Complexity** | Simple | Moderate (requires plugin) |
| **Rate Limits** | Yes (REST API limits) | No (direct plugin access) |
| **Offline Usage** | ✅ Works offline | ❌ Requires active Figma session |

## 🛡️ Security Considerations

- WebSocket connections are local-only by default
- Plugin runs in Figma's sandbox environment
- No sensitive data stored in plugin code
- Message validation using Zod schemas
- Connection authentication via plugin ID

## 🚧 Limitations

- Requires active Figma session (desktop/browser)
- Plugin must be manually installed and run
- WebSocket connection can be unstable on poor networks
- Some advanced Figma features may not be supported
- Limited to single file operations (current page)

## 📚 Documentation

- **[Development Guide](DEVELOPMENT.md)** - Setup, architecture, and contribution guidelines
- **[Changelog](CHANGELOG.md)** - Version history and updates

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please see the [Development Guide](DEVELOPMENT.md) for guidelines.

---

**Note**: This project provides write access to Figma designs through MCP by using Figma's Plugin API, which enables creation and modification operations not available through the REST API.
