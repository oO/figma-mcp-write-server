import { describe, it, expect } from 'vitest';
import { extractRegionFromSparse, extractPathFromSparse } from '../../../figma-plugin/src/operations/extract-element-helpers.js';

describe('Extract Element Helpers', () => {
  const mockSparseData = {
    vertices: '[0,0,100,0,100,100,0,100]',
    regions: [
      {
        loops: ['[0,1,2,3]'],
        windingRule: 'EVENODD',
        fillIndex: 0
      },
      {
        loops: ['[0,2,3]'],
        windingRule: 'NONZERO',
        fillIndex: 1
      }
    ],
    paths: [
      '[0,1]',
      '[2,3]'
    ],
    fills: [
      [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
      [{ type: 'SOLID', color: { r: 0, g: 1, b: 0 } }]
    ],
    handles: {
      '0': '[10,10,20,20]',
      '1': '[30,30,40,40]'
    },
    vertexProps: {
      '0': { cornerRadius: 5 },
      '1': { cornerRadius: 10 }
    }
  };

  describe('extractRegionFromSparse', () => {
    describe('when removeFromSource=false', () => {
      it('should extract region with remapped vertices but leave source unchanged', () => {
        const result = extractRegionFromSparse(mockSparseData, 0, false);

        // Extracted data should have clean vertex indices
        expect(result.extracted.vertices).toBe('[0,0,100,0,100,100,0,100]'); // All vertices used, so same indices
        expect(result.extracted.regions).toHaveLength(1);
        expect(result.extracted.regions[0].loops).toEqual(['[0,1,2,3]']);
        expect(result.extracted.regions[0].windingRule).toBe('EVENODD');
        
        // Source should remain unchanged
        expect(result.remaining).toBeNull();
        expect(result.positionOffset).toEqual({ x: 0, y: 0 });
      });

      it('should preserve source data structure completely', () => {
        const originalData = JSON.parse(JSON.stringify(mockSparseData));
        extractRegionFromSparse(mockSparseData, 1, false);

        // Source data should be unchanged
        expect(mockSparseData).toEqual(originalData);
      });
    });

    describe('when removeFromSource=true', () => {
      it('should extract region with proper vertex remapping', () => {
        const result = extractRegionFromSparse(mockSparseData, 0, true);

        expect(result.extracted.vertices).toBe('[0,0,100,0,100,100,0,100]'); // All vertices used
        expect(result.extracted.regions).toHaveLength(1);
        expect(result.extracted.regions[0].loops).toEqual(['[0,1,2,3]']); // Same indices since all vertices used
        expect(result.remaining).toBeDefined();
        expect(result.remaining.regions).toHaveLength(1);
      });

      it('should create minimal remaining data when no regions left', () => {
        const singleRegionData = {
          ...mockSparseData,
          regions: [mockSparseData.regions[0]]
        };

        const result = extractRegionFromSparse(singleRegionData, 0, true);

        expect(result.remaining.vertices).toBe('[0,0,10,0,10,10,0,10]');
        expect(result.remaining.regions).toHaveLength(1);
        expect(result.remaining.regions[0].loops).toEqual(['[0,1,2,3]']);
      });
    });
  });

  describe('extractPathFromSparse', () => {
    describe('when removeFromSource=false', () => {
      it('should extract path with remapped vertices but leave source unchanged', () => {
        const result = extractPathFromSparse(mockSparseData, 0, false);

        // Extracted data should have clean vertex indices (only vertices 0,1 used by path '[0,1]')
        expect(result.extracted.vertices).toBe('[0,0,100,0]'); // Only first two vertices
        expect(result.extracted.paths).toEqual(['[0,1]']); // Remapped to clean indices
        
        // Source should remain unchanged
        expect(result.remaining).toBeNull();
        expect(result.positionOffset).toEqual({ x: 0, y: 0 });
      });

      it('should preserve source data structure completely', () => {
        const originalData = JSON.parse(JSON.stringify(mockSparseData));
        extractPathFromSparse(mockSparseData, 1, false);

        // Source data should be unchanged
        expect(mockSparseData).toEqual(originalData);
      });
    });

    describe('when removeFromSource=true', () => {
      it('should extract path with proper vertex remapping', () => {
        const result = extractPathFromSparse(mockSparseData, 0, true);

        expect(result.extracted.vertices).toBe('[0,0,100,0]'); // Only vertices 0,1 used
        expect(result.extracted.paths).toHaveLength(1);
        expect(result.extracted.paths[0]).toBe('[0,1]'); // Remapped to 0,1
        expect(result.remaining).toBeDefined();
        expect(result.remaining.paths).toHaveLength(1);
      });

      it('should create minimal remaining data when no paths left', () => {
        const singlePathData = {
          ...mockSparseData,
          paths: [mockSparseData.paths[0]]
        };

        const result = extractPathFromSparse(singlePathData, 0, true);

        expect(result.remaining.vertices).toBe('[0,0,10,0]');
        expect(result.remaining.paths).toHaveLength(1);
        expect(result.remaining.paths[0]).toBe('[0,1]');
      });
    });
  });

  describe('optimization benefits', () => {
    it('should avoid connectivity issues when preserving source', () => {
      // This test ensures that when removeFromSource=false,
      // we avoid the complex vertex remapping that can cause
      // "does not connect properly with previous segment" errors
      
      const complexSparseData = {
        vertices: '[0,0,50,25,100,0,75,50,100,100,50,75,0,100,25,50]',
        regions: [{
          loops: ['[7,0,1,2,3,4,5,6]'], // Complex loop with many vertices
          windingRule: 'EVENODD'
        }]
      };

      const result = extractRegionFromSparse(complexSparseData, 0, false);

      // Should use original vertices and indices without remapping
      expect(result.extracted.vertices).toBe(complexSparseData.vertices);
      expect(result.extracted.regions[0].loops[0]).toBe('[7,0,1,2,3,4,5,6]');
      expect(result.remaining).toBeNull();
    });
  });
});