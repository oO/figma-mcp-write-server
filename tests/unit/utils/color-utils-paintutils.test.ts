import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createImagePaint,
  createImageFromUrl,
  createImageFromBytes,
  validatePaint,
  clonePaint,
  isPaintType,
  getImageDimensions,
  applyImageFilters,
  convertStopArrays,
  convertFlattenedHandles
} from '../../../figma-plugin/src/utils/color-utils.js';

// Mock Figma API
const mockFigma = {
  createImageAsync: vi.fn(),
  createImage: vi.fn(),
  getImageByHash: vi.fn()
};

global.figma = mockFigma as any;

// Mock Paint objects for testing
const mockSolidPaint: SolidPaint = {
  type: 'SOLID',
  color: { r: 1, g: 0, b: 0 },
  opacity: 1,
  visible: true,
  blendMode: 'NORMAL'
};

const mockGradientPaint: GradientPaint = {
  type: 'GRADIENT_LINEAR',
  gradientStops: [
    { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
    { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } }
  ],
  gradientHandlePositions: [
    { x: 0, y: 0.5 },
    { x: 1, y: 0.5 },
    { x: 0.5, y: 0 }
  ],
  opacity: 1,
  visible: true,
  blendMode: 'NORMAL'
};

const mockImagePaint: ImagePaint = {
  type: 'IMAGE',
  imageHash: 'test-hash-123',
  scaleMode: 'FILL',
  opacity: 1,
  visible: true,
  blendMode: 'NORMAL'
};

describe('Color Utils - PaintUtils Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createImagePaint', () => {
    it('should create basic image paint with default scale mode', () => {
      const result = createImagePaint('test-hash');

      expect(result).toEqual({
        type: 'IMAGE',
        imageHash: 'test-hash',
        scaleMode: 'FILL'
      });
    });

    it('should create image paint with custom scale mode', () => {
      const result = createImagePaint('test-hash', 'CROP');

      expect(result.scaleMode).toBe('CROP');
    });

    it('should create image paint with transformation matrix', () => {
      const transform = [[1, 0, 0], [0, 1, 0]];
      const result = createImagePaint('test-hash', 'TILE', transform);

      expect(result.imageTransform).toEqual(transform);
    });

    it('should create image paint with filters', () => {
      const filters = { exposure: 0.5, contrast: -0.2 };
      const result = createImagePaint('test-hash', 'FIT', undefined, filters);

      expect(result.filters).toEqual(filters);
    });

    it('should handle case-insensitive scale modes', () => {
      const result = createImagePaint('test-hash', 'crop');

      expect(result.scaleMode).toBe('CROP');
    });
  });

  describe('createImageFromUrl', () => {
    it('should create image from URL successfully', async () => {
      const mockImage = {
        hash: 'url-hash-123',
        getSizeAsync: vi.fn().mockResolvedValue({ width: 200, height: 150 })
      };
      
      mockFigma.createImageAsync.mockResolvedValue(mockImage);

      const result = await createImageFromUrl('https://example.com/image.jpg');

      expect(mockFigma.createImageAsync).toHaveBeenCalledWith('https://example.com/image.jpg');
      expect(result).toEqual({
        imageHash: 'url-hash-123',
        dimensions: { width: 200, height: 150 }
      });
    });

    it('should handle URL creation failure', async () => {
      mockFigma.createImageAsync.mockRejectedValue(new Error('Invalid URL'));

      await expect(createImageFromUrl('invalid-url')).rejects.toThrow('Failed to create image from URL');
    });

    it('should handle size retrieval failure', async () => {
      const mockImage = {
        hash: 'url-hash-123',
        getSizeAsync: vi.fn().mockRejectedValue(new Error('Size error'))
      };
      
      mockFigma.createImageAsync.mockResolvedValue(mockImage);

      await expect(createImageFromUrl('https://example.com/image.jpg')).rejects.toThrow('Failed to create image from URL');
    });
  });

  describe('createImageFromBytes', () => {
    it('should create image from bytes successfully', async () => {
      const mockImage = {
        hash: 'bytes-hash-456',
        getSizeAsync: vi.fn().mockResolvedValue({ width: 300, height: 200 })
      };
      
      mockFigma.createImage.mockReturnValue(mockImage);

      const bytes = new Uint8Array([137, 80, 78, 71]); // PNG header
      const result = await createImageFromBytes(bytes);

      expect(mockFigma.createImage).toHaveBeenCalledWith(bytes);
      expect(result).toEqual({
        imageHash: 'bytes-hash-456',
        dimensions: { width: 300, height: 200 }
      });
    });

    it('should handle bytes creation failure', async () => {
      mockFigma.createImage.mockImplementation(() => {
        throw new Error('Invalid bytes');
      });

      const bytes = new Uint8Array([1, 2, 3]);
      await expect(createImageFromBytes(bytes)).rejects.toThrow('Failed to create image from bytes');
    });
  });

  describe('validatePaint', () => {
    it('should validate solid paint', () => {
      expect(validatePaint(mockSolidPaint)).toBe(true);
    });

    it('should validate gradient paint', () => {
      expect(validatePaint(mockGradientPaint)).toBe(true);
    });

    it('should validate image paint', () => {
      expect(validatePaint(mockImagePaint)).toBe(true);
    });

    it('should reject null paint', () => {
      expect(validatePaint(null as any)).toBe(false);
    });

    it('should reject paint without type', () => {
      expect(validatePaint({ color: { r: 1, g: 0, b: 0 } } as any)).toBe(false);
    });

    it('should reject solid paint without color', () => {
      expect(validatePaint({ type: 'SOLID', opacity: 1 } as any)).toBe(false);
    });

    it('should reject gradient paint without gradientStops', () => {
      expect(validatePaint({ type: 'GRADIENT_LINEAR', opacity: 1 } as any)).toBe(false);
    });

    it('should reject image paint without imageHash', () => {
      expect(validatePaint({ type: 'IMAGE', scaleMode: 'FILL' } as any)).toBe(false);
    });

    it('should reject unknown paint type', () => {
      expect(validatePaint({ type: 'UNKNOWN', data: {} } as any)).toBe(false);
    });
  });

  describe('clonePaint', () => {
    it('should deep clone solid paint', () => {
      const cloned = clonePaint(mockSolidPaint);

      expect(cloned).toEqual(mockSolidPaint);
      expect(cloned).not.toBe(mockSolidPaint);
      expect(cloned.color).not.toBe(mockSolidPaint.color);
    });

    it('should deep clone gradient paint', () => {
      const cloned = clonePaint(mockGradientPaint) as GradientPaint;

      expect(cloned).toEqual(mockGradientPaint);
      expect(cloned).not.toBe(mockGradientPaint);
      expect(cloned.gradientStops).not.toBe(mockGradientPaint.gradientStops);
      expect(cloned.gradientHandlePositions).not.toBe(mockGradientPaint.gradientHandlePositions);
    });

    it('should deep clone image paint', () => {
      const imageWithFilters = {
        ...mockImagePaint,
        filters: { exposure: 0.5, contrast: -0.2 }
      };
      
      const cloned = clonePaint(imageWithFilters) as ImagePaint;

      expect(cloned).toEqual(imageWithFilters);
      expect(cloned).not.toBe(imageWithFilters);
      expect(cloned.filters).not.toBe(imageWithFilters.filters);
    });

    it('should handle paint with complex nested structures', () => {
      const complexPaint = {
        ...mockGradientPaint,
        gradientStops: [
          { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
          { position: 0.5, color: { r: 0, g: 1, b: 0, a: 0.8 } },
          { position: 1, color: { r: 0, g: 0, b: 1, a: 0.6 } }
        ]
      };

      const cloned = clonePaint(complexPaint);

      expect(cloned).toEqual(complexPaint);
      expect(cloned.gradientStops[0].color).not.toBe(complexPaint.gradientStops[0].color);
    });
  });

  describe('isPaintType', () => {
    it('should identify solid paint type', () => {
      expect(isPaintType(mockSolidPaint, 'SOLID')).toBe(true);
      expect(isPaintType(mockSolidPaint, 'solid')).toBe(true);
      expect(isPaintType(mockSolidPaint, 'IMAGE')).toBe(false);
    });

    it('should identify gradient paint types', () => {
      expect(isPaintType(mockGradientPaint, 'GRADIENT_LINEAR')).toBe(true);
      expect(isPaintType(mockGradientPaint, 'gradient_linear')).toBe(true);
      expect(isPaintType(mockGradientPaint, 'GRADIENT_RADIAL')).toBe(false);
    });

    it('should identify image paint type', () => {
      expect(isPaintType(mockImagePaint, 'IMAGE')).toBe(true);
      expect(isPaintType(mockImagePaint, 'image')).toBe(true);
      expect(isPaintType(mockImagePaint, 'SOLID')).toBe(false);
    });

    it('should handle case-insensitive type checking', () => {
      expect(isPaintType(mockSolidPaint, 'Solid')).toBe(true);
      expect(isPaintType(mockImagePaint, 'Image')).toBe(true);
      expect(isPaintType(mockGradientPaint, 'Gradient_Linear')).toBe(true);
    });
  });

  describe('getImageDimensions', () => {
    it('should get image dimensions successfully', async () => {
      const mockImage = {
        getSizeAsync: vi.fn().mockResolvedValue({ width: 400, height: 300 })
      };
      
      mockFigma.getImageByHash.mockReturnValue(mockImage);

      const result = await getImageDimensions('test-hash');

      expect(mockFigma.getImageByHash).toHaveBeenCalledWith('test-hash');
      expect(result).toEqual({ width: 400, height: 300 });
    });

    it('should return null for non-existent image', async () => {
      mockFigma.getImageByHash.mockReturnValue(null);

      const result = await getImageDimensions('nonexistent-hash');

      expect(result).toBeNull();
    });

    it('should return null on size retrieval error', async () => {
      const mockImage = {
        getSizeAsync: vi.fn().mockRejectedValue(new Error('Size error'))
      };
      
      mockFigma.getImageByHash.mockReturnValue(mockImage);

      const result = await getImageDimensions('error-hash');

      expect(result).toBeNull();
    });
  });

  describe('applyImageFilters', () => {
    it('should apply all filter types', () => {
      const filterValues = {
        filterExposure: 0.3,
        filterContrast: -0.2,
        filterSaturation: 0.5,
        filterTemperature: 0.1,
        filterTint: -0.1,
        filterHighlights: 0.2,
        filterShadows: -0.3
      };

      const result = applyImageFilters(mockImagePaint, filterValues);

      expect(result.filters).toEqual({
        exposure: 0.3,
        contrast: -0.2,
        saturation: 0.5,
        temperature: 0.1,
        tint: -0.1,
        highlights: 0.2,
        shadows: -0.3
      });
    });

    it('should apply partial filters with defaults', () => {
      const filterValues = {
        filterExposure: 0.5,
        filterSaturation: -0.3
      };

      const result = applyImageFilters(mockImagePaint, filterValues);

      expect(result.filters).toEqual({
        exposure: 0.5,
        contrast: 0,
        saturation: -0.3,
        temperature: 0,
        tint: 0,
        highlights: 0,
        shadows: 0
      });
    });

    it('should preserve existing filters', () => {
      const paintWithFilters = {
        ...mockImagePaint,
        filters: { exposure: 0.1, contrast: 0.2 }
      };

      const filterValues = {
        filterSaturation: 0.3,
        filterTemperature: -0.1
      };

      const result = applyImageFilters(paintWithFilters, filterValues);

      expect(result.filters).toEqual({
        exposure: 0,
        contrast: 0,
        saturation: 0.3,
        temperature: -0.1,
        tint: 0,
        highlights: 0,
        shadows: 0
      });
    });

    it('should not modify original paint', () => {
      const original = { ...mockImagePaint };
      const filterValues = { filterExposure: 0.5 };

      applyImageFilters(original, filterValues);

      expect(original).toEqual(mockImagePaint);
      expect(original.filters).toBeUndefined();
    });

    it('should handle empty filter values', () => {
      const result = applyImageFilters(mockImagePaint, {});

      expect(result.filters).toEqual({
        exposure: 0,
        contrast: 0,
        saturation: 0,
        temperature: 0,
        tint: 0,
        highlights: 0,
        shadows: 0
      });
    });

    it('should handle null filter values', () => {
      const result = applyImageFilters(mockImagePaint, null);

      expect(result.filters).toBeUndefined();
    });
  });

  describe('convertStopArrays', () => {
    it('should convert parallel arrays to ColorStop array', () => {
      const positions = [0, 0.5, 1];
      const colors = ['#FF0000', '#00FF00', '#0000FF'];

      const result = convertStopArrays(positions, colors);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        position: 0,
        color: { r: 1, g: 0, b: 0, a: 1 }
      });
      expect(result[1]).toEqual({
        position: 0.5,
        color: { r: 0, g: 1, b: 0, a: 1 }
      });
      expect(result[2]).toEqual({
        position: 1,
        color: { r: 0, g: 0, b: 1, a: 1 }
      });
    });

    it('should handle minimum required stops', () => {
      const positions = [0, 1];
      const colors = ['#FFFFFF', '#000000'];

      const result = convertStopArrays(positions, colors);

      expect(result).toHaveLength(2);
      expect(result[0].position).toBe(0);
      expect(result[1].position).toBe(1);
    });

    it('should throw error for mismatched array lengths', () => {
      const positions = [0, 0.5, 1];
      const colors = ['#FF0000', '#00FF00']; // Different length

      expect(() => convertStopArrays(positions, colors))
        .toThrow('Position and color arrays must have the same length');
    });

    it('should handle colors with alpha', () => {
      const positions = [0, 1];
      const colors = ['#FF0000AA', '#0000FFCC'];

      const result = convertStopArrays(positions, colors);

      expect(result[0].color.a).toBeCloseTo(0.667, 3); // AA = 170/255
      expect(result[1].color.a).toBeCloseTo(0.8, 3);   // CC = 204/255
    });

    it('should handle empty arrays', () => {
      const result = convertStopArrays([], []);

      expect(result).toEqual([]);
    });

    it('should handle large arrays', () => {
      const positions = Array.from({ length: 10 }, (_, i) => i / 9);
      const colors = Array.from({ length: 10 }, () => '#FF0000');

      const result = convertStopArrays(positions, colors);

      expect(result).toHaveLength(10);
      expect(result[0].position).toBe(0);
      expect(result[9].position).toBe(1);
    });
  });

  describe('convertFlattenedHandles', () => {
    it('should convert flattened coordinates to Vector array', () => {
      const flattenedHandles = {
        gradientStartX: 0.1,
        gradientStartY: 0.2,
        gradientEndX: 0.8,
        gradientEndY: 0.9,
        gradientWidthX: 0.4,
        gradientWidthY: 0.3
      };

      const result = convertFlattenedHandles(flattenedHandles);

      expect(result).toEqual([
        { x: 0.1, y: 0.2 },
        { x: 0.8, y: 0.9 },
        { x: 0.4, y: 0.3 }
      ]);
    });

    it('should use default values for missing coordinates', () => {
      const flattenedHandles = {
        gradientStartX: 0.2,
        gradientEndY: 0.8
      };

      const result = convertFlattenedHandles(flattenedHandles);

      expect(result).toEqual([
        { x: 0.2, y: 0.5 },  // Default gradientStartY = 0.5
        { x: 1, y: 0.8 },    // Default gradientEndX = 1
        { x: 0.5, y: 0 }     // Default gradientWidthX/Y = 0.5/0
      ]);
    });

    it('should handle empty flattened handles object', () => {
      const result = convertFlattenedHandles({});

      expect(result).toEqual([
        { x: 0, y: 0.5 },    // All defaults
        { x: 1, y: 0.5 },
        { x: 0.5, y: 0 }
      ]);
    });

    it('should handle all zero coordinates', () => {
      const flattenedHandles = {
        gradientStartX: 0,
        gradientStartY: 0,
        gradientEndX: 0,
        gradientEndY: 0,
        gradientWidthX: 0,
        gradientWidthY: 0
      };

      const result = convertFlattenedHandles(flattenedHandles);

      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 }
      ]);
    });

    it('should handle edge case coordinates', () => {
      const flattenedHandles = {
        gradientStartX: 1,
        gradientStartY: 1,
        gradientEndX: 0,
        gradientEndY: 0,
        gradientWidthX: 0.5,
        gradientWidthY: 0.5
      };

      const result = convertFlattenedHandles(flattenedHandles);

      expect(result).toEqual([
        { x: 1, y: 1 },
        { x: 0, y: 0 },
        { x: 0.5, y: 0.5 }
      ]);
    });

    it('should validate coordinate bounds (0-1)', () => {
      // This test documents expected behavior - coordinates outside 0-1 are passed through
      const flattenedHandles = {
        gradientStartX: -0.5,
        gradientEndX: 1.5
      };

      const result = convertFlattenedHandles(flattenedHandles);

      expect(result[0].x).toBe(-0.5); // Out of bounds values passed through
      expect(result[1].x).toBe(1.5);
    });
  });

  describe('Integration scenarios', () => {
    it('should work together for complete gradient creation', () => {
      const positions = [0, 0.3, 0.7, 1];
      const colors = ['#FF0000', '#FFFF00', '#00FF00', '#0000FF'];
      const handles = {
        gradientStartX: 0,
        gradientStartY: 0,
        gradientEndX: 1,
        gradientEndY: 1
      };

      const stops = convertStopArrays(positions, colors);
      const vectors = convertFlattenedHandles(handles);

      expect(stops).toHaveLength(4);
      expect(vectors).toHaveLength(3);
      expect(stops[1].position).toBe(0.3);
      expect(vectors[0]).toEqual({ x: 0, y: 0 });
      expect(vectors[1]).toEqual({ x: 1, y: 1 });
    });

    it('should work together for complete image paint creation', async () => {
      const mockImage = {
        hash: 'test-hash',
        getSizeAsync: vi.fn().mockResolvedValue({ width: 100, height: 100 })
      };
      
      mockFigma.createImageAsync.mockResolvedValue(mockImage);

      const imageResult = await createImageFromUrl('https://example.com/test.jpg');
      const paint = createImagePaint(imageResult.imageHash, 'CROP');
      const filteredPaint = applyImageFilters(paint, { filterExposure: 0.5 });
      const isValid = validatePaint(filteredPaint);
      const isImageType = isPaintType(filteredPaint, 'IMAGE');

      expect(imageResult.imageHash).toBe('test-hash');
      expect(paint.scaleMode).toBe('CROP');
      expect(filteredPaint.filters?.exposure).toBe(0.5);
      expect(isValid).toBe(true);
      expect(isImageType).toBe(true);
    });
  });
});