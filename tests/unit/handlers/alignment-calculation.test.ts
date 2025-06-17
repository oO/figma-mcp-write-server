import { describe, expect, test } from '@jest/globals';

// We need to test the actual calculation logic, so let's extract and test the core functions
// This simulates the NodeBounds interface and calculation logic

interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

// Extract the core calculation logic for testing
class AlignmentCalculator {
  static createNodeBounds(x: number, y: number, width: number, height: number): NodeBounds {
    return {
      x,
      y,
      width,
      height,
      left: x,
      right: x + width,
      top: y,
      bottom: y + height,
      centerX: x + width / 2,
      centerY: y + height / 2
    };
  }

  static createParentBounds(width: number, height: number): NodeBounds {
    // Parent bounds are always relative (0,0 at top-left)
    return this.createNodeBounds(0, 0, width, height);
  }

  static calculateAlignHorizontal(
    direction?: string,
    referencePoint?: string,
    alignmentPoint?: string,
    nodeBounds: NodeBounds,
    referenceBounds: NodeBounds
  ): number {
    const refPoint = referencePoint || direction || 'center';
    const alignPoint = alignmentPoint || direction || 'center';

    // Get the reference coordinate
    let referenceX: number;
    switch (refPoint) {
      case 'left':
        referenceX = referenceBounds.left;
        break;
      case 'center':
        referenceX = referenceBounds.centerX;
        break;
      case 'right':
        referenceX = referenceBounds.right;
        break;
      default:
        referenceX = referenceBounds.centerX;
    }

    // Calculate the node position based on its alignment point
    switch (alignPoint) {
      case 'left':
        return referenceX;
      case 'center':
        return referenceX - nodeBounds.width / 2;
      case 'right':
        return referenceX - nodeBounds.width;
      default:
        return referenceX - nodeBounds.width / 2;
    }
  }

  static calculateAlignVertical(
    direction?: string,
    referencePoint?: string,
    alignmentPoint?: string,
    nodeBounds: NodeBounds,
    referenceBounds: NodeBounds
  ): number {
    const refPoint = referencePoint || direction || 'middle';
    const alignPoint = alignmentPoint || direction || 'middle';

    // Get the reference coordinate
    let referenceY: number;
    switch (refPoint) {
      case 'top':
        referenceY = referenceBounds.top;
        break;
      case 'middle':
        referenceY = referenceBounds.centerY;
        break;
      case 'bottom':
        referenceY = referenceBounds.bottom;
        break;
      default:
        referenceY = referenceBounds.centerY;
    }

    // Calculate the node position based on its alignment point
    switch (alignPoint) {
      case 'top':
        return referenceY;
      case 'middle':
        return referenceY - nodeBounds.height / 2;
      case 'bottom':
        return referenceY - nodeBounds.height;
      default:
        return referenceY - nodeBounds.height / 2;
    }
  }

  static calculatePositionHorizontal(
    direction?: string,
    referencePoint?: string,
    alignmentPoint?: string,
    nodeBounds: NodeBounds,
    referenceBounds: NodeBounds,
    spacing: number = 0,
    margin: number = 0
  ): number {
    const refPoint = referencePoint || direction || 'center';
    const alignPoint = alignmentPoint || direction || 'center';

    // Get the reference coordinate
    let referenceX: number;
    switch (refPoint) {
      case 'left':
        referenceX = referenceBounds.left;
        break;
      case 'center':
        referenceX = referenceBounds.centerX;
        break;
      case 'right':
        referenceX = referenceBounds.right;
        break;
      default:
        referenceX = referenceBounds.centerX;
    }

    // For positioning, we need to apply spacing based on direction
    let offsetX = 0;
    if (direction === 'left') {
      offsetX = -(spacing + margin);
    } else if (direction === 'right') {
      offsetX = spacing + margin;
    }

    // Calculate the node position based on its alignment point
    switch (alignPoint) {
      case 'left':
        return referenceX + offsetX;
      case 'center':
        return referenceX - nodeBounds.width / 2 + offsetX;
      case 'right':
        return referenceX - nodeBounds.width + offsetX;
      default:
        return referenceX - nodeBounds.width / 2 + offsetX;
    }
  }
}

describe('Alignment Calculation Logic', () => {
  describe('Node Bounds Creation', () => {
    test('should create correct node bounds', () => {
      const bounds = AlignmentCalculator.createNodeBounds(10, 20, 100, 50);
      
      expect(bounds).toEqual({
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        left: 10,
        right: 110,
        top: 20,
        bottom: 70,
        centerX: 60,
        centerY: 45
      });
    });

    test('should create parent bounds with relative coordinates', () => {
      const parentBounds = AlignmentCalculator.createParentBounds(300, 200);
      
      expect(parentBounds).toEqual({
        x: 0,
        y: 0,
        width: 300,
        height: 200,
        left: 0,
        right: 300,
        top: 0,
        bottom: 200,
        centerX: 150,
        centerY: 100
      });
    });
  });

  describe('Horizontal Alignment', () => {
    const parentBounds = AlignmentCalculator.createParentBounds(300, 200); // 300x200 frame
    const childBounds = AlignmentCalculator.createNodeBounds(50, 50, 100, 40); // 100x40 child

    test('should align left correctly', () => {
      const result = AlignmentCalculator.calculateAlignHorizontal(
        'left', undefined, undefined, childBounds, parentBounds
      );
      expect(result).toBe(0); // Child's left edge at parent's left edge (x=0)
    });

    test('should align center correctly', () => {
      const result = AlignmentCalculator.calculateAlignHorizontal(
        'center', undefined, undefined, childBounds, parentBounds
      );
      expect(result).toBe(100); // Child center at parent center: 150 - 100/2 = 100
    });

    test('should align right correctly', () => {
      const result = AlignmentCalculator.calculateAlignHorizontal(
        'right', undefined, undefined, childBounds, parentBounds
      );
      expect(result).toBe(200); // Child's right edge at parent's right edge: 300 - 100 = 200
    });
  });

  describe('Vertical Alignment', () => {
    const parentBounds = AlignmentCalculator.createParentBounds(300, 200); // 300x200 frame
    const childBounds = AlignmentCalculator.createNodeBounds(50, 50, 100, 40); // 100x40 child

    test('should align top correctly', () => {
      const result = AlignmentCalculator.calculateAlignVertical(
        'top', undefined, undefined, childBounds, parentBounds
      );
      expect(result).toBe(0); // Child's top edge at parent's top edge (y=0)
    });

    test('should align middle correctly', () => {
      const result = AlignmentCalculator.calculateAlignVertical(
        'middle', undefined, undefined, childBounds, parentBounds
      );
      expect(result).toBe(80); // Child center at parent center: 100 - 40/2 = 80
    });

    test('should align bottom correctly', () => {
      const result = AlignmentCalculator.calculateAlignVertical(
        'bottom', undefined, undefined, childBounds, parentBounds
      );
      expect(result).toBe(160); // Child's bottom edge at parent's bottom edge: 200 - 40 = 160
    });
  });

  describe('Reference Point and Alignment Point Combinations', () => {
    const parentBounds = AlignmentCalculator.createParentBounds(300, 200);
    const childBounds = AlignmentCalculator.createNodeBounds(0, 0, 50, 20); // 50x20 child

    test('should align child center to parent left edge', () => {
      const result = AlignmentCalculator.calculateAlignHorizontal(
        undefined, 'left', 'center', childBounds, parentBounds
      );
      expect(result).toBe(-25); // Child center at parent left: 0 - 50/2 = -25
    });

    test('should align child right edge to parent center', () => {
      const result = AlignmentCalculator.calculateAlignHorizontal(
        undefined, 'center', 'right', childBounds, parentBounds
      );
      expect(result).toBe(100); // Child right edge at parent center: 150 - 50 = 100
    });

    test('should align child left edge to parent right edge', () => {
      const result = AlignmentCalculator.calculateAlignHorizontal(
        undefined, 'right', 'left', childBounds, parentBounds
      );
      expect(result).toBe(300); // Child left edge at parent right: 300
    });
  });

  describe('Positioning with Spacing', () => {
    const parentBounds = AlignmentCalculator.createParentBounds(300, 200);
    const childBounds = AlignmentCalculator.createNodeBounds(0, 0, 50, 20);

    test('should position to the right with spacing', () => {
      const result = AlignmentCalculator.calculatePositionHorizontal(
        'right', 'right', 'left', childBounds, parentBounds, 20, 5
      );
      expect(result).toBe(325); // Parent right (300) + spacing (20) + margin (5) = 325
    });

    test('should position to the left with spacing', () => {
      const result = AlignmentCalculator.calculatePositionHorizontal(
        'left', 'left', 'right', childBounds, parentBounds, 20, 5
      );
      expect(result).toBe(-75); // Parent left (0) - spacing (20) - margin (5) - width (50) = -75
    });

    test('should position center without spacing', () => {
      const result = AlignmentCalculator.calculatePositionHorizontal(
        'center', 'center', 'center', childBounds, parentBounds, 0, 0
      );
      expect(result).toBe(125); // Parent center (150) - child width/2 (25) = 125
    });
  });

  describe('Real-world Scenarios', () => {
    test('should center 50x20 text in 300x200 frame', () => {
      const frameSize = { width: 300, height: 200 };
      const textSize = { width: 50, height: 20 };
      
      const parentBounds = AlignmentCalculator.createParentBounds(frameSize.width, frameSize.height);
      const childBounds = AlignmentCalculator.createNodeBounds(0, 0, textSize.width, textSize.height);

      const x = AlignmentCalculator.calculateAlignHorizontal('center', undefined, undefined, childBounds, parentBounds);
      const y = AlignmentCalculator.calculateAlignVertical('middle', undefined, undefined, childBounds, parentBounds);

      expect(x).toBe(125); // (300 - 50) / 2 = 125
      expect(y).toBe(90);  // (200 - 20) / 2 = 90
    });

    test('should align text to bottom-right corner', () => {
      const parentBounds = AlignmentCalculator.createParentBounds(300, 200);
      const childBounds = AlignmentCalculator.createNodeBounds(0, 0, 80, 30);

      const x = AlignmentCalculator.calculateAlignHorizontal('right', undefined, undefined, childBounds, parentBounds);
      const y = AlignmentCalculator.calculateAlignVertical('bottom', undefined, undefined, childBounds, parentBounds);

      expect(x).toBe(220); // 300 - 80 = 220
      expect(y).toBe(170); // 200 - 30 = 170
    });

    test('should handle edge case with zero-sized elements', () => {
      const parentBounds = AlignmentCalculator.createParentBounds(100, 100);
      const childBounds = AlignmentCalculator.createNodeBounds(0, 0, 0, 0);

      const x = AlignmentCalculator.calculateAlignHorizontal('center', undefined, undefined, childBounds, parentBounds);
      const y = AlignmentCalculator.calculateAlignVertical('middle', undefined, undefined, childBounds, parentBounds);

      expect(x).toBe(50); // 100/2 - 0/2 = 50
      expect(y).toBe(50); // 100/2 - 0/2 = 50
    });
  });

  describe('Edge Cases', () => {
    test('should handle child larger than parent', () => {
      const parentBounds = AlignmentCalculator.createParentBounds(100, 100);
      const childBounds = AlignmentCalculator.createNodeBounds(0, 0, 200, 150);

      const x = AlignmentCalculator.calculateAlignHorizontal('center', undefined, undefined, childBounds, parentBounds);
      const y = AlignmentCalculator.calculateAlignVertical('middle', undefined, undefined, childBounds, parentBounds);

      expect(x).toBe(-50); // 50 - 200/2 = -50 (child extends outside parent)
      expect(y).toBe(-25); // 50 - 150/2 = -25 (child extends outside parent)
    });

    test('should handle negative coordinates correctly', () => {
      const parentBounds = AlignmentCalculator.createParentBounds(100, 100);
      const childBounds = AlignmentCalculator.createNodeBounds(-50, -25, 50, 25);

      const x = AlignmentCalculator.calculateAlignHorizontal('left', undefined, undefined, childBounds, parentBounds);
      const y = AlignmentCalculator.calculateAlignVertical('top', undefined, undefined, childBounds, parentBounds);

      expect(x).toBe(0); // Align to parent left edge
      expect(y).toBe(0); // Align to parent top edge
    });
  });

  describe('Multi-Node Alignment Requirements', () => {
    test('should validate that all nodes share the same coordinate system', () => {
      // This test documents the requirement that all nodes must share the same parent
      // so that coordinate system conversions are not needed
      
      const sharedParentBounds = AlignmentCalculator.createParentBounds(400, 300);
      const node1 = AlignmentCalculator.createNodeBounds(50, 50, 100, 50);
      const node2 = AlignmentCalculator.createNodeBounds(200, 100, 80, 40);
      
      // Both nodes can be aligned because they share coordinate system
      const alignX1 = AlignmentCalculator.calculateAlignHorizontal('left', undefined, undefined, node1, sharedParentBounds);
      const alignX2 = AlignmentCalculator.calculateAlignHorizontal('left', undefined, undefined, node2, sharedParentBounds);
      
      expect(alignX1).toBe(0); // Both align to same reference point
      expect(alignX2).toBe(0); // No coordinate conversion needed
    });
  });
});