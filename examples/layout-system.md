# Layout System Guide

> **Use Cases**: Build responsive layouts, organize content automatically, and create flexible component structures that adapt to different screen sizes.

## Quick Examples

![Auto Layout and Constraints](images/layout-system.png)

- "Make this frame arrange children vertically" → Auto layout with vertical direction
- "Pin this header to the top" → Top constraint applied
- "Center this logo" → Center constraints both ways
- "Make this button stretch full width" → Left-right constraints

## Core Operations

### Auto Layout

#### Enabling Auto Layout
**When to use**: Components that need to adapt to content changes, navigation bars, card layouts

**User instruction**: "Make this frame automatically arrange its children horizontally with 16px spacing"

**What happens**:
1. AI uses `manage_auto_layout` tool with `enable` operation
2. Sets direction to "horizontal" 
3. Applies 16px spacing between items
4. Configures default alignment settings

```yaml
# Example response
operation: manage_auto_layout
result:
  nodeId: "123:456"
  autoLayout:
    direction: "horizontal"
    spacing: 16
    padding: { top: 0, right: 0, bottom: 0, left: 0 }
    alignment: { primary: "min", counter: "center" }
```

#### Auto Layout Configuration
**When to use**: Fine-tuning component behavior, creating professional spacing systems

**User instruction**: "Set up this card with vertical layout, 20px padding, and center alignment"

**What happens**:
1. AI enables auto layout with vertical direction
2. Sets uniform 20px padding on all sides
3. Configures center alignment for child elements
4. Sets up proper resizing behavior for content adaptation

### Constraints System

#### Basic Constraints
**When to use**: Responsive layouts that need to adapt to container size changes

**User instruction**: "Pin this sidebar to the left and make it stretch to full height"

**What happens**:
1. AI uses `manage_constraints` tool
2. Sets horizontal constraint to "left"
3. Sets vertical constraint to "top_bottom" for full height
4. Element now responds to parent container resizing

#### Center Positioning
**When to use**: Logos, modal dialogs, centered content that should stay centered

**User instruction**: "Center this dialog both horizontally and vertically"

**What happens**:
1. AI applies horizontal constraint "center"
2. Applies vertical constraint "center" 
3. Element maintains center position regardless of container size
4. Works for both fixed and responsive layouts

### Hierarchy Management

#### Grouping Elements
**When to use**: Organizing related elements, creating logical structure, managing layer order

**User instruction**: "Group these navigation items together"

**What happens**:
1. AI uses `manage_hierarchy` tool with `group` operation
2. Selects specified elements by ID
3. Creates new group container
4. Maintains relative positioning within group

#### Layer Ordering
**When to use**: Controlling visual stacking, bringing elements forward/back

**User instruction**: "Bring this button to the front"

**What happens**:
1. AI uses `manage_hierarchy` with `bring_to_front` operation
2. Moves element to top of layer stack
3. Updates z-index positioning
4. Element now appears above other elements

## Advanced Workflows

### Responsive Navigation Bar
**User instruction**: "Create a responsive navigation with logo, menu items, and CTA button"

**What the AI does**:
1. **Container Frame**: Creates main nav frame (1200x60px)
2. **Enable Auto Layout**: Sets horizontal direction with space-between alignment
3. **Logo Section**: Creates frame for logo with left alignment
4. **Menu Section**: Creates horizontal auto layout for navigation items
5. **CTA Section**: Creates frame for call-to-action button
6. **Constraints**: Applies left-right constraints for full width responsiveness
7. **Spacing**: Sets appropriate padding and item spacing

![Navigation Bar Example](images/responsive-nav.png)

### Card Component Layout
**User instruction**: "Build a card that adapts to its content automatically"

**What the AI does**:
1. **Card Container**: Creates frame with vertical auto layout
2. **Content Structure**: Sets up title, description, and action areas
3. **Spacing System**: Applies 16px spacing between content sections
4. **Padding**: Adds 20px padding around all content
5. **Sizing Behavior**: Configures "hug" content for automatic sizing
6. **Alignment**: Centers content horizontally, aligns text left

### Dashboard Layout System
**User instruction**: "Create a dashboard with header, sidebar, and main content that works on different screen sizes"

**What the AI does**:
1. **Main Container**: Creates root frame without auto layout for absolute positioning
2. **Header Setup**: Creates header with horizontal auto layout and full-width constraints
3. **Sidebar Layout**: Creates sidebar with vertical auto layout and left + full-height constraints  
4. **Content Area**: Creates main content with constraints to fill remaining space
5. **Responsive Behavior**: All elements adapt when container resizes
6. **Spacing System**: Consistent spacing between all major sections

![Dashboard Layout](images/dashboard-layout.png)

## Layout Patterns

### Auto Layout Strategies

#### Content-Driven Layouts
- **Hug Content**: Components size themselves to content
- **Fill Container**: Components expand to available space
- **Fixed Size**: Components maintain specific dimensions
- **Mixed Approach**: Combine strategies within same layout

#### Alignment Options
- **Primary Axis**: Start, center, end, space-between, space-around
- **Counter Axis**: Start, center, end
- **Text Alignment**: Independent of layout alignment
- **Icon Alignment**: Often center-aligned within containers

### Constraint Strategies

#### Responsive Patterns
- **Stretch Full Width**: Left-right constraints
- **Stretch Full Height**: Top-bottom constraints  
- **Corner Pinning**: Single-side constraints
- **Center Floating**: Center constraints
- **Proportional Scaling**: Scale constraints

#### Layout Combinations
- **Auto Layout + Constraints**: Auto layout for internal content, constraints for container behavior
- **Nested Auto Layout**: Auto layout frames within constraint-based layouts
- **Mixed Systems**: Different approaches for different sections

## Tips & Best Practices

### Auto Layout Guidelines
- **Start with Direction**: Choose horizontal or vertical based on primary content flow
- **Plan Spacing Early**: Consistent spacing creates professional layouts
- **Use Nesting**: Combine multiple auto layout frames for complex layouts
- **Consider Content**: Plan for text expansion and dynamic content

### Constraint Guidelines  
- **Understand Parent**: Constraints only work relative to parent container
- **Avoid Conflicts**: Don't use constraints on auto layout children
- **Test Responsiveness**: Always test with different container sizes
- **Plan for Edge Cases**: Consider minimum and maximum sizes

### Common Mistakes
- **Auto Layout Children with Constraints**: These conflict - choose one approach
- **Forgetting Padding**: Auto layout without padding can feel cramped
- **Inconsistent Spacing**: Use consistent spacing values throughout design
- **Over-Constraining**: Too many constraints can create conflicts

## Troubleshooting

### Auto Layout Issues
**Problem**: "Elements aren't arranging as expected"
**Solutions**:
- Check direction setting (horizontal vs vertical)
- Verify alignment settings for primary and counter axes
- Ensure spacing values are set correctly
- Check if children have conflicting constraints

**Problem**: "Content is getting cut off"
**Solutions**:
- Check container sizing behavior (hug vs fill vs fixed)
- Verify padding settings aren't too restrictive
- Check if parent container has size constraints
- Review text wrapping and overflow settings

### Constraint Issues
**Problem**: "Element isn't responding to container changes"
**Solutions**:
- Verify element isn't a child of auto layout frame
- Check that parent container is actually resizing
- Ensure constraints are set on correct axis
- Test with manual container resizing

**Problem**: "Layout breaks at certain sizes"
**Solutions**:
- Set minimum width/height constraints
- Plan for content overflow scenarios
- Use mixed constraint strategies
- Test with realistic content lengths

## Next Steps

- **[Design System →](design-system.md)**: Apply layout patterns to reusable components
- **[Advanced Operations →](advanced-operations.md)**: Complex layout manipulations
- **[Getting Started ←](getting-started.md)**: Review basics if needed

---

**Remember**: Good layouts adapt to content changes and different screen sizes. Start with auto layout for components, add constraints for responsive behavior.