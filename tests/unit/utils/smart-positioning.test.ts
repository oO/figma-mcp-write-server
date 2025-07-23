import { describe, it, expect, beforeEach } from 'vitest';
import {
  getNodeBounds,
  boundsOverlap,
  checkForOverlaps,
  createOverlapWarning,
  generatePositionCandidates
} from '../../../figma-plugin/src/utils/smart-positioning.js';

describe('Smart Positioning Utils', () => {
  describe('boundsOverlap', () => {
    it('should detect overlapping rectangles', () => {
      const bounds1 = { x: 0, y: 0, width: 100, height: 100 };
      const bounds2 = { x: 50, y: 50, width: 100, height: 100 };
      
      expect(boundsOverlap(bounds1, bounds2)).toBe(true);
    });

    it('should detect non-overlapping rectangles', () => {
      const bounds1 = { x: 0, y: 0, width: 100, height: 100 };
      const bounds2 = { x: 120, y: 120, width: 100, height: 100 };
      
      expect(boundsOverlap(bounds1, bounds2)).toBe(false);
    });

    it('should respect buffer zones', () => {
      const bounds1 = { x: 0, y: 0, width: 100, height: 100 };
      const bounds2 = { x: 110, y: 110, width: 100, height: 100 }; // 10px gap
      
      expect(boundsOverlap(bounds1, bounds2, 0)).toBe(false);
      expect(boundsOverlap(bounds1, bounds2, 20)).toBe(true); // 20px buffer > 10px gap
    });

    it('should handle touching rectangles', () => {
      const bounds1 = { x: 0, y: 0, width: 100, height: 100 };
      const bounds2 = { x: 100, y: 0, width: 100, height: 100 }; // Touching edge
      
      expect(boundsOverlap(bounds1, bounds2, 0)).toBe(false);
      expect(boundsOverlap(bounds1, bounds2, 1)).toBe(true);
    });
  });

  describe('generatePositionCandidates', () => {
    it('should generate positions around reference node', () => {
      const referenceBounds = { x: 100, y: 100, width: 100, height: 100 };
      const newNodeSize = { width: 50, height: 50 };
      const spacing = 20;
      
      const candidates = generatePositionCandidates(referenceBounds, newNodeSize, spacing);
      
      expect(candidates).toHaveLength(6);
      
      // Check right position
      expect(candidates[0].x).toBe(220); // 100 + 100 + 20
      expect(candidates[0].y).toBe(100);
      expect(candidates[0].reason).toContain('right');
      
      // Check below position
      expect(candidates[1].x).toBe(100);
      expect(candidates[1].y).toBe(220); // 100 + 100 + 20
      expect(candidates[1].reason).toContain('below');
      
      // Check above position
      expect(candidates[2].x).toBe(100);
      expect(candidates[2].y).toBe(30); // 100 - 50 - 20
      expect(candidates[2].reason).toContain('above');
      
      // Check left position
      expect(candidates[3].x).toBe(30); // 100 - 50 - 20
      expect(candidates[3].y).toBe(100);
      expect(candidates[3].reason).toContain('left');
    });

    it('should handle different spacing values', () => {
      const referenceBounds = { x: 0, y: 0, width: 100, height: 100 };
      const newNodeSize = { width: 50, height: 50 };
      
      const candidates10 = generatePositionCandidates(referenceBounds, newNodeSize, 10);
      const candidates30 = generatePositionCandidates(referenceBounds, newNodeSize, 30);
      
      // Right position should reflect different spacing
      expect(candidates10[0].x).toBe(110); // 0 + 100 + 10
      expect(candidates30[0].x).toBe(130); // 0 + 100 + 30
    });
  });

  describe('createOverlapWarning', () => {
    it('should create warning message for single overlapping node', () => {
      const overlapInfo = {
        hasOverlap: true,
        overlappingNodeIds: ['node1'],
        overlappingNodes: [{
          id: 'node1',
          name: 'Rectangle 1',
          bounds: { x: 0, y: 0, width: 100, height: 100 }
        }]
      };
      
      const warning = createOverlapWarning(overlapInfo, { x: 50, y: 50 });
      
      expect(warning).toContain('⚠️');
      expect(warning).toContain('overlaps');
      expect(warning).toContain('Rectangle 1');
      expect(warning).toContain('node1');
      expect(warning).toContain('(50, 50)');
    });

    it('should create warning message for multiple overlapping nodes', () => {
      const overlapInfo = {
        hasOverlap: true,
        overlappingNodeIds: ['node1', 'node2'],
        overlappingNodes: [{
          id: 'node1',
          name: 'Rectangle 1',
          bounds: { x: 0, y: 0, width: 100, height: 100 }
        }, {
          id: 'node2',
          name: 'Circle 1',
          bounds: { x: 20, y: 20, width: 80, height: 80 }
        }]
      };
      
      const warning = createOverlapWarning(overlapInfo, { x: 25, y: 25 });
      
      expect(warning).toContain('Rectangle 1');
      expect(warning).toContain('Circle 1');
      expect(warning).toContain('node1');
      expect(warning).toContain('node2');
    });

    it('should return empty string for no overlaps', () => {
      const overlapInfo = {
        hasOverlap: false,
        overlappingNodeIds: [],
        overlappingNodes: []
      };
      
      const warning = createOverlapWarning(overlapInfo, { x: 0, y: 0 });
      expect(warning).toBe('');
    });
  });

  describe('getNodeBounds', () => {
    it('should extract bounds from node with positioning properties', () => {
      const mockNode = {
        x: 100,
        y: 200,
        width: 150,
        height: 75,
        type: 'RECTANGLE'
      } as any;
      
      const bounds = getNodeBounds(mockNode);
      
      expect(bounds).toEqual({
        x: 100,
        y: 200,
        width: 150,
        height: 75
      });
    });

    it('should return zero bounds for nodes without positioning', () => {
      const mockNode = {
        type: 'PAGE'
      } as any;
      
      const bounds = getNodeBounds(mockNode);
      
      expect(bounds).toEqual({
        x: 0,
        y: 0,
        width: 0,
        height: 0
      });
    });
  });
});

describe('Smart Positioning Integration', () => {
  it('should demonstrate typical usage flow', () => {
    // Simulate existing node
    const existingBounds = { x: 100, y: 100, width: 100, height: 100 };
    
    // New node to be positioned
    const newNodeSize = { width: 80, height: 60 };
    
    // Generate candidates around existing node
    const candidates = generatePositionCandidates(existingBounds, newNodeSize, 20);
    
    // Test first candidate (to the right)
    const proposedBounds = {
      x: candidates[0].x,
      y: candidates[0].y,
      width: newNodeSize.width,
      height: newNodeSize.height
    };
    
    // Should not overlap with existing node
    expect(boundsOverlap(proposedBounds, existingBounds)).toBe(false);
    
    // Should have proper spacing
    expect(candidates[0].x).toBe(220); // 100 + 100 + 20
    expect(candidates[0].reason).toContain('right');
  });
});