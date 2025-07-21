import { describe, it, expect } from 'vitest';
import { UnifiedNodeOperationsSchema } from '@/types/node-operations';

describe('Node Schema Validation Fix', () => {
  describe('UnifiedNodeOperationsSchema (Create Operations)', () => {
    it('should accept create_node request without any ID fields', () => {
      const validRequest = {
        operation: 'create',
        name: 'QA Test Rectangle',
        width: 100,
        height: 50,
        nodeType: 'rectangle',
        fillColor: '#FF5733'
      };

      // This should not throw an error
      expect(() => UnifiedNodeOperationsSchema.parse(validRequest)).not.toThrow();
      
      const result = UnifiedNodeOperationsSchema.parse(validRequest);
      expect(result.nodeType).toBe('rectangle');
      expect(result.name).toBe('QA Test Rectangle');
      expect(result.width).toBe(100);
      expect(result.height).toBe(50);
      expect(result.fillColor).toBe('#FF5733');
      expect(result.nodeId).toBeUndefined(); // Should not have nodeId
    });

    it('should work with case-insensitive nodeType', () => {
      const requestWithUppercase = {
        operation: 'create',
        name: 'Test Rectangle',
        width: 100,
        height: 50,
        nodeType: 'RECTANGLE', // Should be normalized to 'rectangle'
        fillColor: '#FF5733'
      };

      const result = UnifiedNodeOperationsSchema.parse(requestWithUppercase);
      expect(result.nodeType).toBe('rectangle'); // Should be normalized
    });

    it('should reject nodeId if provided in create request', () => {
      const requestWithNodeId = {
        operation: 'create',
        name: 'Test Rectangle',
        width: 100,
        height: 50,
        nodeType: 'rectangle',
        fillColor: '#FF5733',
        nodeId: 'some-id' // This shouldn't be allowed in create
      };

      // The schema shouldn't include nodeId field, so this should be ignored or cause error
      const result = UnifiedNodeOperationsSchema.parse(requestWithNodeId);
      expect(result.nodeId).toBeUndefined(); // nodeId should not be in the result
    });

    it('should reject invalid nodeType', () => {
      const invalidRequest = {
        operation: 'create',
        name: 'Test Rectangle',
        width: 100,
        height: 50,
        nodeType: 'invalid_type',
        fillColor: '#FF5733'
      };

      expect(() => UnifiedNodeOperationsSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('UnifiedNodeOperationsSchema (Update Operations)', () => {
    it('should require id for update operations', () => {
      const updateRequest = {
        operation: 'update',
        name: 'Updated Rectangle',
        width: 150,
        height: 75,
        fillColor: '#00FF00'
        // Missing id - should fail
      };

      expect(() => UnifiedNodeOperationsSchema.parse(updateRequest)).toThrow();
    });

    it('should accept valid update request with required id', () => {
      const updateRequest = {
        operation: 'update',
        id: 'existing-node-id',
        name: 'Updated Rectangle',
        width: 150,
        height: 75,
        fillColor: '#00FF00'
      };

      expect(() => UnifiedNodeOperationsSchema.parse(updateRequest)).not.toThrow();
      
      const result = UnifiedNodeOperationsSchema.parse(updateRequest);
      expect(result.id).toBe('existing-node-id');
      expect(result.name).toBe('Updated Rectangle');
    });

    it('should accept bulk update requests with array parameters', () => {
      const bulkUpdateRequest = {
        operation: 'update',
        id: ['node-1', 'node-2'],
        name: ['Updated Rectangle 1', 'Updated Rectangle 2'],
        width: [150, 200],
        height: [75, 100],
        fillColor: ['#00FF00', '#0000FF']
      };

      expect(() => UnifiedNodeOperationsSchema.parse(bulkUpdateRequest)).not.toThrow();
      
      const result = UnifiedNodeOperationsSchema.parse(bulkUpdateRequest);
      expect(result.id).toEqual(['node-1', 'node-2']);
      expect(result.name).toEqual(['Updated Rectangle 1', 'Updated Rectangle 2']);
    });
  });
});