# Examples & Usage Guide

This guide shows how to use the Figma MCP Write Server through natural language instructions to AI agents.

## 🚀 Getting Started

1. Follow the [README](README.md) setup instructions
2. Give natural language instructions to your AI agent
3. The AI will use MCP tools to execute operations in Figma

## 📋 Basic Operations

### Creating Shapes
**User Instructions → AI Actions:**

- **"Create a blue rectangle"**
  - AI uses `create_node` tool with rectangle type and blue fill

- **"Make a red circle at position 100, 50"**
  - AI creates ellipse with red color at specified coordinates

- **"Add a white frame container 300x200 pixels"**
  - AI creates frame with specified dimensions and white background

### Text Creation
**User Instructions → AI Actions:**

- **"Add the title 'Welcome' in large bold text"**
  - AI uses `create_text` tool with appropriate font size and weight

- **"Create a paragraph with custom line spacing"**
  - AI applies line height and other typography controls

- **"Make a heading with mixed colors - 'Hello' in red, 'World' in blue"**
  - AI uses styleRanges to apply different colors to text segments

## 🎨 Style Management

### Creating Styles
**User Instructions → AI Actions:**

- **"Create a primary blue color style"**
  - AI uses `manage_styles` to create paint style with solid blue color

- **"Make a gradient from orange to blue for hero sections"**
  - AI creates gradient paint style with linear gradient stops

- **"Set up a large heading text style with tight spacing"**
  - AI creates text style with 48px Inter Bold, custom letter spacing

- **"Add a card shadow effect style"**
  - AI creates effect style with drop shadow parameters

### Applying Styles
**User Instructions → AI Actions:**

- **"Apply the primary blue color to this rectangle"**
  - AI uses style application to apply existing paint style to selected node

- **"Use the heading style on this text"**
  - AI applies saved text style to specified text element

- **"Show me all the color styles in this file"**
  - AI lists all paint styles with their names and properties

## 🏗️ Complete Workflows

### Design System Creation
**User Instructions:**
"Create a complete design system with colors, typography, and components."

**What the AI does:**
1. **Color Palette**: Creates rectangles with primary, secondary, and neutral colors
2. **Typography Scale**: Sets up heading and body text styles (H1-H4, Body, Caption)
3. **Component Library**: Builds button variants (Primary, Secondary, Tertiary)
4. **Spacing System**: Establishes consistent margin and padding values
5. **Style Organization**: Saves everything as reusable styles for team consistency

### Card Component
**User Instructions:**
"Create a card component with title, body text, and action button."

**What the AI does:**
1. Creates white frame for card container (300x200px)
2. Adds title with mixed formatting (highlight first word in color)
3. Creates body text with custom line spacing and width constraints
4. Adds blue action button with centered white text
5. Creates reusable text styles for card title and body

### Button System
**User Instructions:**
"Create 5 button variants with different colors and update their corner radius to 8px."

**What the AI does:**
1. Creates multiple rectangle bases with different background colors
2. Adds styled button labels with consistent typography
3. Updates corner radius property for all buttons
4. Organizes buttons in a grid layout for comparison

## 📝 Typography Examples

### Mixed Text Styling
**User Instructions:**
"Make the first word bold and red, then make 'EXAMPLE' larger and underlined"

**What the AI does:**
- AI applies different formatting to specific character ranges within the same text
- Uses styleRanges to control font weight, color, size, and decoration per segment

### Text Style Creation
**User Instructions:**
"Create this as a reusable heading style called 'H1/Primary'"

**What the AI does:**
- AI saves text formatting as a reusable style for design consistency
- Style includes font family, size, weight, spacing, and color settings

### Typography Controls Available:
- **Alignment**: Left, center, right, justified, and vertical alignment
- **Spacing**: Letter spacing, line height, paragraph spacing
- **Styling**: Text case (uppercase, lowercase), text decoration (underline)
- **Layout**: Fixed-width text with automatic height adjustment

## 🎨 Style Capabilities

### Paint Styles
- **Solid colors**: "Create a primary red color style"
- **Linear gradients**: "Make a gradient from red to blue"
- **Radial gradients**: "Create a circular gradient for backgrounds"
- **Image fills**: "Set up an image fill style for hero sections"

### Text Styles
- **Typography hierarchy**: "Create heading styles H1 through H4"
- **Font properties**: Custom font families, weights, sizes
- **Spacing controls**: Letter spacing, line height, paragraph spacing
- **Alignment options**: Left, center, right, justified text

### Effect Styles
- **Drop shadows**: "Add a subtle card shadow effect"
- **Inner shadows**: "Create an inset shadow for buttons"
- **Blur effects**: Layer blur and background blur styles

### Grid Styles
- **Column grids**: "Set up a 12-column layout grid"
- **Row grids**: "Create a baseline grid for typography"
- **Custom spacing**: Configurable gutters and margins

### Style Operations
The AI can perform these operations:
- **Create**: "Make a new primary blue color style"
- **List**: "Show me all text styles in this file"
- **Apply**: "Use the heading style on this text"
- **Get**: "What are the details of the primary color style?"
- **Delete**: "Remove the unused button style"

## 🏗️ Layer & Hierarchy Management

### Grouping Operations
**User Instructions → AI Actions:**

- **"Group these navigation elements together"**
  - AI uses `manage_hierarchy` with `group` operation to create organized containers

- **"Create a frame around these components"**
  - AI uses `frame` operation to wrap elements in a frame container with proper sizing

- **"Ungroup this navigation bar so I can edit individual elements"**
  - AI uses `ungroup` operation to dissolve groups while preserving element positions

### Layer Ordering
**User Instructions → AI Actions:**

- **"Bring the logo to the front"**
  - AI uses `bring_to_front` operation to move element to top layer

- **"Send this background shape behind everything"**
  - AI uses `send_to_back` operation to move element to bottom layer

- **"Move this button forward one layer"**
  - AI uses `bring_forward` operation for precise single-step positioning

- **"Move this element back one layer"**
  - AI uses `send_backward` operation for precise single-step positioning

- **"Place this element above the header"**
  - AI uses `move_above` operation for relative positioning between specific elements

- **"Place this button below the navigation"**
  - AI uses `move_below` operation for relative positioning between specific elements

### Hierarchy Reorganization
**User Instructions → AI Actions:**

- **"Move this button into the sidebar frame"**
  - AI uses `move_to_parent` operation to restructure element relationships

- **"Show me all the children of this component"**
  - AI uses `get_children` operation to inspect hierarchy structure

- **"Reorder this element to be first in its container"**
  - AI uses `reorder` operation with index 0 for precise positioning

### Hierarchy Inspection
**User Instructions → AI Actions:**

- **"What is the parent of this element?"**
  - AI uses `get_parent` operation to find the direct parent container

- **"Show me all siblings of this button"**
  - AI uses `get_siblings` operation to list elements at the same hierarchy level

- **"What is the current layer position of this element?"**
  - AI uses `get_layer_index` operation to get the exact position in parent's children

- **"Show me the complete hierarchy path for this element"**
  - AI uses `get_ancestors` operation to trace from element to root page

- **"List all nested elements inside this component"**
  - AI uses `get_descendants` operation to recursively find all child elements

### Advanced Hierarchy Workflows
**User Instructions:**
"Organize this messy layout - group related elements, fix layer order, and structure everything properly"

**What the AI does:**
1. **Analysis**: Uses `get_page_nodes` and hierarchy queries to understand current structure
2. **Grouping**: Groups related elements (navigation items, buttons, content sections)
3. **Layer Management**: Brings important elements forward, sends backgrounds back
4. **Restructuring**: Moves elements into logical parent containers
5. **Organization**: Creates proper hierarchy with frames for major sections

## 🔧 Batch Operations

### Selection Management
**User Instructions:**
"Select all text elements and change their font size to 16px"

**What the AI does:**
1. Uses `get_page_nodes` to find all text nodes on the page
2. Uses `set_selection` to select all found text elements
3. Uses `update_node` to modify font size property for all selected items

### Bulk Updates
**User Instructions:**
"Update all buttons to have rounded corners and consistent spacing"

**What the AI does:**
1. Identifies all button-like elements (rectangles with text)
2. Applies corner radius updates to all button frames
3. Standardizes internal padding and text positioning
4. Ensures consistent styling across all variants




## 💡 Tips for Users

- **Start Simple**: Begin with basic shapes before requesting complex designs
- **Be Specific**: Give clear instructions like "Create a 200x100 blue rectangle" rather than "make a shape"
- **Check Connection**: Make sure the Figma plugin is running and connected before giving instructions
- **Name Things**: Ask for descriptive names like "Primary Button" instead of "Rectangle"
- **Build Systems**: Create color and text styles first, then use them consistently
- **Use Natural Language**: Say "make the text bigger" instead of trying to specify technical parameters
- **Test Incrementally**: Try simple operations first to verify everything is working

## 🚦 Common Workflows

1. **Design System Setup**: "Create color palette" → "Set up typography styles" → "Build component library"
2. **Component Creation**: "Make a container" → "Add content" → "Apply styling" → "Refine details"
3. **Batch Updates**: "Select all buttons" → "Update properties" → "Verify results"
4. **Style Management**: "Create styles" → "Apply to elements" → "Organize by category"

Remember: You give natural language instructions to your AI agent, and the AI uses the MCP tools to execute the operations in Figma. You don't need to write any code!

