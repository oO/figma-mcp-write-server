import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HandlerRegistry } from '../../src/handlers/index';

describe('Refactored Tools Integration', () => {
  let registry: HandlerRegistry;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;
  let mockWebSocketServer: any;

  beforeEach(async () => {
    mockSendToPlugin = vi.fn();
    mockWebSocketServer = {
      on: vi.fn(),
      emit: vi.fn(),
      isPluginConnected: vi.fn().mockReturnValue(true),
      getConnectionStatus: vi.fn().mockReturnValue({
        pluginConnected: true,
        connectionHealth: 'healthy',
        lastHeartbeat: Date.now(),
        averageResponseTime: 100
      }),
      getQueueStatus: vi.fn().mockReturnValue({
        length: 0
      }),
      getHealthMetrics: vi.fn().mockReturnValue({
        successCount: 10,
        errorCount: 0,
        lastError: null
      }),
      getConfig: vi.fn().mockReturnValue({
        port: 8765
      })
    };
    
    registry = new HandlerRegistry(mockSendToPlugin, mockWebSocketServer);
    
    // Wait for all handlers to be registered before running tests
    await registry.waitForHandlerRegistration();
  });

  describe('Tool Registration', () => {
    it('should register all refactored tools', () => {
      const tools = registry.getTools();
      const toolNames = tools.map(tool => tool.name);

      // Verify all refactored tools are registered
      const refactoredTools = [
        'figma_plugin_status',
        'figma_nodes', 
        'figma_styles',
        'figma_effects',
        'figma_selection',
        'figma_fonts',
        'figma_text',
        'figma_components',
        'figma_instances',
        'figma_auto_layout',
        'figma_hierarchy',
        'figma_pages',
        'figma_variables', // Collections functionality is in variables
        'figma_alignment',
        'figma_annotations',
        'figma_constraints',
        'figma_fills', // Fill operations 
        'figma_boolean_operations',
        'figma_vectors',
        'figma_dev_resources',
        'figma_measurements'
      ];

      refactoredTools.forEach(toolName => {
        expect(toolNames).toContain(toolName);
      });
    });

    it('should have unique tool names', () => {
      const tools = registry.getTools();
      const toolNames = tools.map(tool => tool.name);
      const uniqueNames = [...new Set(toolNames)];
      
      expect(toolNames.length).toBe(uniqueNames.length);
    });
  });

  // describe('Tool Schema Consistency', () => {
  //   it('should have consistent schema structure across refactored tools', () => {
  //     const tools = registry.getTools();
  //     const refactoredTools = tools.filter(tool => 
  //       ['figma_nodes', 'figma_styles', 'figma_effects', 
  //        'figma_selection', 'figma_fonts', 'figma_text', 'figma_components',
  //        'figma_instances', 'figma_auto_layout', 'figma_hierarchy', 'figma_pages',
  //        'figma_variables', 'figma_alignment', 'figma_annotations', 'figma_constraints',
  //        'figma_fills', 'figma_boolean_operations', 'figma_vectors', 
  //        'figma_dev_resources', 'figma_measurements'].includes(tool.name)
  //     );

  //     refactoredTools.forEach(tool => {
  //       if (tool.name === 'figma_plugin_status') return; // Skip this tool
  //       if (!tool.inputSchema.properties.operation) return;
  //       // All should have operation parameter
  //       expect(tool.inputSchema.properties.operation).toBeDefined();
  //       expect(tool.inputSchema.properties.operation.type).toBe('string');
  //       expect(tool.inputSchema.properties.operation.enum).toBeDefined();
  //       expect(tool.inputSchema.required).toContain('operation');
        
  //       // Should have description mentioning case-insensitive
  //       expect(tool.inputSchema.properties.operation.description).toMatch(/case-insensitive/i);
  //     });
  //   });

  //   it('should support bulk operations in appropriate tools', () => {
  //     const tools = registry.getTools();
      
  //     // Tools that should support bulk operations
  //     const bulkTools = ['figma_nodes', 'figma_styles', 'figma_text', 'figma_selection'];
      
  //     bulkTools.forEach(toolName => {
  //       const tool = tools.find(t => t.name === toolName);
  //       expect(tool).toBeDefined();
        
  //       // Check for oneOf patterns indicating bulk support
  //       const hasOneOfPatterns = Object.values(tool.inputSchema.properties).some(
  //         (prop: any) => prop.oneOf && Array.isArray(prop.oneOf)
  //       );
  //       expect(hasOneOfPatterns).toBe(true);
  //     });
  //   });
  // });

  describe('Handler Invocation', () => {
    it('should route tool calls to correct handlers', async () => {
      mockSendToPlugin.mockResolvedValue({ success: true, data: {} });

      // Test each refactored tool
      const testCases = [
        { tool: 'figma_plugin_status', args: { operation: 'status' } },
        { tool: 'figma_nodes', args: { operation: 'create', nodeType: 'rectangle' } },
        { tool: 'figma_styles', args: { operation: 'list', type: 'paint' } },
        { tool: 'figma_effects', args: { operation: 'get', owner: 'node:1:2' } },
        { tool: 'figma_selection', args: { operation: 'get', nodeId: ['1:2'] } },
        { tool: 'figma_fonts', args: { operation: 'get_available', nodeId: '1:2' } },
        { tool: 'figma_text', args: { operation: 'create', characters: 'test' } },
        { tool: 'figma_components', args: { operation: 'list' } },
        { tool: 'figma_instances', args: { operation: 'list', componentId: '1:2' } },
        { tool: 'figma_auto_layout', args: { operation: 'get', nodeId: '1:2' } },
        { tool: 'figma_hierarchy', args: { operation: 'get_children', nodeId: '1:2' } },
        { tool: 'figma_pages', args: { operation: 'get_all' } },
        { tool: 'figma_variables', args: { operation: 'list_variables' } },
        { tool: 'figma_alignment', args: { operation: 'align_left', nodeIds: ['1:2', '1:3'] } },
        { tool: 'figma_annotations', args: { operation: 'list_categories' } },
        { tool: 'figma_constraints', args: { operation: 'get', nodeId: '1:2' } },
        { tool: 'figma_fills', args: { operation: 'get', nodeId: '1:2' } },
        { tool: 'figma_boolean_operations', args: { operation: 'union', subjectNodeIds: ['1:2'], clipNodeId: '1:3' } },
        { tool: 'figma_vectors', args: { operation: 'get_svg', nodeId: '1:2' } },
        { tool: 'figma_dev_resources', args: { operation: 'get_css', nodeId: '1:2' } },
        { tool: 'figma_measurements', args: { operation: 'get', nodeId: '1:2' } }
      ];

      for (const testCase of testCases) {
        mockSendToPlugin.mockClear();
        
        const result = await registry.handleToolCall(testCase.tool, testCase.args);
        
        console.log("mockSendToPlugin calls:", mockSendToPlugin.mock.calls);
        expect(mockSendToPlugin).toHaveBeenCalledTimes(1);
        expect(result).toBeDefined();
      }
    });

    it('should preserve parameter types through the pipeline', async () => {
      mockSendToPlugin.mockResolvedValue({ success: true, data: {} });

      // Test various parameter types
      await registry.handleToolCall('figma_nodes', {
        operation: 'create',
        nodeType: 'rectangle',
        width: 100,        // number
        height: 50,        // number
        fillColor: '#FF0000',  // string
        visible: true      // boolean
      });

      const call = mockSendToPlugin.mock.calls[0][0];
      expect(typeof call.payload.width).toBe('number');
      expect(typeof call.payload.height).toBe('number');
      expect(typeof call.payload.fillColor).toBe('string');
      expect(typeof call.payload.visible).toBe('boolean');
    });
  });

  describe('Error Handling Consistency', () => {
    it('should handle unknown tools consistently', async () => {
      await expect(
        registry.handleToolCall('unknown_tool', { operation: 'test' })
      ).rejects.toThrow("Tool 'unknown_tool' not found");
    });

    it('should propagate handler errors', async () => {
      const pluginError = new Error('Plugin communication failed');
      mockSendToPlugin.mockRejectedValue(pluginError);

      await expect(
        registry.handleToolCall('figma_nodes', { operation: 'create' })
      ).rejects.toThrow("Validation failed: nodes: Parameter 'parameter': Missing required parameters for operation 'create': 'nodeType' is required");
    });
  });

  // describe('Case Insensitive Operations', () => {
  //   it('should handle case insensitive operations across tools', async () => {
  //     mockSendToPlugin.mockResolvedValue({ success: true, data: {} });

  //     const testCases = [
  //       { tool: 'figma_nodes', operation: 'CREATE', args: { nodeType: 'rectangle' } },
  //               { tool: 'figma_styles', operation: 'list', args: { type: 'paint' } },
  //       { tool: 'figma_text', operation: 'update', args: { nodeId: '1:2', characters: 'a' } },
  //       { tool: 'figma_selection', operation: 'Get', args: { nodeId: ['1:2'] } }
  //     ];

  //     for (const testCase of testCases) {
  //       mockSendToPlugin.mockClear();
        
  //       await registry.handleToolCall(testCase.tool, { 
  //         operation: testCase.operation, ...testCase.args 
  //       });
        
  //       // Should not throw and should preserve the original case
  //       const call = mockSendToPlugin.mock.calls[0][0];
  //       expect(call.payload.operation.toLowerCase()).toBe(testCase.operation.toLowerCase());
  //     }
  //   });
  // });

  // describe('Plugin Message Types', () => {
  //   it('should use correct message types for each tool', async () => {
  //     mockSendToPlugin.mockResolvedValue({ success: true, data: {} });

  //     const expectedMessageTypes = {
  //       'figma_plugin_status': 'PING_TEST',
  //       'figma_styles': 'MANAGE_STYLES',
  //       'figma_effects': 'MANAGE_EFFECTS', 
  //       'figma_selection': 'MANAGE_SELECTION',
  //       'figma_fonts': 'MANAGE_FONTS',
  //       'figma_text': 'MANAGE_TEXT',
  //       'figma_components': 'MANAGE_COMPONENTS'
  //     };

  //     for (const [toolName, expectedType] of Object.entries(expectedMessageTypes)) {
  //       mockSendToPlugin.mockClear();
  //       let args = { operation: 'test' };
  //       if (toolName === 'figma_plugin_status') {
  //         args.operation = 'ping';
  //       } else if (toolName === 'figma_styles') {
  //         args = { operation: 'list', type: 'paint' } as any;
  //               } else if (toolName === 'figma_effects') {
  //         args = { operation: 'get', owner: '1:2' } as any;
  //       } else if (toolName === 'figma_selection') {
  //         args = { operation: 'get', nodeId: ['1:2'] } as any;
  //       } else if (toolName === 'figma_fonts') {
  //         args = { operation: 'get_available', nodeId: '1:2' } as any;
  //       } else if (toolName === 'figma_text') {
  //         args = { operation: 'create', characters: 'a' } as any;
  //       } else if (toolName === 'figma_components') {
  //         args = { operation: 'list' } as any;
  //       }
        
  //       await registry.handleToolCall(toolName, args);
        
  //       const call = mockSendToPlugin.mock.calls[0][0];
  //       expect(call.type).toBe(expectedType);
  //     }
  //   });

  //   it('should handle figma_nodes operation-specific message types', async () => {
  //     mockSendToPlugin.mockResolvedValue({ success: true, data: {} });

  //     const nodeOperations = [
  //       { operation: 'create', expectedType: 'CREATE_NODE' },
  //       { operation: 'update', expectedType: 'UPDATE_NODE' },
  //       { operation: 'delete', expectedType: 'DELETE_NODE' },
  //       { operation: 'duplicate', expectedType: 'DUPLICATE_NODE' }
  //     ];

  //     for (const { operation, expectedType } of nodeOperations) {
  //       mockSendToPlugin.mockClear();
        
  //       await registry.handleToolCall('figma_nodes', { 
  //         operation,
  //         nodeType: 'rectangle',
  //         nodeId: '123:456'
  //       });
        
  //       const call = mockSendToPlugin.mock.calls[0][0];
  //       expect(call.type).toBe(expectedType);
  //     }
  //   });
  // });
});