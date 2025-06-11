# Examples & Usage Guide

This guide shows how to use the Figma MCP Write Server through natural language instructions to AI agents.

> **Current State (v0.23.0)**: Features 20 MCP tools with YAML response format, comprehensive test coverage (143 tests), boolean & vector operations, component system, and variables & design tokens.

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

### Enhanced Shape Creation
**User Instructions → AI Actions:**

- **"Create a rounded rectangle with 12px corners"**
  - AI uses `create_node` tool with rectangle type and corner radius property

- **"Make a card with different corner radii - rounded top, square bottom"**
  - AI creates rectangle with individual corner radius settings for each corner

- **"Create a 5-pointed star with golden color"**
  - AI uses `create_node` with star type, point count, and golden fill color

- **"Add a hexagon (6-sided polygon) for an icon"**
  - AI creates polygon with 6 sides and applies styling

- **"Create a semi-transparent overlay frame"**
  - AI makes frame with black fill, 50% opacity, and content clipping enabled

### Text Creation
**User Instructions → AI Actions:**

- **"Add the title 'Welcome' in large bold text"**
  - AI uses `create_text` tool with appropriate font size and weight
  - Tool automatically loads required fonts and applies typography settings

- **"Create a paragraph with custom line spacing"**
  - AI applies line height and other typography controls
  - Supports both pixel and percentage line height units

- **"Make a heading with mixed colors - 'Hello' in red, 'World' in blue"**
  - AI uses styleRanges to apply different colors to text segments
  - Mixed text styling allows different fonts, sizes, and colors within same text node

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

## 🔧 Boolean & Vector Operations

### Boolean Operations
**User Instructions → AI Actions:**

- **"Combine these two rectangles into a single shape"**
  - AI uses `manage_boolean_operations` with `union` operation to merge overlapping shapes

- **"Cut a circle hole in the middle of this rectangle"**
  - AI uses `manage_boolean_operations` with `subtract` operation to remove the circle area from the rectangle

- **"Create a shape from only the overlapping part of these elements"**
  - AI uses `manage_boolean_operations` with `intersect` operation to keep only shared areas

- **"Remove the overlapping areas to create a complex cutout effect"**
  - AI uses `manage_boolean_operations` with `exclude` operation for advanced shape combinations

- **"Combine these logo elements but keep the original shapes for editing"**
  - AI performs boolean operations with `preserveOriginal: true` to maintain source shapes

### Vector Operations
**User Instructions → AI Actions:**

- **"Create a custom arrow icon with precise curves"**
  - AI uses `manage_vector_operations` with `create_vector` and SVG path data for custom shapes

- **"Turn this complex grouped design into a single vector shape"**
  - AI uses `manage_vector_operations` with `flatten` to convert hierarchies into unified vectors

- **"Convert the stroke outline of this shape into a filled path"**
  - AI uses `manage_vector_operations` with `outline_stroke` to transform strokes into solid shapes

- **"Extract the path data from this icon so I can modify it"**
  - AI uses `manage_vector_operations` with `get_vector_paths` to retrieve SVG-compatible path information

### Advanced Shape Creation Workflows
**User Instructions:**
"Create a complex logo by combining basic shapes and custom vectors."

**What the AI does:**
1. **Base Shapes**: Creates rectangles and circles for the logo foundation
2. **Custom Vectors**: Creates vector paths for unique design elements using SVG data
3. **Boolean Combination**: Uses union operations to merge related elements
4. **Detail Subtraction**: Uses subtract operations to cut out precise details and holes
5. **Final Refinement**: Flattens complex results and outlines strokes for clean vector output

**User Instructions:**
"Build an icon library with consistent stroke weights and fill styles."

**What the AI does:**
1. **Vector Creation**: Creates base icon shapes using custom vector paths
2. **Stroke Consistency**: Applies uniform stroke weights across all icons
3. **Outline Conversion**: Uses outline_stroke to convert strokes to fills for scalability
4. **Path Optimization**: Flattens complex icons into single vector nodes
5. **Style Application**: Applies consistent fill styles and organizes as reusable components

### Boolean Operation Examples

**Creating Logo Elements:**
- **Union**: "Merge the company initials into a single logomark"
- **Subtract**: "Cut the company name out of a solid background shape" 
- **Intersect**: "Create a badge effect where text only appears in the circle area"
- **Exclude**: "Make a ring-shaped frame by removing inner circle from outer circle"

**Icon Design Workflows:**
- **Vector Creation**: "Design a custom arrow with curved tail using path data"
- **Flatten Operations**: "Convert this layered icon into a single editable shape"
- **Stroke to Fill**: "Convert these outlined icons to solid shapes for better scaling"
- **Path Extraction**: "Get the vector data from this icon to create variations"

## 🧩 Component System

### Creating Components
**User Instructions → AI Actions:**

- **"Turn this button design into a reusable component"**
  - AI uses `manage_components` tool to convert existing node to component

- **"Create a button component set with Primary, Secondary, and Tertiary variants"**
  - AI creates individual button components then combines into component set with variant properties

- **"Make instances of this card component across the page"**
  - AI uses `manage_instances` to create multiple instances with different positions

### Component Management
**User Instructions → AI Actions:**

- **"Create a variant property 'Type' with values 'Primary, Secondary, Tertiary'"**
  - AI adds variant properties to existing component set

- **"Swap all Primary buttons to use the new Secondary component"**
  - AI finds Primary button instances and swaps them to Secondary component

- **"Override the text on this button instance to say 'Learn More'"**
  - AI applies text overrides to specific instance while maintaining component link

- **"Reset all overrides on this card instance back to defaults"**
  - AI resets instance to match main component properties

## 🏗️ Workflows

### Design System Creation
**User Instructions:**
"Create a design system with colors, typography, and components."

**What the AI does:**
1. **Color Palette**: Creates rectangles with primary, secondary, and neutral colors
2. **Typography Scale**: Sets up heading and body text styles (H1-H4, Body, Caption)
3. **Component Library**: Builds button variants and converts them to component set
4. **Instance Creation**: Places component instances throughout design
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

## 🏗️ Auto Layout & Constraints

### Auto Layout System
**User Instructions → AI Actions:**

- **"Make this frame automatically arrange its children vertically"**
  - AI uses `manage_auto_layout` with `enable` operation, direction "vertical"

- **"Create a horizontal button with proper spacing and padding"**
  - AI enables auto layout with horizontal direction, sets spacing and padding for professional button appearance

- **"Make this card layout responsive with 16px spacing between elements"**
  - AI configures auto layout with vertical direction, 16px spacing, and proper alignment

- **"Turn off auto layout so I can position elements manually"**
  - AI uses `disable` operation to convert back to absolute positioning

### Responsive Constraints
**User Instructions → AI Actions:**

- **"Make this sidebar stay on the left and stretch with the window height"**
  - AI uses `manage_constraints` with horizontal "left" and vertical "top_bottom"

- **"Pin this header to the top and make it stretch across the full width"**
  - AI sets constraints with horizontal "left_right" and vertical "top"

- **"Center this logo both horizontally and vertically"**
  - AI applies "center" constraints for both horizontal and vertical positioning

- **"Make this element scale proportionally when the container resizes"**
  - AI uses "scale" constraints for proportional resizing behavior

### Layout Workflows
**User Instructions:**
"Create a responsive navigation bar with logo, menu items, and a call-to-action button"

**What the AI does:**
1. **Container Setup**: Creates frame for navigation with proper dimensions
2. **Enable Auto Layout**: Uses horizontal direction with space-between alignment
3. **Add Spacing**: Sets consistent spacing and padding for professional appearance
4. **Responsive Behavior**: Applies constraints to stretch across full width and pin to top
5. **Content Alignment**: Centers elements vertically within the navigation bar

**User Instructions:**
"Build a card component that adapts to its content size automatically"

**What the AI does:**
1. **Card Frame**: Creates container frame with vertical auto layout
2. **Content Spacing**: Sets 16px spacing between title, description, and button
3. **Padding**: Adds 20px padding around all content
4. **Sizing**: Configures to "hug" content so card resizes based on content
5. **Alignment**: Centers content and stretches elements appropriately

### Moving Elements into Auto Layout
**User Instructions → AI Actions:**

- **"Move this button into the navigation bar"**
  - AI uses `manage_hierarchy` with `move` operation to place element in container
  - Element automatically positions according to auto layout settings

- **"Add this text to the card component"**
  - AI uses hierarchy management to move text into auto layout frame
  - No manual positioning needed - auto layout handles placement

### Layout Debugging
**User Instructions → AI Actions:**

- **"Show me the auto layout settings for this component"**
  - AI uses `get_properties` operation to display current auto layout configuration

- **"Check if this element can have constraints"**
  - AI uses `get_info` operation to verify constraint compatibility and parent relationships

- **"What constraints are currently applied to this element?"**
  - AI uses `get` operation to show current constraint settings

- **"Reset this element's constraints to defaults"**
  - AI uses `reset` operation to return to left/top positioning

## 🏗️ Layer & Hierarchy Management

### Grouping Operations
**User Instructions → AI Actions:**

- **"Group these navigation elements together"**
  - AI uses `manage_hierarchy` with `group` operation and array of node IDs

- **"Create a frame around these components"**
  - AI uses `manage_hierarchy` with `group` operation to wrap elements in a container

- **"Ungroup this navigation bar so I can edit individual elements"**
  - AI uses `manage_hierarchy` with `ungroup` operation to dissolve groups

### Layer & Node Management
**User Instructions → AI Actions:**

- **"Move this button to position 100, 50"**
  - AI uses `manage_nodes` with `move` operation and coordinates

- **"Delete this unused element"**
  - AI uses `manage_nodes` with `delete` operation

- **"Duplicate this card with 20px offset"**
  - AI uses `manage_nodes` with `duplicate` operation and offset values

- **"Reorder this element in its container"**
  - AI uses `manage_hierarchy` with `reorder` operation and new index

### Page & Selection Management
**User Instructions → AI Actions:**

- **"Show me all nodes on this page"**
  - AI uses `get_page_nodes` to list all elements with hierarchy information

- **"Find all text elements in this design"**
  - AI uses `get_page_nodes` with nodeTypes filter for "TEXT" elements

- **"Select these specific components"**
  - AI uses `set_selection` with array of node IDs to choose elements

### Layout Workflows
**User Instructions:**
"Create a dashboard layout with header, sidebar, and main content area"

**What the AI does:**
1. **Container Structure**: Creates main container frame without auto layout for absolute positioning
2. **Header Setup**: Creates header with horizontal auto layout, pins to top with full width constraints
3. **Sidebar Layout**: Creates sidebar with vertical auto layout, constrains to left side with full height
4. **Main Content**: Creates content area with constraints to fill remaining space (left_right, top_bottom)
5. **Responsive Behavior**: Ensures all elements adapt properly when container resizes

**User Instructions:**
"Create a button and then move some icons into it to make a navigation button"

**What the AI does:**
1. **Create Button Frame**: Creates frame and enables horizontal auto layout with proper spacing
2. **Add Icon Elements**: Creates icon shapes/text elements on the canvas
3. **Move into Button**: Uses `move_to_parent` to place icons inside the auto layout button
4. **Automatic Arrangement**: Icons automatically arrange horizontally with consistent spacing
5. **Automatic Positioning**: No manual coordinate adjustment needed - auto layout handles everything

**User Instructions:**
"Make a product card grid that arranges automatically and adapts to different screen sizes"

**What the AI does:**
1. **Grid Container**: Creates container with auto layout and wrap behavior enabled
2. **Card Templates**: Creates individual cards with vertical auto layout for internal content
3. **Responsive Cards**: Sets card constraints for proper grid behavior
4. **Content Adaptation**: Configures cards to hug content height but maintain consistent width
5. **Spacing System**: Applies consistent spacing between cards and internal card elements

### Hierarchy Workflows
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

### Enhanced Node Updates
**User Instructions → AI Actions:**

- **"Make this rectangle have rounded corners with 16px radius"**
  - AI uses `update_node` tool to modify corner radius property
  - Supports both uniform and individual corner radius settings

- **"Update this card to have different corner radii - rounded top, square bottom"**
  - AI updates individual corner radius values for asymmetric corners
  - Properties: `topLeftRadius`, `topRightRadius`, `bottomLeftRadius`, `bottomRightRadius`

- **"Rotate this element 45 degrees and make it semi-transparent"**
  - AI uses `update_node` to apply rotation and opacity changes
  - Rotation in degrees, opacity from 0-1 with automatic validation

- **"Change this star to have 8 points instead of 5"**
  - AI modifies star properties including point count and inner radius
  - Supports star and polygon node types with configurable points

- **"Lock this element and hide it temporarily"**
  - AI updates node visibility and lock state properties
  - `visible` and `locked` properties for interaction control

- **"Update this frame to clip its content and change background"**
  - AI modifies frame properties for content clipping and background color
  - `clipsContent` property controls overflow behavior

### Bulk Updates
**User Instructions:**
"Update all buttons to have rounded corners and consistent spacing"

**What the AI does:**
1. Uses `get_page_nodes` to identify all button-like elements (rectangles with text)
2. Applies `update_node` with corner radius updates to all button frames  
3. Standardizes internal padding and text positioning
4. Ensures consistent styling across all variants
5. Provides YAML response with summary of all changes made

## 🎨 Variables & Design Tokens

### Creating Variable Collections
**User Instructions → AI Actions:**

- **"Create a color collection with light and dark modes"**
  - AI uses `manage_collections` to create collection with multiple modes

- **"Set up a spacing system with variables"**
  - AI creates collection for spacing tokens with consistent values

### Variable Creation & Management
**User Instructions → AI Actions:**

- **"Create a primary color variable with #0066CC for light mode and #4A9EFF for dark mode"**
  - AI uses `manage_variables` to create COLOR variable with mode-specific values

- **"Add a base spacing variable set to 16 pixels"**
  - AI creates FLOAT variable for consistent spacing throughout the design

- **"Make a button text variable that says 'Submit' in English and 'Enviar' in Spanish"**
  - AI creates STRING variable with localized content for different modes

### Variable Binding
**User Instructions → AI Actions:**

- **"Bind the primary color variable to this rectangle's fill"**
  - AI uses variable binding to connect design tokens to element properties

- **"Apply the spacing variable to the padding of this frame"**
  - AI binds spacing variables to auto layout padding settings

### Design Token Workflows
**User Instructions:**
"Build a themeable design system using variables."

**What the AI does:**
1. **Token Structure**: Creates organized collections for colors, spacing, typography, and breakpoints
2. **Mode Setup**: Establishes Light/Dark themes, brand variations, or accessibility modes
3. **Semantic Naming**: Uses descriptive names like 'primary-button-bg' instead of 'blue-500'
4. **Binding Strategy**: Connects variables to component properties for automatic theming
5. **Documentation**: Lists all variables with their purposes and usage guidelines

### Variable Management
**User Instructions → AI Actions:**

- **"Update all blue colors to use the new brand blue"**
  - AI modifies variable values to propagate changes across the design system

- **"Add a high contrast mode for accessibility"**
  - AI creates new mode with enhanced contrast ratios

- **"Show me all spacing variables in the design system"**
  - AI lists variables with their current values and usage

## 💡 Tips for Users

### General Usage
- **Start Simple**: Begin with basic shapes before requesting complex designs
- **Be Specific**: Give clear instructions like "Create a 200x100 blue rectangle" rather than "make a shape"
- **Check Connection**: Make sure the Figma plugin is running and connected before giving instructions
- **Name Things**: Ask for descriptive names like "Primary Button" instead of "Rectangle"
- **Test Incrementally**: Try simple operations first to verify everything is working

### Error Handling & Debugging
- **Error Messages**: All tools provide detailed error messages with actionable suggestions
- **Validation**: Parameters are automatically validated with clear feedback on invalid inputs
- **Plugin Status**: Use `get_plugin_status` and `get_connection_health` to check system status
- **YAML Responses**: All responses are in structured YAML format for easy reading

### Design System Best Practices
- **Build Systems**: Create color and text styles first, then use them consistently
- **Variables for Consistency**: Use variables for colors, spacing, and text to maintain design system consistency
- **Semantic Naming**: Name variables descriptively (e.g., 'primary-button-bg' not 'blue-500')
- **Mode Strategy**: Plan your variable modes early (Light/Dark, Brand variations, Accessibility)

### Layout Strategy
- **Auto Layout First**: Use auto layout for components that need to adapt to content changes
- **Constraints for Responsive**: Use constraints for elements that need to respond to container size changes
- **Mixed Approach**: Combine auto layout frames within constraint-based layouts for maximum flexibility
- **Hierarchy Management**: Use grouping and layer ordering tools for organized designs

### Natural Language Interaction
- **Use Natural Language**: Say "make the text bigger" instead of trying to specify technical parameters
- **Be Conversational**: The AI understands context and can handle follow-up requests
- **Ask for Help**: Request explanations like "show me all the styles in this file"

## 🚦 Common Workflows

### Design System Workflows
1. **Design System Setup**: "Create color palette" → "Set up typography styles" → "Build component library" → "Define variable collections"
2. **Style Management**: "Create styles" → "Apply to elements" → "Organize by category" → "Test consistency"
3. **Variable System**: "Create collections" → "Define semantic variables" → "Set up modes" → "Bind to components" → "Test theme switching"

### Component Development
4. **Component Creation**: "Make a container" → "Add content" → "Apply styling" → "Convert to component" → "Create variants"
5. **Instance Management**: "Create instances" → "Apply overrides" → "Test responsiveness" → "Update main component"
6. **Component Building**: "Create frame" → "Add auto layout" → "Add content elements" → "Configure spacing and alignment" → "Set resizing behavior"

### Layout & Hierarchy
7. **Responsive Layout**: "Create container frame" → "Enable auto layout on components" → "Set constraints for responsive behavior" → "Test different screen sizes"
8. **Layout Debugging**: "Check auto layout properties" → "Verify constraint settings" → "Test responsive behavior" → "Adjust as needed"
9. **Hierarchy Organization**: "Group related elements" → "Set layer order" → "Create logical structure" → "Apply naming conventions"

### Content & Updates
10. **Batch Updates**: "Select all buttons" → "Update properties" → "Verify results" → "Test consistency"
11. **Content Management**: "Create text styles" → "Apply typography" → "Update content" → "Maintain hierarchy"

### Component System Workflow
**User Instructions:**
"Build a design system with reusable components."

**What the AI does:**
1. **Base Components**: Creates individual button, card, and input components
2. **Component Sets**: Combines related components into variant sets (button types, card sizes)
3. **Instance Library**: Places component instances throughout the design
4. **Override Management**: Customizes instances with specific text, colors, or properties
5. **Component Updates**: Updates main components to propagate changes to all instances

## 🔧 Technical Details

### Error Handling (v0.23.0)
- **Standardized Exceptions**: All handlers throw exceptions for consistent error handling
- **Detailed Messages**: Error responses include operation context, timestamps, and suggestions
- **Validation**: Comprehensive parameter validation with Zod schemas
- **Plugin Status**: Real-time connection and health monitoring
- **Boolean Validation**: Smart filtering of compatible node types for shape operations

### Tool Structure
- **20 Consolidated Tools**: Organized by domain for easy discovery
- **YAML Responses**: All tools return structured YAML data within MCP text format
- **Payload Wrapper Pattern**: Consistent `{type: 'OPERATION', payload: params}` structure
- **Comprehensive Coverage**: Full Figma API access through MCP protocol
- **Advanced Geometry**: Boolean operations and vector path manipulation

### Boolean & Vector Capabilities
- **Shape Compatibility**: Works with rectangles, ellipses, vectors, stars, polygons, and boolean operations
- **SVG Path Support**: Full SVG path syntax with winding rules (EVENODD, NONZERO)
- **Preserve Options**: Choice to keep or remove original shapes after boolean operations
- **Vector Creation**: Custom path creation with position control and path data
- **Path Extraction**: Retrieve and modify vector paths from existing shapes

### Test Coverage
- **143 Total Tests**: Comprehensive unit and integration test suite (up from 119)
- **Handler Testing**: All tool handlers with success/failure scenarios
- **Integration Testing**: End-to-end workflows and tool routing
- **Error Testing**: Exception handling and validation patterns
- **Boolean Testing**: Complete coverage of all boolean operations and edge cases
- **Vector Testing**: Full vector operation coverage with path validation

---

**Remember**: You give natural language instructions to your AI agent, and the AI uses the MCP tools to execute the operations in Figma. You don't need to write any code!

