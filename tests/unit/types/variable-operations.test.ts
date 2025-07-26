import { describe, test, expect } from 'vitest';
import { 
  ManageCollectionsSchema, 
  ManageVariablesSchema
} from '@/types/variable-operations';

describe('Variable Operations Schemas', () => {
  describe('ManageCollectionsSchema', () => {
    test('should validate create operation', () => {
      const validData = {
        operation: 'create',
        name: 'Colors',
        modes: ['Light', 'Dark'],
        description: 'Color tokens'
      };

      const result = ManageCollectionsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should validate update operation', () => {
      const validData = {
        operation: 'update',
        collectionId: 'collection-1',
        name: 'Updated Colors'
      };

      const result = ManageCollectionsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should validate mode operations', () => {
      const addModeData = {
        operation: 'add_mode',
        collectionId: 'collection-1',
        newModeName: 'High Contrast'
      };

      const renameModeData = {
        operation: 'rename_mode',
        collectionId: 'collection-1',
        modeId: 'mode-1',
        newModeName: 'Dark Theme'
      };

      expect(ManageCollectionsSchema.safeParse(addModeData).success).toBe(true);
      expect(ManageCollectionsSchema.safeParse(renameModeData).success).toBe(true);
    });

    test('should reject invalid operations', () => {
      const invalidData = {
        operation: 'invalid_operation',
        collectionName: 'Test'
      };

      const result = ManageCollectionsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test('should handle optional fields', () => {
      const minimalData = {
        operation: 'list'
      };

      const result = ManageCollectionsSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });
  });

  describe('ManageVariablesSchema', () => {
    test('should validate variable creation', () => {
      const validData = {
        operation: 'create_variable',
        collectionId: 'collection-1',
        variableName: 'Primary Blue',
        variableType: 'COLOR',
        modeValues: { light: '#0066CC', dark: '#4A9EFF' }
      };

      const result = ManageVariablesSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should validate all variable types', () => {
      const types = ['COLOR', 'FLOAT', 'STRING', 'BOOLEAN'];
      
      types.forEach(type => {
        const data = {
          operation: 'create_variable',
          collectionId: 'collection-1',
          variableName: `Test ${type}`,
          variableType: type
        };

        const result = ManageVariablesSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    test('should validate binding operations', () => {
      const bindToNode = {
        operation: 'bind_variable',
        variableId: 'var-1',
        id: 'node-1',
        property: 'fills'
      };

      const bindToStyle = {
        operation: 'bind_variable',
        variableId: 'var-1',
        styleId: 'style-1',
        property: 'color'
      };

      expect(ManageVariablesSchema.safeParse(bindToNode).success).toBe(true);
      expect(ManageVariablesSchema.safeParse(bindToStyle).success).toBe(true);
    });

    test('should validate unbind operations', () => {
      const unbindFromNode = {
        operation: 'unbind_variable',
        id: 'node-1',
        property: 'width'
      };

      const unbindFromStyle = {
        operation: 'unbind_variable',
        styleId: 'style-1',
        property: 'paints'
      };

      expect(ManageVariablesSchema.safeParse(unbindFromNode).success).toBe(true);
      expect(ManageVariablesSchema.safeParse(unbindFromStyle).success).toBe(true);
    });

    test('should validate get_variable operations', () => {
      const getByNode = {
        operation: 'get_variable',
        id: 'node-1'
      };

      const getByVariable = {
        operation: 'get_variable',
        variableId: 'var-1'
      };

      expect(ManageVariablesSchema.safeParse(getByNode).success).toBe(true);
      expect(ManageVariablesSchema.safeParse(getByVariable).success).toBe(true);
    });

    test('should handle complex modeValues', () => {
      const complexData = {
        operation: 'create_variable',
        collectionId: 'collection-1',
        variableName: 'Spacing Scale',
        variableType: 'FLOAT',
        modeValues: {
          compact: 8,
          comfortable: 12,
          spacious: 16
        }
      };

      const result = ManageVariablesSchema.safeParse(complexData);
      expect(result.success).toBe(true);
    });

    test('should validate variable metadata', () => {
      const withMetadata = {
        operation: 'create_variable',
        collectionId: 'collection-1',
        variableName: 'Primary Color',
        variableType: 'COLOR',
        description: 'Primary brand color',
        scopes: ['FILL_COLOR', 'STROKE_COLOR'],
        codeSyntax: { iOS: 'primaryColor', web: '--color-primary' },
        hiddenFromPublishing: false
      };

      const result = ManageVariablesSchema.safeParse(withMetadata);
      expect(result.success).toBe(true);
    });
  });

});