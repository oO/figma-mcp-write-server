# Design System Creation Examples

## 🎨 Creating a Complete Design System

### Step 1: Define Color Palette
```
Create a color palette with primary, secondary, and neutral colors as rectangles arranged in a grid.
```

**AI Agent Commands:**
- `create_rectangle` with different fill colors for each color swatch
- `create_text` to label each color with hex values
- `create_frame` to group related colors together

### Step 2: Typography Scale
```
Create a typography scale showing different text sizes and weights.
```

**Example Typography Hierarchy:**
- Heading 1: 32px, Inter Bold
- Heading 2: 24px, Inter SemiBold  
- Heading 3: 20px, Inter Medium
- Body: 16px, Inter Regular
- Caption: 12px, Inter Regular

### Step 3: Component Library
```
Create basic UI components: buttons, input fields, cards, and navigation elements.
```

**Button Variants:**
- Primary: Blue background, white text
- Secondary: White background, blue text, blue border
- Tertiary: Transparent background, blue text

### Step 4: Spacing System
```
Create a spacing scale with consistent margin and padding values.
```

**Spacing Scale:**
- XS: 4px
- SM: 8px
- MD: 16px
- LG: 24px
- XL: 32px
- XXL: 48px

## 🔧 Implementation Example

### Creating Button Components

```javascript
// Primary Button
await mcpClient.callTool('create_rectangle', {
  name: 'Primary Button',
  width: 120,
  height: 40,
  fillColor: '#0066FF',
  x: 50,
  y: 50
});

await mcpClient.callTool('create_text', {
  name: 'Button Text',
  content: 'Primary',
  fontSize: 14,
  fontFamily: 'Inter',
  textColor: '#FFFFFF',
  x: 67,
  y: 63
});

// Secondary Button
await mcpClient.callTool('create_rectangle', {
  name: 'Secondary Button',
  width: 120,
  height: 40,
  fillColor: '#FFFFFF',
  strokeColor: '#0066FF',
  strokeWidth: 1,
  x: 200,
  y: 50
});

await mcpClient.callTool('create_text', {
  name: 'Button Text',
  content: 'Secondary',
  fontSize: 14,
  fontFamily: 'Inter',
  textColor: '#0066FF',
  x: 217,
  y: 63
});
```

### Creating Color Swatches

```javascript
const colors = [
  { name: 'Primary', hex: '#0066FF', x: 50 },
  { name: 'Secondary', hex: '#00CC88', x: 200 },
  { name: 'Neutral Dark', hex: '#333333', x: 350 },
  { name: 'Neutral Light', hex: '#F5F5F5', x: 500 }
];

for (const color of colors) {
  // Create color swatch
  await mcpClient.callTool('create_rectangle', {
    name: `${color.name} Swatch`,
    width: 100,
    height: 100,
    fillColor: color.hex,
    x: color.x,
    y: 150
  });
  
  // Add color label
  await mcpClient.callTool('create_text', {
    name: `${color.name} Label`,
    content: `${color.name}\n${color.hex}`,
    fontSize: 12,
    fontFamily: 'Inter',
    textColor: '#333333',
    x: color.x,
    y: 270
  });
}
```

### Creating Typography Scale

```javascript
const typographyScale = [
  { name: 'H1', size: 32, weight: 'Bold', y: 350 },
  { name: 'H2', size: 24, weight: 'SemiBold', y: 400 },
  { name: 'H3', size: 20, weight: 'Medium', y: 440 },
  { name: 'Body', size: 16, weight: 'Regular', y: 480 },
  { name: 'Caption', size: 12, weight: 'Regular', y: 510 }
];

for (const text of typographyScale) {
  await mcpClient.callTool('create_text', {
    name: `Typography ${text.name}`,
    content: `${text.name} - ${text.size}px ${text.weight}`,
    fontSize: text.size,
    fontFamily: 'Inter',
    textColor: '#333333',
    x: 50,
    y: text.y
  });
}
```

## 📋 Design System Checklist

### Colors
- [ ] Primary color and variants
- [ ] Secondary color and variants  
- [ ] Neutral grays (5-7 shades)
- [ ] Semantic colors (success, warning, error)
- [ ] Background colors

### Typography
- [ ] Font family selection
- [ ] Heading hierarchy (H1-H6)
- [ ] Body text styles
- [ ] Caption and small text
- [ ] Line height standards

### Components
- [ ] Buttons (primary, secondary, tertiary)
- [ ] Form inputs (text, select, checkbox, radio)
- [ ] Cards and containers
- [ ] Navigation elements
- [ ] Icons and illustrations

### Spacing
- [ ] Margin scale
- [ ] Padding scale
- [ ] Grid system
- [ ] Component spacing rules

### Layout
- [ ] Grid system
- [ ] Breakpoints
- [ ] Container widths
- [ ] Column gutters

## 🎯 Pro Tips

1. **Start with constraints** - Define your color palette and typography scale first
2. **Use consistent naming** - Establish naming conventions early
3. **Create reusable components** - Build once, use everywhere
4. **Document decisions** - Add notes explaining design choices
5. **Test at scale** - Create example pages using your system
6. **Iterate based on usage** - Refine components as you use them

## 🔄 Workflow Integration

### With Design Tokens
```javascript
const designTokens = {
  colors: {
    primary: '#0066FF',
    secondary: '#00CC88',
    neutral: {
      900: '#1A1A1A',
      800: '#333333',
      700: '#4D4D4D',
      // ...
    }
  },
  typography: {
    fontFamily: 'Inter',
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 32
    }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  }
};

// Use tokens in component creation
await mcpClient.callTool('create_rectangle', {
  fillColor: designTokens.colors.primary,
  width: designTokens.spacing.xl * 4,
  height: designTokens.spacing.lg
});
```

This systematic approach ensures consistency across your entire design system and makes it easy to maintain and scale.
