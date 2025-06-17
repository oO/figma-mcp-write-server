# Figma MCP Alignment Tool - Design Specification

**Target**: Phase 2.5  
**Assigned to**: Claude Code

---

## Tool Interface

```typescript
manage_alignment({
  horizontalOperation?: "position" | "align" | "distribute",
  horizontalDirection?: "left" | "center" | "right",
  horizontalReferencePoint?: "left" | "center" | "right",   // Which part of reference
  horizontalAlignmentPoint?: "left" | "center" | "right",   // Which part of moving node
  horizontalSpacing?: number,
  
  verticalOperation?: "position" | "align" | "distribute", 
  verticalDirection?: "top" | "middle" | "bottom",
  verticalReferencePoint?: "top" | "middle" | "bottom",     // Which part of reference  
  verticalAlignmentPoint?: "top" | "middle" | "bottom",     // Which part of moving node
  verticalSpacing?: number,
  
  nodeIds: string[],
  referenceMode?: "bounds" | "key_object" | "relative",
  referenceNodeId?: string,
  margin?: number
})
```

## Operation Matrix

**Operations:**
- `position` - Place relative to reference
- `align` - Align to reference edge/center  
- `distribute` - Even spacing

**Directions:**
- Horizontal: `left`, `center`, `right`
- Vertical: `top`, `middle`, `bottom`

**Reference Modes:**
- `bounds` - Calculated bounding box (default)
- `key_object` - Specific reference node
- `relative` - Position relative to reference node

**Reference/Alignment Points:**
- **Reference Points**: Which part of the reference to align to
- **Alignment Points**: Which part of the moving node to use for alignment
- Creates 3×3 matrix of alignment possibilities for precise positioning

## Implementation Architecture

**Location**: Figma Plugin (not MCP Server)

**Rationale:**
- Atomic operations - read positions, calculate, update in single transaction
- No race conditions from state changes during calculation
- Lower latency - no WebSocket round trips for position data
- Direct access to Figma constraints (locked nodes, bounds checking)

**Data Flow:**
1. MCP Server validates parameters and routes operation
2. Figma Plugin receives operation parameters via WebSocket
3. Plugin reads node positions/dimensions
4. Plugin calculates new positions using alignment algorithms
5. Plugin updates node positions
6. Plugin returns success/error response

---

## Examples

**"Create circle to right of rectangle, centered vertically"**
```typescript
manage_alignment({
  horizontalOperation: "position",
  horizontalDirection: "right",
  horizontalSpacing: 20,
  verticalOperation: "align", 
  verticalDirection: "middle",
  nodeIds: ["NewCircle"],
  referenceMode: "relative",
  referenceNodeId: "ExistingRectangle"
})
```

**"Center text in frame"**
```typescript
manage_alignment({
  horizontalOperation: "align",
  horizontalDirection: "center",
  verticalOperation: "align",
  verticalDirection: "middle",
  nodeIds: ["textNode"],
  referenceMode: "bounds"
})
```

**"Position circle so its center aligns with rectangle's left edge"**
```typescript
manage_alignment({
  horizontalOperation: "align",
  horizontalReferencePoint: "left",     // Rectangle's left edge
  horizontalAlignmentPoint: "center",   // Circle's center
  verticalOperation: "align", 
  verticalReferencePoint: "middle",     // Rectangle's middle
  verticalAlignmentPoint: "middle",     // Circle's middle
  nodeIds: ["circleId"],
  referenceMode: "relative",
  referenceNodeId: "rectangleId"
})
```

**"Align all nodes' centers to rectangle's left edge"**
```typescript
manage_alignment({
  horizontalOperation: "align",
  horizontalReferencePoint: "left",     // Rectangle's left edge
  horizontalAlignmentPoint: "center",   // Each node's center
  nodeIds: ["circle1", "circle2", "circle3"],
  referenceMode: "relative",
  referenceNodeId: "rectangleId"
})
```

## Success Criteria

**Functional:**
- All matrix combinations work (3 operations × 6 directions × 3×3 alignment points)
- Single node alignment to parent
- Key object alignment 
- Professional spacing quality

**Performance:**
- <500ms response time for 20+ objects
- Zero positioning errors
- 99%+ success rate

**Integration:**
- Works with existing MCP tools
- Doesn't break auto layout
- Clear error messages

## Testing

**Core scenarios:** Standard alignment, distribution, single objects, relative positioning, cross-container
**Edge cases:** Overlapping objects, locked objects, invalid IDs, boundary conditions
**Natural language:** Complex positioning commands, multi-step workflows
**3×3 matrix:** All reference point × alignment point combinations