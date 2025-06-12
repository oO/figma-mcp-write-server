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

### Code Style
- No hardcoded numbers in documentation that require frequent updates
- Use descriptive variable and function names
- Follow existing patterns for consistency

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
- 23 MCP tools organized by domain
- Handler-based architecture with auto-discovery
- WebSocket communication with Figma plugin
- Test coverage with unit and integration tests
- YAML response format for structured data
