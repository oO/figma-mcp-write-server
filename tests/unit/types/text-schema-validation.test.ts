import { describe, it, expect } from 'vitest';
import { ManageTextSchema } from '../../../src/types/text-operations.js';

describe('Text Schema Validation', () => {
  describe('Operation Validation', () => {
    it('should accept all valid operations', () => {
      const validOperations = [
        'create', 'update', 'get', 'delete', 
        'set_range', 'get_range', 'delete_range',
        'insert_text', 'delete_text', 'search_text'
      ];

      validOperations.forEach(operation => {
        const result = ManageTextSchema.safeParse({
          operation,
          characters: 'test' // Required for create
        });
        
        if (operation === 'create') {
          expect(result.success).toBe(true);
        } else {
          // For non-create operations, we need different required fields
          const specificResult = ManageTextSchema.safeParse({
            operation,
            nodeId: '123:456',
            searchQuery: 'test' // For search operations
          });
          expect(specificResult.success).toBe(true);
        }
      });
    });

    it('should reject invalid operations', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'invalid_operation',
        characters: 'test'
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('Create Operation Validation', () => {
    it('should require characters for create operation', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'create'
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('characters');
    });

    it('should accept valid create parameters', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'create',
        characters: 'Hello World',
        x: 100,
        y: 200,
        fontSize: 16,
        fontFamily: 'Arial'
      });
      
      expect(result.success).toBe(true);
    });

    it('should accept bulk create parameters', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'create',
        characters: ['Hello', 'World'],
        x: [100, 200],
        y: [200, 300],
        fontSize: [16, 18]
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject empty characters', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'create',
        characters: ''
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject empty characters in arrays', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'create',
        characters: ['Hello', '']
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('Search Operation Validation', () => {
    it('should require searchQuery for search_text operation', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'search_text'
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('searchQuery');
    });

    it('should accept search_text with nodeId', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'search_text',
        nodeId: '123:456',
        searchQuery: 'hello'
      });
      
      expect(result.success).toBe(true);
    });

    it('should accept search_text without nodeId (global search)', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'search_text',
        searchQuery: 'hello'
      });
      
      expect(result.success).toBe(true);
    });

    it('should accept search options', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'search_text',
        searchQuery: 'hello',
        searchCaseSensitive: true,
        searchWholeWord: true,
        searchMaxResults: 50
      });
      
      expect(result.success).toBe(true);
    });

    it('should validate searchMaxResults bounds', () => {
      const tooHigh = ManageTextSchema.safeParse({
        operation: 'search_text',
        searchQuery: 'hello',
        searchMaxResults: 1500
      });
      
      const tooLow = ManageTextSchema.safeParse({
        operation: 'search_text',
        searchQuery: 'hello',
        searchMaxResults: 0
      });
      
      expect(tooHigh.success).toBe(false);
      expect(tooLow.success).toBe(false);
    });

    it('should accept bulk search parameters', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'search_text',
        nodeId: ['123:456', '123:789'],
        searchQuery: ['hello', 'world'],
        searchCaseSensitive: [true, false],
        searchMaxResults: [10, 20]
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('Text Editing Operation Validation', () => {
    it('should require correct parameters for insert_text', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'insert_text',
        nodeId: '123:456',
        insertPosition: 5,
        insertText: 'inserted'
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject insert_text without required parameters', () => {
      const noNodeId = ManageTextSchema.safeParse({
        operation: 'insert_text',
        insertPosition: 5,
        insertText: 'inserted'
      });
      
      const noPosition = ManageTextSchema.safeParse({
        operation: 'insert_text',
        nodeId: '123:456',
        insertText: 'inserted'
      });
      
      const noText = ManageTextSchema.safeParse({
        operation: 'insert_text',
        nodeId: '123:456',
        insertPosition: 5
      });
      
      expect(noNodeId.success).toBe(false);
      expect(noPosition.success).toBe(false);
      expect(noText.success).toBe(false);
    });

    it('should require correct parameters for delete_text', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'delete_text',
        nodeId: '123:456',
        deleteStart: 5,
        deleteEnd: 10
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject delete_text with invalid range', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'delete_text',
        nodeId: '123:456',
        deleteStart: 10,
        deleteEnd: 5  // end before start
      });
      
      expect(result.success).toBe(false);
    });

    it('should accept bulk text editing parameters', () => {
      const insertResult = ManageTextSchema.safeParse({
        operation: 'insert_text',
        nodeId: ['123:456', '123:789'],
        insertPosition: [5, 10],
        insertText: ['hello', 'world'],
        insertUseStyle: ['BEFORE', 'AFTER']
      });
      
      const deleteResult = ManageTextSchema.safeParse({
        operation: 'delete_text',
        nodeId: ['123:456', '123:789'],
        deleteStart: [5, 10],
        deleteEnd: [10, 15]
      });
      
      expect(insertResult.success).toBe(true);
      expect(deleteResult.success).toBe(true);
    });
  });

  describe('Range Operation Validation', () => {
    it('should require nodeId for range operations', () => {
      const operations = ['set_range', 'get_range', 'delete_range'];
      
      operations.forEach(operation => {
        const result = ManageTextSchema.safeParse({
          operation,
          rangeStart: 0,
          rangeEnd: 5
        });
        
        expect(result.success).toBe(false);
      });
    });

    it('should accept valid range operations', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'set_range',
        nodeId: '123:456',
        rangeStart: 0,
        rangeEnd: 5,
        rangeFontSize: 18
      });
      
      expect(result.success).toBe(true);
    });

    it('should validate range bounds', () => {
      const negativeStart = ManageTextSchema.safeParse({
        operation: 'get_range',
        nodeId: '123:456',
        rangeStart: -1,
        rangeEnd: 5
      });
      
      const zeroEnd = ManageTextSchema.safeParse({
        operation: 'get_range',
        nodeId: '123:456',
        rangeStart: 0,
        rangeEnd: 0
      });
      
      expect(negativeStart.success).toBe(false);
      expect(zeroEnd.success).toBe(false);
    });
  });

  describe('Advanced Text Decoration Validation', () => {
    it('should accept valid text decoration parameters', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'update',
        nodeId: '123:456',
        textDecorationStyle: 'WAVY',
        textDecorationOffset: 2,
        textDecorationOffsetUnit: 'PIXELS',
        textDecorationThickness: 1.5,
        textDecorationThicknessUnit: 'AUTO',
        textDecorationColor: '#FF0000',
        textDecorationColorAuto: false,
        textDecorationSkipInk: true
      });
      
      expect(result.success).toBe(true);
    });

    it('should validate text decoration style enum', () => {
      const invalid = ManageTextSchema.safeParse({
        operation: 'update',
        nodeId: '123:456',
        textDecorationStyle: 'INVALID_STYLE'
      });
      
      expect(invalid.success).toBe(false);
    });

    it('should validate text decoration color format', () => {
      const invalidColor = ManageTextSchema.safeParse({
        operation: 'update',
        nodeId: '123:456',
        textDecorationColor: 'red'
      });
      
      const shortColor = ManageTextSchema.safeParse({
        operation: 'update',
        nodeId: '123:456',
        textDecorationColor: '#FFF'
      });
      
      expect(invalidColor.success).toBe(false);
      expect(shortColor.success).toBe(false);
    });
  });

  describe('Parameter Type Validation', () => {
    it('should validate numeric parameters', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'create',
        characters: 'test',
        fontSize: 'invalid'
      });
      
      expect(result.success).toBe(false);
    });

    it('should validate boolean parameters', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'create',
        characters: 'test',
        autoRename: 'invalid'
      });
      
      expect(result.success).toBe(false);
    });

    it('should validate string parameters', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'create',
        characters: 123
      });
      
      expect(result.success).toBe(false);
    });

    it('should validate array parameters', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'create',
        characters: ['test', 123]
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('Font Size Validation', () => {
    it('should accept valid font sizes', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'create',
        characters: 'test',
        fontSize: 16
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject font sizes outside valid range', () => {
      const tooSmall = ManageTextSchema.safeParse({
        operation: 'create',
        characters: 'test',
        fontSize: 0
      });
      
      const tooLarge = ManageTextSchema.safeParse({
        operation: 'create',
        characters: 'test',
        fontSize: 500
      });
      
      expect(tooSmall.success).toBe(false);
      expect(tooLarge.success).toBe(false);
    });
  });

  describe('Color Format Validation', () => {
    it('should accept valid hex colors', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'create',
        characters: 'test',
        fillColor: '#FF0000'
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid color formats', () => {
      const invalidFormats = [
        'red',
        '#FFF',
        '#GGGGGG',
        'rgb(255,0,0)',
        '#FF00000'
      ];
      
      invalidFormats.forEach(color => {
        const result = ManageTextSchema.safeParse({
          operation: 'create',
          characters: 'test',
          fillColor: color
        });
        
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Bulk Operation Validation', () => {
    it('should accept consistent array lengths', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'create',
        characters: ['Hello', 'World'],
        fontSize: [16, 18],
        fillColor: ['#FF0000', '#00FF00']
      });
      
      expect(result.success).toBe(true);
    });

    it('should accept mixed single values and arrays', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'create',
        characters: ['Hello', 'World'],
        fontSize: 16,  // Single value
        fillColor: ['#FF0000', '#00FF00']
      });
      
      expect(result.success).toBe(true);
    });

    it('should validate all array elements', () => {
      const result = ManageTextSchema.safeParse({
        operation: 'create',
        characters: ['Hello', ''],  // Empty string in array
        fontSize: [16, 18]
      });
      
      expect(result.success).toBe(false);
    });
  });
});