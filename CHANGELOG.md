# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-05-28

### Fixed
- **Critical**: Fixed JSON parsing errors in MCP protocol communication
  - Redirected decorative console output from stdout to stderr
  - Prevented emoji-decorated log messages from interfering with JSON-RPC protocol
  - Resolved parsing errors: "Unexpected token '🎨'", "🚀 Startin", "🔗 Connect", etc.
  - Maintained all debug logging functionality while ensuring MCP compliance
- Updated files: `src/index.ts`, `src/mcp-server.ts`, `src/bridge-client.ts`

### Technical Details
- Root cause: Console messages with emojis/decorations were being sent to stdout
- Solution: Changed `console.log()` to `console.error()` for non-JSON output
- Impact: Eliminates connection issues between Claude Desktop and MCP server
- MCP protocol requires stdout to contain only valid JSON-RPC messages

## [1.0.0] - 2025-01-28

### Added
- Initial release of Figma MCP Write Server
- WebSocket bridge architecture for plugin communication
- 13 MCP tools for full Figma write access:
  - `create_rectangle` - Create rectangle shapes
  - `create_ellipse` - Create ellipse/circle shapes  
  - `create_text` - Create text elements
  - `create_frame` - Create frame containers
  - `update_node` - Update existing node properties
  - `move_node` - Move nodes to new positions
  - `delete_node` - Delete nodes
  - `duplicate_node` - Duplicate existing nodes
  - `get_selection` - Get currently selected nodes
  - `set_selection` - Set node selection
  - `get_page_nodes` - List all nodes on current page
  - `export_node` - Export nodes as images
  - `get_plugin_status` - Check plugin connection status
- Figma plugin with UI thread WebSocket connection
- TypeScript implementation with full type safety
- Zod schema validation for all tool inputs
- Real-time heartbeat monitoring
- Comprehensive error handling and logging
- CLI interface with configurable options
- Complete setup documentation

### Changed
- Refactored plugin communication to use WebSocket bridge instead of direct MCP server WebSocket
- Moved WebSocket connection from plugin main thread to UI thread for better compatibility
- Simplified message handling by removing redundant UUID generation
- Updated architecture to separate concerns between bridge and MCP server

### Fixed
- Plugin connection issues by moving WebSocket to UI thread (Figma plugins have network restrictions in main thread)
- TypeScript compilation errors with WebSocket imports
- Message routing between plugin and MCP server
- Heartbeat mechanism for stable connections

### Technical Details
- **Architecture**: MCP Server ↔ WebSocket Bridge ↔ Figma Plugin ↔ Figma API
- **Transport**: stdio for MCP, WebSocket for plugin communication
- **Languages**: TypeScript, JavaScript
- **Dependencies**: @modelcontextprotocol/sdk, ws, zod, uuid
- **Compatibility**: Node.js 18+, Figma Desktop, MCP clients (Claude Desktop, etc.)

### Security
- Local-only WebSocket connections (localhost:3002)
- Plugin runs in Figma's sandboxed environment
- Message validation using Zod schemas
- No sensitive data stored in plugin code
