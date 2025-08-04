# Claude Code Project Context

## MANDATORY Commit Message Format

**ALWAYS USE THIS EXACT FORMAT FOR EVERY COMMIT - NO EXCEPTIONS:**

```
type: brief description (vX.X.X)

- Bullet point describing change 1
- Bullet point describing change 2

Designed with ❤️ by oO. Coded with ✨ by Claude Sonnet 4
Co-authored-by: Claude.AI <noreply@anthropic.com>
```

**Types**: `feat:` `fix:` `docs:` `refactor:` `test:` `chore:`

**CRITICAL**: This format is MANDATORY. Git template is configured at `.gitmessage`. Never use any other commit format.

## Core Development Principles

### Error Handling
- All handlers throw exceptions (no error response objects)
- Use `{type: 'OPERATION', payload: parameters}` pattern
- YAML responses for all tool outputs
- **JSON-RPC**: Always use `error.toString()` never `error.message`
- **Debug Logging**: 
  - Server: Use `logger.debug()` from `src/utils/logger.ts` 
  - Plugin: Use `logger.debug()` from `figma-plugin/src/logger.ts`
  - Both safely ignore errors to avoid breaking JSON-RPC communication

### Code Standards
- Follow existing patterns before creating new ones
- Always validate the existence and proper syntax of Figma API calls
- **Figma API Research**: If no working examples exist in codebase, always check the official Figma Plugin API documentation at https://www.figma.com/plugin-docs/ before implementing
- Use descriptive names without hardcoded numbers in docs
- Add tests for new features, run `npm test` before commits
- Examine existing implementations first for consistency
- **Version Management**: Never hardcode version numbers - use dynamic injection from package.json
  - Server: Uses package.json import for VERSION constant
  - Plugin: Uses `PLUGIN_VERSION` global constant injected during build
  - UI: Uses `{{VERSION}}` template placeholder replaced during build

### Testing & Quality
- Unit and integration test coverage
- Run lint/typecheck commands if available
- Handle errors properly in try/catch blocks
- **Bug-Driven Testing**: Every bug found MUST have a corresponding test added to prevent regression

## API Pattern Guidelines

### Figma API Critical Rules
- **Style IDs**: Always clean trailing commas with `.replace(/,$/, '')`
- **Style Operations**: Search local collections, don't use direct API calls
- **Text Styles**: Clean style IDs before `setTextStyleIdAsync()`
- **Property Modification**: For object/array properties (effects, fills, strokes), ALWAYS use the clone-modify-assign pattern
  - Clone entire property array/object
  - Modify the cloned data
  - Assign entire new array/object back to property
  - Use `FigmaPropertyManager` utility in `figma-plugin/src/utils/figma-property-utils.ts`
  - Reference: https://www.figma.com/plugin-docs/editing-properties/

### Image Transform Constraints (CRITICAL)
- **Scale Mode Segregation**: Different transform systems for different scale modes
  - **CROP mode**: Uses `imageTransform` matrix (arbitrary rotation/skew allowed)
  - **FILL/FIT/TILE modes**: Uses individual `rotation`/`scalingFactor` properties only
- **90-Degree Rotation Limit**: `rotation` property limited to ±90° increments for FILL/FIT/TILE modes
- **Matrix vs Property Exclusivity**: Cannot mix `imageTransform` matrix with individual properties
- **Transform API Selection**: Always check `scaleMode` before applying transforms
- **JSON Serialization Issue**: `JSON.stringify()` returns empty objects for image paints - manually copy properties

### MCP Tool Design
- **Flat parameters only** - never nest objects in tool interfaces
- Use descriptive root-level parameter names (`styleName`, `styleDescription`)
- Follow patterns from existing tools (`manage_styles`, `manage_components`)

## Implementation Standards

### Operation Handler Pattern
Operations are automatically discovered from `figma-plugin/src/operations/` directory. Each operation file exports a handler function:

```typescript
// figma-plugin/src/operations/example-operation.ts
export async function EXAMPLE_OPERATION(payload: any): Promise<any> {
  // Implementation
  return result;
}
```

### Key Requirements
- Place operation files in `figma-plugin/src/operations/` directory
- Export functions named exactly as the operation (e.g., `MANAGE_NODES`)
- Use flat parameters, convert to objects internally if needed

### Figma Property Management
```typescript
// CORRECT: Use FigmaPropertyManager for array/object properties
import { modifyEffects } from '../utils/figma-property-utils.js';

modifyEffects(target, manager => {
  manager.push(newEffect);           // Add effect
  manager.update(index, effect);     // Update effect
  manager.remove(index);             // Delete effect
  manager.move(fromIndex, toIndex);  // Reorder effect
  manager.duplicate(from, to);       // Duplicate effect
});

// WRONG: Direct property mutation
target.effects.push(effect);        // Will not trigger Figma updates
target.effects[0] = newEffect;      // Will not work properly
```

## Documentation Rules

### Pre-Release Phase (< 1.0.0)
- **Current state only** - describe what exists now
- **No change documentation** - avoid "new", "added", "updated"
- **CHANGELOG.md exception** - only file that documents changes
- **Present tense** - describe current capabilities

### Writing Standards
- Avoid superlatives ("comprehensive", "robust", "powerful")
- Be direct without marketing language
- Focus on functionality, not test counts
- Use simple, clear language

### File Purposes
- **README.md**: Current capabilities and setup
- **docs/development.md**: Technical architecture for contributors
- **docs/examples.md**: Current usage patterns
- **CHANGELOG.md**: Commit-to-commit changes only

## Project Architecture

Figma MCP Write Server with 25 MCP tools, handler-based architecture, WebSocket communication, and YAML responses.

## Figma Plugin Development Critical Knowledge

### Context Separation (CRITICAL)
- **Main Plugin Thread**: Has access to Figma API (`figma.createImage`, etc.) but NO browser APIs
- **UI Thread (iframe)**: Has browser APIs (`window.atob`, `fetch`, etc.) but NO Figma API access
- **Communication**: Use `figma.ui.postMessage()` and message listeners for data exchange

### Binary Data Handling (CRITICAL)
- **NEVER send large byte arrays** (680K+ numbers) - causes JSON serialization hanging
- **Use Base64 strings** for efficient binary data transmission between threads
- **Convert Base64 in UI thread** using `window.atob` - main thread doesn't have this API
- **Server preprocessing**: Convert image files to Base64, not byte arrays

### Performance Patterns
- **Research API availability first**: Check if functions exist in the target context before implementing
- **Test with real data sizes**: Small test images won't reveal serialization issues
- **Use proper error boundaries**: Catch and log specific error types for debugging

### Debugging Strategy for Plugin Issues
1. **Systematic approach**: Start with Figma API documentation research
2. **Context-aware testing**: Test in the actual execution environment (main vs UI thread)
3. **Real data validation**: Use actual file sizes, not toy examples
4. **API availability checks**: Verify functions exist before calling them
5. **Thread-specific solutions**: Don't assume browser APIs work in main thread

### Common Anti-Patterns to Avoid
- Attempting to use `atob`, `btoa`, `fetch` in main plugin thread (not available)
- Sending large arrays through postMessage (causes hanging)
- Using Node.js APIs like `Buffer` in plugin context (not available)
- Implementing manual Base64 decoding when UI thread can handle it

## Critical Reminders

- **Security**: Never expose/log secrets, follow defensive practices only
- **Files**: Edit existing over creating new, no proactive documentation
- **Patterns**: Match established codebase conventions
- **Quality**: Preserve all functionality during refactoring
- **Figma Constraints**: Always consider thread context and API availability first
