import { describe, it, expect } from '@jest/globals';
import { caseInsensitiveEnum, EnumPreprocessor, preprocessEnumFields } from '../src/types/enum-utils.js';
import { 
  FigmaTextAlign, 
  FigmaExportFormats, 
  FigmaNodeTypes,
  FigmaStyleTypesCompat,
  FigmaPaintTypes 
} from '../src/types/figma-enums.js';

describe('Case-Insensitive Enum Preprocessing', () => {
  describe('Basic enum preprocessing', () => {
    it('should accept exact enum values', () => {
      const textAlignSchema = caseInsensitiveEnum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']);
      
      expect(textAlignSchema.parse('LEFT')).toBe('LEFT');
      expect(textAlignSchema.parse('CENTER')).toBe('CENTER');
      expect(textAlignSchema.parse('RIGHT')).toBe('RIGHT');
      expect(textAlignSchema.parse('JUSTIFIED')).toBe('JUSTIFIED');
    });

    it('should normalize lowercase inputs to uppercase canonical form', () => {
      const textAlignSchema = caseInsensitiveEnum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']);
      
      expect(textAlignSchema.parse('left')).toBe('LEFT');
      expect(textAlignSchema.parse('center')).toBe('CENTER');
      expect(textAlignSchema.parse('right')).toBe('RIGHT');
      expect(textAlignSchema.parse('justified')).toBe('JUSTIFIED');
    });

    it('should normalize title case inputs to canonical form', () => {
      const textAlignSchema = caseInsensitiveEnum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']);
      
      expect(textAlignSchema.parse('Left')).toBe('LEFT');
      expect(textAlignSchema.parse('Center')).toBe('CENTER');
      expect(textAlignSchema.parse('Right')).toBe('RIGHT');
      expect(textAlignSchema.parse('Justified')).toBe('JUSTIFIED');
    });

    it('should handle camelCase for underscore enums', () => {
      const paintTypeSchema = caseInsensitiveEnum(['GRADIENT_LINEAR', 'GRADIENT_RADIAL']);
      
      expect(paintTypeSchema.parse('gradientLinear')).toBe('GRADIENT_LINEAR');
      expect(paintTypeSchema.parse('gradientRadial')).toBe('GRADIENT_RADIAL');
      expect(paintTypeSchema.parse('GradientLinear')).toBe('GRADIENT_LINEAR');
    });

    it('should reject completely invalid enum values', () => {
      const textAlignSchema = caseInsensitiveEnum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']);
      
      expect(() => textAlignSchema.parse('INVALID')).toThrow();
      expect(() => textAlignSchema.parse('MIDDLE')).toThrow();
      expect(() => textAlignSchema.parse('TOP')).toThrow();
    });
  });

  describe('Figma enum integrations', () => {
    it('should work with FigmaTextAlign.horizontal', () => {
      expect(FigmaTextAlign.horizontal.parse('left')).toBe('LEFT');
      expect(FigmaTextAlign.horizontal.parse('LEFT')).toBe('LEFT');
      expect(FigmaTextAlign.horizontal.parse('Center')).toBe('CENTER');
      expect(FigmaTextAlign.horizontal.parse('justified')).toBe('JUSTIFIED');
    });

    it('should work with FigmaTextAlign.vertical', () => {
      expect(FigmaTextAlign.vertical.parse('top')).toBe('TOP');
      expect(FigmaTextAlign.vertical.parse('CENTER')).toBe('CENTER');
      expect(FigmaTextAlign.vertical.parse('Bottom')).toBe('BOTTOM');
    });

    it('should work with FigmaExportFormats', () => {
      expect(FigmaExportFormats.parse('png')).toBe('PNG');
      expect(FigmaExportFormats.parse('JPG')).toBe('JPG');
      expect(FigmaExportFormats.parse('Svg')).toBe('SVG');
      expect(FigmaExportFormats.parse('pdf')).toBe('PDF');
    });

    it('should work with FigmaNodeTypes', () => {
      expect(FigmaNodeTypes.parse('rectangle')).toBe('RECTANGLE');
      expect(FigmaNodeTypes.parse('ELLIPSE')).toBe('ELLIPSE');
      expect(FigmaNodeTypes.parse('Frame')).toBe('FRAME');
      expect(FigmaNodeTypes.parse('text')).toBe('TEXT');
    });

    it('should work with lowercase compat enums', () => {
      expect(FigmaStyleTypesCompat.parse('PAINT')).toBe('paint');
      expect(FigmaStyleTypesCompat.parse('paint')).toBe('paint');
      expect(FigmaStyleTypesCompat.parse('Text')).toBe('text');
      expect(FigmaStyleTypesCompat.parse('EFFECT')).toBe('effect');
    });

    it('should handle complex paint types with underscores', () => {
      expect(FigmaPaintTypes.parse('solid')).toBe('SOLID');
      expect(FigmaPaintTypes.parse('gradientLinear')).toBe('GRADIENT_LINEAR');
      expect(FigmaPaintTypes.parse('GRADIENT_RADIAL')).toBe('GRADIENT_RADIAL');
      expect(FigmaPaintTypes.parse('gradientAngular')).toBe('GRADIENT_ANGULAR');
    });
  });

  describe('Object field preprocessing', () => {
    it('should preprocess enum fields in objects', () => {
      const testData = {
        alignment: 'left',
        format: 'png',
        nodeType: 'rectangle',
        otherField: 'unchanged'
      };

      const enumMappings = {
        alignment: ['LEFT', 'CENTER', 'RIGHT'],
        format: ['PNG', 'JPG', 'SVG'],
        nodeType: ['RECTANGLE', 'ELLIPSE', 'FRAME']
      };

      const processed = preprocessEnumFields(testData, enumMappings);

      expect(processed.alignment).toBe('LEFT');
      expect(processed.format).toBe('PNG');
      expect(processed.nodeType).toBe('RECTANGLE');
      expect(processed.otherField).toBe('unchanged');
    });

    it('should handle missing enum fields gracefully', () => {
      const testData = {
        alignment: 'left',
        otherField: 'unchanged'
      };

      const enumMappings = {
        alignment: ['LEFT', 'CENTER', 'RIGHT'],
        missingField: ['A', 'B', 'C']
      };

      const processed = preprocessEnumFields(testData, enumMappings);

      expect(processed.alignment).toBe('LEFT');
      expect(processed.otherField).toBe('unchanged');
      expect(processed.missingField).toBeUndefined();
    });
  });

  describe('Agent Experience scenarios', () => {
    it('should handle common agent input variations', () => {
      // Common variations agents might use
      const variations = [
        { input: 'left', expected: 'LEFT' },
        { input: 'LEFT', expected: 'LEFT' },
        { input: 'Left', expected: 'LEFT' },
        { input: 'center', expected: 'CENTER' },
        { input: 'CENTER', expected: 'CENTER' },
        { input: 'Center', expected: 'CENTER' },
        { input: 'justified', expected: 'JUSTIFIED' },
        { input: 'JUSTIFIED', expected: 'JUSTIFIED' },
        { input: 'Justified', expected: 'JUSTIFIED' }
      ];

      const schema = FigmaTextAlign.horizontal;

      variations.forEach(({ input, expected }) => {
        expect(schema.parse(input)).toBe(expected);
      });
    });

    it('should handle export format variations', () => {
      const variations = [
        { input: 'png', expected: 'PNG' },
        { input: 'PNG', expected: 'PNG' },
        { input: 'Png', expected: 'PNG' },
        { input: 'jpg', expected: 'JPG' },
        { input: 'svg', expected: 'SVG' },
        { input: 'pdf', expected: 'PDF' }
      ];

      variations.forEach(({ input, expected }) => {
        expect(FigmaExportFormats.parse(input)).toBe(expected);
      });
    });

    it('should handle style type variations for backward compatibility', () => {
      const variations = [
        { input: 'paint', expected: 'paint' },
        { input: 'PAINT', expected: 'paint' },
        { input: 'Paint', expected: 'paint' },
        { input: 'text', expected: 'text' },
        { input: 'TEXT', expected: 'text' },
        { input: 'effect', expected: 'effect' },
        { input: 'EFFECT', expected: 'effect' }
      ];

      variations.forEach(({ input, expected }) => {
        expect(FigmaStyleTypesCompat.parse(input)).toBe(expected);
      });
    });

    it('should provide helpful error messages for invalid values', () => {
      const schema = FigmaTextAlign.horizontal;

      // Test that invalid values still throw appropriate errors
      expect(() => schema.parse('middle')).toThrow();
      expect(() => schema.parse('top')).toThrow();
      expect(() => schema.parse('invalid')).toThrow();
    });
  });

  describe('Performance considerations', () => {
    it('should handle repeated parsing efficiently', () => {
      const schema = FigmaTextAlign.horizontal;
      
      // Parse the same value multiple times to test caching
      for (let i = 0; i < 100; i++) {
        expect(schema.parse('left')).toBe('LEFT');
        expect(schema.parse('center')).toBe('CENTER');
        expect(schema.parse('right')).toBe('RIGHT');
      }
    });
  });
});