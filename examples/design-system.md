# Design System Guide

> **Use Cases**: Build consistent, scalable design systems with reusable components, design tokens, and systematic styling that maintains brand consistency across projects.

## Quick Examples

![Design System Components](images/design-system.png)

- "Create a primary blue color style" → Reusable color token
- "Make a heading text style" → Typography scale component
- "Turn this button into a component" → Reusable UI component
- "Create design tokens for spacing" → Variable-based spacing system

## Core Operations

### Style Management

#### Color Styles (Paint Styles)
**When to use**: Brand colors, theme systems, consistent color application

**User instruction**: "Create a primary brand color style with #0066FF"

**What happens**:
1. AI uses `manage_styles` tool with paint style type
2. Creates solid color style with specified hex value
3. Names style appropriately (e.g., "Primary Blue")
4. Makes style available for application to any element

```yaml
# Example response
operation: manage_styles
result:
  styleId: "S:abc123"
  styleName: "Primary Blue"
  styleType: "PAINT"
  color: "#0066FF"
  applied: true
```

#### Typography Styles (Text Styles)
**When to use**: Consistent typography hierarchy, brand font applications

**User instruction**: "Create a heading style with Inter Bold 32px and tight line height"

**What happens**:
1. AI creates text style with specified font properties
2. Sets font family to Inter, weight to Bold, size to 32px
3. Applies appropriate line height for headings
4. Makes style reusable across all text elements

#### Gradient Styles
**When to use**: Brand gradients, hero backgrounds, visual interest

**User instruction**: "Make a gradient style from orange to purple for hero sections"

**What happens**:
1. AI creates linear gradient paint style
2. Sets gradient stops with orange and purple colors
3. Configures direction and opacity settings
4. Names style for specific use case context

### Component System

#### Creating Components
**When to use**: Reusable UI elements, maintaining consistency, scaling design systems

**User instruction**: "Turn this button design into a reusable component"

**What happens**:
1. AI uses `manage_components` tool with `create` operation
2. Converts existing node to main component
3. Preserves all styling and layout properties
4. Makes component available in assets panel

#### Component Variants
**When to use**: Different states or styles of same component (primary/secondary buttons)

**User instruction**: "Create button variants for Primary, Secondary, and Tertiary styles"

**What happens**:
1. AI creates individual button components for each style
2. Uses `manage_components` with `create_set` operation
3. Combines components into variant set
4. Adds variant properties for easy switching
5. Names variants appropriately

#### Component Instances
**When to use**: Placing components throughout design, customizing with overrides

**User instruction**: "Create three instances of this card component with different titles"

**What happens**:
1. AI uses `manage_instances` tool with `create` operation
2. Places multiple instances at different positions
3. Applies text overrides for different titles
4. Maintains connection to main component

### Variables & Design Tokens

#### Variable Collections
**When to use**: Theme systems (light/dark), brand variations, systematic design values

**User instruction**: "Create a color collection with light and dark theme modes"

**What happens**:
1. AI uses `manage_collections` tool to create new collection
2. Sets up "Light" and "Dark" modes
3. Prepares structure for color variables
4. Names collection appropriately for context

#### Color Variables
**When to use**: Themeable designs, brand consistency, systematic color application

**User instruction**: "Create a primary color variable - blue for light mode, lighter blue for dark mode"

**What happens**:
1. AI uses `manage_variables` tool with COLOR type
2. Sets #0066FF for light mode value
3. Sets #4A9EFF for dark mode value
4. Names variable descriptively (e.g., "color/primary")

#### Spacing Variables
**When to use**: Consistent spacing systems, responsive design, layout tokens

**User instruction**: "Set up a spacing system with variables for 4px, 8px, 16px, 24px, 32px"

**What happens**:
1. AI creates FLOAT variables for each spacing value
2. Names with semantic scale (xs, sm, md, lg, xl)
3. Organizes in spacing collection
4. Makes variables available for layout properties

#### Variable Binding
**When to use**: Connecting design tokens to component properties for automatic theming

**User instruction**: "Bind the primary color variable to this button's background"

**What happens**:
1. AI uses variable binding functionality
2. Connects color variable to fill property
3. Button now updates automatically when variable changes
4. Theme switching affects button color instantly

## Advanced Workflows

### Complete Design System Setup
**User instruction**: "Build a design system with colors, typography, spacing, and button components"

**What the AI does**:
1. **Color Palette**: Creates primary, secondary, neutral color styles
2. **Typography Scale**: Sets up H1-H4, body, caption text styles
3. **Spacing System**: Creates consistent spacing variables (4px scale)
4. **Button Components**: Builds primary, secondary, tertiary button variants
5. **Component Library**: Organizes everything in logical structure
6. **Token Application**: Binds variables to component properties
7. **Documentation**: Provides usage guidelines for each element

![Complete Design System](images/complete-design-system.png)

### Themeable Component System
**User instruction**: "Create components that automatically adapt to light and dark themes"

**What the AI does**:
1. **Variable Foundation**: Creates color collection with light/dark modes
2. **Semantic Variables**: Sets up primary, secondary, surface, text color variables
3. **Component Creation**: Builds components using variable-bound properties
4. **Theme Testing**: Demonstrates theme switching functionality
5. **Component Variants**: Creates state variations (hover, disabled) using variables
6. **System Documentation**: Documents variable usage and theme behavior

### Brand Application System
**User instruction**: "Set up a multi-brand system that can switch between different brand identities"

**What the AI does**:
1. **Brand Collections**: Creates separate variable collections for each brand
2. **Brand Variables**: Sets up colors, fonts, spacing for each brand
3. **Flexible Components**: Creates components that adapt to brand variables
4. **Asset Organization**: Organizes components by brand and function
5. **Switching System**: Demonstrates brand theme switching
6. **Guidelines**: Provides brand application guidelines

## Design Token Strategies

### Color Token Hierarchy
```
Brand Colors (Raw Values)
├── Primary: #0066FF
├── Secondary: #FF6B35  
└── Neutral: #8E8E93

Semantic Colors (Contextual Usage)
├── color/primary → Brand Primary
├── color/success → Green
├── color/warning → Orange
└── color/error → Red

Component Colors (Specific Applications)  
├── button/primary/background → color/primary
├── text/heading → color/neutral-900
└── surface/card → color/neutral-50
```

### Typography Token System
```
Font Families
├── font/primary → Inter
└── font/mono → JetBrains Mono

Font Sizes (Fluid Scale)
├── text/xs → 12px
├── text/sm → 14px  
├── text/base → 16px
├── text/lg → 18px
└── text/xl → 20px

Semantic Typography
├── heading/h1 → font/primary, text/2xl, weight/bold
├── heading/h2 → font/primary, text/xl, weight/semibold
└── body/default → font/primary, text/base, weight/regular
```

### Spacing Token Framework
```
Base Scale (4px system)
├── space/0 → 0px
├── space/1 → 4px
├── space/2 → 8px
├── space/3 → 12px
├── space/4 → 16px
└── space/6 → 24px

Semantic Spacing
├── spacing/component-padding → space/4
├── spacing/section-gap → space/6
└── spacing/page-margin → space/8
```

## Best Practices

### Style Organization
- **Consistent Naming**: Use clear, descriptive names for all styles
- **Hierarchical Structure**: Organize styles by type and usage
- **Semantic Over Descriptive**: "Primary Button" not "Blue Button"
- **Version Control**: Update styles systematically when designs evolve

### Component Guidelines
- **Single Responsibility**: Each component should have one clear purpose
- **Proper Variants**: Use component variants for related but different states
- **Meaningful Overrides**: Allow overrides for content, not core styling
- **Documentation**: Include usage guidelines and do/don'ts

### Variable Strategy
- **Semantic Naming**: Use purpose-based names, not appearance-based
- **Consistent Scale**: Use mathematical relationships in value scales
- **Mode Planning**: Plan all theme variations before creating variables
- **Binding Strategy**: Bind variables to properties that should change with themes

### System Maintenance
- **Regular Audits**: Review and clean up unused styles and components
- **Usage Tracking**: Monitor how components are being used
- **Update Propagation**: Test changes across all instances
- **Documentation Updates**: Keep guidelines current with system changes

## Troubleshooting

### Style Issues
**Problem**: "Styles aren't applying consistently"
**Solutions**:
- Check if style was properly created and saved
- Verify element type matches style type (text styles on text elements)
- Ensure style hasn't been overridden with local styling
- Check if style conflicts with other applied styles

**Problem**: "Colors look different than expected"
**Solutions**:
- Verify color space and profile settings
- Check if transparency/opacity is affecting appearance
- Ensure gradient directions and stops are correct
- Test in different viewing contexts (light/dark backgrounds)

### Component Issues
**Problem**: "Component instances aren't updating when main component changes"
**Solutions**:
- Check if instances have been detached from main component
- Verify overrides aren't blocking main component changes
- Ensure main component changes are being published
- Reset overrides if blocking desired updates

**Problem**: "Component variants aren't working properly"
**Solutions**:
- Check variant property names and values
- Verify all variants are properly configured in component set
- Ensure variant properties don't conflict with each other
- Test switching between variants systematically

### Variable Issues
**Problem**: "Variables aren't updating component properties"
**Solutions**:
- Check if variables are properly bound to component properties
- Verify variable modes are set up correctly
- Ensure variable values are appropriate for property types
- Test mode switching to confirm variable binding

## Next Steps

- **[Advanced Operations →](advanced-operations.md)**: Complex boolean and vector operations
- **[Layout System ←](layout-system.md)**: Apply design system to responsive layouts
- **[Image Workflows →](image-workflows.md)**: Integrate images with design system components

---

**Remember**: Great design systems are built incrementally. Start with colors and typography, then add components and variables as the system matures.