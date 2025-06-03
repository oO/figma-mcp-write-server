# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.13.1] - 2025-06-03

### Changed
- **Plugin UI**: Completely redesigned Figma plugin interface
  - Simplified flat design with consistent 8px spacing
  - Removed complex nested sections and rounded corners
  - Clean layout prioritizing activity log visibility
  - Fixed flexbox layout to prevent content clipping
  - Removed timestamps from log entries for cleaner display
  - Improved visual hierarchy with better typography and spacing

## [0.13.0] - 2025-06-02

### Added
- **Auto Layout & Constraints**: New responsive design capabilities with two new tools
  - `manage_auto_layout` tool for automatic content arrangement and sizing
    - Enable/disable auto layout on frames with `enable`, `disable` operations
    - Configure layout direction (horizontal/vertical), spacing, and padding
    - Set primary and counter axis alignment (min, center, max, space_between)
    - Control resizing behavior (hug, fill, fixed) for dynamic content adaptation
    - Update and retrieve auto layout properties with full configuration details
  - `manage_constraints` tool for responsive behavior in non-auto-layout containers
    - Set horizontal constraints (left, right, left_right, center, scale)
    - Set vertical constraints (top, bottom, top_bottom, center, scale)
    - Get current constraint settings and validate constraint compatibility
    - Reset constraints to defaults and check constraint applicability
  - Validation preventing invalid operations (auto layout children cannot have constraints)
  - Rich response formatting with detailed feedback and change tracking

### Enhanced
- **Hierarchy Management**: Improved `move_to_parent` operation for auto layout compatibility
  - Auto-detects when target parent has auto layout enabled
  - Skips manual coordinate transformation for auto layout containers
  - Provides clear feedback about automatic positioning behavior
  - Maintains backward compatibility for non-auto-layout parent containers

### Fixed
- **Plugin Compatibility**: Resolved JavaScript syntax issues for Figma's plugin environment
  - Replaced ES6 spread operator (`...`) with `Object.assign()` and `.concat()`
  - Fixed "Unexpected token ..." errors in Figma console
  - Enhanced error handling and input validation for auto layout properties
  - Improved null safety and default value handling throughout plugin code

### Technical Details
- **Tool Count**: Expanded to 15 MCP tools (added 2 new auto layout tools)
- **API Coverage**: Figma auto layout and constraints API implementation
- **Validation**: Full parameter validation with descriptive error messages
- **JavaScript Compatibility**: ES5-compatible code for Figma plugin environment

## [0.12.0] - 2025-06-02

### Added
- **Layer & Hierarchy Management**: New `manage_hierarchy` tool with layer organization capabilities
  - Grouping operations: `group`, `ungroup`, `frame` for organizing related elements
  - Depth/Z-index management: `bring_to_front`, `send_to_back`, `bring_forward`, `send_backward`
  - Precise positioning: `reorder`, `move_above`, `move_below` for exact layer control
  - Hierarchy manipulation: `move_to_parent` for restructuring node relationships
  - Tree traversal: `get_parent`, `get_children`, `get_siblings`, `get_ancestors`, `get_descendants`
  - Layer introspection: `get_layer_index` for current position information
  - Smart container creation with automatic sizing and coordinate adjustment
  - Support for both GROUP and FRAME container types

### Enhanced
- **Plugin Integration**: Hierarchy management in Figma plugin
  - Full grouping and ungrouping with parent-child relationship handling
  - Frame creation with automatic bounding box calculation
  - Layer ordering with proper index management and validation
  - Coordinate system handling for parent transitions
  - Error handling for invalid operations and missing nodes
  - Tree traversal algorithms for ancestor/descendant queries

### Technical Details
- **API Coverage**: 17 distinct hierarchy operations covering all common use cases
- **Validation**: Parameter validation for each operation type with clear error messages
- **Performance**: Efficient tree traversal and batch operations
- **Safety**: Bounds checking and parent validation to prevent invalid states

## [0.11.0] - 2025-06-01

### Added
- **Style Management**: New `manage_styles` tool with Figma style support
  - Paint styles: solid colors, linear/radial/angular/diamond gradients, image fills
  - Text styles: typography control with Figma text properties
  - Effect styles: drop shadows, inner shadows, layer blur, background blur
  - Grid styles: column/row/grid layouts with full configuration
  - CRUD operations: create, list, apply, delete, get styles
  - Style application to any compatible node type
  - Figma Plugin API coverage for style types

### Enhanced
- **Plugin Integration**: Style handling in Figma plugin
  - Paint creation with gradient types and image support
  - Text style property mapping including OpenType features
  - Effect system with multiple effects and blend modes
  - Layout grid support with all alignment and sizing options
  - Error handling and logging for style operations

### Technical Details
- **Schema Validation**: Zod schemas for style operations
- **Type Safety**: TypeScript support for style properties
- **API Coverage**: Coverage of Figma's style management capabilities

## [0.10.0] - 2025-06-01

### Added
- **Typography Tool**: New `create_text` tool with typography features
  - Mixed text styling with `styleRanges` for applying different fonts, sizes, and colors to text segments
  - Font properties: `fontFamily`, `fontStyle`, `fontSize`, `textCase`, `textDecoration`
  - Text alignment controls: `textAlignHorizontal`, `textAlignVertical`
  - Spacing controls: `letterSpacing`, `lineHeight`, `paragraphIndent`, `paragraphSpacing`
  - Line height unit support (pixels or percentage)
  - Text style creation and management with `createStyle` and `styleName` parameters
  - Fixed-width text support with automatic height adjustment
- **Plugin Integration**: Text handling in Figma plugin
  - Unified text creation function supporting both simple and advanced typography
  - Asynchronous font loading with proper error handling
  - Style range application using Figma's `setRange*` methods
  - Text style creation with property mapping
  - Backward compatibility with existing `create_node` text creation

### Changed
- **Text Creation Architecture**: Consolidated text creation pathways
  - Updated existing `createText()` function to handle advanced typography parameters
  - Single code path for both `CREATE_TEXT` and legacy text creation
  - Eliminated code duplication between simple and advanced text creation
- **Tool Documentation**: Updated `create_node` tool with typography guidance
  - Added annotation directing users to `create_text` for advanced typography features
  - Schema documentation for typography parameters
  - Added practical examples for mixed styling and text style creation

### Technical Details
- **Font Management**: Improved font loading with support for multiple fonts in single text node
- **Color Handling**: Enhanced color processing for both global and range-specific text colors
- **Parameter Mapping**: Conversion between MCP schema and Figma API formats
- **Error Handling**: Error handling for font loading and style creation operations

## [0.9.4] - 2025-06-01

### Added
- **Version Display**: Added version number to plugin UI
- **Automated Version Management**: New build process for version handling
  - Added build script to inject package.json version into plugin UI
  - Created ui.template.html with version placeholder
  - Added build:plugin-ui npm script

### Changed
- **UI Improvements**: Enhanced plugin interface
  - Simplified version display to single line "MCP WebSocket Client v0.9.4"
  - Improved UI layout and readability

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

## [0.9.3] - 2025-06-01

### Added
- **Unified Node Creation**: New `create_node` tool that consolidates all node creation functionality
  - Single tool for creating rectangles, ellipses, text, and frames
  - Uses `nodeType` parameter to specify what type of node to create
  - Built-in validation ensures required properties are provided for each node type
  - Automatic default value assignment (dimensions, names, font properties)
- **Documentation**: Added examples and usage guide
  - Updated README with unified tool documentation
  - Property reference guide

### Removed
- **Legacy Tools**: Removed individual node creation tools to simplify API
  - Removed `create_rectangle`, `create_ellipse`, `create_text`, and `create_frame`
  - Removed corresponding schemas and plugin handlers
  - Streamlined codebase with single creation interface

### Changed
- **Version Scheme**: Reset to 0.9.x to reflect pre-release development status
- **Plugin Communication**: Updated to use single `CREATE_NODE` message type
- **Tool Count**: Reduced from 14 to 10 tools with cleaner, unified interface

## [0.9.2] - 2025-06-01

### Fixed
- **Architecture**: Fixed broken communication between MCP server and Figma plugin
  - Implemented WebSocket server directly in MCP server (port 8765)
  - Updated Figma plugin to be WebSocket client that connects to MCP server
  - Fixed port configuration inconsistencies (standardized on 8765)
  - Removed broken plugin-client.ts and bridge architecture
- **Documentation**: Cleanup and accuracy improvements
  - Removed exaggerated claims ("breakthrough", "first ever", "novel")
  - Fixed help text references to non-existent files
  - Updated architecture descriptions to match actual implementation
  - Removed redundant PROJECT_SUMMARY.md file
  - Fixed typos and improved navigation between documentation files
- **Plugin**: Improved Figma plugin implementation
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

## [0.2.0] - 2025-05-28

### Fixed
- **Fixed**: JSON parsing errors in MCP protocol communication
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

## [0.1.0] - 2025-05-28

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
- Error handling and logging
- CLI interface with configurable options
- Setup documentation

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
