# Figma MCP Tool Best Practice

**IDs, not Selection** All Tool interactions are ID-based, not selection-based. Selection is for the UI, not the MCP interface

**Finding Nodes** Use `figma_nodes list` to introspect the content of the page, with various filters to quickly find nodes.

**Bulk Operations** Always prefer bulk operations instead of multiple single operations.
- Longuest array dictates the total number of executions
- Single values are applied to each execution.
- Shorter arrays are looped to match longer arrays.

**Hierarchical Layout** Nodes can be nested within Frames, including other Frames. Define a node's parent at creation time, instead of using a second operation with `figma_hierarchy`. Take advantage of `figma_auto_layout` or `figma_constraints` instead of relying only manual layout adjustments. Leverage `figma_alignment` to align nodes instead of computing position and bouding boxes manually.

**Seeing is better than guessing** Use figma_export as data to see your design as pixels. Use this to validate the design looks the way you expect it to.

**Practice DRY Design** avoid duplicating elements, define components (`figma_components`) and use them as instances (`figma_instances`). Also use `figma_styles` and `figma_variables` instead of repeating fills and strokes to each object.

## Frames vs Groups vs Components Decision Matrix

**Use frames for** layout containers, clipping boundaries, visual effects application, responsive design with constraints, prototyping with scrolling, and layout grid implementation. Frames support complex styling and advanced layout features essential for modern interfaces.

**Use groups for** simple element organization, fixed relationships between elements (like logo components), and temporary bundling during design exploration. Groups offer lighter memory usage but lack advanced features.

**Use components for** reusable elements with dynamic content, consistent styling, and automatic updates. Components provide a single source of truth for design elements, reducing duplication and maintenance overhead. Keep component instances linked for memory efficiency and automatic update propagation. Detach only when extensive customization overrides the benefits of centralized updates.

## Component Library Architecture

Organize components following **atomic design principles**, with clear separation between published and building-block components. Use nested components strategically—base shapes become building blocks for buttons, which combine into button groups, eventually forming complete interfaces.

Structure variants to minimize permutations while maximizing flexibility. A button component with 3 sizes, 3 types, 4 states, and 2 icon options would create 72 variants if combined—instead, use component properties to manage variations dynamically.
