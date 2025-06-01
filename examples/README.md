# Figma MCP Write Server Examples

This directory contains example usage patterns and configurations for the Figma MCP Write Server.

## 🎯 Examples

### 1. Claude Desktop Configuration
File: `claude-desktop-config.json`
- Example configuration for Claude Desktop MCP integration
- Shows basic server setup parameters

### 2. Design System Creation
File: `design-system-example.md`
- Create consistent design components
- Set up color palettes and typography
- Build reusable component libraries

## 📝 Code Examples

### Basic Operations
```javascript
// Create a simple button component
await mcpClient.callTool('create_frame', {
  name: 'Button',
  width: 120,
  height: 40,
  backgroundColor: '#0066FF'
});

await mcpClient.callTool('create_text', {
  x: 10,
  y: 10,
  content: 'Click Me',
  fontSize: 14,
  textColor: '#FFFFFF'
});
```

### Advanced Workflows
```javascript
// Create a complete card component with multiple elements
const cardFrame = await mcpClient.callTool('create_frame', {
  name: 'Card Component',
  width: 300,
  height: 200,
  backgroundColor: '#FFFFFF'
});

// Add header text
await mcpClient.callTool('create_text', {
  x: 20,
  y: 20,
  content: 'Card Title',
  fontSize: 18,
  fontFamily: 'Inter',
  textColor: '#000000'
});

// Add body text
await mcpClient.callTool('create_text', {
  x: 20,
  y: 50,
  content: 'This is the card description text.',
  fontSize: 14,
  fontFamily: 'Inter',
  textColor: '#666666'
});

// Add action button
await mcpClient.callTool('create_rectangle', {
  x: 20,
  y: 150,
  width: 100,
  height: 32,
  fillColor: '#0066FF',
  name: 'Action Button'
});
```

## 🚀 Getting Started

1. Follow the main README setup instructions
2. Choose a configuration example that matches your use case
3. Customize the parameters for your specific needs
4. Test with simple operations before complex workflows

## 💡 Pro Tips

- Start with basic shapes before complex components
- Use consistent naming conventions for better organization
- Test plugin connection before starting batch operations
- Monitor the plugin UI for real-time connection status
- Use the `get_plugin_status` tool to verify connectivity
