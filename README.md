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

## 📋 Available Tools

Rather than a thin wrapper around the Figma API, tools are organized for intuitive use and discovery. Humans rely on the UI and good UX, but MCP tools have to be designed from the Agent's perspective.

### Tool Categories
- **Core Design:** `figma_nodes`, `figma_text`, `figma_fills`, `figma_strokes`, `figma_effects`
- **Layout & Positioning:** `figma_auto_layout`, `figma_constraints`, `figma_alignment`, `figma_hierarchy`
- **Design System:** `figma_styles`, `figma_components`, `figma_instances`, `figma_variables`, `figma_fonts`
- **Advanced Operations:** `figma_boolean_operations`, `figma_vector_operations`
- **Developer Tools:** `figma_dev_resources`, `figma_annotations`, `figma_measurements`, `figma_exports`
- **System:** `figma_plugin_status`, `figma_pages`, `figma_selection`

These 24 tools provide complete access to Figma's capabilities - from creating basic shapes and text to building complex design systems with components and variables. Advanced features include boolean operations for combining shapes, vector manipulation for custom paths, and comprehensive export options for developer handoff.

See the [Complete Guide](docs/guide.md#tool-reference) for detailed documentation of each tool.



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
Open Claude Desktop and use any of the 24 available tools to design programmatically

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

- **[Complete Guide](docs/guide.md)** - Setup, tools, examples, and development
- **[Examples](docs/examples.md)** - Quick command reference
- **[Configuration](docs/configuration.md)** - Advanced server settings
- **[Development](docs/development.md)** - Technical reference for contributors
- **[Changelog](CHANGELOG.md)** - Version history and updates

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
