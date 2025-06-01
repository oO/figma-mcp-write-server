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

### NEW: Advanced Typography (v0.10.0)
```javascript
// Create a styled heading with mixed formatting
await mcpClient.callTool('create_text', {
  characters: 'Advanced Typography Features',
  x: 50,
  y: 50,
  fontSize: 32,
  fontFamily: 'Inter',
  fontStyle: 'Bold',
  textAlignHorizontal: 'CENTER',
  letterSpacing: 1.2,
  lineHeight: 120,
  lineHeightUnit: 'percent',
  styleRanges: [
    {
      start: 0,
      end: 8,
      fillColor: '#FF6B35',
      fontStyle: 'Bold'
    },
    {
      start: 9,
      end: 19,
      fillColor: '#0066FF',
      fontSize: 28
    },
    {
      start: 20,
      end: 28,
      textDecoration: 'UNDERLINE',
      fillColor: '#333333'
    }
  ],
  createStyle: true,
  styleName: 'Heading/Display'
});

// Create text with paragraph styling
await mcpClient.callTool('create_text', {
  characters: 'This is a paragraph with custom spacing and alignment. It demonstrates advanced typography controls including line height, letter spacing, and paragraph formatting.',
  x: 50,
  y: 120,
  width: 400,
  fontSize: 16,
  fontFamily: 'Inter',
  fontStyle: 'Regular',
  textAlignHorizontal: 'JUSTIFIED',
  lineHeight: 150,
  lineHeightUnit: 'percent',
  letterSpacing: 0.5,
  paragraphSpacing: 12,
  fillColor: '#444444',
  createStyle: true,
  styleName: 'Body/Paragraph'
});
```

### Basic Operations
```javascript
// Create a simple button component
await mcpClient.callTool('create_node', {
  nodeType: 'frame',
  name: 'Button',
  width: 120,
  height: 40,
  fillColor: '#0066FF'
});

await mcpClient.callTool('create_text', {
  characters: 'Click Me',
  x: 10,
  y: 10,
  fontSize: 14,
  fillColor: '#FFFFFF'
});
```

### Advanced Workflows
```javascript
// Create a complete card component with advanced typography
const cardFrame = await mcpClient.callTool('create_node', {
  nodeType: 'frame',
  name: 'Card Component',
  width: 300,
  height: 200,
  fillColor: '#FFFFFF'
});

// Add styled header with mixed formatting
await mcpClient.callTool('create_text', {
  characters: 'Premium Card Title',
  x: 20,
  y: 20,
  fontSize: 18,
  fontFamily: 'Inter',
  fontStyle: 'Bold',
  fillColor: '#000000',
  styleRanges: [
    {
      start: 0,
      end: 7,
      fillColor: '#FF6B35',
      fontSize: 20
    }
  ],
  createStyle: true,
  styleName: 'Card/Title'
});

// Add body text with advanced formatting
await mcpClient.callTool('create_text', {
  characters: 'This card demonstrates advanced typography features including mixed styling, custom spacing, and text style creation.',
  x: 20,
  y: 50,
  width: 260,
  fontSize: 14,
  fontFamily: 'Inter',
  fontStyle: 'Regular',
  fillColor: '#666666',
  lineHeight: 140,
  lineHeightUnit: 'percent',
  letterSpacing: 0.3,
  textAlignHorizontal: 'LEFT',
  createStyle: true,
  styleName: 'Card/Body'
});

// Add action button with styled text
await mcpClient.callTool('create_node', {
  nodeType: 'rectangle',
  x: 20,
  y: 150,
  width: 100,
  height: 32,
  fillColor: '#0066FF',
  name: 'Action Button'
});

await mcpClient.callTool('create_text', {
  characters: 'Learn More',
  x: 35,
  y: 160,
  fontSize: 14,
  fontFamily: 'Inter',
  fontStyle: 'Medium',
  fillColor: '#FFFFFF',
  textAlignHorizontal: 'CENTER',
  letterSpacing: 0.5,
  textCase: 'UPPER'
});
```

## 🎨 Typography Features (New in v0.10.0)

### Mixed Text Styling
Use `styleRanges` to apply different formatting to text segments:
```javascript
styleRanges: [
  { start: 0, end: 5, fontStyle: 'Bold', fillColor: '#FF0000' },
  { start: 6, end: 12, fontSize: 20, textDecoration: 'UNDERLINE' }
]
```

### Text Style Creation
Create reusable text styles for design consistency:
```javascript
{
  createStyle: true,
  styleName: 'Heading/H1',
  fontSize: 32,
  fontStyle: 'Bold'
}
```

### Advanced Typography Controls
- **Alignment**: `textAlignHorizontal`, `textAlignVertical`
- **Spacing**: `letterSpacing`, `lineHeight`, `paragraphSpacing`
- **Styling**: `textCase`, `textDecoration`, `fontStyle`
- **Layout**: Fixed width with `width` parameter

## 🚀 Getting Started

1. Follow the main README setup instructions
2. Choose a configuration example that matches your use case
3. Customize the parameters for your specific needs
4. Test with simple operations before complex workflows
5. **NEW**: Experiment with `create_text` for advanced typography

## 💡 Pro Tips

- Start with basic shapes before complex components
- Use consistent naming conventions for better organization
- Test plugin connection before starting batch operations
- Monitor the plugin UI for real-time connection status
- Use the `get_plugin_status` tool to verify connectivity
- **NEW**: Use `create_text` instead of `create_node` for text with advanced styling
- **NEW**: Create text styles early in your design process for consistency
- **NEW**: Use `styleRanges` for highlighting and mixed formatting within text
