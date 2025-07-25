# Usage Examples

Practical examples showing how to use the Figma MCP Write Server through natural language instructions to AI agents.

> **Current State**: Features 22 MCP tools with YAML response format, handler-based architecture, complete stroke management system, precision alignment system with parent validation, dev mode integration, boolean & vector operations, component system, variables & design tokens, and SQLite font database with cross-platform configuration.

## Table of Contents

### Basic Operations
- [🎨 Creating Shapes](#-creating-shapes)
- [🔤 Working with Text](#-working-with-text)
- [🎨 Colors and Fills](#-colors-and-fills)
- [🖋️ Strokes and Borders](#-strokes-and-borders)
- [📐 Layout and Positioning](#-layout-and-positioning)

### Design Systems
- [🎨 Design System Creation](#-design-system-creation)
- [🧩 Component Development](#-component-development)
- [🎨 Variables & Design Tokens](#-variables--design-tokens)

### Advanced Operations
- [🔧 Boolean & Vector Operations](#-boolean--vector-operations)
- [🏗️ Auto Layout & Responsive Design](#-auto-layout--responsive-design)
- [📤 Export Operations](#-export-operations)

### Developer Workflows
- [👨‍💻 Dev Mode Integration](#-dev-mode-integration)
- [🔧 Batch Operations](#-batch-operations)

---

## 🎨 Creating Shapes

### Basic Shape Creation
**User Instructions → AI Actions:**

- **"Create a blue rectangle"**
  - AI uses `figma_nodes` tool with operation `create`, rectangle type and blue fill

- **"Make a red circle at position 100, 50"**
  - AI creates ellipse with red color at specified coordinates

- **"Add a white frame container 300x200 pixels"**
  - AI creates frame with specified dimensions and white background

### Advanced Shape Creation

- **"Create a rounded rectangle with 12px corners"**
  - AI uses `figma_nodes` tool with operation `create`, rectangle type and corner radius property

- **"Make a card with different corner radii - rounded top, square bottom"**
  - AI creates rectangle with individual corner radius settings for each corner

- **"Create a 5-pointed star with golden color"**
  - AI uses `figma_nodes` with operation `create`, star type, point count, and golden fill color

- **"Add a hexagon (6-sided polygon) for an icon"**
  - AI uses `figma_nodes` with operation `create` for polygon with 6 sides and applies styling

- **"Create a semi-transparent overlay frame"**
  - AI makes frame with black fill, 50% opacity, and content clipping enabled

---

## 🔤 Working with Text

### Text Creation and Styling

- **"Add the title 'Welcome' in large bold text"**
  - AI uses `figma_text` tool with operation `create` and appropriate font size and weight
  - Tool automatically loads required fonts and applies typography settings

- **"Create a paragraph with custom line spacing"**
  - AI applies line height and other typography controls
  - Supports both pixel and percentage line height units

- **"Make a heading with mixed colors - 'Hello' in red, 'World' in blue"**
  - AI uses styleRanges to apply different colors to text segments
  - Mixed text styling allows different fonts, sizes, and colors within same text node

### Typography Controls

- **"Create a subtitle with Inter font, 16px size, medium weight"**
  - AI uses `figma_fonts` to validate font availability, then applies with `figma_text`

- **"Make the paragraph text have tighter letter spacing"**
  - AI applies negative letterSpacing value for condensed typography

- **"Add a caption with increased line height for readability"**
  - AI sets lineHeight to 1.5 or higher for better text flow

---

## 🎨 Colors and Fills

### Basic Fill Operations

- **"Make this rectangle have a blue to purple gradient"**
  - AI uses `figma_fills` with gradient type, setting color stops and direction

- **"Apply a red color (#FF0000) to the selected shapes"**
  - AI uses `figma_fills` with solid color fill and specified hex value

- **"Remove all fills from this element"**
  - AI uses `figma_fills` with operation `clear` to remove existing fills

### Advanced Fill Techniques

- **"Create a radial gradient from white center to black edges"**
  - AI uses `figma_fills` with radial gradient type and appropriate color stops

- **"Make a linear gradient at 45-degree angle"**
  - AI applies linear gradient with custom rotation angle

- **"Add multiple fills - gradient background with color overlay"**
  - AI uses `figma_fills` to create multiple fill layers with different blend modes

---

## 🖋️ Strokes and Borders

### Basic Stroke Operations
- **"Add a 2px red stroke to this rectangle"**
  - AI uses `figma_strokes` with operation `add_solid`, red color, and 2px weight

- **"Make the border thicker - change stroke to 4px"**
  - AI uses `figma_strokes` with operation `update` to modify stroke weight

- **"Remove the stroke from this shape"**
  - AI uses `figma_strokes` with operation `delete` to remove stroke paint

### Advanced Stroke Styling
- **"Create a dashed border with 5px dashes and 3px gaps"**
  - AI uses `figma_strokes` with `dashPattern: [5, 3]` for custom dash styling

- **"Make stroke with rounded end caps and rounded corners"**
  - AI applies `strokeCap: 'ROUND'` and `strokeJoin: 'ROUND'` properties

- **"Add gradient stroke from blue to green"**
  - AI uses `figma_strokes` with operation `add_gradient`, setting color stops and direction

### Stroke Positioning
- **"Make the stroke appear inside the shape"**
  - AI sets `strokeAlign: 'INSIDE'` to position stroke within shape bounds

- **"Center the stroke on the shape edge"**
  - AI uses `strokeAlign: 'CENTER'` for stroke positioning

- **"Put stroke outside the shape boundaries"**
  - AI applies `strokeAlign: 'OUTSIDE'` for external stroke positioning

---

## 📐 Layout and Positioning

### Alignment and Distribution

- **"Center this text within the frame"**
  - AI uses `figma_alignment` to center horizontally and vertically within parent

- **"Align these three buttons to the left edge"**
  - AI uses `figma_alignment` with left alignment for multiple selected objects

- **"Distribute these icons evenly with 20px spacing"**
  - AI uses `figma_alignment` with distribute operations and custom spacing

### Positioning and Constraints

- **"Move this button to the bottom right corner of the frame"**
  - AI uses `figma_nodes` with position updates relative to parent bounds

- **"Set this sidebar to stick to the left edge when the frame resizes"**
  - AI uses `figma_constraints` to set left and top constraints

- **"Make this footer always stay at the bottom"**
  - AI applies bottom constraint with appropriate settings

---

## 🎨 Design System Creation

### Color Styles

- **"Create a color palette with primary, secondary, and accent colors"**
  1. AI uses `figma_styles` to create multiple color styles
  2. Creates systematic naming (primary-500, secondary-200, etc.)
  3. Applies semantic meaning and generates documentation

- **"Build a grayscale color system from white to black"**
  - AI creates progressive grayscale steps using `figma_styles`
  - Names colors with consistent scale (gray-50, gray-100, etc.)

### Text Styles

- **"Set up typography scale for headings, body, and captions"**
  1. AI creates text styles for H1-H6, body, caption using `figma_styles`
  2. Defines consistent font family, sizes, and weights
  3. Sets appropriate line heights and spacing for each level

- **"Create branded text styles using custom fonts"**
  - AI uses `figma_fonts` to validate brand fonts, then creates text styles
  - Applies brand-specific typography hierarchy and spacing

---

## 🧩 Component Development

### Component Creation

- **"Turn this button design into a reusable component"**
  1. AI uses `figma_components` to create main component
  2. Sets up proper naming and description
  3. Identifies which properties should be variant-controlled

- **"Create a card component with image, title, and description variants"**
  - AI builds component with multiple content variants using `figma_components`
  - Sets up text and image property overrides

### Component Variants

- **"Add size variants (small, medium, large) to this button component"**
  1. AI uses `figma_components` to create component set
  2. Defines size variants with appropriate dimensions
  3. Adjusts typography and padding for each size

- **"Create state variants (default, hover, pressed, disabled) for the button"**
  - AI creates interactive variants with different visual states
  - Applies appropriate colors and opacity changes

### Component Instances

- **"Create 5 instances of this button component across the page"**
  - AI uses `figma_instances` to place multiple instances with proper spacing

- **"Swap this component to use the secondary button variant"**
  - AI uses `figma_instances` to change component variant while preserving position

---

## 🎨 Variables & Design Tokens

### Variable Creation

- **"Create color variables for the brand palette"**
  1. AI uses `figma_variables` to create color variables
  2. Organizes into collections (Brand Colors, Semantic Colors)
  3. Sets up primitive and semantic token structure

- **"Set up spacing variables (4px, 8px, 16px, 32px, 64px)"**
  - AI creates number variables for consistent spacing system
  - Uses systematic naming and descriptions

### Design Token System

- **"Build a complete design token system with colors, spacing, and typography"**
  1. **Color Tokens**: Creates primitive colors and semantic mappings
  2. **Spacing System**: Establishes base unit and scale multipliers
  3. **Semantic Naming**: Uses descriptive names like 'primary-button-bg' instead of 'blue-500'
  4. **Binding Strategy**: Connects variables to component properties for automatic theming
  5. **Documentation**: Lists all variables with their purposes and usage guidelines

---

## 🔧 Boolean & Vector Operations

### Boolean Operations

- **"Combine these two circles into one shape using union"**
  - AI uses `figma_boolean_operations` with union operation to merge shapes

- **"Cut a hole in this rectangle using the circle"**
  - AI applies subtract operation to create negative space

- **"Create an intersection of these overlapping shapes"**
  - AI uses intersect operation to keep only overlapping areas

### Vector Path Operations

- **"Convert this shape's stroke to a filled outline"**
  - AI uses `figma_vector_operations` with outline stroke operation

- **"Flatten this complex shape into a single vector path"**
  - AI applies flatten operation to convert complex shapes to simple paths

- **"Simplify this vector path to reduce complexity"**
  - AI uses simplify operation to reduce anchor points while preserving shape

---

## 🏗️ Auto Layout & Responsive Design

### Container Layout Operations

- **"Make this frame arrange its children vertically with 16px spacing"**
  - AI uses `figma_auto_layout` with operation `set_vertical`, `verticalSpacing: 16`, and appropriate padding

- **"Create a horizontal button group with even spacing"**
  - AI uses operation `set_horizontal` with `horizontalAlignment: 'AUTO'` for space-between distribution

- **"Set up a grid layout with 3 columns and 2 rows"**
  - AI uses operation `set_grid` with `columns: 3`, `rows: 2`, and specified spacing

- **"Remove auto layout and use freeform positioning"**
  - AI uses operation `set_freeform` to disable layout constraints

### Layout Properties and Sizing

- **"Make this card resize to fit its content horizontally but stay fixed height"**
  - AI uses `set_horizontal` with `fixedWidth: false` and `fixedHeight: true`

- **"Add 20px padding around the content and 12px spacing between items"**
  - AI applies `paddingTop: 20`, `paddingRight: 20`, `paddingBottom: 20`, `paddingLeft: 20`, `horizontalSpacing: 12`

- **"Create a responsive layout that wraps to new rows when space is tight"**
  - AI uses `set_horizontal` with `wrapLayout: true` and `verticalSpacing` for row gaps

### Child Layout Management

- **"Make the middle button fill the available space"**
  - AI uses operation `set_child` with `containerId`, `childIndex: 1`, `layoutGrow: 1`, `horizontalSizing: 'fill'`

- **"Set all buttons to hug their content width"**
  - AI uses `set_child` with child nodeIds array and `horizontalSizing: ['hug', 'hug', 'hug']`

- **"Move the last item to the beginning of the layout"**
  - AI uses operation `reorder_children` with appropriate `fromIndex` and `toIndex: 0`

### Cross-Parent Bulk Operations

- **"Make these elements from different containers all fill horizontally"**
  - AI uses `set_child` with `nodeId: ['child1', 'child2', 'child3']` and `horizontalSizing: ['fill', 'fill', 'fill']` (no containerId needed)

- **"Set different layout behaviors for children across multiple containers"**
  - AI applies individual child properties across parents in a single operation

### Grid Layout Specifics

- **"Create a 2x3 product grid with 16px gaps"**
  - AI uses `set_grid` with `columns: 2`, `rows: 3`, `columnSpacing: 16`, `rowSpacing: 16`

- **"Make this grid item span 2 columns"**
  - AI uses `set_child` with `columnSpan: 2` for grid child positioning

- **"Position this item in the top-right corner of the grid"**
  - AI uses `set_child` with `columnAnchor: 1`, `rowAnchor: 0` for precise grid placement

---

## 📤 Export Operations

### Basic Export Operations

- **"Export this icon as a 24x24 PNG"**
  - AI uses `figma_exports` with PNG format and specific dimensions

- **"Save this component as an SVG with clean markup"**
  - AI exports as SVG with optimized settings and proper naming

- **"Export all selected elements as separate PNG files"**
  - AI processes bulk export operation with individual file generation

### Advanced Export Settings

- **"Export this design at 2x resolution for retina displays"**
  - AI applies scale factor in export settings for high-DPI output

- **"Save this frame as JPEG with 85% quality"**
  - AI uses JPEG format with specific quality compression settings

---

## 👨‍💻 Dev Mode Integration

### CSS Generation

- **"Generate CSS for this button component"**
  - AI uses `figma_dev_resources` to extract CSS properties
  - Includes dimensions, colors, typography, and spacing values

- **"Create CSS custom properties from these design tokens"**
  - AI converts Figma variables to CSS custom properties with proper naming

### Development Annotations

- **"Add spacing measurements between these elements"**
  - AI uses `figma_measurements` to create precise spacing annotations

- **"Document the responsive breakpoints for this layout"**
  - AI applies `figma_annotations` with responsive behavior documentation

---

## 🔧 Batch Operations

### Multi-Element Operations

- **"Apply the same blue color to all selected rectangles"**
  - AI uses `figma_fills` with bulk nodeId array to apply color consistently

- **"Move all these buttons 20px to the right"**
  - AI uses `figma_nodes` with bulk positioning updates

- **"Set consistent 12px corner radius on all cards"**
  - AI applies corner radius property to multiple elements simultaneously

### Template Creation

- **"Create 10 cards in a grid layout with placeholder content"**
  1. AI creates template card component
  2. Uses bulk operations to generate instances
  3. Applies grid positioning and spacing
  4. Varies placeholder content for each instance

---

## 💡 Usage Guidelines

### Best Practices

1. **Be Specific**: "Create a 200x50px blue button" works better than "make a button"
2. **Use Exact Values**: Specify colors (#FF0000), sizes (16px), and positions (x: 100, y: 50)
3. **Reference Existing Elements**: "Apply the same style as the header" when possible
4. **Describe Relationships**: "Center the text within the button" for layout context

### AI Agent Instructions

When instructing AI agents:

- **Start with Action Verb**: "Create", "Move", "Apply", "Set", "Generate"
- **Specify Tool Context**: Mention when working with specific design systems or components
- **Include Constraints**: "Keep the text readable" or "Maintain brand colors"
- **Request Validation**: "Check that the spacing follows the 8px grid"

### Common Workflows

1. **Design System First**: Create styles and variables before applying to components
2. **Components Then Instances**: Build the component library, then create instances
3. **Layout Then Content**: Set up frames and layout before adding specific content
4. **Measure and Export**: Add annotations and export specifications for development handoff

---

## 🔧 Technical Details

### Tool Response Format

All tools return structured YAML data within MCP's text response format:

```yaml
operation: create
nodeType: rectangle
nodeId: "123:456"
properties:
  width: 200
  height: 100
  x: 0
  y: 0
  fillColor: "#007AFF"
message: "Rectangle created successfully"
```

### Bulk Operations

Many tools support bulk operations by passing arrays:

- **Single**: `nodeId: "123:456"`
- **Bulk**: `nodeId: ["123:456", "123:457", "123:458"]`

### Error Handling

If operations fail, AI agents receive clear error messages:
- "Node not found: invalid-id" for missing elements
- "Font not available: CustomFont" for missing fonts
- "Plugin not connected" for connection issues

For more technical details, see [development.md](development.md) and [architecture.md](architecture.md).