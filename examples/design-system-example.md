# Design System Creation Examples with Advanced Typography (v0.10.0)

## 🎨 Creating a Complete Design System

### Step 1: Define Color Palette
```
Create a color palette with primary, secondary, and neutral colors as rectangles arranged in a grid.
```

**AI Agent Commands:**
- `create_node` with `nodeType: "rectangle"` and different fill colors for each color swatch
- `create_text` with advanced styling to label each color with hex values and descriptions
- `create_node` with `nodeType: "frame"` to group related colors together

### Step 2: Advanced Typography Scale (NEW)
```
Create a comprehensive typography scale with text styles, mixed formatting, and consistent spacing.
```

**Example Typography Hierarchy with Styles:**
- Display: 48px, Inter Bold, tight letter spacing, created as "Display/Large" style
- Heading 1: 32px, Inter Bold, created as "Heading/H1" style
- Heading 2: 24px, Inter SemiBold, created as "Heading/H2" style
- Heading 3: 20px, Inter Medium, created as "Heading/H3" style
- Body Large: 18px, Inter Regular, 150% line height, created as "Body/Large" style
- Body: 16px, Inter Regular, 140% line height, created as "Body/Regular" style
- Caption: 12px, Inter Regular, 120% line height, created as "Caption/Regular" style

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
// Primary Button with Advanced Typography
await mcpClient.callTool('create_node', {
  nodeType: 'rectangle',
  name: 'Primary Button',
  width: 120,
  height: 40,
  fillColor: '#0066FF',
  x: 50,
  y: 50
});

await mcpClient.callTool('create_text', {
  characters: 'Primary',
  name: 'Button Text',
  fontSize: 14,
  fontFamily: 'Inter',
  fontStyle: 'Medium',
  fillColor: '#FFFFFF',
  textAlignHorizontal: 'CENTER',
  letterSpacing: 0.5,
  textCase: 'UPPER',
  x: 67,
  y: 63,
  createStyle: true,
  styleName: 'Button/Primary'
});

// Secondary Button with Advanced Typography
await mcpClient.callTool('create_node', {
  nodeType: 'rectangle',
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
  characters: 'Secondary',
  name: 'Button Text',
  fontSize: 14,
  fontFamily: 'Inter',
  fontStyle: 'Medium',
  fillColor: '#0066FF',
  textAlignHorizontal: 'CENTER',
  letterSpacing: 0.5,
  textCase: 'UPPER',
  x: 217,
  y: 63,
  createStyle: true,
  styleName: 'Button/Secondary'
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
  await mcpClient.callTool('create_node', {
    nodeType: 'rectangle',
    name: `${color.name} Swatch`,
    width: 100,
    height: 100,
    fillColor: color.hex,
    x: color.x,
    y: 150
  });
  
  // Add color label with advanced typography
  await mcpClient.callTool('create_text', {
    characters: `${color.name}\n${color.hex}`,
    name: `${color.name} Label`,
    fontSize: 12,
    fontFamily: 'Inter',
    fontStyle: 'Medium',
    fillColor: '#333333',
    textAlignHorizontal: 'CENTER',
    lineHeight: 140,
    lineHeightUnit: 'percent',
    letterSpacing: 0.3,
    x: color.x,
    y: 270,
    styleRanges: [
      {
        start: 0,
        end: color.name.length,
        fontStyle: 'Bold',
        fontSize: 14
      },
      {
        start: color.name.length + 1,
        end: color.name.length + 1 + color.hex.length,
        fontStyle: 'Regular',
        fillColor: '#666666'
      }
    ],
    createStyle: true,
    styleName: 'Color/Label'
  });
}
```

### Creating Advanced Typography Scale with Text Styles

```javascript
const typographyScale = [
  { 
    name: 'Display', 
    size: 48, 
    weight: 'Bold', 
    lineHeight: 110, 
    letterSpacing: -1.5, 
    y: 320,
    styleName: 'Display/Large'
  },
  { 
    name: 'H1', 
    size: 32, 
    weight: 'Bold', 
    lineHeight: 120, 
    letterSpacing: -0.5, 
    y: 390,
    styleName: 'Heading/H1'
  },
  { 
    name: 'H2', 
    size: 24, 
    weight: 'Bold', 
    lineHeight: 130, 
    letterSpacing: 0, 
    y: 440,
    styleName: 'Heading/H2'
  },
  { 
    name: 'H3', 
    size: 20, 
    weight: 'Medium', 
    lineHeight: 140, 
    letterSpacing: 0, 
    y: 480,
    styleName: 'Heading/H3'
  },
  { 
    name: 'Body Large', 
    size: 18, 
    weight: 'Regular', 
    lineHeight: 150, 
    letterSpacing: 0.2, 
    y: 520,
    styleName: 'Body/Large'
  },
  { 
    name: 'Body', 
    size: 16, 
    weight: 'Regular', 
    lineHeight: 140, 
    letterSpacing: 0.3, 
    y: 560,
    styleName: 'Body/Regular'
  },
  { 
    name: 'Caption', 
    size: 12, 
    weight: 'Regular', 
    lineHeight: 120, 
    letterSpacing: 0.5, 
    y: 600,
    styleName: 'Caption/Regular'
  }
];

for (const text of typographyScale) {
  // Create the actual typography example
  await mcpClient.callTool('create_text', {
    characters: `${text.name} Typography Sample`,
    name: `Typography ${text.name} Example`,
    fontSize: text.size,
    fontFamily: 'Inter',
    fontStyle: text.weight,
    fillColor: '#1A1A1A',
    lineHeight: text.lineHeight,
    lineHeightUnit: 'percent',
    letterSpacing: text.letterSpacing,
    x: 50,
    y: text.y,
    createStyle: true,
    styleName: text.styleName
  });
  
  // Create the specification label
  await mcpClient.callTool('create_text', {
    characters: `${text.size}px • ${text.weight} • ${text.lineHeight}% line height • ${text.letterSpacing}px letter spacing`,
    name: `Typography ${text.name} Spec`,
    fontSize: 11,
    fontFamily: 'Inter',
    fontStyle: 'Regular',
    fillColor: '#666666',
    x: 50,
    y: text.y + text.size + 8,
    createStyle: true,
    styleName: 'Specification/Label'
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

### Typography (Enhanced in v0.10.0)
- [ ] Font family selection
- [ ] Heading hierarchy (Display, H1-H6) with text styles
- [ ] Body text styles (Large, Regular, Small)
- [ ] Caption and small text with proper spacing
- [ ] Line height standards (110%-150%)
- [ ] Letter spacing optimization
- [ ] Text case conventions (UPPERCASE for buttons)
- [ ] Mixed formatting guidelines
- [ ] Text style naming conventions

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
2. **Use consistent naming** - Establish naming conventions early (Component/Variant format)
3. **Create text styles early** - Use `createStyle: true` and `styleName` for consistency
4. **Leverage mixed formatting** - Use `styleRanges` for highlights and emphasis
5. **Optimize typography** - Set proper line heights and letter spacing
6. **Create reusable components** - Build once, use everywhere
7. **Document decisions** - Add notes explaining design choices
8. **Test at scale** - Create example pages using your system
9. **Iterate based on usage** - Refine components as you use them
10. **Use advanced typography** - Leverage `create_text` for better text control

## 🔄 Workflow Integration

### With Design Tokens and Advanced Typography
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
      '3xl': 32,
      '4xl': 48
    },
    fontWeight: {
      regular: 'Regular',
      medium: 'Medium',
      bold: 'Bold'
    },
    lineHeight: {
      tight: 110,
      normal: 140,
      relaxed: 150
    },
    letterSpacing: {
      tight: -1.5,
      normal: 0,
      wide: 0.5
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

// Use tokens in advanced typography creation
await mcpClient.callTool('create_text', {
  characters: 'Design System Heading',
  fontSize: designTokens.typography.fontSize['3xl'],
  fontFamily: designTokens.typography.fontFamily,
  fontStyle: designTokens.typography.fontWeight.bold,
  fillColor: designTokens.colors.neutral[900],
  lineHeight: designTokens.typography.lineHeight.tight,
  lineHeightUnit: 'percent',
  letterSpacing: designTokens.typography.letterSpacing.tight,
  createStyle: true,
  styleName: 'System/Heading'
});

// Use tokens in component creation
await mcpClient.callTool('create_node', {
  nodeType: 'rectangle',
  fillColor: designTokens.colors.primary,
  width: designTokens.spacing.xl * 4,
  height: designTokens.spacing.lg
});
```

This systematic approach ensures consistency across your entire design system and makes it easy to maintain and scale.
