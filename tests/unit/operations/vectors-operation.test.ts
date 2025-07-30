import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VectorsOperationsSchema } from '../../../src/types/vectors-operation.js';

describe('VectorsOperationsSchema', () => {
  describe('operation validation', () => {
    it('should accept all valid operations', () => {
      const validOperations = [
        'create_vector', 'get_vector', 'update_vector',
        'create_line', 'get_line', 'update_line',
        'flatten', 'convert_stroke', 'convert_shape', 'convert_text',
        'extract_element'
      ];

      validOperations.forEach(operation => {
        const result = VectorsOperationsSchema.safeParse({ operation });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid operations', () => {
      const invalidOperations = ['invalid_op', 'create_invalid', ''];

      invalidOperations.forEach(operation => {
        const result = VectorsOperationsSchema.safeParse({ operation });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Sparse VectorNetwork format parameters', () => {
    it('should validate sparse vector data', () => {
      const validData = {
        operation: 'create_vector',
        vertices: '[0,0,100,0,50,100]',
        regions: [
          { loops: ['[0,1,2]'], windingRule: 'EVENODD' }
        ]
      };

      const result = VectorsOperationsSchema.safeParse(validData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.vertices).toBe('[0,0,100,0,50,100]');
        expect(result.data.regions[0].windingRule).toBe('EVENODD');
      }
    });

    it('should validate extract_element parameters', () => {
      const validData = {
        operation: 'extract_element',
        nodeId: '123:456',
        regionIndex: 0,
        removeFromSource: false
      };

      const result = VectorsOperationsSchema.safeParse(validData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.regionIndex).toBe(0);
        expect(result.data.removeFromSource).toBe(false);
      }
    });

    it('should validate path extraction parameters', () => {
      const validData = {
        operation: 'extract_element',
        nodeId: '123:456',
        pathIndex: 1,
        removeFromSource: true
      };

      const result = VectorsOperationsSchema.safeParse(validData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.pathIndex).toBe(1);
        expect(result.data.removeFromSource).toBe(true);
      }
    });
  });

  describe('Line format parameters', () => {
    it('should accept coordinate-style parameters', () => {
      const validData = {
        operation: 'create_line',
        startX: 0,
        startY: 0,
        endX: 100,
        endY: 100
      };

      const result = VectorsOperationsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept vector-style parameters', () => {
      const validData = {
        operation: 'create_line',
        x: 50,
        y: 50,
        length: 100,
        rotation: 45
      };

      const result = VectorsOperationsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('default values', () => {
    it('should apply correct defaults', () => {
      const minimalData = { operation: 'create_vector' };
      
      const result = VectorsOperationsSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.replaceOriginal).toBe(true);
        expect(result.data.removeFromSource).toBe(true);
        expect(result.data.tolerance).toBe(1.0);
      }
    });
  });

  describe('validation constraints', () => {
    it('should require non-negative strokeWidth', () => {
      const invalidData = {
        operation: 'create_vector',
        strokeWidth: -1
      };

      const result = VectorsOperationsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should require non-negative tolerance', () => {
      const invalidData = {
        operation: 'extract_element',
        tolerance: -0.5
      };

      const result = VectorsOperationsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate corner radius constraints', () => {
      const validData = {
        operation: 'create_vector',
        cornerRadius: 5
      };

      const result = VectorsOperationsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject negative corner radius', () => {
      const invalidData = {
        operation: 'create_vector',
        cornerRadius: -5
      };

      const result = VectorsOperationsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});