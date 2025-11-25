# Figma Design Execution Skill

**Purpose:** Execute design tasks in Figma using MCP tools with proficiency and design intelligence.

**Scope:** Tool usage patterns, layout strategies, banner adaptation workflows, design validation.

**NOT in scope:** Brand guidelines (see client-specific projects for brand intelligence).

---

## Core Execution Principles

### 1. ID-Based Operations (Never Selection-Based)

All tool interactions use node IDs, not selection state. Selection is UI-only.

**Finding nodes:**
```yaml
# Introspect page content with filters
figma_nodes:
  operation: list
  filterByType: ["FRAME", "TEXT"]
  filterByName: "Product.*"  # regex pattern
  maxResults: 50
```

### 2. Bulk Operations Over Iteration

**Always prefer bulk operations** - arrays execute in parallel, single values broadcast to all.

**Execution rules:**
- Longest array dictates total operations
- Single values apply to every execution
- Shorter arrays loop to match longer arrays

**Example - Create 3 rectangles in one call:**
```yaml
figma_nodes:
  operation: create_rectangle
  x: [0, 150, 300]           # 3 positions
  y: 100                     # broadcasts to all
  width: 120                 # broadcasts to all
  height: 80                 # broadcasts to all
  fillColor: ["#FF0000", "#00FF00", "#0000FF"]  # 3 colors
```

### 3. Hierarchical Layout at Creation

Define parent relationships during creation, not after.

**WHY THIS MATTERS:**
- Flat layouts (siblings) break when you need to relocate element groups
- Moving a parent moves all children automatically
- Text inside buttons, labels on products, CTAs with icons - all need nesting
- "Move CTA" should move the button AND the text, not leave text orphaned

**Pattern:**
```yaml
# Create parent frame
figma_nodes:
  operation: create_frame
  name: "Banner 300x600"
  width: 300
  height: 600

# Then create children WITH parentId
figma_nodes:
  operation: create_rectangle
  name: "Background"
  parentId: "{parent-frame-id}"  # nested from creation
  width: 300
  height: 600
```

**Advantages:**
- Coordinates are relative to parent (simpler math)
- Hierarchy established immediately
- No secondary `figma_hierarchy` operations needed
- Group operations (move, scale, delete) work on parent and affect all children

### 4. Layout Systems Over Manual Positioning

Use `figma_auto_layout`, `figma_constraints`, `figma_alignment` instead of computing positions manually.

**Auto-layout for spacing:**
```yaml
figma_auto_layout:
  operation: set_vertical
  nodeId: "{container-id}"
  verticalSpacing: 20        # gap between children
  paddingTop: 40
  paddingBottom: 40
  horizontalAlignment: CENTER
```

**Alignment for precision:**
```yaml
figma_alignment:
  nodeIds: ["{logo-id}", "{product-id}"]
  referenceMode: key_object
  referenceNodeId: "{product-id}"
  horizontalOperation: align
  horizontalDirection: center
```

### 5. Visual Validation Over Assumptions

**Always export to validate** - seeing pixels confirms design matches intent.

```yaml
figma_exports:
  operation: export
  id: "{banner-frame-id}"
  format: PNG
  target: DATA              # returns base64 for visual inspection
```

**Use this to:**
- Verify layout proportions
- Check text readability
- Confirm color application
- Validate spacing relationships

### 6. DRY Design with Styles/Components/Variables

**Avoid duplication** - define once, reference everywhere.

**Components for reusable elements:**
```yaml
# Create component
figma_components:
  operation: create
  componentIds: "{legal-text-frame-id}"
  name: "Legal Text / 8px White"

# Use as instance
figma_instances:
  operation: create
  componentId: "{component-id}"
  x: 10
  y: 580
```

**Styles for consistent fills/text:**
```yaml
# Create paint style
figma_styles:
  operation: create
  type: paint
  name: "Brand/Primary Blue"
  color: "#0066CC"

# Apply to nodes
figma_styles:
  operation: apply
  styleId: "{style-id}"
  nodeId: ["{rect-1}", "{rect-2}", "{rect-3}"]
```

---

## Banner Adaptation Workflow

**Goal:** Convert banner from one format to another while preserving design intent.

### Step 1: Analyze Source Design

```yaml
# Get source frame structure
figma_nodes:
  operation: get
  nodeId: "{source-banner-id}"

# List all children
figma_nodes:
  operation: list
  nodeId: "{source-banner-id}"
  traversal: children
  detail: detailed
```

**Extract:**
- Element hierarchy (background, logo, product, text layers)
- Spacing relationships (margins, gaps)
- Proportions (product size relative to frame)
- Typography (sizes, weights, alignment)

### Step 2: Determine Adaptation Strategy

**Format change types:**

**A. Aspect ratio change (e.g., 300x600 → 400x800)**
- Same orientation (vertical → vertical)
- Scale proportionally, adjust spacing
- Preserve relative sizes

**B. Orientation flip (e.g., 728x90 → 300x250)**
- Horizontal → vertical layout
- Restructure element positions
- May need text rewrap

**C. Size scaling (e.g., 160x600 → 300x600)**
- Same aspect, different dimensions
- Proportional scaling of all elements
- Typography may need optical adjustment

### Step 3: Create Target Frame

```yaml
figma_nodes:
  operation: create_frame
  name: "Banner {target-format}"
  width: {target-width}
  height: {target-height}
  x: {source-x + source-width + 50}  # position next to source
  y: {source-y}
```

### Step 4: Duplicate & Adapt Elements

**Background layer:**
```yaml
# NEVER use FILL - it stretches/deforms the image anamorphically
# ALWAYS use CROP with proper positioning to maintain aspect ratio
figma_fills:
  operation: update_image
  nodeId: "{bg-rect-id}"
  imageHash: "{same-as-source}"
  imageScaleMode: CROP       # maintains aspect ratio, crops excess
  imagePositionX: 0          # adjust to show relevant portion
  imagePositionY: 0
```

**CRITICAL:** Background images must never be stretched. Use CROP mode and adjust position to show the important part of the image (logo glow, key visual, etc.).

**Logo positioning:**
```yaml
# Maintain relative position (e.g., "center, 40px from bottom")
figma_nodes:
  operation: update
  nodeId: "{logo-id}"
  x: {(target-width - logo-width) / 2}
  y: {target-height - 40 - logo-height}
```

**Product image:**
```yaml
# Maintain 50-60% width rule
target_product_width = target-width * 0.55

figma_nodes:
  operation: update
  nodeId: "{product-id}"
  width: {target_product_width}
  height: {maintain-aspect-ratio}
```

**Text layers:**
```yaml
# Adjust box width, may reflow
figma_text:
  operation: update
  nodeId: "{text-id}"
  width: {target-width - (2 * margin)}
  # Font size may need adjustment for readability
```

### Step 5: Validate Visually

```yaml
figma_exports:
  operation: export
  id: "{target-banner-id}"
  format: PNG
  target: DATA
```

**Check:**
- Spacing feels balanced
- Text is readable (not too small/large)
- Product dominates appropriately
- Legal text meets minimum size requirements

---

## Layout Construction Patterns

### Pattern: Background + Centered Logo + Product + Text

**Common in display ads** - use this sequence:

1. **Frame container**
2. **Background rect** (full size, image/gradient fill)
3. **Product image** (50-60% width, positioned dynamically)
4. **Logo** (aligned to product or fixed position)
5. **Text frame** (auto-layout for multi-line, centered or aligned)
6. **Legal text** (8px, bottom position, contrast-adjusted color)

**Example execution:**
```yaml
# 1. Frame
figma_nodes: {operation: create_frame, name: "300x600", width: 300, height: 600}

# 2. Background (as child)
figma_nodes: {operation: create_rectangle, parentId: "{frame}", width: 300, height: 600}
figma_fills: {operation: add_image, nodeId: "{bg}", imageHash: "{hash}", imageScaleMode: FILL}

# 3. Product (positioned in bulk with logo)
figma_images: {operation: create, source: "{product-url}", parentId: "{frame}", x: 75, y: 200}
figma_nodes: {operation: update, nodeId: "{product}", width: 150}  # 50% of 300

# 4. Logo (aligned to product)
figma_images: {operation: create, source: "{logo-url}", parentId: "{frame}", x: 100, y: 300}
figma_alignment: {nodeIds: ["{logo}", "{product}"], horizontalOperation: align, horizontalDirection: center}

# 5. Text
figma_text: {operation: create, parentId: "{frame}", characters: "Headline", fontSize: 24, x: 20, y: 450, width: 260}

# 6. Legal
figma_text: {operation: create, parentId: "{frame}", characters: "Legal copy", fontSize: 8, fillColor: "#FFFFFF", x: 10, y: 582, width: 280}
```

### Pattern: Auto-Layout Vertical Stack

**Use when elements need consistent spacing:**

```yaml
# Create container with auto-layout
figma_nodes: {operation: create_frame, name: "Stack", width: 300, height: 600}
figma_auto_layout: {
  operation: set_vertical,
  nodeId: "{frame}",
  verticalSpacing: 20,
  paddingTop: 40,
  paddingBottom: 40,
  paddingLeft: 20,
  paddingRight: 20,
  horizontalAlignment: CENTER
}

# Add children - auto-layout handles positioning
figma_text: {operation: create, parentId: "{frame}", characters: "Headline", fontSize: 32}
figma_text: {operation: create, parentId: "{frame}", characters: "Subhead", fontSize: 18}
figma_nodes: {operation: create_rectangle, parentId: "{frame}", width: 200, height: 200}
```

---

## Frames vs Groups vs Components

### Use Frames For:
- Layout containers (banners, cards, sections)
- Clipping boundaries (overflow hidden)
- Visual effects (drop shadows, blur)
- Responsive design with constraints
- Prototyping with scrolling
- Layout grids

**Frames support advanced styling and layout - use by default.**

### Use Groups For:
- Simple bundling (logo + icon)
- Fixed relationships (wordmark components)
- Temporary organization during exploration
- Lighter memory usage when features not needed

**Groups lack auto-layout, constraints, clipping - use sparingly.**

### Use Components For:
- Reusable elements (buttons, legal text blocks, product cards)
- Consistent styling with variants (primary/secondary buttons)
- Automatic update propagation

**Component workflow:**
```yaml
# 1. Create element
figma_text: {operation: create, characters: "Legal copy 8px", fontSize: 8}

# 2. Convert to component
figma_components: {operation: create, componentIds: "{text-id}", name: "Legal/8px White"}

# 3. Use as instances
figma_instances: {operation: create, componentId: "{component}", x: [10, 10, 10], y: [582, 232, 442]}
```

**Keep instances linked** for automatic updates. Detach only when customization outweighs centralized control.

---

## Component Library Strategy

### Atomic Design Hierarchy

**Atoms:** Base shapes, typography, colors (via styles/variables)
**Molecules:** Buttons, input fields, icons with labels
**Organisms:** Navigation bars, product cards, banner templates
**Templates:** Full layouts with placeholder content

**Build bottom-up:**
1. Define styles/variables (colors, text styles)
2. Create base components (buttons, legal text)
3. Compose into larger components (product card = image + text + button)
4. Assemble templates (banner = background + product card + logo)

### Variant Management

**Minimize permutations:**

❌ **Bad:** 3 sizes × 3 types × 4 states × 2 icons = 72 variants
✅ **Good:** Use component properties to manage variations dynamically

```yaml
# Create component set with smart variants
figma_components: {
  operation: create_set,
  componentIds: ["{btn-1}", "{btn-2}", "{btn-3}"],
  name: "Button",
  variantProperties: ["Size=Small,Medium,Large", "Type=Primary,Secondary,Tertiary"]
}
```

**Separate concerns:**
- Size variants: Small, Medium, Large (3 options)
- Type variants: Primary, Secondary, Tertiary (3 options)
- State: Manage via overlays or component properties, not multiplication

---

## Mandatory Banner Elements

**Every digital advertising banner must include:**

1. **Logo** - Brand identification, positioned per brand guidelines
2. **Headline/Claim** - Primary message, uses display/brand typography
3. **Product Visual** - Hero image (device, person, offer graphic)
4. **Price/Offer** - Clear value proposition
5. **CTA** - Action button ("J'en profite", "En savoir plus", etc.)
6. **Legal Text** - Disclaimers, conditions, regulatory text

**Before finalizing:** Verify ALL six elements are present. Missing elements = incomplete banner.

**Logo positioning by format orientation:**
- **Vertical (portrait):** Top center
- **Square:** Top center
- **Horizontal (landscape):** Depends on layout - typically top-left or integrate with content
- **Skinny horizontal (728x90, etc.):** Middle-right, not top-right (vertical centering needed)

**Reading order by format:**
- **Vertical (portrait):** Top to bottom (logo → claim → product → CTA → legal)
- **Horizontal (landscape):** LEFT TO RIGHT strictly
  - Skinny formats (728x90, 970x90): Product LEFT → content RIGHT
  - Product on right breaks natural reading flow - never do this
  - Eye enters left, scans right, exits at CTA

---

## Design Validation Checklist

Before finalizing any design task:

**Visual Export:**
- [ ] Export as PNG/DATA and visually inspect
- [ ] Check at 100% zoom (actual pixel accuracy)
- [ ] Verify spacing relationships look balanced

**Technical Accuracy:**
- [ ] All required elements present (logo, legal, product)
- [ ] Text readable at minimum sizes (8px+ for legal)
- [ ] Colors match brand guidelines (if applicable)
- [ ] Image fills positioned correctly (no awkward crops)

**Layout Verification:**
- [ ] Elements within frame bounds (no overflow unless intentional)
- [ ] Proportions feel appropriate (product dominates, text supports)
- [ ] Alignment is precise (center means center, not "close enough")

**Maintainability:**
- [ ] Using components where appropriate (reusable elements)
- [ ] Styles applied for colors/text (not inline fills)
- [ ] Logical naming convention (descriptive, hierarchical)

---

## Common Pitfalls & Solutions

### Pitfall: Manually calculating positions for every element

**Solution:** Use `figma_alignment`, `figma_auto_layout`, `figma_constraints` for automatic positioning.

### Pitfall: CTA as rectangle + text siblings (flat hierarchy)

**Problem:** Creating a button as separate rectangle and text at the same level. When you move the rectangle, the text stays behind. When text changes, rectangle doesn't resize.

**Solution:** Build CTAs as auto-layout frames with text as child:

```yaml
# 1. Create CTA frame with styling
figma_nodes:
  operation: create_frame
  name: "CTA"
  parentId: "{parent-frame-id}"
  x: 100
  y: 200
  width: 120
  height: 44
  fillColor: "#EA5B0F"
  cornerRadius: 5

# 2. Apply auto-layout for centering and padding
figma_auto_layout:
  operation: set_horizontal
  nodeId: "{cta-frame-id}"
  horizontalAlignment: CENTER
  verticalAlignment: CENTER
  paddingTop: 10
  paddingBottom: 10
  paddingLeft: 20
  paddingRight: 20

# 3. Create text AS CHILD (not sibling!)
figma_text:
  operation: create
  parentId: "{cta-frame-id}"
  characters: "J'en profite"
  fontFamily: "Inter"
  fontStyle: "Bold"
  fontSize: 14
  fillColor: "#FFFFFF"
```

**Result:** Move CTA frame → text moves with it. Text grows → frame resizes. This is proper component behavior.

### Pitfall: Font style case-sensitivity errors

**Problem:** Font style names are case-sensitive in Figma API. "bold" ≠ "Bold", "Semibold" ≠ "SemiBold".

**Solution:** Use exact capitalization as shown in `figma_fonts` search results. Common gotchas:
- "Bold" not "bold"
- "SemiBold" not "Semibold" (check actual font family)
- "Regular" not "regular"

```yaml
# Check available styles first
figma_fonts:
  operation: get_font_styles
  fontFamily: "Inter"
```

### Pitfall: Creating elements at page level then moving into frames

**Solution:** Specify `parentId` at creation time for immediate nesting.

### Pitfall: Applying same color to 20 elements individually

**Solution:** Create paint style once, apply to all elements in bulk.

### Pitfall: Assuming design looks correct without visual check

**Solution:** Always export and inspect pixels - Figma primitives can lie about visual appearance.

### Pitfall: Using groups when frames would provide needed features

**Solution:** Default to frames for layout containers - groups only for simple bundling.

### Pitfall: Creating 50 button variants instead of using properties

**Solution:** Structure variants to minimize permutations, use component properties dynamically.

---

## Quick Reference: Tool Selection

**Need to find nodes?** → `figma_nodes list` with filters
**Need to create layouts?** → `figma_nodes create_*` with `parentId`
**Need spacing/alignment?** → `figma_auto_layout` or `figma_alignment`
**Need to apply colors?** → `figma_styles` (paint) or `figma_fills` (direct)
**Need to validate design?** → `figma_exports` with `target: DATA`
**Need reusable elements?** → `figma_components` + `figma_instances`
**Need to adapt banners?** → Follow 5-step adaptation workflow above

---

**Remember:** Design execution is about accomplishing intent efficiently. Use the right tools for the task, validate visually, and build maintainable structures.
