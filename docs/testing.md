# Testing Guide

This document covers the comprehensive testing strategy for the Figma MCP Write Server, including unit tests, integration tests, manual testing procedures, and debugging techniques.

## Table of Contents

1. [🧪 Testing Overview](#-testing-overview)
2. [🔧 Test Setup](#-test-setup)
3. [📋 Unit Testing](#-unit-testing)
4. [🔄 Integration Testing](#-integration-testing)
5. [🎯 Manual Testing](#-manual-testing)
6. [📊 Test Coverage](#-test-coverage)
7. [🐛 Debugging](#-debugging)
8. [🚀 Performance Testing](#-performance-testing)

---

## 🧪 Testing Overview

### Test Suite Structure (119 Tests)

**Unit Tests (103 tests)**:
- Handler functionality for all tool types
- Parameter validation with Zod schemas
- Error handling and exception patterns
- WebSocket communication logic
- Tool registration and routing

**Integration Tests (16 tests)**:
- MCP server and handler registry integration
- Multi-tool workflows and sequential operations
- Plugin status and health monitoring
- End-to-end tool execution flows

### Testing Philosophy

- **Test-Driven Development**: Write tests before implementing features
- **Bug-Driven Testing**: Every bug gets a test to prevent regression
- **Comprehensive Coverage**: Both success and failure scenarios
- **Real-World Scenarios**: Integration tests with actual workflows
- **Performance Validation**: Ensure operations complete within acceptable timeframes

## 🔧 Test Setup

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit          # Unit tests only (103 tests)
npm run test:integration   # Integration tests only (16 tests)

# Development and debugging
npm run test:watch         # Watch mode for development
npm run test:coverage      # Generate coverage report
npm run test:connectivity  # WebSocket connection test
npm run test:manual        # Display manual test guide

# TypeScript validation
npm run type-check         # TypeScript validation only
```

### Test Configuration

**Unit Tests**: `jest.config.js`
```javascript
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
    }
  ]
};
```

**Integration Tests**: `jest.integration.config.js`
```javascript
module.exports = {
  projects: [
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testEnvironment: 'node',
      testTimeout: 30000
    }
  ]
};
```

### Mock Setup (`tests/setup.ts`)

```typescript
// Global test setup
import { jest } from '@jest/globals';

// Mock WebSocket for unit tests
global.WebSocket = jest.fn();

// Mock Figma API for plugin tests
global.figma = {
  getNodeById: jest.fn(),
  createRectangle: jest.fn(),
  // ... other Figma API mocks
};
```

## 📋 Unit Testing

### Handler Testing Pattern

```typescript
describe('NodeHandler', () => {
  let nodeHandler: NodeHandler;
  let mockSendToPlugin: jest.MockedFunction<any>;

  beforeEach(() => {
    mockSendToPlugin = jest.fn();
    nodeHandler = new NodeHandler(mockSendToPlugin);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNode', () => {
    test('should create rectangle successfully', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        data: { nodeId: 'node-123', nodeType: 'rectangle' }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      // Act
      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'create',
        nodeType: 'rectangle',
        width: 100,
        height: 100
      });

      // Assert
      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'CREATE_NODE',
        payload: {
          nodeType: 'rectangle',
          width: 100,
          height: 100
        }
      });
    });

    test('should handle creation errors', async () => {
      // Arrange
      mockSendToPlugin.mockResolvedValue({
        success: false,
        error: 'Invalid parameters'
      });

      // Act & Assert
      await expect(nodeHandler.handle('figma_nodes', {
        operation: 'create',
        nodeType: 'rectangle'
      })).rejects.toThrow('Invalid parameters');
    });
  });
});
```

### Parameter Validation Testing

```typescript
describe('Schema Validation', () => {
  test('should validate required parameters', () => {
    expect(() => {
      CreateNodeSchema.parse({
        nodeType: 'rectangle'
        // missing width and height
      });
    }).toThrow();
  });

  test('should accept valid parameters', () => {
    const validParams = {
      nodeType: 'rectangle',
      width: 100,
      height: 100,
      x: 0,
      y: 0
    };

    expect(() => {
      CreateNodeSchema.parse(validParams);
    }).not.toThrow();
  });

  test('should validate parameter types', () => {
    expect(() => {
      CreateNodeSchema.parse({
        nodeType: 'rectangle',
        width: 'invalid', // should be number
        height: 100
      });
    }).toThrow();
  });
});
```

### WebSocket Communication Testing

```typescript
describe('WebSocket Server', () => {
  let wsServer: FigmaWebSocketServer;
  let mockWebSocket: jest.Mocked<WebSocket>;

  beforeEach(() => {
    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.OPEN
    } as any;
    
    wsServer = new FigmaWebSocketServer({ port: 8765 });
  });

  test('should handle plugin connection', async () => {
    // Simulate plugin connection
    wsServer.handleConnection(mockWebSocket);
    
    expect(wsServer.isPluginConnected()).toBe(true);
  });

  test('should queue messages when plugin disconnected', async () => {
    const message = { type: 'TEST', payload: {} };
    
    // Plugin not connected
    await wsServer.sendMessage(message);
    
    // Message should be queued
    expect(wsServer.getQueuedMessageCount()).toBe(1);
  });
});
```

### Error Handling Testing

```typescript
describe('Error Handling', () => {
  test('should format error responses consistently', async () => {
    const error = new Error('Test error');
    const result = createErrorResponse(error);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('error: "Test error"');
    expect(result.content[0].text).toContain('timestamp:');
  });

  test('should handle validation errors', async () => {
    const handler = new NodeHandler(mockSendToPlugin);
    
    await expect(handler.handle('figma_nodes', {
      operation: 'create',
      nodeType: 'invalid' // invalid node type
    })).rejects.toThrow('Validation failed');
  });
});
```

## 🔄 Integration Testing

### End-to-End Workflow Testing

```typescript
describe('MCP Server Integration', () => {
  let mcpServer: FigmaMCPServer;
  let mockPlugin: MockFigmaPlugin;

  beforeEach(async () => {
    mockPlugin = new MockFigmaPlugin();
    mcpServer = new FigmaMCPServer({ port: 8765 });
    await mcpServer.start();
    await mockPlugin.connect();
  });

  afterEach(async () => {
    await mockPlugin.disconnect();
    await mcpServer.stop();
  });

  test('should complete create-select-modify workflow', async () => {
    // Create a rectangle
    const createResult = await mcpServer.callTool('figma_nodes', {
      operation: 'create',
      nodeType: 'rectangle',
      width: 100,
      height: 100
    });

    expect(createResult.isError).toBe(false);
    const nodeId = extractNodeId(createResult);

    // Select the rectangle
    const selectResult = await mcpServer.callTool('figma_selection', {
      operation: 'set_nodes',
      nodeIds: [nodeId]
    });

    expect(selectResult.isError).toBe(false);

    // Modify the rectangle
    const modifyResult = await mcpServer.callTool('figma_nodes', {
      operation: 'update',
      nodeId: nodeId,
      width: 200
    });

    expect(modifyResult.isError).toBe(false);
  });
});
```

### Multi-Tool Integration Testing

```typescript
describe('Multi-Tool Workflows', () => {
  test('should create design system components', async () => {
    // Create color style
    const colorStyle = await mcpServer.callTool('figma_styles', {
      operation: 'create',
      styleType: 'color',
      name: 'Primary Blue',
      color: '#007AFF'
    });

    // Create component with style
    const component = await mcpServer.callTool('figma_components', {
      operation: 'create',
      name: 'Button',
      width: 100,
      height: 40
    });

    // Apply style to component
    const styled = await mcpServer.callTool('figma_nodes', {
      operation: 'update',
      nodeId: extractNodeId(component),
      fillStyleId: extractStyleId(colorStyle)
    });

    expect(styled.isError).toBe(false);
  });
});
```

### Plugin Status and Health Testing

```typescript
describe('Plugin Health Monitoring', () => {
  test('should report plugin status correctly', async () => {
    const status = await mcpServer.callTool('figma_plugin_status', {
      operation: 'status'
    });

    expect(status.isError).toBe(false);
    expect(status.content[0].text).toContain('connectionStatus: connected');
  });

  test('should handle plugin disconnection', async () => {
    await mockPlugin.disconnect();
    
    // Wait for health check to detect disconnection
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const status = await mcpServer.callTool('figma_plugin_status', {
      operation: 'status'
    });

    expect(status.content[0].text).toContain('connectionStatus: disconnected');
  });
});
```

## 🎯 Manual Testing

### Setup for Manual Testing

1. **Start Development Server**
```bash
npm run dev
```

2. **Load Figma Plugin**
- Open Figma Desktop
- Go to **Plugins** → **Development** → **Import plugin from manifest**
- Select `figma-plugin/manifest.json`
- Run the plugin

3. **Connect MCP Client**
- Configure Claude Desktop with server path
- Verify connection in Claude interface

### Manual Test Checklist

#### Basic Operations
- [ ] Create rectangle, ellipse, frame, text
- [ ] Update node properties (size, position, color)
- [ ] Delete and duplicate nodes
- [ ] Move nodes to different positions

#### Selection and Navigation
- [ ] Set current selection
- [ ] Get current selection
- [ ] Navigate page hierarchy
- [ ] Select multiple nodes

#### Style System
- [ ] Create color, text, and effect styles
- [ ] Apply styles to nodes
- [ ] Update style definitions
- [ ] Remove styles

#### Layout and Positioning
- [ ] Configure auto layout
- [ ] Set layout constraints
- [ ] Align multiple objects
- [ ] Group and ungroup elements

#### Advanced Features
- [ ] Boolean operations (union, subtract, etc.)
- [ ] Vector path manipulation
- [ ] Component creation and instancing
- [ ] Variable binding

#### Error Scenarios
- [ ] Invalid node IDs
- [ ] Malformed parameters
- [ ] Plugin disconnection
- [ ] Network interruption

### Performance Testing Scenarios

#### Load Testing
```bash
# Test with multiple rapid requests
for i in {1..50}; do
  # Use MCP client to send rapid requests
  curl -X POST localhost:3000/tools/figma_nodes \
    -d '{"operation":"create","nodeType":"rectangle"}'
done
```

#### Large Operation Testing
- Create 100+ nodes in sequence
- Perform bulk selection operations
- Test with complex vector paths
- Measure response times

#### Memory Usage Testing
- Monitor memory usage during long sessions
- Test for memory leaks
- Verify garbage collection

## 📊 Test Coverage

### Coverage Requirements

- **Minimum Coverage**: 80% overall
- **Handler Coverage**: 90% line coverage
- **Critical Paths**: 100% coverage for error handling
- **Integration Paths**: 95% coverage for end-to-end workflows

### Generating Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

### Coverage Analysis

```typescript
// Coverage reporting configuration
module.exports = {
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**', // Type-only files
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/handlers/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};
```

## 🐛 Debugging

### Debug Configuration

```bash
# Enable debug logging
DEBUG=figma-mcp:* npm run dev

# Debug specific modules
DEBUG=figma-mcp:websocket npm run dev
DEBUG=figma-mcp:handlers npm run dev
```

### Common Debugging Scenarios

#### WebSocket Connection Issues
```typescript
// Debug WebSocket messages
const wsServer = new FigmaWebSocketServer({
  port: 8765,
  debug: true // Enable debug logging
});

wsServer.on('message', (message) => {
  console.log('Received:', message);
});

wsServer.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

#### Handler Execution Debugging
```typescript
// Add debug logging to handlers
export class NodeHandler extends BaseHandler {
  async handle(toolName: string, args: any): Promise<ToolResult> {
    console.log(`[${this.getHandlerName()}] Handling ${toolName}:`, args);
    
    try {
      const result = await super.handle(toolName, args);
      console.log(`[${this.getHandlerName()}] Success:`, result);
      return result;
    } catch (error) {
      console.error(`[${this.getHandlerName()}] Error:`, error);
      throw error;
    }
  }
}
```

#### Plugin Communication Debugging
```typescript
// Debug plugin messages in Figma plugin
function debugLog(message: string, data?: any) {
  console.log(`[Plugin] ${message}`, data);
  // Also send to server for logging
  sendToServer({ type: 'DEBUG_LOG', message, data });
}
```

### Debugging Tools

#### VS Code Debug Configuration (`.vscode/launch.json`)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug MCP Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/index.js",
      "env": {
        "DEBUG": "figma-mcp:*"
      },
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal"
    }
  ]
}
```

## 🚀 Performance Testing

### Benchmarking Tools

```bash
# WebSocket connection benchmark
npm run test:connectivity

# Load testing with custom script
node tools/load-test.js

# Memory profiling
node --inspect dist/index.js
```

### Performance Metrics

#### Response Time Targets
- **Simple Operations**: < 100ms (create, update, delete)
- **Complex Operations**: < 500ms (boolean operations, vector paths)
- **Bulk Operations**: < 1000ms (multiple node operations)
- **Style Operations**: < 200ms (create, apply, update styles)

#### Memory Usage Targets
- **Base Memory**: < 50MB idle
- **Per Operation**: < 5MB additional per active operation
- **Maximum Memory**: < 200MB under heavy load
- **Memory Leaks**: 0% growth over 1000 operations

### Performance Test Examples

```typescript
describe('Performance Tests', () => {
  test('should create 100 nodes within 5 seconds', async () => {
    const startTime = Date.now();
    
    const promises = Array(100).fill(0).map((_, i) => 
      mcpServer.callTool('figma_nodes', {
        operation: 'create',
        nodeType: 'rectangle',
        x: i * 10,
        y: i * 10
      })
    );
    
    await Promise.all(promises);
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000);
  });

  test('should handle concurrent requests', async () => {
    const concurrentRequests = 20;
    const promises = Array(concurrentRequests).fill(0).map(() =>
      mcpServer.callTool('figma_plugin_status', { operation: 'status' })
    );
    
    const results = await Promise.all(promises);
    
    // All requests should succeed
    results.forEach(result => {
      expect(result.isError).toBe(false);
    });
  });
});
```

### Monitoring and Alerts

```typescript
// Performance monitoring
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  
  recordOperation(operation: string, duration: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);
    
    // Alert on slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${operation} took ${duration}ms`);
    }
  }
  
  getAverageTime(operation: string): number {
    const times = this.metrics.get(operation) || [];
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }
}
```

This testing guide provides comprehensive coverage of all testing aspects for the Figma MCP Write Server, ensuring reliable, performant, and maintainable code.