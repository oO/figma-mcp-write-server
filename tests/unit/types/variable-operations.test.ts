import { describe, test, expect } from '@jest/globals';
import { 
  ManageCollectionsSchema, 
  ManageVariablesSchema,
  VariableCollectionDataSchema,
  VariableDataSchema 
} from '../../../src/types/variable-operations.js';

describe('Variable Operations Schemas', () => {
  describe('ManageCollectionsSchema', () => {
    test('should validate create operation', () => {
      const validData = {
        operation: 'create',
        collectionName: 'Colors',
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
        collectionName: 'Updated Colors'
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
        operation: 'create',
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
          operation: 'create',
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
        operation: 'bind',
        variableId: 'var-1',
        nodeId: 'node-1',
        property: 'fills'
      };

      const bindToStyle = {
        operation: 'bind',
        variableId: 'var-1',
        styleId: 'style-1',
        property: 'color'
      };

      expect(ManageVariablesSchema.safeParse(bindToNode).success).toBe(true);
      expect(ManageVariablesSchema.safeParse(bindToStyle).success).toBe(true);
    });

    test('should validate unbind operations', () => {
      const unbindFromNode = {
        operation: 'unbind',
        nodeId: 'node-1',
        property: 'width'
      };

      const unbindFromStyle = {
        operation: 'unbind',
        styleId: 'style-1',
        property: 'paints'
      };

      expect(ManageVariablesSchema.safeParse(unbindFromNode).success).toBe(true);
      expect(ManageVariablesSchema.safeParse(unbindFromStyle).success).toBe(true);
    });

    test('should validate get_bindings operations', () => {
      const getByNode = {
        operation: 'get_bindings',
        nodeId: 'node-1'
      };

      const getByVariable = {
        operation: 'get_bindings',
        variableId: 'var-1'
      };

      expect(ManageVariablesSchema.safeParse(getByNode).success).toBe(true);
      expect(ManageVariablesSchema.safeParse(getByVariable).success).toBe(true);
    });

    test('should handle complex modeValues', () => {
      const complexData = {
        operation: 'create',
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
        operation: 'create',
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

  describe('VariableCollectionDataSchema', () => {
    test('should validate complete collection data', () => {
      const collectionData = {
        id: 'VariableCollectionId:collection-1',
        name: 'Color Tokens',
        description: 'Design system color tokens',
        modes: [
          { id: 'mode-1', name: 'Light' },
          { id: 'mode-2', name: 'Dark' }
        ],
        defaultModeId: 'mode-1',
        hiddenFromPublishing: false,
        variableIds: ['var-1', 'var-2', 'var-3']
      };

      const result = VariableCollectionDataSchema.safeParse(collectionData);
      expect(result.success).toBe(true);
    });

    test('should handle optional fields with defaults', () => {
      const minimalData = {
        id: 'collection-1',
        name: 'Test Collection',
        modes: [{ id: 'mode-1', name: 'Default' }],
        defaultModeId: 'mode-1'
      };

      const result = VariableCollectionDataSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      expect(result.data?.hiddenFromPublishing).toBe(false);
    });
  });

  describe('VariableDataSchema', () => {
    test('should validate complete variable data', () => {
      const variableData = {
        id: 'VariableID:var-1',
        name: 'Primary Blue',
        description: 'Main brand color',
        collectionId: 'collection-1',
        type: 'COLOR',
        scopes: ['FILL_COLOR', 'STROKE_COLOR'],
        codeSyntax: { iOS: 'primaryBlue', web: '--color-primary' },
        hiddenFromPublishing: false,
        valuesByMode: {
          'mode-1': { r: 0, g: 0.4, b: 0.8 },
          'mode-2': { r: 0.29, g: 0.62, b: 1 }
        }
      };

      const result = VariableDataSchema.safeParse(variableData);
      expect(result.success).toBe(true);
    });

    test('should handle all variable types', () => {
      const types = ['COLOR', 'FLOAT', 'STRING', 'BOOLEAN'];
      
      types.forEach(type => {
        const data = {
          id: `var-${type.toLowerCase()}`,
          name: `Test ${type}`,
          collectionId: 'collection-1',
          type
        };

        const result = VariableDataSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    test('should apply default values', () => {
      const minimalData = {
        id: 'var-1',
        name: 'Test Variable',
        collectionId: 'collection-1',
        type: 'COLOR'
      };

      const result = VariableDataSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      expect(result.data?.scopes).toEqual([]);
      expect(result.data?.codeSyntax).toEqual({});
      expect(result.data?.hiddenFromPublishing).toBe(false);
      expect(result.data?.valuesByMode).toEqual({});
    });
  });
});