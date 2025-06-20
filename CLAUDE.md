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

### Implementation Pattern Guidelines
**CRITICAL**: Before implementing any new feature, always examine existing implementations first to match established patterns.

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

### Documentation Guidelines

**IMPORTANT**: During the pre-release phase, documentation should be factual and concise about the current state of the tool, not changes or future plans.

#### Writing Style
- **Avoid superlatives**: Do not use words like "comprehensive", "complete", "robust", "extensive", "advanced", "cutting-edge", "powerful", "seamless", etc.
- **No test counting**: Do not mention specific test numbers in documentation as they change frequently and add no value to users
- **Be direct**: Use simple, clear language without marketing fluff
- **Focus on functionality**: Describe what tools do, not how amazing they are

#### Documentation Files
- **README.md**: Main project documentation - should reflect current capabilities and setup instructions
- **DEVELOPMENT.md**: Technical documentation for contributors - architecture, development workflow, testing
- **EXAMPLES.md**: Usage examples and workflows - should demonstrate actual current functionality
- **CHANGELOG.md**: Exception to the rule - tracks changes from one commit to the next, documents incremental changes within sessions

#### Documentation Principles
- Stay factual and concise about current state
- Avoid hardcoded numbers that require frequent maintenance updates
- Focus on "what it does now" not "what it will do"
- Only CHANGELOG.md should document changes and progression
- Use clear, direct language without superlatives

## Project Architecture

This is a Figma MCP Write Server with:
- 24 MCP tools organized by domain
- Handler-based architecture with auto-discovery
- WebSocket communication with Figma plugin
- Test coverage with unit and integration tests
- YAML response format for structured data
