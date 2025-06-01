# Unified Create Node Example

This example demonstrates how to use the new unified `create_node` tool to create different types of Figma nodes with a single, consistent interface.

## Overview

The `create_node` tool replaces the individual `create_rectangle`, `create_ellipse`, `create_text`, and `create_frame` tools with a unified interface that uses a `nodeType` parameter to specify what type of node to create.

## Basic Usage

### Creating a Rectangle

```json
{
  "tool": "create_node",
  "arguments": {
    "nodeType": "rectangle",
    "x": 100,
    "y": 100,
    "width": 200,
    "height": 150,
    "name": "My Rectangle",
    "fillColor": "#FF6B6B"
  }
}
```

### Creating an Ellipse

```json
{
  "tool": "create_node",
  "arguments": {
    "nodeType": "ellipse",
    "x": 300,
    "y": 100,
    "width": 120,
    "height": 120,
    "name": "Circle",
    "fillColor": "#4ECDC4",
    "strokeColor": "#45B7B8",
    "strokeWidth": 3
  }
}
```

### Creating Text

```json
{
  "tool": "create_node",
  "arguments": {
    "nodeType": "text",
    "x": 100,
    "y": 300,
    "content": "Hello, World!",
    "fontSize": 24,
    "fontFamily": "Inter",
    "textColor": "#2C3E50",
    "name": "Greeting Text"
  }
}
```

### Creating a Frame

```json
{
  "tool": "create_node",
  "arguments": {
    "nodeType": "frame",
    "x": 500,
    "y": 100,
    "width": 300,
    "height": 400,
    "name": "Content Frame",
    "backgroundColor": "#F8F9FA"
  }
}
```

## Advanced Examples

### Creating a Card Component

```json
{
  "tool": "create_node",
  "arguments": {
    "nodeType": "frame",
    "x": 50,
    "y": 50,
    "width": 280,
    "height": 180,
    "name": "Card Container",
    "backgroundColor": "#FFFFFF",
    "strokeColor": "#E1E8ED",
    "strokeWidth": 1
  }
}
```

### Creating a Button

```json
{
  "tool": "create_node",
  "arguments": {
    "nodeType": "rectangle",
    "x": 100,
    "y": 400,
    "width": 120,
    "height": 40,
    "name": "Button Background",
    "fillColor": "#3498DB"
  }
}
```

## Property Reference

### Common Properties (All Node Types)
- `nodeType`: **Required** - Type of node ("rectangle", "ellipse", "text", "frame")
- `x`: X position (default: 0)
- `y`: Y position (default: 0)
- `name`: Node name (auto-generated if not provided)

### Shape Properties (Rectangle, Ellipse, Frame)
- `width`: **Required** - Width of the shape
- `height`: **Required** - Height of the shape
- `fillColor`: Fill color (hex format, e.g., "#FF6B6B")
- `strokeColor`: Stroke color (hex format)
- `strokeWidth`: Stroke width in pixels

### Text Properties
- `content`: **Required** - Text content to display
- `fontSize`: Font size (default: 16)
- `fontFamily`: Font family (default: "Inter")
- `textColor`: Text color (hex format)

### Frame Properties
- `backgroundColor`: Background color (hex format)

## Benefits

1. **Consistency**: Single interface for all node creation
2. **Discoverability**: All node types accessible through one tool
3. **Validation**: Built-in validation ensures required properties are provided
4. **Flexibility**: Easy to extend with new node types in the future
5. **Clean API**: No redundant tools or legacy compatibility concerns

## Error Handling

The tool validates that required properties are provided for each node type:

- **Rectangle/Ellipse/Frame**: Must include `width` and `height`
- **Text**: Must include `content`

Invalid configurations will return helpful error messages indicating what properties are missing.