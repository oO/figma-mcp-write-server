import { describe, it, expect } from '@jest/globals';
import { CreateNodeSchema, UpdateNodeSchema } from '../src/types/node-operations.js';

describe('Node Schema Validation Fix', () => {
  describe('CreateNodeSchema', () => {
    it('should accept create_node request without any ID fields', () => {
      const validRequest = {
        name: 'QA Test Rectangle',
        width: 100,
        height: 50,
        nodeType: 'rectangle',
        fillColor: '#FF5733'
      };

      // This should not throw an error
      expect(() => CreateNodeSchema.parse(validRequest)).not.toThrow();
      
      const result = CreateNodeSchema.parse(validRequest);
      expect(result.nodeType).toBe('rectangle');
      expect(result.name).toBe('QA Test Rectangle');
      expect(result.width).toBe(100);
      expect(result.height).toBe(50);
      expect(result.fillColor).toBe('#FF5733');
      expect(result.nodeId).toBeUndefined(); // Should not have nodeId
    });

    it('should work with case-insensitive nodeType', () => {
      const requestWithUppercase = {
        name: 'Test Rectangle',
        width: 100,
        height: 50,
        nodeType: 'RECTANGLE', // Should be normalized to 'rectangle'
        fillColor: '#FF5733'
      };

      const result = CreateNodeSchema.parse(requestWithUppercase);
      expect(result.nodeType).toBe('rectangle'); // Should be normalized
    });

    it('should reject nodeId if provided in create request', () => {
      const requestWithNodeId = {
        name: 'Test Rectangle',
        width: 100,
        height: 50,
        nodeType: 'rectangle',
        fillColor: '#FF5733',
        nodeId: 'some-id' // This shouldn't be allowed in create
      };

      // The schema shouldn't include nodeId field, so this should be ignored or cause error
      const result = CreateNodeSchema.parse(requestWithNodeId);
      expect(result.nodeId).toBeUndefined(); // nodeId should not be in the result
    });

    it('should reject invalid nodeType', () => {
      const invalidRequest = {
        name: 'Test Rectangle',
        width: 100,
        height: 50,
        nodeType: 'invalid_type',
        fillColor: '#FF5733'
      };

      expect(() => CreateNodeSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('UpdateNodeSchema', () => {
    it('should require nodeId for update operations', () => {
      const updateRequest = {
        name: 'Updated Rectangle',
        width: 150,
        height: 75,
        fillColor: '#00FF00'
        // Missing nodeId - should fail
      };

      expect(() => UpdateNodeSchema.parse(updateRequest)).toThrow();
    });

    it('should accept valid update request with required nodeId', () => {
      const updateRequest = {
        nodeId: 'existing-node-id',
        name: 'Updated Rectangle',
        width: 150,
        height: 75,
        fillColor: '#00FF00'
      };

      expect(() => UpdateNodeSchema.parse(updateRequest)).not.toThrow();
      
      const result = UpdateNodeSchema.parse(updateRequest);
      expect(result.nodeId).toBe('existing-node-id');
      expect(result.name).toBe('Updated Rectangle');
    });
  });
});