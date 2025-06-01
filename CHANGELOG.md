# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Version Display**: Added version number to plugin UI
- **Automated Version Management**: New build process for version handling
  - Added build script to inject package.json version into plugin UI
  - Created ui.template.html with version placeholder
  - Added build:plugin-ui npm script

### Changed
- **Property Handling**: Standardized color property handling across node types
  - Unified fillColor property for all node types (text, shapes, frames)
  - Removed redundant textColor and backgroundColor properties
  - Updated property descriptions for clarity
- **Code Organization**: Improved code structure and maintainability
  - Added formatNodeResponse helper for consistent node responses
  - Standardized naming conventions across codebase
  - Improved section header visibility in type definitions
- **Documentation**: Simplified examples and documentation
  - Removed empty unified-create-node-example.md
  - Updated examples README to reflect actual content
  - Removed references to non-existent example files

## [0.9.3] - 2025-01-25

### Added
- **Unified Node Creation**: New `create_node` tool that consolidates all node creation functionality
  - Single tool for creating rectangles, ellipses, text, and frames
  - Uses `nodeType` parameter to specify what type of node to create
  - Built-in validation ensures required properties are provided for each node type
  - Automatic default value assignment (dimensions, names, font properties)
- **Enhanced Documentation**: Added comprehensive examples and usage guide
  - Updated README with unified tool documentation
  - Complete property reference guide

### Removed
- **Legacy Tools**: Removed individual node creation tools to simplify API
  - Removed `create_rectangle`, `create_ellipse`, `create_text`, and `create_frame`
  - Removed corresponding schemas and plugin handlers
  - Streamlined codebase with single creation interface

### Changed
- **Version Scheme**: Reset to 0.9.x to reflect pre-release development status
- **Plugin Communication**: Updated to use single `CREATE_NODE` message type
- **Tool Count**: Reduced from 14 to 10 tools with cleaner, unified interface

## [0.9.2] - 2025-05-31

### Fixed
- **Architecture**: Fixed broken communication between MCP server and Figma plugin
  - Implemented WebSocket server directly in MCP server (port 8765)
  - Updated Figma plugin to be WebSocket client that connects to MCP server
  - Fixed port configuration inconsistencies (standardized on 8765)
  - Removed broken plugin-client.ts and bridge architecture
- **Documentation**: Comprehensive cleanup and accuracy improvements
  - Removed exaggerated claims ("breakthrough", "first ever", "novel")
  - Fixed help text references to non-existent files
  - Updated architecture descriptions to match actual implementation
  - Removed redundant PROJECT_SUMMARY.md file
  - Fixed typos and improved navigation between documentation files
- **Plugin**: Enhanced Figma plugin implementation
  - Added proper WebSocket client with auto-reconnection
  - Improved error handling and visual status indicators
  - Added font loading for text creation operations
  - Enhanced UI with real-time connection monitoring

### Changed
- **Architecture**: Simplified to direct MCP server ↔ Plugin communication
  - MCP server now includes built-in WebSocket server
  - Plugin connects as WebSocket client (eliminates bridge complexity)
  - Consistent port configuration (8765) across all components
- **Code Structure**: Cleaned up unused files and inconsistent references
  - Removed plugin-client.ts (functionality moved to mcp-server.ts)
  - Updated help text and documentation to match actual file structure
  - Fixed TypeScript imports and dependencies

### Technical Details
- **Port**: Standardized on 8765 for WebSocket communication
- **Connection**: Plugin auto-connects to MCP server on startup
- **Error Handling**: Improved timeout and reconnection logic
- **Logging**: Better status reporting and debugging information

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
- Local-only WebSocket connections (localhost:8765)
- Plugin runs in Figma's sandboxed environment
- Message validation using Zod schemas
- No sensitive data stored in plugin code
