# Figma MCP Write Server

A Model Context Protocol (MCP) server that provides write access to Figma through the Plugin API, enabling AI agents to create, modify, and manage Figma designs programmatically.

Designed with ❤️ by a human. Coded with ✨ by AI agents (Claude and Gemini)

> [!WARNING]
> This project is in pre-release development mode (Semantic Versioning < 1.0.0). All tools, interfaces and definitions are subject to change.

## 🚀 Overview

Since Figma's REST API is read-only, this server uses the Plugin API to enable write operations, allowing AI agents to act as autonomous graphic designers.

| Feature | REST API MCP | Plugin API MCP (This Project) |
|---------|--------------|-------------------------------|
| **Read Operations** | ✅ Full access | ✅ Full access |
| **Write Operations** | ❌ Not supported | ✅ Full support |
| **Real-time Updates** | ❌ Polling only | ✅ Live connection |
| **Rate Limits** | Yes (REST API limits) | No (direct plugin access) |
| **Setup Complexity** | Simple | Moderate (requires plugin) |
| **Offline Usage** | ✅ Works offline | ❌ Requires active Figma session |

**Key Capabilities:**
- **Full Design Creation** - Generate complete designs from scratch, not just modifications
- **Design System Integration** - Create and manage components, styles, and design tokens
- **Developer Handoff** - Generate CSS and manage development resources and status
- **Asset Management** - Handle images, fonts, and exports to the filesystem or directly back to the AI agent
- **Complete Figma API Support** -

## 📋 Available Tools

Rather than a thin wrapper around the Figma API, tools are thouthtfully organized for intuitive use and discovery. Humans rely on the UI and good UX, but MCP tools have to be designed from the Agent's perspective. _AX is the new UX_

### Core Design Tools
- **`figma_nodes`** - Create, update, move, delete, and duplicate design elements (rectangles, ellipses, text, frames, stars, polygons)
- **`figma_text`** - Create and style text with typography controls, character-level formatting, and text properties
- **`figma_fills`** - Manage fill properties including solid colors, gradients, image fills, and pattern fills for design elements
- **`figma_strokes`** - Manage stroke properties including solid colors, gradients, image strokes, patterns, and stroke styling (weight, alignment, caps, joins)
- **`figma_effects`** - Apply shadows, blurs, and other visual effects to design elements

### Layout & Positioning
- **`figma_auto_layout`** - Complete auto layout system with 7 operations: get/set layouts (horizontal/vertical/grid/freeform), child properties, and reordering. Supports cross-parent bulk operations and auto-index lookup
- **`figma_constraints`** - Set layout constraints to control how elements resize and reposition
- **`figma_alignment`** - Align, position, and distribute multiple elements with various reference points
- **`figma_hierarchy`** - Parent, Group, ungroup, and reorder nodes in the layer structure
- **`figma_selection`** - Get or set the current selection and navigate page nodes

### Design System
- **`figma_styles`** - Create and manage design system styles for colors, text, effects, and layout grids
- **`figma_components`** - Create and manage reusable components and component sets with variant properties
- **`figma_instances`** - Create component instances, swap components, and manage property overrides
- **`figma_variables`** - Create, bind, and manage design variables across your design system
- **`figma_fonts`** - Search, validate, and manage fonts with font database integration

### Advanced Operations
- **`figma_boolean_operations`** - Perform union, subtract, intersect, and exclude operations on shapes
- **`figma_vector_operations`** - Create and manipulate vector paths, flatten shapes, and outline strokes

### Developer Tools
- **`figma_dev_resources`** - Generate CSS code and manage development resources and status
- **`figma_annotations`** - Add design annotations and documentation for developer handoff
- **`figma_measurements`** - Create spacing and sizing measurements for design specifications
- **`figma_exports`** - Export design elements as images, SVGs, or other formats with customizable settings

### System Tools
- **`figma_plugin_status`** - Check plugin connection status, run diagnostics, and monitor system health



## ⚡ Quick Start

#### System Requirements
- **Operating System** - Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **Active Figma Session** - Server requires an open Figma file to operate
- **Network Connection** - For font database sync and plugin communication


### 1. 📋 Install pre-requisites

- **Node.js 22.x** - Download from [nodejs.org](https://nodejs.org/)
- **npm** - Comes with Node.js (verify with `npm --version`)
- **Figma Desktop** - Required for Plugin API access (browser version has limitations)
  - Download: [figma.com/downloads](https://www.figma.com/downloads/) (Windows 10+ or macOS 11+)
- **Git** - For cloning the repository

```bash
node --version  # Should show v22.x.x
npm --version   # Should show 8.0.0 or higher
git --version   # Should show 2.0.0 or higher
```

> **Note**: Node.js v22.x is specifically required due to better-sqlite3 pre-built binary compatibility. Other Node versions may require manual compilation which can fail on some systems.


### 2. Clone and Build Project
```bash
git clone git@github.com:oO/figma-mcp-write-server.git
cd figma-mcp-write-server
npm install
npm run build
```

### 3. Configure Claude Desktop
Add this configuration to your Claude Desktop MCP settings file:

**Configuration:**
```json
{
  "mcpServers": {
    "figma-mcp-write-server": {
      "command": "node",
      "args": ["/path/to/figma-mcp-write-server/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 4. Install the Figma Plugin
1. Open Figma Desktop
2. Go to **Plugins** → **Development** → **Import plugin from manifest**
3. Select `figma-plugin/manifest.json` from the project directory
4. Run the plugin from **Plugins** → **Development** → **Figma MCP Write Server**

**Optional**: Customize server settings by copying `config.example.yaml` to your platform-specific config directory and editing as needed. See [Configuration Guide](docs/configuration.md) for details.

## 🎯 Start Creating
Open Claude Desktop and use any of the 22 available tools to design programmatically

### Layout & Structure
- "Create a header frame with title and subtitle"
- "Make this frame arrange its children vertically with 16px spacing"
- "Center text within frame" or "Align circle's center to rectangle's left edge"
- "Add a 2px red stroke to this rectangle with rounded end caps"

### Design Systems
- "Create color palette and apply styles consistently"
- "Build button variants with different colors and styles"
- "Create design tokens for colors and spacing, bind to components"

### Boolean Operations
- "Combine shapes with union, create cutouts with subtract"
- "Create complex logos by intersecting and excluding shapes"
- "Build icon libraries with consistent stroke-to-fill conversion"

### Vector Operations
- "Create custom icons with SVG paths and flatten complex shapes"
- "Convert stroke outlines to filled paths for better scaling"
- "Extract vector paths from existing shapes for modification"

### Developer Handoff
- "Add annotations and measurements, generate CSS for developers"
- "Export selected components as PNG files"
- "Create design specifications with spacing measurements"



## 🚧 Current Limitations

- **Active Session Required** - Requires open Figma Desktop application with active file
- **Manual Plugin Setup** - Plugin must be manually installed and run for each session
- **Single File Scope** - Operations limited to currently open file and selected page
- **Network Dependency** - WebSocket connection can be unstable on poor networks
- **Pattern Fill Creation** - Pattern fills can be read but not created due to a known Figma Plugin API validation bug
- **Desktop Only** - Figma browser version has limited Plugin API access


## 📚 Documentation

- **[Usage Examples](docs/examples.md)** - Practical usage examples and AI instructions
- **[Configuration Guide](docs/configuration.md)** - Server configuration and setup options
- **[Development Guide](docs/development.md)** - Contributing and architecture guidelines
- **[Changelog](CHANGELOG.md)** - Version history and updates

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
