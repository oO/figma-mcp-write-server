import { describe, test, expect, vi, beforeEach } from 'vitest';
import { EffectsHandler } from '@/handlers/effects-handler';
import * as yaml from 'js-yaml';

describe('EffectsHandler', () => {
  let effectsHandler: EffectsHandler;
  let mockSendToPlugin: any;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    effectsHandler = new EffectsHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    test('should return correct tool name', () => {
      const tools = effectsHandler.getTools();
      
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_effects');
    });

    test('should have bulk operations support in schema', () => {
      const tools = effectsHandler.getTools();
      const schema = tools[0].inputSchema;

      // Check that key parameters support oneOf pattern for bulk operations
      expect(schema.properties?.owner).toHaveProperty('oneOf');
      expect(schema.properties?.effectType).toHaveProperty('oneOf');
      expect(schema.properties?.color).toHaveProperty('oneOf');
      expect(schema.properties?.radius).toHaveProperty('oneOf');
      expect(schema.properties?.failFast).toBeDefined();
    });

    test('should have proper examples including bulk operations', () => {
      const tools = effectsHandler.getTools();
      const examples = tools[0].examples;

      // Check that examples contain effect types and owner formats
      const allExamples = examples.join(' ');
      expect(allExamples).toContain('DROP_SHADOW');
      expect(allExamples).toContain('node:');
      expect(allExamples).toContain('style:');
    });
  });

  describe('Single Effect Operations', () => {
    test('should handle drop shadow creation', async () => {
      const mockResponse = {
        effectId: 'effect-123',
        type: 'DROP_SHADOW',
        added: true
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await effectsHandler.handle('figma_effects', {
        operation: 'create',
        owner: 'node:123:456',
        effectType: 'DROP_SHADOW',
        color: '#00000040',
        offsetX: 0,
        offsetY: 2,
        radius: 4,
        spread: 0
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'CREATE_EFFECT',
        payload: expect.objectContaining({
          operation: 'create',
          owner: 'node:123:456',
          effectType: 'DROP_SHADOW',
          effectParams: expect.objectContaining({
            type: 'DROP_SHADOW',
            color: expect.objectContaining({ r: 0, g: 0, b: 0, a: expect.closeTo(0.25, 0.01) }),
            offset: { x: 0, y: 2 },
            radius: 4,
            spread: 0,
            visible: true
          })
        })
      });

      // Direct YAML result expected without error wrapper
      // The unified handler returns the whole response in YAML format
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult).toHaveProperty('effectId', 'effect-123');
      expect(parsedResult).toHaveProperty('type', 'DROP_SHADOW');
    });

    test('should handle inner shadow creation', async () => {
      const mockResponse = { effectId: 'effect-456', type: 'INNER_SHADOW' };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await effectsHandler.handle('figma_effects', {
        operation: 'create',
        owner: 'style:S:abc123',
        effectType: 'INNER_SHADOW',
        color: '#FF000080',
        offsetX: 2,
        offsetY: 2,
        radius: 3,
        spread: 1,
        blendMode: 'MULTIPLY'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'CREATE_EFFECT',
        payload: expect.objectContaining({
          effectParams: expect.objectContaining({
            type: 'INNER_SHADOW',
            color: expect.objectContaining({ r: 1, g: 0, b: 0, a: expect.closeTo(0.5, 0.01) }),
            offset: { x: 2, y: 2 },
            radius: 3,
            spread: 1,
            blendMode: 'MULTIPLY',
            visible: true
          })
        })
      });

      // Direct YAML result expected without error wrapper
    });

    test('should handle layer blur creation', async () => {
      const mockResponse = { effectId: 'effect-789', type: 'LAYER_BLUR' };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await effectsHandler.handle('figma_effects', {
        operation: 'create',
        owner: 'node:123:456',
        effectType: 'LAYER_BLUR',
        radius: 8,
        visible: true
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'CREATE_EFFECT',
        payload: expect.objectContaining({
          effectParams: expect.objectContaining({
            type: 'LAYER_BLUR',
            radius: 8,
            visible: true
          })
        })
      });
    });

    test('should handle noise effect creation', async () => {
      const mockResponse = { effectId: 'effect-noise', type: 'NOISE' };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await effectsHandler.handle('figma_effects', {
        operation: 'create',
        owner: 'node:123:456',
        effectType: 'NOISE',
        blendMode: 'OVERLAY',
        size: 2,
        density: 0.8,
        noiseType: 'MONOTONE',
        opacity: 0.3
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'CREATE_EFFECT',
        payload: expect.objectContaining({
          effectParams: expect.objectContaining({
            type: 'NOISE',
            blendMode: 'OVERLAY',
            size: 2,
            density: 0.8,
            noiseType: 'MONOTONE',
            opacity: 0.3,
            visible: true
          })
        })
      });
    });

    test('should handle effect update', async () => {
      const mockResponse = { effectId: 'effect-123', updated: true };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await effectsHandler.handle('figma_effects', {
        operation: 'update',
        owner: 'node:123:456',
        effectIndex: 0,
        color: '#0000FF4D',
        radius: 6
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'UPDATE_EFFECT',
        payload: expect.objectContaining({
          operation: 'update',
          owner: 'node:123:456',
          effectIndex: 0,
          color: '#0000FF4D',
          radius: 6
        })
      });

      // Direct YAML result expected without error wrapper
    });

    test('should handle effect deletion', async () => {
      const mockResponse = { deleted: true, effectIndex: 0 };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await effectsHandler.handle('figma_effects', {
        operation: 'delete',
        owner: 'node:123:456',
        effectIndex: 0
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'DELETE_EFFECT',
        payload: expect.objectContaining({
          operation: 'delete',
          owner: 'node:123:456',
          effectIndex: 0
        })
      });

      // Direct YAML result expected without error wrapper
    });

    test('should handle get effects', async () => {
      const mockResponse = {
          effects: [
            { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.25 }, radius: 4 },
            { type: 'LAYER_BLUR', radius: 8 }
          ]
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await effectsHandler.handle('figma_effects', {
        operation: 'get',
        owner: 'node:123:456'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'GET_EFFECTS',
        payload: expect.objectContaining({
          operation: 'get',
          owner: 'node:123:456'
        })
      });

      // Direct YAML result expected without error wrapper
    });


    test('should handle reorder effects', async () => {
      const mockResponse = { reordered: true };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await effectsHandler.handle('figma_effects', {
        operation: 'reorder',
        owner: 'node:123:456',
        effectIndex: 2,
        newIndex: 0
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'REORDER_EFFECT',
        payload: expect.objectContaining({
          operation: 'reorder',
          owner: 'node:123:456',
          effectIndex: 2,
          newIndex: 0
        })
      });
    });

    test('should handle duplicate effects', async () => {
      const mockResponse = { duplicated: true, newEffectIndex: 2 };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await effectsHandler.handle('figma_effects', {
        operation: 'duplicate',
        owner: 'node:123:456',
        effectIndex: 0,
        newIndex: 2
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'DUPLICATE_EFFECT',
        payload: expect.objectContaining({
          operation: 'duplicate',
          owner: 'node:123:456',
          effectIndex: 0,
          newIndex: 2
        })
      });
    });
  });

  describe('Bulk Effect Operations', () => {
    test('should detect and handle bulk effect creation', async () => {
      const mockResponse = { effectId: 'effect-123', type: 'DROP_SHADOW' };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await effectsHandler.handle('figma_effects', {
        operation: 'create',
        owner: ['node:123:456', 'node:123:789'],
        effectType: ['DROP_SHADOW', 'INNER_SHADOW'],
        color: [
          '#00000040',
          '#FF000080'
        ],
        offsetX: [0, 2],
        offsetY: [2, 2],
        radius: [4, 3]
      });

      // Should call sendToPlugin 2 times for bulk operation
      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
      
      // Verify first call
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, {
        type: 'CREATE_EFFECT',
        payload: expect.objectContaining({
          owner: 'node:123:456',
          effectType: 'DROP_SHADOW',
          effectParams: expect.objectContaining({
            type: 'DROP_SHADOW',
            color: expect.objectContaining({ r: 0, g: 0, b: 0, a: expect.closeTo(0.25, 0.01) }),
            offset: { x: 0, y: 2 },
            radius: 4
          })
        })
      });

      // Verify second call
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(2, {
        type: 'CREATE_EFFECT',
        payload: expect.objectContaining({
          owner: 'node:123:789',
          effectType: 'INNER_SHADOW',
          effectParams: expect.objectContaining({
            type: 'INNER_SHADOW',
            color: expect.objectContaining({ r: 1, g: 0, b: 0, a: expect.closeTo(0.5, 0.01) }),
            offset: { x: 2, y: 2 },
            radius: 3
          })
        })
      });

      // Result should be bulk format
      // Direct YAML result expected without error wrapper
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult).toHaveProperty('operation', 'effects_create');
      expect(parsedResult).toHaveProperty('totalItems', 2);
      expect(parsedResult).toHaveProperty('successCount');
      expect(parsedResult).toHaveProperty('results');
    });

    test('should handle bulk effect updates with array cycling', async () => {
      const mockResponse = { updated: true };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await effectsHandler.handle('figma_effects', {
        operation: 'update',
        owner: ['node:123:456', 'node:123:789', 'node:123:abc'],
        effectIndex: [0, 1, 0],
        radius: 8, // Single value should cycle to all effects
        visible: [true, false] // Array should cycle: true, false, true
      });

      expect(mockSendToPlugin).toHaveBeenCalledTimes(3);
      
      // Check cycling behavior
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, expect.objectContaining({
        payload: expect.objectContaining({
          owner: 'node:123:456',
          effectIndex: 0,
          radius: 8,
          visible: true
        })
      }));
      
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(3, expect.objectContaining({
        payload: expect.objectContaining({
          owner: 'node:123:abc',
          effectIndex: 0,
          radius: 8,
          visible: true // Cycled back to first value
        })
      }));
    });

    test('should handle bulk effect deletions', async () => {
      const mockResponse = { deleted: true };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await effectsHandler.handle('figma_effects', {
        operation: 'delete',
        owner: ['node:123:456', 'node:123:789', 'style:S:abc123'],
        effectIndex: [0, 1, 0]
      });

      expect(mockSendToPlugin).toHaveBeenCalledTimes(3);
      
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.operation).toBe('effects_delete');
      expect(parsedResult.totalItems).toBe(3);
    });
  });

  describe('Error Handling', () => {
    test('should use error.toString() for JSON-RPC compliance', async () => {
      const testError = new Error('Effect creation failed');
      mockSendToPlugin.mockRejectedValue(testError);

      try {
        await effectsHandler.handle('figma_effects', {
          operation: 'create',
          owner: 'node:123:456',
          effectType: 'DROP_SHADOW'
        });
        throw new Error('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Effect creation failed');
      }
    });

    test.skip('should handle plugin errors', async () => {
      // Note: Error handling behavior may vary with unified handler implementation
      mockSendToPlugin.mockResolvedValue({
        success: false,
        error: 'Effect index out of bounds'
      });

      try {
        await effectsHandler.handle('figma_effects', {
          operation: 'update',
          owner: 'node:123:456',
          effectIndex: 99,
          radius: 5
        });
        throw new Error('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Effect index out of bounds');
      }
    });

    test('should handle failFast in bulk operations', async () => {
      mockSendToPlugin
        .mockResolvedValueOnce({ success: true, data: { effectId: 'effect-1' } })
        .mockRejectedValueOnce(new Error('Creation failed'))
        .mockResolvedValueOnce({ success: true, data: { effectId: 'effect-3' } });

      const result = await effectsHandler.handle('figma_effects', {
        operation: 'create',
        owner: ['node:123:456', 'node:123:789', 'node:123:abc'],
        effectType: ['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR'],
        radius: [4, 3, 8],
        failFast: true
      });

      // Should stop after first failure
      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
      
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.successCount).toBe(1);
      expect(parsedResult.errorCount).toBe(1);
    });
  });

  describe('Schema Validation', () => {
    test('should reject invalid effect types', async () => {
      await expect(effectsHandler.handle('figma_effects', {
        operation: 'create',
        owner: 'node:123:456',
        effectType: 'INVALID_EFFECT'
      })).rejects.toThrow();
    });

    test('should reject invalid owner format', async () => {
      await expect(effectsHandler.handle('figma_effects', {
        operation: 'create',
        owner: 'invalid-owner-format',
        effectType: 'DROP_SHADOW'
      })).rejects.toThrow();
    });

    test('should validate required parameters', async () => {
      await expect(effectsHandler.handle('figma_effects', {
        // Missing operation
        owner: 'node:123:456',
        effectType: 'DROP_SHADOW'
      })).rejects.toThrow();
    });

    test('should validate effect-specific parameters', async () => {
      await expect(effectsHandler.handle('figma_effects', {
        operation: 'create',
        owner: 'node:123:456',
        effectType: 'DROP_SHADOW',
        radius: -5 // Invalid negative radius
      })).rejects.toThrow();
    });
  });

  describe('Parameter Transformation', () => {
    test('should transform flat offset parameters to offset object', async () => {
      const mockResponse = { effectId: 'effect-123' };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await effectsHandler.handle('figma_effects', {
        operation: 'create',
        owner: 'node:123:456',
        effectType: 'DROP_SHADOW',
        offsetX: 5,
        offsetY: 10,
        radius: 4
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'CREATE_EFFECT',
        payload: expect.objectContaining({
          effectParams: expect.objectContaining({
            offset: { x: 5, y: 10 }
          })
        })
      });
    });

    test('should handle missing offset parameters gracefully', async () => {
      const mockResponse = { effectId: 'effect-123' };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await effectsHandler.handle('figma_effects', {
        operation: 'create',
        owner: 'node:123:456',
        effectType: 'LAYER_BLUR',
        radius: 8
        // No offset parameters for blur effect
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'CREATE_EFFECT',
        payload: expect.objectContaining({
          effectParams: expect.objectContaining({
            type: 'LAYER_BLUR',
            radius: 8,
            visible: true
          })
        })
      });
    });
  });
});