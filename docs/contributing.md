# Contributing Guide

This guide provides step-by-step instructions for setting up your development environment, making contributions, and understanding the development workflow.

## Table of Contents

1. [🔧 Development Environment Setup](#-development-environment-setup)
2. [🛠️ Core Components](#-core-components)
3. [📋 Adding Features](#-adding-features)
4. [🔄 Development Workflow](#-development-workflow)
5. [📝 Code Standards](#-code-standards)
6. [🎯 Contribution Guidelines](#-contribution-guidelines)

---

## 🔧 Development Environment Setup

### Prerequisites
- **Node.js 18.0.0 or higher** with npm (verify with `node --version`)
- **Git** for version control
- **TypeScript knowledge** (project uses TypeScript throughout)
- **Figma Desktop** application and account
- **Understanding of MCP protocol** (helpful but not required to start)

### Platform Requirements
- **Windows (win32)** or **macOS (darwin)** operating system
- **Only Windows and macOS are supported** for export operations
- Export functionality uses platform-specific default paths:
  - Windows: `~/Documents/Figma Exports`
  - macOS: `~/Downloads/Figma Exports`

### Initial Setup
```bash
# Clone the repository
git clone git@github.com:oO/figma-mcp-write-server.git
cd figma-mcp-write-server

# Install dependencies
npm install

# Build everything
npm run build

# Start development server with watch mode
npm run dev
```

### Development Scripts
```bash
npm run build              # Build everything (TypeScript + Plugin)
npm run build:ts          # Build TypeScript only
npm run build:plugin      # Build Figma plugin only
npm run build:plugin:watch # Watch mode for plugin development
npm run dev               # Development mode with auto-restart
npm start                 # Start production server
npm test                  # Run all tests (unit + integration)
npm run test:unit         # Run unit tests only
npm run test:integration  # Run integration tests only
npm run test:coverage     # Generate test coverage report
npm run test:watch        # Watch mode for testing
npm run test:connectivity # WebSocket connection test
npm run test:manual       # Display manual test guide
npm run type-check        # TypeScript validation only
```

### Plugin Build with Custom Port
```bash
cd figma-plugin && node build.js --port=3000
cd figma-plugin && node build.js --watch --port=8765
```

## 🛠️ Core Components

### MCP Server (`src/mcp-server.ts`)
The main orchestrator implementing the Model Context Protocol:

- **Protocol Implementation**: Handles MCP tool registration and execution
- **Transport Layer**: Uses stdio transport for MCP client communication
- **WebSocket Integration**: Manages communication with Figma plugin
- **Lifecycle Management**: Coordinates startup/shutdown of all components

### CLI Entry Point (`src/index.ts`)
Command-line interface and application bootstrap:

- **Argument Parsing**: Handles --port, --help, --check-port flags
- **Port Management**: Automatic port detection and conflict resolution
- **Process Management**: Graceful shutdown and error handling
- **Help System**: Usage documentation

### WebSocket Server (`src/websocket/websocket-server.ts`)
Dedicated server for Figma plugin communication:

- **Connection Management**: Handles plugin connections on configurable port (default: 3000)
- **Message Routing**: Bidirectional communication with plugin
- **Status Monitoring**: Tracks plugin connection state
- **Error Recovery**: Automatic reconnection handling
- **Port Configuration**: Automatically uses server config port, overridable via command line

### Handler System (`src/handlers/`)
Domain-specific tool handlers with auto-discovery:

- **Auto-Discovery**: Handlers automatically register via `getTools()` interface method
- **Map-Based Routing**: Efficient Map-based request routing for tool execution
- **Connection Monitoring**: Built-in plugin status and health monitoring
- **YAML Response Format**: Consistent YAML output for structured data within MCP text format
- **Error Handling**: Error reporting with timestamps and operation context
- **Type Safety**: Full TypeScript integration with runtime validation using Zod schemas

## 📋 Adding Features

### Adding a New MCP Tool

#### Step 1: Define Schema (`src/types/`)
```typescript
export const NewOperationSchema = z.object({
  operation: z.literal("new_operation"),
  nodeId: z.string(),
  newParameter: z.string()
});

// Add to existing union schema
export const ExistingSchema = z.discriminatedUnion("operation", [
  ExistingOperationSchema,
  NewOperationSchema // Add this
]);
```

#### Step 2: Add Handler Method
```typescript
private async newOperation(params: NewOperationParams): Promise<ToolResult> {
  const response = await this.sendToPlugin({
    type: 'NEW_OPERATION',
    payload: {
      nodeId: params.nodeId,
      newParameter: params.newParameter
    }
  });

  if (!response.success) {
    throw new Error(response.error || 'Operation failed');
  }

  return {
    content: [{
      type: 'text',
      text: yaml.dump({
        operation: 'new_operation',
        nodeId: params.nodeId,
        result: response.data,
        message: 'Operation completed successfully'
      }, { indent: 2, lineWidth: 100 })
    }],
    isError: false
  };
}
```

#### Step 3: Add Plugin Handler (`figma-plugin/src/operations/`)
```typescript
export async function newOperation(payload: any): Promise<any> {
  try {
    const node = figma.getNodeById(payload.nodeId);
    if (!node) {
      return {
        success: false,
        error: `Node ${payload.nodeId} not found`
      };
    }

    // Implement the operation
    // ... operation logic here

    return {
      success: true,
      data: {
        nodeId: payload.nodeId,
        result: 'operation completed'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Operation failed: ${error.message}`
    };
  }
}
```

#### Step 4: Register Tool
Update the handler's `getTools()` method to include the new tool:
```typescript
getTools(): Tool[] {
  return [
    // existing tools...
    {
      name: 'new_tool_name',
      description: 'Description of what the tool does',
      inputSchema: NewOperationSchema
    }
  ];
}
```

#### Step 5: Add Tests
```typescript
describe('newOperation', () => {
  test('should execute operation successfully', async () => {
    const mockResponse = {
      success: true,
      data: { nodeId: 'node-123', result: 'completed' }
    };
    mockSendToPlugin.mockResolvedValue(mockResponse);

    const result = await handler.handle('new_tool_name', {
      operation: 'new_operation',
      nodeId: 'node-123',
      newParameter: 'test'
    });

    expect(result.isError).toBe(false);
    expect(mockSendToPlugin).toHaveBeenCalledWith({
      type: 'NEW_OPERATION',
      payload: { nodeId: 'node-123', newParameter: 'test' }
    });
  });
});
```

### Adding a New Handler

#### Step 1: Create Handler File (`src/handlers/new-handler.ts`)
```typescript
import { BaseHandler } from './base-handler.js';
import { Tool, ToolResult } from '../types/index.js';

export class NewHandler extends BaseHandler {
  getHandlerName(): string {
    return 'NewHandler';
  }

  getTools(): Tool[] {
    return [
      {
        name: 'new_tool',
        description: 'Tool description',
        inputSchema: NewToolSchema
      }
    ];
  }

  getOperations(): Record<string, OperationHandler> {
    return {
      'new_tool': (payload) => this.handleNewTool(payload)
    };
  }

  private async handleNewTool(payload: any): Promise<ToolResult> {
    return this.executeOperation('handleNewTool', payload, async () => {
      // Implementation here
    });
  }
}
```

#### Step 2: Register Handler (`src/handlers/index.ts`)
The handler will be automatically discovered by the handler registry due to the auto-discovery pattern.

### Adding Plugin Operations

#### Step 1: Create Operation File (`figma-plugin/src/operations/new-operation.ts`)
```typescript
export async function newOperation(payload: any): Promise<any> {
  try {
    // Implement Figma API calls
    return {
      success: true,
      data: { /* operation result */ }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

#### Step 2: Export from Router
The operation will be automatically discovered by the operation router.

## 🔄 Development Workflow

### Before Starting Work
1. **Create Feature Branch**: `git checkout -b feature/description`
2. **Pull Latest Changes**: `git pull origin main`
3. **Install Dependencies**: `npm install`
4. **Run Tests**: `npm test` to ensure everything works

### During Development
1. **Start Development Server**: `npm run dev`
2. **Load Figma Plugin**: Import manifest.json in Figma Desktop
3. **Make Changes**: Edit TypeScript files
4. **Test Changes**: Use `npm test` and manual testing
5. **Check Types**: Use `npm run type-check`

### Testing Your Changes
```bash
npm test                    # All tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:coverage      # Coverage report
npm run test:connectivity  # WebSocket connection test
```

### Manual Testing Checklist
1. **Setup**: Start `npm run dev` and load Figma plugin
2. **Tool Discovery**: Verify tool appears in MCP client
3. **Valid Input**: Test with correct parameters
4. **Invalid Input**: Test parameter validation
5. **Error Cases**: Test with non-existent node IDs
6. **Response Format**: Verify YAML structure

### Before Submitting PR
1. **Run Full Test Suite**: `npm test`
2. **Check Code Style**: `npm run type-check`
3. **Update Documentation**: Add examples if needed
4. **Test Integration**: Verify with actual MCP client
5. **Commit Changes**: Follow commit message format

## 📝 Code Standards

### TypeScript Guidelines
- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use Zod schemas for runtime validation
- Avoid `any` type - use proper typing

### Error Handling
- All handlers throw exceptions (no error response objects)
- Use structured error responses with timestamps
- Include actionable error messages
- Validate inputs before processing

### Testing Standards
- Unit tests for all new handlers and operations
- Integration tests for end-to-end workflows
- Mock external dependencies appropriately
- Test both success and failure scenarios

### Documentation
- Update docs/examples.md with new tool usage
- Add inline comments for complex logic
- Keep README.md tool listings current
- Document breaking changes

### Figma Plugin Constraints
- Use ES2015 compatible syntax (no spread operator)
- Load fonts before text operations
- Handle node type checking properly
- Use proper color format conversions

## 🎯 Contribution Guidelines

### Types of Contributions

**Bug Fixes**
- Fix existing functionality that doesn't work as expected
- Add tests to prevent regression
- Include reproduction steps in PR description

**New Features**
- Add new MCP tools or operations
- Extend existing tool capabilities
- Improve developer experience

**Documentation Improvements**
- Update usage examples
- Clarify setup instructions
- Add troubleshooting guides

**Performance Improvements**
- Optimize WebSocket communication
- Improve handler efficiency
- Reduce memory usage

### Pull Request Process

1. **Fork Repository**: Create your own fork
2. **Create Branch**: Use descriptive branch names
3. **Make Changes**: Follow code standards
4. **Add Tests**: Ensure adequate test coverage
5. **Update Docs**: Update relevant documentation
6. **Submit PR**: Include detailed description

### Code Review Guidelines

**For Contributors**
- Respond to feedback promptly
- Address all review comments
- Keep PRs focused and manageable
- Update PR description if scope changes

**For Reviewers**
- Review for functionality, security, and style
- Test changes locally when possible
- Provide constructive feedback
- Approve when all criteria are met

### Commit Message Format
```
type: brief description (vX.X.X)

- Bullet point describing change 1
- Bullet point describing change 2

Designed with ❤️ by oO. Coded with ✨ by Claude Sonnet 4
Co-authored-by: Claude.AI <noreply@anthropic.com>
```

**Types**: `feat:` `fix:` `docs:` `refactor:` `test:` `chore:`

### Getting Help

**Questions About Development**
- Check existing documentation first
- Review similar implementations in codebase
- Ask in GitHub Discussions or Issues

**Bug Reports**
- Include reproduction steps
- Provide environment details
- Add relevant error messages

**Feature Requests**
- Describe the use case clearly
- Explain why it would be valuable
- Consider implementation complexity

Thank you for contributing to the Figma MCP Write Server! Your contributions help make this tool better for everyone.