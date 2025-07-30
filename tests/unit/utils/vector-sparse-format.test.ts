import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sparseToFigma } from '../../../figma-plugin/src/utils/vector-sparse-format.js';

// Mock the logger
vi.mock('../../../figma-plugin/src/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('Vector Sparse Format', () => {
  describe('sparseToFigma', () => {
    it('should convert basic triangle vertices to VectorNetwork', () => {
      const sparse = {
        vertices: "[0,0,100,0,50,100]", // Triangle coordinates
        regions: [{ loops: ["[0,1,2]"] }] // Single region connecting all vertices
      };

      const result = sparseToFigma(sparse);

      expect(result.vertices).toHaveLength(3);
      expect(result.vertices[0]).toEqual({
        x: 0,
        y: 0,
        strokeCap: "NONE",
        strokeJoin: "MITER",
        cornerRadius: 0,
        handleMirroring: "NONE"
      });
      expect(result.vertices[1]).toEqual({
        x: 100,
        y: 0,
        strokeCap: "NONE", 
        strokeJoin: "MITER",
        cornerRadius: 0,
        handleMirroring: "NONE"
      });
      expect(result.vertices[2]).toEqual({
        x: 50,
        y: 100,
        strokeCap: "NONE",
        strokeJoin: "MITER", 
        cornerRadius: 0,
        handleMirroring: "NONE"
      });

      expect(result.regions).toHaveLength(1);
      expect(result.regions[0].windingRule).toBe("NONZERO");
      expect(result.regions[0].loops).toEqual([[0, 1, 2]]);
    });

    it('should handle open paths (segments)', () => {
      const sparse = {
        vertices: "[0,0,50,0,100,0,150,0]", // Four points in a line
        paths: ["[0,1,2]", "[2,3]"] // Two open paths
      };

      const result = sparseToFigma(sparse);

      expect(result.vertices).toHaveLength(4);
      expect(result.segments).toHaveLength(3); // 0-1, 1-2, 2-3
      
      // Check segments
      expect(result.segments[0]).toEqual({
        start: 0,
        end: 1,
        tangentStart: { x: 0, y: 0 },
        tangentEnd: { x: 0, y: 0 }
      });
      expect(result.segments[1]).toEqual({
        start: 1,
        end: 2,
        tangentStart: { x: 0, y: 0 },
        tangentEnd: { x: 0, y: 0 }
      });
      expect(result.segments[2]).toEqual({
        start: 2,
        end: 3,
        tangentStart: { x: 0, y: 0 },
        tangentEnd: { x: 0, y: 0 }
      });
    });

    it('should handle bezier handles in handles parameter', () => {
      const sparse = {
        vertices: "[0,0,100,0,100,100,0,100]", // Square
        regions: [{ loops: ["[0,1,2,3]"] }],
        handles: {
          "0": "[10,0,-10,0]", // Bezier handles for vertex 0
          "1": "[0,10,0,-10]"  // Bezier handles for vertex 1
        }
      };

      const result = sparseToFigma(sparse);

      expect(result.vertices).toHaveLength(4);
      expect(result.vertices[0].handleMirroring).toBe("NONE");
      
      // Check that regions are created
      expect(result.regions).toHaveLength(1);
      expect(result.regions[0].loops).toEqual([[0, 1, 2, 3]]);
    });

    it('should validate vertex indices in regions', () => {
      const sparse = {
        vertices: "[0,0,100,0]", // Only 2 vertices (indices 0,1)
        regions: [{ loops: ["[0,1,5]"] }] // Index 5 is invalid
      };

      expect(() => sparseToFigma(sparse)).toThrow('invalid vertex index');
    });

    it('should validate vertex indices in paths', () => {
      const sparse = {
        vertices: "[0,0,100,0]", // Only 2 vertices (indices 0,1)  
        paths: ["[0,1,5]"] // Index 5 is invalid
      };

      expect(() => sparseToFigma(sparse)).toThrow('invalid vertex indices');
    });

    it('should require even number of coordinates in vertices', () => {
      const sparse = {
        vertices: "[0,0,100]" // Odd number - missing Y coordinate
      };

      expect(() => sparseToFigma(sparse)).toThrow('Invalid vertices format: must be a valid JSON array string like "[0,0,100,0,50,100]"');
    });

    it('should handle complex shape with multiple regions', () => {
      const sparse = {
        vertices: "[0,0,100,0,100,100,0,100,25,25,75,25,75,75,25,75]", // Outer square + inner square
        regions: [
          { loops: ["[0,1,2,3]"] }, // Outer region
          { loops: ["[4,5,6,7]"] }  // Inner region
        ]
      };

      const result = sparseToFigma(sparse);

      expect(result.vertices).toHaveLength(8);
      expect(result.regions).toHaveLength(2);
      expect(result.regions[0].loops).toEqual([[0, 1, 2, 3]]);
      expect(result.regions[1].loops).toEqual([[4, 5, 6, 7]]);
    });

    it('should handle mixed regions and paths', () => {
      const sparse = {
        vertices: "[0,0,100,0,100,100,0,100,150,50,200,50]", // Square + line
        regions: [{ loops: ["[0,1,2,3]"] }], // Closed square
        paths: ["[4,5]"] // Open line
      };

      const result = sparseToFigma(sparse);

      expect(result.vertices).toHaveLength(6);
      expect(result.regions).toHaveLength(1);
      expect(result.segments).toHaveLength(5); // 4 for square + 1 for line
    });

    it('should handle empty regions and paths gracefully', () => {
      const sparse = {
        vertices: "[0,0,100,0,100,100]"
        // No regions or paths - just vertices
      };

      const result = sparseToFigma(sparse);

      expect(result.vertices).toHaveLength(3);
      expect(result.regions).toHaveLength(0);
      expect(result.segments).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in vertices', () => {
      const sparse = {
        vertices: "[0,0,100,0" // Missing closing bracket
      };

      expect(() => sparseToFigma(sparse)).toThrow('Invalid vertices format: must be a valid JSON array string like "[0,0,100,0,50,100]"');
    });

    it('should handle invalid JSON in regions', () => {
      const sparse = {
        vertices: "[0,0,100,0,100,100]",
        regions: [{ loops: ["[0,1,2"] }] // Missing closing bracket
      };

      expect(() => sparseToFigma(sparse)).toThrow(); // Will throw JSON parse error
    });

    it('should handle invalid JSON in paths', () => {
      const sparse = {
        vertices: "[0,0,100,0,100,100]",
        paths: ["[0,1,2"] // Missing closing bracket  
      };

      expect(() => sparseToFigma(sparse)).toThrow(); // Will throw JSON parse error
    });

    it('should handle empty vertices gracefully', () => {
      const sparse = {
        vertices: "[]" // Empty array
      };

      const result = sparseToFigma(sparse);
      expect(result.vertices).toHaveLength(0);
      expect(result.regions).toHaveLength(0);
      expect(result.segments).toHaveLength(0);
    });
  });
});