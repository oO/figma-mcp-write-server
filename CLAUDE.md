# Claude Code Project Context

## Commit Message Format

This project uses a specific commit message format. Always follow this pattern:

```
type: brief description (vX.X.X)

- Bullet point describing change 1
- Bullet point describing change 2
- Bullet point describing change 3
[...more bullet points as needed]

Designed with ❤️ by oO. Coded with ✨ by Claude Sonnet 4
Co-authored-by: Claude.AI <noreply@anthropic.com>
```

### Commit Types
- `feat:` - New features or major functionality additions
- `fix:` - Bug fixes and issue resolutions
- `docs:` - Documentation updates
- `refactor:` - Code refactoring without functionality changes
- `test:` - Test additions or modifications
- `chore:` - Build process, dependency updates, etc.

### Examples
```
feat: Variables & Design Tokens for design system consistency (v0.21.0)

- Add manage_collections tool for variable collection management with multi-mode support
- Add manage_variables tool for variable operations and property binding to nodes/styles
- Implement variable binding system with support for COLOR, FLOAT, STRING, BOOLEAN types

Designed with ❤️ by oO. Coded with ✨ by Claude Sonnet 4
Co-authored-by: Claude.AI <noreply@anthropic.com>
```

## Development Guidelines

### Error Handling (v0.22.0)
- All handlers throw exceptions for errors (no error response objects)
- Use standardized payload wrapper pattern: `{type: 'OPERATION', payload: parameters}`
- YAML responses for all tool outputs

### Testing
- Test suite with unit and integration tests
- Always add tests when adding new features
- Run `npm test` before committing

### JSON-RPC Error Handling
- NEVER use `error.message` in JSON-RPC contexts as it can create protocol issues
- ALWAYS use `error.toString()` instead for error logging and responses
- This applies to all plugin communication and MCP responses

### Code Style
- No hardcoded numbers in documentation that require frequent updates
- Use descriptive variable and function names
- Follow existing patterns for consistency

### Figma API Patterns
**CRITICAL**: Always follow the correct Figma API patterns and handle known API quirks:

**Style ID Trailing Comma Issue:**
```typescript
// ✅ CRITICAL FIX: Figma's getLocalTextStyles() and similar methods return style IDs with trailing commas
// Always clean style IDs before using them for lookups or operations
const cleanStyleId = styleId.replace(/,$/, '');

// Apply this fix in:
// - Style deletion: allStyles.find(s => s.id.replace(/,$/, '') === params.styleId)
// - Text style application: await text.setTextStyleIdAsync(cleanStyleId)
// - Style retrieval: style = allStyles.find(s => s.id.replace(/,$/, '') === params.styleId)
```

**Style Deletion Pattern:**
```typescript
// ✅ CORRECT: Find style from local collections, then remove
const paintStyles = figma.getLocalPaintStyles();
const textStyles = figma.getLocalTextStyles();
const allStyles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles];
const style = allStyles.find(s => s.id.replace(/,$/, '') === params.styleId);
style.remove();

// ❌ INCORRECT: figma.getStyleByIdAsync() doesn't exist in Plugin API
// ❌ INCORRECT: Cannot delete styles directly by ID
```

**Text Style Application Pattern:**
```typescript
// ✅ CORRECT: Clean style ID before application
const cleanStyleId = params.textStyleId.replace(/,$/, '');
await text.setTextStyleIdAsync(cleanStyleId);

// ❌ INCORRECT: Using style ID with trailing comma will fail silently
// await text.setTextStyleIdAsync(params.textStyleId); // Will clear textStyleId to empty string
```

**Key Principles:**
- **ALWAYS** remove trailing commas from style IDs before any operations
- Style operations require searching through local style collections, not direct API calls
- Text style application must use cleaned style IDs to work properly
- Handle style not found errors properly in try/catch blocks

### Implementation Pattern Guidelines
**CRITICAL**: Before implementing any new feature, always examine existing implementations first to match established patterns.

#### MCP Tool Parameter Design Pattern
**ALWAYS use flat parameter structures** - never nest objects for tool parameters:

**✅ CORRECT (Flat):**
```json
{
  "operation": "create_text_style",
  "nodeId": "123:456",
  "styleName": "Heading Large", 
  "styleDescription": "Main heading style"
}
```

**❌ INCORRECT (Nested):**
```json
{
  "operation": "create_text_style",
  "nodeId": "123:456",
  "createTextStyle": {
    "name": "Heading Large",
    "description": "Main heading style"
  }
}
```

**Design Principles:**
- All tool parameters must be at the root level of the parameter object
- Use descriptive flat parameter names (e.g., `styleName`, `styleDescription`)
- Never create nested configuration objects in tool interfaces
- This ensures consistency across all MCP tools and simplifies parameter handling
- Follow the pattern established by `manage_styles`, `manage_components`, and all existing tools

#### Handler Implementation Pattern
When adding new handlers to the Figma plugin:
1. **First**: Read existing handlers (e.g., `style-handler.ts`, `node-handler.ts`) to understand the pattern
2. **Follow this exact structure**:
```typescript
export class NewHandler extends BaseHandler {
  getHandlerName(): string {
    return 'NewHandler';
  }

  getOperations(): Record<string, OperationHandler> {
    return {
      'OPERATION_NAME': (payload) => this.methodName(payload)
    };
  }

  private async methodName(payload: any): Promise<OperationResult> {
    return this.executeOperation('methodName', payload, async () => {
      // Implementation here
    });
  }
}
```
3. **Do NOT use**: `async handle(type: string, payload: any)` patterns
4. **Always match**: The exact interface contracts used by existing handlers
5. **Always use flat parameters**: Convert flat parameters to internal objects if needed for helper functions

### Documentation Guidelines

**CRITICAL PRE-RELEASE RULE**: During pre-release phase (major version < 1.0.0), ALL documentation must reflect the current state only. Do NOT document changes, history, or what was added/removed - that's only for CHANGELOG.md.

#### Pre-Release Documentation Rules
- **Current State Only**: All documentation (README, DEVELOPMENT, EXAMPLES) describes what the tool does NOW
- **No Change Documentation**: Never mention "new", "added", "updated", "removed", "replaced" in documentation files
- **No Version History**: Don't reference previous versions or what changed between versions
- **No Migration Notes**: Don't include upgrade instructions or breaking change notices
- **Exception**: CHANGELOG.md is the ONLY file that documents changes commit-to-commit

#### Writing Style
- **Avoid superlatives**: Do not use words like "comprehensive", "complete", "robust", "extensive", "advanced", "cutting-edge", "powerful", "seamless", etc.
- **No test counting**: Do not mention specific test numbers in documentation as they change frequently and add no value to users
- **Be direct**: Use simple, clear language without marketing fluff
- **Focus on functionality**: Describe what tools do, not how amazing they are
- **Present tense only**: Use present tense to describe current capabilities

#### Documentation Files (Pre-Release < 1.0.0)
- **README.md**: Current project state - capabilities and setup instructions as they exist now
- **DEVELOPMENT.md**: Current technical architecture - how the system works now for contributors
- **EXAMPLES.md**: Current usage patterns - how to use the tools that exist now
- **CHANGELOG.md**: ONLY exception - tracks changes from one commit to the next

#### Documentation Principles
- Stay factual and concise about current state
- Avoid hardcoded numbers that require frequent maintenance updates
- Focus on "what it does now" not "what it will do" or "what it used to do"
- ONLY CHANGELOG.md documents changes and progression
- Use clear, direct language without superlatives
- Write as if this is the first version anyone has ever seen

#### Documentation Scope for Commits
**CRITICAL**: Documentation should only cover changes since the last commit, not intermediate development steps.

**Process for documenting changes:**
1. **Check actual changes**: Use `git status --porcelain` and `git diff --name-status HEAD` to see what files were modified, added, or deleted since the last commit
2. **Document only commit-level changes**: Do not document intermediate development steps or work-in-progress changes
3. **Use git diff to understand scope**: Review actual code changes to understand what functionality was added, removed, or modified
4. **Examples of what to document**:
   - New tools added (complete functionality, not development iterations)
   - Tools removed or deprecated
   - Breaking changes to existing tool interfaces
   - New major features or architectural changes
5. **Examples of what NOT to document**:
   - Intermediate refactoring steps during development
   - Temporary fixes that were later replaced
   - Development debugging or testing iterations
   - Changes that were made and then reverted in the same session

**For this project**: Compare the current state against the last git commit to determine what actually changed, then document only those changes in CHANGELOG.md.

## Project Architecture

This is a Figma MCP Write Server with:
- 24 MCP tools organized by domain
- Handler-based architecture with auto-discovery
- WebSocket communication with Figma plugin
- Test coverage with unit and integration tests
- YAML response format for structured data
