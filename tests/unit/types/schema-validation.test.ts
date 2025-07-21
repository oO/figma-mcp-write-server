import { describe, it, expect } from 'vitest';
import { ManageStylesSchema, UnifiedNodeOperationsSchema } from '@/types/index';

describe('Schema Validation Tests', () => {
  describe('ManageStylesSchema', () => {
    it('should accept apply operation', () => {
      const validRequest = {
        operation: 'apply',
        styleId: 'S:style-123',
        nodeId: 'node-1'
      };

      expect(() => ManageStylesSchema.parse(validRequest)).not.toThrow();
      
      const result = ManageStylesSchema.parse(validRequest);
      expect(result.operation).toBe('apply');
      expect(result.styleId).toBe('S:style-123');
      expect(result.nodeId).toBe('node-1');
    });

    it('should accept update operation', () => {
      const validRequest = {
        operation: 'update',
        styleId: 'S:style-123',
        name: 'Updated Style'
      };

      expect(() => ManageStylesSchema.parse(validRequest)).not.toThrow();
      
      const result = ManageStylesSchema.parse(validRequest);
      expect(result.operation).toBe('update');
      expect(result.styleId).toBe('S:style-123');
    });

    it('should accept create operation with required fields', () => {
      const validRequest = {
        operation: 'create',
        type: 'paint',
        name: 'Test Style',
        color: '#FF0000'
      };

      expect(() => ManageStylesSchema.parse(validRequest)).not.toThrow();
      
      const result = ManageStylesSchema.parse(validRequest);
      expect(result.operation).toBe('create');
      expect(result.type).toBe('paint');
    });
  });

  describe('UnifiedNodeOperationsSchema', () => {
    it('should accept duplicate operation', () => {
      const validRequest = {
        operation: 'duplicate',
        nodeId: 'node-123',
        x: 100,
        y: 200
      };

      expect(() => UnifiedNodeOperationsSchema.parse(validRequest)).not.toThrow();
      
      const result = UnifiedNodeOperationsSchema.parse(validRequest);
      expect(result.operation).toBe('duplicate');
      expect(result.nodeId).toBe('node-123');
    });

    it('should accept delete operation', () => {
      const validRequest = {
        operation: 'delete',
        nodeId: 'node-123'
      };

      expect(() => UnifiedNodeOperationsSchema.parse(validRequest)).not.toThrow();
      
      const result = UnifiedNodeOperationsSchema.parse(validRequest);
      expect(result.operation).toBe('delete');
      expect(result.nodeId).toBe('node-123');
    });

    it('should accept all current node operations', () => {
      const operations = ['delete', 'duplicate'];
      
      operations.forEach(operation => {
        const request = { operation, nodeId: 'node-123' };
        // Should not fail validation with required fields provided
        expect(() => UnifiedNodeOperationsSchema.parse(request)).not.toThrow();
        
        const result = UnifiedNodeOperationsSchema.parse(request);
        expect(result.operation).toBe(operation);
        expect(result.nodeId).toBe('node-123');
      });
    });

    it('should accept bulk operations with array parameters', () => {
      const validRequest = {
        operation: 'delete',
        nodeId: ['node-123', 'node-456', 'node-789']
      };

      expect(() => UnifiedNodeOperationsSchema.parse(validRequest)).not.toThrow();
      
      const result = UnifiedNodeOperationsSchema.parse(validRequest);
      expect(result.operation).toBe('delete');
      expect(result.nodeId).toEqual(['node-123', 'node-456', 'node-789']);
    });
  });
});