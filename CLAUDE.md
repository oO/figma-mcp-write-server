# Claude Code Project Context

## Commit Message Format

```
type: brief description (vX.X.X)

- Bullet point describing change 1
- Bullet point describing change 2

Designed with ❤️ by oO. Coded with ✨ by Claude Sonnet 4
Co-authored-by: Claude.AI <noreply@anthropic.com>
```

**Types**: `feat:` `fix:` `docs:` `refactor:` `test:` `chore:`

## Core Development Principles

### Error Handling
- All handlers throw exceptions (no error response objects)
- Use `{type: 'OPERATION', payload: parameters}` pattern
- YAML responses for all tool outputs
- **JSON-RPC**: Always use `error.toString()` never `error.message`

### Code Standards
- Follow existing patterns before creating new ones
- Always validate the existence and proper syntax of Figma API calls
- Use descriptive names without hardcoded numbers in docs
- Add tests for new features, run `npm test` before commits
- Examine existing implementations first for consistency

### Testing & Quality
- Unit and integration test coverage
- Run lint/typecheck commands if available
- Handle errors properly in try/catch blocks

## API Pattern Guidelines

### Figma API Critical Rules
- **Style IDs**: Always clean trailing commas with `.replace(/,$/, '')`
- **Style Operations**: Search local collections, don't use direct API calls
- **Text Styles**: Clean style IDs before `setTextStyleIdAsync()`

### MCP Tool Design
- **Flat parameters only** - never nest objects in tool interfaces
- Use descriptive root-level parameter names (`styleName`, `styleDescription`)
- Follow patterns from existing tools (`manage_styles`, `manage_components`)

## Implementation Standards

### Handler Pattern
```typescript
export class NewHandler extends BaseHandler {
  getHandlerName(): string { return 'NewHandler'; }
  getOperations(): Record<string, OperationHandler> {
    return { 'OPERATION_NAME': (payload) => this.methodName(payload) };
  }
  private async methodName(payload: any): Promise<OperationResult> {
    return this.executeOperation('methodName', payload, async () => {
      // Implementation
    });
  }
}
```

### Key Requirements
- Extend `BaseHandler` with `getOperations()` method
- Use flat parameters, convert to objects internally if needed
- Don't use `async handle(type, payload)` patterns

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
- **DEVELOPMENT.md**: Technical architecture for contributors
- **EXAMPLES.md**: Current usage patterns
- **CHANGELOG.md**: Commit-to-commit changes only

## Project Architecture

Figma MCP Write Server with 24 MCP tools, handler-based architecture, WebSocket communication, and YAML responses.

## Critical Reminders

- **Security**: Never expose/log secrets, follow defensive practices only
- **Files**: Edit existing over creating new, no proactive documentation
- **Patterns**: Match established codebase conventions
- **Quality**: Preserve all functionality during refactoring
