# Figma Tool Best Practice

- All Tool interactions are ID-based, not selection-based. Selection is for the UI, not the MCP interface.
- Always prefer bulk operations instead of multiple single operations. Bulk operations can have single values that are applied to each operations. Shorter arrays are looped to match longer arrays. For example, create rectangles with the same size but alternating colors.
- Use figma_nodes list to introspect the content of the page, with various filters to quickly find nodes.
- Frames provide the hierarchy. nodes can define their parent at creation time.
- Take advantage of auto_layout instead of relying on manual layout adjustments.
- Components and Instances are the DRY principle of Figma design.
- Use figma_export as data to see your design as pixels. Use this to validate the design looks the way you expect it to.
