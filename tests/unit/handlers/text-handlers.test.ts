import { describe, test, expect, beforeEach, vi } from 'vitest';
import { TextHandler } from '@/handlers/text-handler';
import { ManageTextSchema } from '@/types/text-operations';

describe('TextHandler', () => {
  let textHandler: TextHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    textHandler = new TextHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    test('should return figma_text tool definition', () => {
      const tools = textHandler.getTools();
      
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_text');
      expect(tools[0].description).toContain('Comprehensive text management');
      expect(tools[0].inputSchema.properties).toHaveProperty('operation');
      expect(tools[0].inputSchema.required).toContain('operation');
    });

    test('should include all required operations in enum', () => {
      const tools = textHandler.getTools();
      const operationEnum = tools[0].inputSchema.properties.operation.enum;
      
      expect(operationEnum).toContain('create');
      expect(operationEnum).toContain('update');
      expect(operationEnum).toContain('character_styling');
      expect(operationEnum).toContain('convert_to_vectors');
      expect(operationEnum).toContain('apply_text_style');
      expect(operationEnum).toContain('create_text_style');
    });

    test('should have comprehensive property definitions', () => {
      const tools = textHandler.getTools();
      const properties = tools[0].inputSchema.properties;
      
      expect(properties).toHaveProperty('characters');
      expect(properties).toHaveProperty('fontFamily');
      expect(properties).toHaveProperty('fontSize');
      expect(properties).toHaveProperty('textAlignHorizontal');
      expect(properties).toHaveProperty('characterRanges');
      expect(properties).toHaveProperty('fills');
      expect(properties).toHaveProperty('vectorConversion');
      expect(properties).toHaveProperty('textStyleId');
      expect(properties).toHaveProperty('styleName');
      expect(properties).toHaveProperty('styleDescription');
      expect(properties).toHaveProperty('hyperlink');
    });

    test('should include usage examples', () => {
      const tools = textHandler.getTools();
      
      expect(tools[0].examples).toBeDefined();
      expect(tools[0].examples.length).toBeGreaterThan(0);
      
      // Check that examples cover different operations
      const examples = tools[0].examples;
      expect(examples.some(ex => ex.includes('"operation": "create"'))).toBe(true);
      expect(examples.some(ex => ex.includes('"operation": "update"'))).toBe(true);
      expect(examples.some(ex => ex.includes('"operation": "character_styling"'))).toBe(true);
      expect(examples.some(ex => ex.includes('"operation": "convert_to_vectors"'))).toBe(true);
    });
  });

  describe('handle', () => {
    describe('create operation', () => {
      test('should handle basic text creation', async () => {
        const mockResponse = {
          success: true,
          data: {
            id: 'text_123',
            name: 'Hello World',
            type: 'TEXT',
            appliedFont: {
              requested: 'Inter Regular',
              actual: 'Inter Regular',
              substituted: false
            }
          }
        };
        mockSendToPlugin.mockResolvedValue(mockResponse);

        const args = {
          operation: 'create',
          characters: 'Hello World',
          fontFamily: 'Inter',
          fontSize: 24,
          x: 100,
          y: 100
        };

        const result = await textHandler.handle('manage_text', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_TEXT',
          payload: args
        });
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Hello World');
      });

      test('should validate required parameters for create operation', async () => {
        const args = {
          operation: 'create'
          // Missing required 'characters' field
        };

        const mockResponse = {
          success: false,
          error: 'Missing required parameter: characters'
        };
        mockSendToPlugin.mockResolvedValue(mockResponse);

        await expect(textHandler.handle('manage_text', args))
          .rejects.toThrow('Missing required parameter: characters');
      });

      test('should reject empty string characters', async () => {
        const args = {
          operation: 'create',
          characters: ''
        };

        await expect(textHandler.handle('manage_text', args))
          .rejects.toThrow('Text content cannot be empty');
      });

      test('should reject whitespace-only characters', async () => {
        const args = {
          operation: 'create',
          characters: '   \t\n  '
        };

        const mockResponse = {
          success: false,
          error: 'Text nodes must have non-empty characters content'
        };
        mockSendToPlugin.mockResolvedValue(mockResponse);

        await expect(textHandler.handle('manage_text', args))
          .rejects.toThrow('Text nodes must have non-empty characters content');
      });

      test('should handle rollback when text creation fails', async () => {
        const mockResponse = {
          success: false,
          error: 'Font loading failed'
        };
        mockSendToPlugin.mockResolvedValue(mockResponse);

        const args = {
          operation: 'create',
          characters: 'Valid text',
          fontFamily: 'NonExistentFont'
        };

        await expect(textHandler.handle('manage_text', args))
          .rejects.toThrow('Font loading failed');
      });

      test('should handle text creation with advanced typography', async () => {
        const mockResponse = {
          success: true,
          data: {
            id: 'text_456',
            name: 'Styled Text',
            type: 'TEXT'
          }
        };
        mockSendToPlugin.mockResolvedValue(mockResponse);

        const args = {
          operation: 'create',
          characters: 'Professional Typography',
          fontFamily: 'Helvetica',
          fontStyle: 'Bold',
          fontSize: 48,
          letterSpacing: { value: 2, unit: 'PIXELS' },
          lineHeight: { value: 120, unit: 'PERCENT' },
          textCase: 'UPPER',
          fills: [{
            type: 'SOLID',
            color: '#1a1a1a',
            visible: true,
            opacity: 1.0
          }]
        };

        const result = await textHandler.handle('manage_text', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_TEXT',
          payload: args
        });
        expect(result.content[0].type).toBe('text');
      });
    });

    describe('update operation', () => {
      test('should handle text content updates', async () => {
        const mockResponse = {
          success: true,
          data: {
            id: 'text_123',
            name: 'Updated Text',
            type: 'TEXT'
          }
        };
        mockSendToPlugin.mockResolvedValue(mockResponse);

        const args = {
          operation: 'update',
          nodeId: 'text_123',
          characters: 'Updated content',
          fontSize: 32
        };

        const result = await textHandler.handle('manage_text', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_TEXT',
          payload: args
        });
        expect(result.content[0].type).toBe('text');
      });

      test('should reject updating text to empty characters', async () => {
        const args = {
          operation: 'update',
          nodeId: 'text_123',
          characters: ''
        };

        await expect(textHandler.handle('manage_text', args))
          .rejects.toThrow('Text content cannot be empty');
      });

      test('should reject updating text to whitespace-only characters', async () => {
        const mockResponse = {
          success: false,
          error: 'Text nodes cannot be updated to have empty characters content'
        };
        mockSendToPlugin.mockResolvedValue(mockResponse);

        const args = {
          operation: 'update',
          nodeId: 'text_123',
          characters: '   \t\n  '
        };

        await expect(textHandler.handle('manage_text', args))
          .rejects.toThrow('Text nodes cannot be updated to have empty characters content');
      });
    });

    describe('character_styling operation', () => {
      test('should handle character-level styling', async () => {
        const mockResponse = {
          success: true,
          data: {
            id: 'text_123',
            characterRanges: [
              { range: [0, 5], appliedFont: 'Custom Font A Regular', substituted: false },
              { range: [6, 11], appliedFont: 'Inter Regular', substituted: true }
            ]
          }
        };
        mockSendToPlugin.mockResolvedValue(mockResponse);

        const args = {
          operation: 'character_styling',
          nodeId: 'text_123',
          characterRanges: [{
            start: 0,
            end: 5,
            fontSize: 36,
            fills: [{ type: 'SOLID', color: '#ff0000' }]
          }, {
            start: 6,
            end: 11,
            fontSize: 24,
            fills: [{ type: 'SOLID', color: '#0000ff' }]
          }]
        };

        const result = await textHandler.handle('manage_text', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_TEXT',
          payload: args
        });
        expect(result.content[0].type).toBe('text');
      });
    });

    describe('convert_to_vectors operation', () => {
      test('should handle text to vector conversion', async () => {
        const mockResponse = {
          success: true,
          data: {
            id: 'vector_123',
            name: 'Text (Vectors)',
            type: 'GROUP'
          }
        };
        mockSendToPlugin.mockResolvedValue(mockResponse);

        const args = {
          operation: 'convert_to_vectors',
          nodeId: 'text_123',
          vectorConversion: {
            preserveStrokes: true,
            combineShapes: false
          }
        };

        const result = await textHandler.handle('manage_text', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_TEXT',
          payload: args
        });
        expect(result.content[0].type).toBe('text');
      });
    });

    describe('apply_text_style operation', () => {
      test('should handle text style application', async () => {
        const mockResponse = {
          success: true,
          data: {
            id: 'text_123',
            textStyleId: 'heading_style_456'
          }
        };
        mockSendToPlugin.mockResolvedValue(mockResponse);

        const args = {
          operation: 'apply_text_style',
          nodeId: 'text_123',
          textStyleId: 'heading_style_456'
        };

        const result = await textHandler.handle('manage_text', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_TEXT',
          payload: args
        });
        expect(result.content[0].type).toBe('text');
      });
    });

    describe('create_text_style operation', () => {
      test('should handle text style creation', async () => {
        const mockResponse = {
          success: true,
          data: {
            styleId: 'style_789',
            styleName: 'Body Large',
            description: 'Large body text for emphasis'
          }
        };
        mockSendToPlugin.mockResolvedValue(mockResponse);

        const args = {
          operation: 'create_text_style',
          nodeId: 'text_123',
          styleName: 'Body Large',
          styleDescription: 'Large body text for emphasis'
        };

        const result = await textHandler.handle('manage_text', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_TEXT',
          payload: args
        });
        expect(result.content[0].type).toBe('text');
      });
    });

    describe('error handling', () => {
      test('should handle plugin errors gracefully', async () => {
        const mockResponse = {
          success: false,
          error: 'Node not found'
        };
        mockSendToPlugin.mockResolvedValue(mockResponse);

        const args = {
          operation: 'update',
          nodeId: 'invalid_id',
          characters: 'test'
        };

        await expect(textHandler.handle('manage_text', args))
          .rejects.toThrow('Node not found');
      });

      test('should handle schema validation errors', async () => {
        const invalidArgs = {
          operation: 'invalid_operation',
          nodeId: 'test'
        };

        await expect(textHandler.handle('manage_text', invalidArgs))
          .rejects.toThrow();
      });

      test('should handle unknown tool names', async () => {
        await expect(textHandler.handle('unknown_tool', {}))
          .rejects.toThrow('Unknown tool: unknown_tool');
      });
    });
  });

  describe('font loading integration', () => {
    test('should handle font substitution reporting', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'text_123',
          appliedFont: {
            requested: 'Custom Brand Font Bold',
            actual: 'Inter Bold',
            substituted: true,
            reason: 'Custom font not available'
          }
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const args = {
        operation: 'create',
        characters: 'Test Text',
        fontFamily: 'Custom Brand Font',
        fontStyle: 'Bold'
      };

      const result = await textHandler.handle('manage_text', args);

      expect(result.content[0].text).toContain('substituted: true');
      expect(result.content[0].text).toContain('Custom font not available');
    });

    test('should handle multiple font loading in character ranges', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'text_123',
          characterRanges: [
            { range: [0, 5], appliedFont: 'Custom Font A Regular', substituted: false },
            { range: [6, 11], appliedFont: 'Inter Regular', substituted: true }
          ]
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const args = {
        operation: 'character_styling',
        nodeId: 'text_123',
        characterRanges: [{
          start: 0,
          end: 5,
          fontFamily: 'Custom Font A',
          fontStyle: 'Regular'
        }, {
          start: 6,
          end: 11,
          fontFamily: 'Unavailable Font',
          fontStyle: 'Bold'
        }]
      };

      const result = await textHandler.handle('manage_text', args);

      expect(result.content[0].text).toContain('characterRanges');
    });
  });

  describe('performance requirements', () => {
    test('should complete text creation operations quickly', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'text_123', name: 'Test' }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const args = {
        operation: 'create',
        characters: 'Performance test text'
      };

      const startTime = Date.now();
      await textHandler.handle('manage_text', args);
      const endTime = Date.now();

      // Should complete in reasonable time (allowing for test overhead)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('integration with universal tools', () => {
    test('should indicate delegation to universal tools in responses', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'text_123',
          effects: 'Use manage_effects tool',
          strokes: 'Use manage_strokes tool'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const args = {
        operation: 'create',
        characters: 'Text with effects'
      };

      const result = await textHandler.handle('manage_text', args);

      expect(result.content[0].text).toContain('manage_effects tool');
      expect(result.content[0].text).toContain('manage_strokes tool');
    });
  });
});

describe('ManageTextSchema validation', () => {
  test('should validate basic create operation', () => {
    const validInput = {
      operation: 'create',
      characters: 'Hello World',
      fontFamily: 'Inter',
      fontSize: 24
    };

    expect(() => ManageTextSchema.parse(validInput)).not.toThrow();
  });

  test('should validate character ranges structure', () => {
    const validInput = {
      operation: 'character_styling',
      nodeId: 'text_123',
      characterRanges: [{
        start: 0,
        end: 5,
        fontSize: 36,
        fills: [{ type: 'SOLID', color: '#ff0000' }]
      }]
    };

    expect(() => ManageTextSchema.parse(validInput)).not.toThrow();
  });

  test('should validate vector conversion options', () => {
    const validInput = {
      operation: 'convert_to_vectors',
      nodeId: 'text_123',
      vectorConversion: {
        preserveStrokes: true,
        combineShapes: false
      }
    };

    expect(() => ManageTextSchema.parse(validInput)).not.toThrow();
  });

  test('should validate text style creation', () => {
    const validInput = {
      operation: 'create_text_style',
      nodeId: 'text_123',
      styleName: 'Heading Style',
      styleDescription: 'Main heading style'
    };

    expect(() => ManageTextSchema.parse(validInput)).not.toThrow();
  });

  test('should validate hyperlink configuration', () => {
    const validInput = {
      operation: 'create',
      characters: 'Click here',
      hyperlink: {
        type: 'URL',
        url: 'https://example.com'
      }
    };

    expect(() => ManageTextSchema.parse(validInput)).not.toThrow();
  });

  test('should reject invalid operation types', () => {
    const invalidInput = {
      operation: 'invalid_operation'
    };

    expect(() => ManageTextSchema.parse(invalidInput)).toThrow();
  });

  test('should reject invalid font size ranges', () => {
    const invalidInput = {
      operation: 'create',
      characters: 'Test',
      fontSize: 1500 // Over maximum of 1000
    };

    expect(() => ManageTextSchema.parse(invalidInput)).toThrow();
  });

  test('should reject empty characters at schema level', () => {
    const invalidInput = {
      operation: 'create',
      characters: ''
    };

    expect(() => ManageTextSchema.parse(invalidInput)).toThrow('Text content cannot be empty');
  });

  test('should allow valid non-empty characters', () => {
    const validInput = {
      operation: 'create',
      characters: 'Valid text content'
    };

    expect(() => ManageTextSchema.parse(validInput)).not.toThrow();
  });
});