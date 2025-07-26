# Complete Guide

## Setup

### Prerequisites
- Node.js 22.x
- Figma Desktop app
- Claude Desktop or another MCP client

### Install
```bash
git clone git@github.com:oO/figma-mcp-write-server.git
cd figma-mcp-write-server
npm install
npm run build
```

### Configure MCP Client
Add to Claude Desktop settings:
```json
{
  "mcpServers": {
    "figma-mcp-write-server": {
      "command": "node",
      "args": ["/path/to/figma-mcp-write-server/dist/index.js"]
    }
  }
}
```

### Install Figma Plugin
1. Open Figma Desktop
2. Plugins → Development → Import plugin from manifest
3. Select `figma-plugin/manifest.json`
4. Run plugin: Plugins → Development → Figma MCP Write Server

## Using the Tools

### Basic Shapes
```
"Create a blue rectangle"
"Make a 200x100 frame at position 50,50"
"Add a red circle with 2px black stroke"
```

### Text
```
"Add text saying 'Hello World' in 24px Inter Bold"
"Create paragraph text with line height 1.5"
"Apply Helvetica font to selected text"
```

### Layout
```
"Make this frame auto layout vertical with 16px gap"
"Align these shapes to the left"
"Center text in frame"
"Distribute items horizontally"
```

### Styles & Components
```
"Create color style 'Primary Blue' with #0066CC"
"Make this a component called 'Button'"
"Create text style 'Heading 1' with 32px bold"
```

### Advanced
```
"Union these shapes"
"Subtract circle from rectangle"
"Export selection as PNG at 2x"
"Outline this text"
```

## Development

### Adding a New Tool

1. **Create operation handler** in `figma-plugin/src/operations/`:
```typescript
export async function MY_OPERATION(payload: any): Promise<any> {
  // Implementation
  return result;
}
```

2. **Add MCP handler** in appropriate file under `src/handlers/`:
```typescript
async myTool(args: MyToolArgs): Promise<string> {
  const result = await this.executeOperation('MY_OPERATION', args);
  return formatYamlResponse(result);
}
```

3. **Register tool** in handler's `getTools()` method

### Testing
```bash
npm test              # All tests
npm run test:unit     # Unit tests only
npm run dev          # Development mode
```

### Code Patterns
- Use flat parameters in MCP tools (no nested objects)
- Return YAML formatted responses
- Follow existing operation naming: `VERB_NOUN` (e.g., `CREATE_NODES`)
- Clone arrays/objects before modifying Figma properties

### Common Issues
- **WebSocket errors**: Check plugin is running in Figma
- **Font not found**: Sync font database with `figma_fonts` tool
- **Operation not found**: Ensure handler exports match operation name

## Tool Reference

### Core Design
- `figma_nodes` - Create/update/delete shapes, frames, text
- `figma_text` - Text styling and properties
- `figma_fills` - Colors, gradients, images
- `figma_strokes` - Border styling
- `figma_effects` - Shadows, blurs

### Layout
- `figma_auto_layout` - Auto layout properties
- `figma_constraints` - Resize behavior
- `figma_alignment` - Align and distribute
- `figma_hierarchy` - Layer organization
- `figma_selection` - Selection control

### Design System
- `figma_styles` - Color/text/effect styles
- `figma_components` - Components and variants
- `figma_instances` - Component instances
- `figma_variables` - Design tokens
- `figma_fonts` - Font management

### Advanced
- `figma_boolean_operations` - Union/subtract/intersect
- `figma_vector_operations` - Paths and outlines
- `figma_exports` - Export assets
- `figma_dev_resources` - CSS generation
- `figma_plugin_status` - Connection status

## Configuration

See [configuration.md](configuration.md) for detailed server configuration options.