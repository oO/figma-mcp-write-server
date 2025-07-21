import { expect } from 'vitest';
import * as yaml from 'js-yaml';

/**
 * Common test utilities for handler testing
 */
export class HandlerTestUtils {
  /**
   * Test basic tool schema structure
   */
  static testToolSchema(handler: any, expectedToolName: string, expectedOperations: string[]) {
    const tools = handler.getTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe(expectedToolName);
    
    const operations = tools[0].inputSchema.properties.operation.enum;
    expectedOperations.forEach(op => {
      expect(operations).toContain(op);
    });
  }

  /**
   * Test bulk operation support in schema
   */
  static testBulkOperationSupport(handler: any, parameterName: string) {
    const tools = handler.getTools();
    const schema = tools[0].inputSchema;
    
    if (schema.properties[parameterName]) {
      expect(schema.properties[parameterName].oneOf).toBeDefined();
    }
  }

  /**
   * Test basic error cases
   */
  static async testBasicErrorCases(handler: any, validToolName: string, validOperation: string) {
    // Unknown tool
    await expect(
      handler.handle('unknown_tool', { operation: validOperation })
    ).rejects.toThrow('Unknown tool: unknown_tool');

    // Missing parameters
    await expect(
      handler.handle(validToolName, {})
    ).rejects.toThrow();

    // Invalid operation
    await expect(
      handler.handle(validToolName, { operation: 'invalid_operation' })
    ).rejects.toThrow();
  }

  /**
   * Test YAML result formatting
   */
  static async testYamlResultFormatting(handler: any, toolName: string, operation: any, mockResponse: any, mockSendToPlugin: any, expectedProperty: string) {
    mockSendToPlugin.mockResolvedValue(mockResponse);

    const result = await handler.handle(toolName, operation);

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    
    // Should be valid YAML
    const parsedResult = yaml.load(result.content[0].text);
    expect(parsedResult).toHaveProperty(expectedProperty);
  }

  /**
   * Test plugin message call expectations
   */
  static testPluginMessageCall(mockSendToPlugin: any, expectedType: string, expectedPayload: any) {
    expect(mockSendToPlugin).toHaveBeenCalledWith({
      type: expectedType,
      payload: expectedPayload
    });
  }

  /**
   * Test bulk operation calls
   */
  static testBulkOperationCalls(mockSendToPlugin: any, expectedType: string, expectedCalls: any[]) {
    expect(mockSendToPlugin).toHaveBeenCalledTimes(expectedCalls.length);
    
    expectedCalls.forEach((expectedCall, index) => {
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(index + 1, {
        type: expectedType,
        payload: expectedCall
      });
    });
  }
}

/**
 * Test configuration for common handler operations
 */
export interface HandlerTestConfig {
  toolName: string;
  messageType: string;
  operations: string[];
  bulkParams?: string[];
}

/**
 * Run common handler tests
 */
export function runCommonHandlerTests(
  handlerClass: any,
  config: HandlerTestConfig,
  sampleOperations: { operation: string; params: any; expectedPayload: any }[]
) {
  describe(`${config.toolName} Common Tests`, () => {
    let handler: any;
    let mockSendToPlugin: any;

    beforeEach(() => {
      const { vi } = require('vitest');
      mockSendToPlugin = vi.fn();
      handler = new handlerClass(mockSendToPlugin);
    });

    describe('Basic Structure', () => {
      it('should have correct tool schema', () => {
        HandlerTestUtils.testToolSchema(handler, config.toolName, config.operations);
      });

      if (config.bulkParams) {
        it('should support bulk operations', () => {
          config.bulkParams!.forEach(param => {
            HandlerTestUtils.testBulkOperationSupport(handler, param);
          });
        });
      }
    });

    describe('Error Handling', () => {
      it('should handle common error cases', async () => {
        await HandlerTestUtils.testBasicErrorCases(handler, config.toolName, config.operations[0]);
      });
    });

    describe('Sample Operations', () => {
      sampleOperations.forEach(({ operation, params, expectedPayload }) => {
        it(`should handle ${operation} operation`, async () => {
          mockSendToPlugin.mockResolvedValue({
            success: true,
            data: { result: 'success' }
          });

          const result = await handler.handle(config.toolName, params);

          expect(result.isError).toBe(false);
          HandlerTestUtils.testPluginMessageCall(mockSendToPlugin, config.messageType, expectedPayload);
        });
      });
    });

    describe('Result Formatting', () => {
      it('should return YAML formatted results', async () => {
        const mockResponse = {
          success: true,
          data: { result: 'test' }
        };

        await HandlerTestUtils.testYamlResultFormatting(
          handler,
          config.toolName,
          { operation: config.operations[0] },
          mockResponse,
          mockSendToPlugin,
          'result'
        );
      });
    });
  });
}