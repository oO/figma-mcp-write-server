import { describe, it, expect } from 'vitest';
import {
  flattenedToImageMatrix,
  imageMatrixToFlattened,
  flattenedToMatrix,
  matrixToFlattened
} from '../../../figma-plugin/src/utils/color-utils.js';

describe('Matrix Round-trip Conversion Tests', () => {
  const TOLERANCE = 0.001; // Tolerance for floating point comparisons

  function expectClose(actual: number, expected: number, tolerance = TOLERANCE) {
    expect(Math.abs(actual - expected)).toBeLessThan(tolerance);
  }

  describe('Image Matrix Round-trip Tests', () => {
    it('should handle identity transformation', () => {
      const params = {
        transformScale: 1,
        transformRotation: 0,
        imageTranslateX: 0,
        imageTranslateY: 0,
        transformSkewX: 0,
        transformSkewY: 0
      };

      const matrix = flattenedToImageMatrix(params);
      const roundTrip = imageMatrixToFlattened(matrix);

      expectClose(roundTrip.transformScale, 1);
      expectClose(roundTrip.transformRotation, 0);
      expectClose(roundTrip.imageTranslateX, 0);
      expectClose(roundTrip.imageTranslateY, 0);
      expectClose(roundTrip.transformSkewX, 0);
    });

    it('should handle pure translation', () => {
      const params = {
        imageTranslateX: 100,
        imageTranslateY: -50
      };

      const matrix = flattenedToImageMatrix(params);
      const roundTrip = imageMatrixToFlattened(matrix);

      expectClose(roundTrip.imageTranslateX, 100);
      expectClose(roundTrip.imageTranslateY, -50);
      expectClose(roundTrip.transformScale, 1);
      expectClose(roundTrip.transformRotation, 0);
    });

    it('should handle pure scaling', () => {
      const params = {
        transformScaleX: 2.0,
        transformScaleY: 0.5
      };

      const matrix = flattenedToImageMatrix(params);
      const roundTrip = imageMatrixToFlattened(matrix);

      expectClose(roundTrip.transformScaleX, 2.0);
      expectClose(roundTrip.transformScaleY, 0.5);
      expectClose(roundTrip.transformRotation, 0);
      expectClose(roundTrip.imageTranslateX, 0);
      expectClose(roundTrip.imageTranslateY, 0);
    });

    it('should handle pure rotation', () => {
      const params = {
        transformRotation: 45
      };

      const matrix = flattenedToImageMatrix(params);
      const roundTrip = imageMatrixToFlattened(matrix);

      expectClose(roundTrip.transformRotation, 45);
      expectClose(roundTrip.transformScale, 1);
      expectClose(roundTrip.imageTranslateX, 0);
      expectClose(roundTrip.imageTranslateY, 0);
    });

    it('should handle 90-degree rotation', () => {
      const params = {
        transformRotation: 90
      };

      const matrix = flattenedToImageMatrix(params);
      const roundTrip = imageMatrixToFlattened(matrix);

      expectClose(roundTrip.transformRotation, 90);
      expectClose(roundTrip.transformScale, 1);
    });

    it('should handle negative rotation', () => {
      const params = {
        transformRotation: -30
      };

      const matrix = flattenedToImageMatrix(params);
      const roundTrip = imageMatrixToFlattened(matrix);

      expectClose(roundTrip.transformRotation, -30);
    });

    it('should handle combined transformations', () => {
      const params = {
        transformScaleX: 1.5,
        transformScaleY: 2.0,
        transformRotation: 30,
        imageTranslateX: 20,
        imageTranslateY: -10
      };

      const matrix = flattenedToImageMatrix(params);
      const roundTrip = imageMatrixToFlattened(matrix);

      expectClose(roundTrip.transformScaleX, 1.5);
      expectClose(roundTrip.transformScaleY, 2.0);
      expectClose(roundTrip.transformRotation, 30);
      expectClose(roundTrip.imageTranslateX, 20);
      expectClose(roundTrip.imageTranslateY, -10);
    });

    it('should handle image offset parameters', () => {
      const params = {
        transformOffsetX: 0.5,
        transformOffsetY: -0.3,
        transformScale: 1.2
      };

      const matrix = flattenedToImageMatrix(params);
      const roundTrip = imageMatrixToFlattened(matrix);

      expectClose(roundTrip.transformOffsetX, 0.5);
      expectClose(roundTrip.transformOffsetY, -0.3);
      expectClose(roundTrip.transformScale, 1.2);
      // When using offset params, translate should match the conversion
      expectClose(roundTrip.imageTranslateX, 0.5 * 200);
      expectClose(roundTrip.imageTranslateY, -0.3 * 200);
    });

    it('should handle flipping transformations', () => {
      const params = {
        imageFlipHorizontal: true,
        imageFlipVertical: false,
        transformScale: 1.5
      };

      const matrix = flattenedToImageMatrix(params);
      const roundTrip = imageMatrixToFlattened(matrix);

      // Flipping should show up as negative scale
      expectClose(Math.abs(roundTrip.transformScaleX), 1.5);
      expectClose(Math.abs(roundTrip.transformScaleY), 1.5);
      expect(roundTrip.transformScaleX).toBeLessThan(0); // Should be negative due to horizontal flip
      expect(roundTrip.transformScaleY).toBeGreaterThan(0); // Should be positive
    });

    it('should handle edge case: zero scale', () => {
      const params = {
        transformScaleX: 0,
        transformScaleY: 1
      };

      const matrix = flattenedToImageMatrix(params);
      const roundTrip = imageMatrixToFlattened(matrix);

      expectClose(roundTrip.transformScaleX, 0);
      expectClose(roundTrip.transformScaleY, 1);
    });
  });

  describe('Gradient Matrix Round-trip Tests', () => {
    it('should handle default horizontal gradient', () => {
      const params = {
        gradientStartX: 0,
        gradientStartY: 0.5,
        gradientEndX: 1,
        gradientEndY: 0.5,
        gradientScale: 1
      };

      const matrix = flattenedToMatrix(params);
      const roundTrip = matrixToFlattened(matrix);

      expectClose(roundTrip.gradientStartX, 0);
      expectClose(roundTrip.gradientStartY, 0.5);
      expectClose(roundTrip.gradientEndX, 1);
      expectClose(roundTrip.gradientEndY, 0.5);
      expectClose(roundTrip.gradientScale, 1);
    });

    it('should handle vertical gradient', () => {
      const params = {
        gradientStartX: 0.5,
        gradientStartY: 0,
        gradientEndX: 0.5,
        gradientEndY: 1,
        gradientScale: 1
      };

      const matrix = flattenedToMatrix(params);
      const roundTrip = matrixToFlattened(matrix);

      expectClose(roundTrip.gradientStartX, 0.5);
      expectClose(roundTrip.gradientStartY, 0);
      expectClose(roundTrip.gradientEndX, 0.5);
      expectClose(roundTrip.gradientEndY, 1);
      expectClose(roundTrip.gradientScale, 1);
    });

    it('should handle diagonal gradient', () => {
      const params = {
        gradientStartX: 0,
        gradientStartY: 0,
        gradientEndX: 1,
        gradientEndY: 1,
        gradientScale: 1
      };

      const matrix = flattenedToMatrix(params);
      const roundTrip = matrixToFlattened(matrix);

      expectClose(roundTrip.gradientStartX, 0);
      expectClose(roundTrip.gradientStartY, 0);
      
      // When gradientScale is provided, it acts as a multiplier on the normalized direction
      // So the actual end position will be start + (normalized_direction * scale)
      const expectedEndX = 0 + (1 / Math.sqrt(2)) * 1; // ≈ 0.707
      const expectedEndY = 0 + (1 / Math.sqrt(2)) * 1; // ≈ 0.707
      
      expectClose(roundTrip.gradientEndX, expectedEndX);
      expectClose(roundTrip.gradientEndY, expectedEndY);
      expectClose(roundTrip.gradientScale, 1); // The scale should be preserved
    });

    it('should handle scaled gradient', () => {
      const params = {
        gradientStartX: 0.2,
        gradientStartY: 0.3,
        gradientEndX: 0.8,
        gradientEndY: 0.7,
        gradientScale: 2.0
      };

      const matrix = flattenedToMatrix(params);
      const roundTrip = matrixToFlattened(matrix);

      expectClose(roundTrip.gradientStartX, 0.2);
      expectClose(roundTrip.gradientStartY, 0.3);
      expectClose(roundTrip.gradientScale, 2.0);
      // End position should reflect the scaled vector
    });

    it('should handle zero-length gradient', () => {
      const params = {
        gradientStartX: 0.5,
        gradientStartY: 0.5,
        gradientEndX: 0.5,
        gradientEndY: 0.5,
        gradientScale: 1
      };

      const matrix = flattenedToMatrix(params);
      const roundTrip = matrixToFlattened(matrix);

      expectClose(roundTrip.gradientStartX, 0.5);
      expectClose(roundTrip.gradientStartY, 0.5);
      expectClose(roundTrip.gradientScale, 1); // Should default to 1 when no direction
    });
  });

  describe('Matrix Mathematical Properties', () => {
    it('should preserve matrix determinant for simple transformations', () => {
      const params = {
        transformScaleX: 2,
        transformScaleY: 3
      };

      const matrix = flattenedToImageMatrix(params);
      const [[a, b], [c, d]] = matrix;
      const determinant = a * d - b * c;

      // For pure scaling, determinant should equal scaleX * scaleY
      expectClose(determinant, 6); // 2 * 3
    });

    it('should handle matrix with negative determinant (flipped)', () => {
      const params = {
        imageFlipHorizontal: true,
        transformScale: 1
      };

      const matrix = flattenedToImageMatrix(params);
      const [[a, b], [c, d]] = matrix;
      const determinant = a * d - b * c;

      expect(determinant).toBeLessThan(0); // Should be negative due to flip
    });

    it('should preserve rotation properties', () => {
      const params = {
        transformRotation: 60,
        transformScale: 1
      };

      const matrix = flattenedToImageMatrix(params);
      const [[a, b], [c, d]] = matrix;
      
      // For pure rotation, a^2 + b^2 should equal 1 (unit vector)
      expectClose(a * a + b * b, 1);
      expectClose(c * c + d * d, 1);
      
      // Rotation matrix should be orthogonal: a*c + b*d = 0
      expectClose(a * c + b * d, 0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle very small values', () => {
      const params = {
        transformScale: 0.001,
        transformRotation: 0.1
      };

      const matrix = flattenedToImageMatrix(params);
      const roundTrip = imageMatrixToFlattened(matrix);

      expectClose(roundTrip.transformScale, 0.001, 0.0001);
      expectClose(roundTrip.transformRotation, 0.1, 0.1);
    });

    it('should handle very large values', () => {
      const params = {
        transformScale: 1000,
        imageTranslateX: 99999
      };

      const matrix = flattenedToImageMatrix(params);
      const roundTrip = imageMatrixToFlattened(matrix);

      expectClose(roundTrip.transformScale, 1000, 1);
      expectClose(roundTrip.imageTranslateX, 99999, 1);
    });

    it('should handle 360-degree rotation normalization', () => {
      const params = {
        transformRotation: 370 // Should normalize to 10 degrees
      };

      const matrix = flattenedToImageMatrix(params);
      const roundTrip = imageMatrixToFlattened(matrix);

      // Rotation should be equivalent to 10 degrees
      expectClose(Math.abs(roundTrip.transformRotation - 10), 0, 1);
    });
  });
});