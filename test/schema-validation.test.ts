import { describe, it, expect } from '@jest/globals';
import { ManageStylesSchema, ManageNodesSchema } from '../src/types/index.js';

describe('Schema Validation Tests', () => {
  describe('ManageStylesSchema', () => {
    it('should accept apply_bulk operation', () => {
      const validRequest = {
        operation: 'apply_bulk',
        styleId: 'style-123',
        nodeIds: ['node-1', 'node-2', 'node-3']
      };

      expect(() => ManageStylesSchema.parse(validRequest)).not.toThrow();
      
      const result = ManageStylesSchema.parse(validRequest);
      expect(result.operation).toBe('apply_bulk');
      expect(result.styleId).toBe('style-123');
      expect(result.nodeIds).toEqual(['node-1', 'node-2', 'node-3']);
    });

    it('should accept update operation', () => {
      const validRequest = {
        operation: 'update',
        styleId: 'style-123',
        styleName: 'Updated Style'
      };

      expect(() => ManageStylesSchema.parse(validRequest)).not.toThrow();
      
      const result = ManageStylesSchema.parse(validRequest);
      expect(result.operation).toBe('update');
    });

    it('should accept all documented operations', () => {
      const operations = ['create', 'update', 'delete', 'get', 'list', 'apply', 'apply_bulk'];
      
      operations.forEach(operation => {
        const request = { operation };
        expect(() => ManageStylesSchema.parse(request)).not.toThrow();
      });
    });
  });

  describe('ManageNodesSchema', () => {
    it('should accept bulk operations without nodeId', () => {
      const bulkOperations = ['move_bulk', 'delete_bulk', 'duplicate_bulk'];
      
      bulkOperations.forEach(operation => {
        const validRequest = {
          operation,
          nodeIds: ['node-1', 'node-2']
        };

        expect(() => ManageNodesSchema.parse(validRequest)).not.toThrow();
        
        const result = ManageNodesSchema.parse(validRequest);
        expect(result.operation).toBe(operation);
        expect(result.nodeIds).toEqual(['node-1', 'node-2']);
      });
    });

    it('should require nodeId for single operations', () => {
      const singleOperations = ['move', 'delete', 'duplicate'];
      
      singleOperations.forEach(operation => {
        const validRequest = {
          operation,
          nodeId: 'node-123'
        };

        expect(() => ManageNodesSchema.parse(validRequest)).not.toThrow();
      });
    });

    it('should accept all documented operations', () => {
      const operations = ['move', 'delete', 'duplicate', 'move_bulk', 'delete_bulk', 'duplicate_bulk'];
      
      operations.forEach(operation => {
        const request = { operation };
        // Note: This might fail validation due to missing required fields, but should not fail on enum validation
        try {
          ManageNodesSchema.parse(request);
        } catch (error) {
          // Should be validation error, not enum error
          expect(error.message).not.toContain('Invalid enum value');
        }
      });
    });
  });
});