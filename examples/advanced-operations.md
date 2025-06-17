# Advanced Operations Guide

> **Use Cases**: Complex shape creation, boolean operations, custom vector paths, and development handoff workflows. For users comfortable with basic operations who need advanced design capabilities.

## Quick Examples

![Boolean and Vector Operations](images/advanced-operations.png)

- "Combine these shapes into one" → Boolean union operation
- "Cut a hole in this rectangle" → Boolean subtract operation  
- "Create custom arrow icon" → Vector path creation
- "Generate CSS for this component" → Dev mode integration

## Core Operations

### Boolean Operations

#### Union (Combine Shapes)
**When to use**: Merging overlapping shapes, creating complex logos, combining design elements

**User instruction**: "Combine these two rectangles and circle into a single shape"

**What happens**:
1. AI uses `manage_boolean_operations` tool with `union` operation
2. Selects all specified shapes by node ID
3. Combines overlapping areas into unified shape
4. Creates new boolean group with descriptive name

```yaml
# Example response
operation: manage_boolean_operations
result:
  nodeId: "789:012"
  nodeName: "Combined Shape"
  nodeType: "BOOLEAN_OPERATION"
  booleanOperation: "UNION"
  childrenCount: 3
  processedNodeIds: ["123:456", "456:789", "789:012"]
```

#### Subtract (Cut Out Shapes)
**When to use**: Creating cutouts, removing areas, making complex shapes with holes

**User instruction**: "Cut a circle hole in the center of this rectangle"

**What happens**:
1. AI uses `manage_boolean_operations` with `subtract` operation
2. First shape (rectangle) is base, second shape (circle) is subtracted
3. Removes overlapping area from base shape
4. Creates boolean group with hole cut out

#### Intersect (Keep Only Overlap)
**When to use**: Creating badges, overlapping effects, complex shape intersections

**User instruction**: "Keep only the overlapping part of these two shapes"

**What happens**:
1. AI uses `intersect` operation on selected shapes
2. Removes all non-overlapping areas
3. Keeps only areas where shapes intersect
4. Creates new shape from intersection

#### Exclude (Remove Overlap)
**When to use**: Creating frames, ring shapes, complex cutout effects

**User instruction**: "Remove the overlapping areas to create a ring effect"

**What happens**:
1. AI uses `exclude` operation on selected shapes
2. Removes areas where shapes overlap
3. Keeps only non-overlapping portions
4. Creates compound shape with cutouts

### Vector Operations

#### Custom Vector Creation
**When to use**: Custom icons, unique shapes, precise path control

**User instruction**: "Create a custom arrow icon pointing right with curved tail"

**What happens**:
1. AI uses `manage_vector_operations` with `create_vector` operation
2. Generates SVG path data for arrow shape
3. Creates vector node with specified path
4. Positions at desired coordinates

#### Flatten Complex Shapes
**When to use**: Converting layered designs to single vectors, simplifying complex hierarchies

**User instruction**: "Turn this layered logo into a single vector shape"

**What happens**:
1. AI uses `flatten` operation on selected hierarchy
2. Converts all shapes and groups into single vector
3. Maintains visual appearance while simplifying structure
4. Creates flattened vector with optimized paths

#### Outline Strokes
**When to use**: Converting strokes to fills, creating scalable graphics, preparing for boolean operations

**User instruction**: "Convert the stroke outline of this shape into a filled path"

**What happens**:
1. AI uses `outline_stroke` operation
2. Converts stroke properties into filled vector paths
3. Maintains stroke width as fill area
4. Creates new vector with outlined stroke as solid shape

#### Extract Vector Paths
**When to use**: Getting path data for modification, analyzing existing vectors

**User instruction**: "Get the path data from this icon so I can modify it"

**What happens**:
1. AI uses `get_vector_paths` operation
2. Extracts SVG-compatible path data
3. Returns path information with winding rules
4. Provides data for external modification or analysis

### Dev Mode Integration

#### Design Annotations
**When to use**: Communicating design intent, providing developer specifications

**User instruction**: "Add an annotation explaining this component's hover behavior"

**What happens**:
1. AI uses `manage_annotations` tool with `add` operation
2. Creates annotation linked to specific component
3. Includes behavior description and specifications
4. Makes annotation visible in dev mode

#### Spacing Measurements
**When to use**: Documenting spacing requirements, showing layout specifications

**User instruction**: "Add measurements showing the spacing between these elements"

**What happens**:
1. AI uses `manage_measurements` tool
2. Creates measurement indicators between elements
3. Shows exact pixel distances
4. Provides clear spacing documentation for developers

#### CSS Generation
**When to use**: Developer handoff, code generation, design-to-code workflows

**User instruction**: "Generate CSS code for this button component"

**What happens**:
1. AI uses `manage_dev_resources` with `generate_css` operation
2. Extracts styling properties from component
3. Generates production-ready CSS code
4. Includes responsive and state considerations

## Advanced Workflows

### Complex Logo Creation
**User instruction**: "Design a company logo by combining basic shapes and custom elements"

**What the AI does**:
1. **Base Shapes**: Creates foundational rectangles and circles
2. **Custom Elements**: Adds vector paths for unique design features
3. **Boolean Combination**: Uses union operations to merge related elements
4. **Detail Refinement**: Uses subtract operations for precise cutouts and details
5. **Path Optimization**: Flattens complex results into clean vector shapes
6. **Final Polish**: Outlines strokes and optimizes for scalability

![Complex Logo Creation](images/logo-creation-workflow.png)

### Icon Library Development
**User instruction**: "Build a consistent icon set with uniform stroke weights and style"

**What the AI does**:
1. **Base Vector Creation**: Creates foundation icons using custom vector paths
2. **Stroke Consistency**: Applies uniform stroke weights across all icons
3. **Style Standardization**: Uses outline_stroke to convert strokes to fills
4. **Path Optimization**: Flattens complex icons into single vector nodes
5. **Boolean Refinement**: Uses boolean operations for consistent shapes
6. **Component Creation**: Converts finalized icons to reusable components

### Design-to-Development Handoff
**User instruction**: "Prepare this interface design for developer implementation"

**What the AI does**:
1. **Component Analysis**: Identifies all interactive components and states
2. **Annotation Addition**: Adds behavior specifications and interaction notes
3. **Measurement Creation**: Documents spacing, sizing, and layout specifications
4. **CSS Generation**: Extracts styling code for all components
5. **Resource Organization**: Organizes dev resources by component and page
6. **Status Tracking**: Marks components as ready for development

![Dev Handoff Workflow](images/dev-handoff-workflow.png)

## Boolean Operation Strategies

### Shape Combination Patterns
- **Additive Design**: Start with basic shapes, add complexity with unions
- **Subtractive Design**: Start with solid forms, remove areas with subtraction
- **Intersection Focus**: Use intersect for badge effects and overlapping designs
- **Exclusion Effects**: Create frames and ring shapes with exclude operations

### Vector Path Techniques
- **Custom Iconography**: Use precise path control for unique icon designs
- **Logo Creation**: Combine custom vectors with boolean operations
- **Illustration Elements**: Create organic shapes with custom path data
- **Technical Diagrams**: Use precise vector control for technical illustrations

### Performance Optimization
- **Path Simplification**: Flatten complex hierarchies for better performance
- **Stroke Optimization**: Convert strokes to fills for consistent rendering
- **Boolean Cleanup**: Minimize boolean operation complexity
- **Vector Efficiency**: Use optimized path data for smaller file sizes

## Development Integration Patterns

### Annotation Strategies
- **Behavioral Notes**: Document interactive states and transitions
- **Technical Specifications**: Include implementation requirements and constraints
- **Design Rationale**: Explain design decisions and user experience considerations
- **Edge Cases**: Document behavior for error states and unusual conditions

### Measurement Documentation
- **Layout Systems**: Document grid systems and spacing relationships
- **Component Specifications**: Measure internal component spacing and sizing
- **Responsive Behavior**: Document how elements adapt to different screen sizes
- **Typography Metrics**: Specify line heights, spacing, and hierarchy relationships

### CSS Integration
- **Component Libraries**: Generate CSS for reusable component systems
- **Utility Classes**: Create utility-based CSS for consistent styling
- **Custom Properties**: Use CSS variables for themeable designs
- **Responsive Patterns**: Generate media queries and responsive behavior

## Tips & Best Practices

### Boolean Operations
- **Plan Operation Order**: Order of selection affects subtract and exclude results
- **Preserve Originals**: Use `preserveOriginal: true` to keep source shapes
- **Test Combinations**: Try different boolean operations to achieve desired effects
- **Simplify When Possible**: Use simpler shapes when complex booleans aren't needed

### Vector Operations
- **Path Optimization**: Simplify paths for better performance and editability
- **Consistent Winding**: Use appropriate winding rules for complex paths
- **Readable Path Data**: Use descriptive path data for maintainable vectors
- **Scale Considerations**: Design vectors to work at multiple sizes

### Dev Mode Workflow
- **Clear Communication**: Write annotations that developers can easily understand
- **Consistent Terminology**: Use standard development terms in annotations
- **Complete Documentation**: Include all necessary implementation details
- **Update Regularly**: Keep dev resources current with design changes

## Troubleshooting

### Boolean Operation Issues
**Problem**: "Boolean operations aren't working as expected"
**Solutions**:
- Check that all selected shapes are compatible (not text or images)
- Verify shapes are actually overlapping if using intersect
- Try different operation order for subtract and exclude
- Ensure shapes are on same layer and not grouped differently

**Problem**: "Boolean result is more complex than expected"
**Solutions**:
- Simplify source shapes before boolean operations
- Try combining operations in smaller steps
- Check for unexpected overlapping shapes
- Use flatten operation to simplify complex results

### Vector Operation Issues
**Problem**: "Custom vector paths aren't displaying correctly"
**Solutions**:
- Verify SVG path syntax is correct
- Check winding rules (EVENODD vs NONZERO)
- Ensure path data represents closed shapes when needed
- Test with simpler path data to isolate issues

**Problem**: "Outline stroke operation isn't working"
**Solutions**:
- Verify selected shape has stroke applied
- Check that stroke width is greater than 0
- Ensure shape type supports stroke outline operation
- Try with different stroke settings to isolate issues

### Dev Mode Issues
**Problem**: "Annotations aren't showing up in dev mode"
**Solutions**:
- Verify Figma file has dev mode enabled
- Check that annotations are attached to correct nodes
- Ensure annotations have proper labels and content
- Test annotation visibility settings

## Next Steps

- **[Image Workflows →](image-workflows.md)**: Learn image management and manipulation
- **[Export Workflows →](export-workflows.md)**: Export advanced designs for production
- **[Design System ←](design-system.md)**: Apply advanced operations to design systems

---

**Remember**: Advanced operations build on basic skills. Master boolean operations first, then progress to custom vectors and dev integration.