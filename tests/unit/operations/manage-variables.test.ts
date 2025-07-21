import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleManageVariables } from '../../../figma-plugin/src/operations/manage-variables.js';

// Mock BaseOperation
vi.mock('../../../figma-plugin/src/operations/base-operation.js', async () => {
  const actual = await vi.importActual('../../../figma-plugin/src/operations/base-operation.js');
  return {
    BaseOperation: {
      ...actual.BaseOperation,
      validateStringParam: vi.fn().mockImplementation((value, name, validValues) => {
        if (!validValues.includes(value)) {
          throw new Error(`Invalid ${name}: ${value}`);
        }
        return value;
      })
    }
  };
});

// Mock node utilities
vi.mock('../../../figma-plugin/src/utils/node-utils.js', () => ({
  findNodeById: vi.fn()
}));

// Mock Figma API
const mockFigma = {
  variables: {
    getVariableCollectionByIdAsync: vi.fn(),
    getVariableByIdAsync: vi.fn(),
    createVariable: vi.fn(),
    setBoundVariableForPaint: vi.fn(),
  },
  currentPage: {
    findAll: vi.fn().mockReturnValue([])
  },
  getLocalPaintStyles: vi.fn().mockReturnValue([]),
  getLocalTextStyles: vi.fn().mockReturnValue([]),
  getLocalEffectStyles: vi.fn().mockReturnValue([]),
  getStyleByIdAsync: vi.fn()
};

// @ts-ignore
global.figma = mockFigma;

describe('handleManageVariables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('operation validation', () => {
    it('should validate required operation parameter', async () => {
      const { BaseOperation } = await import('../../../figma-plugin/src/operations/base-operation.js');
      
      const params = { 
        operation: 'create',
        collectionId: 'test-collection',
        variableName: 'Test Variable',
        variableType: 'COLOR'
      };
      
      await handleManageVariables(params);
      
      expect(BaseOperation.validateParams).toHaveBeenCalledWith(params, ['operation']);
    });

    it('should validate operation value', async () => {
      const { BaseOperation } = await import('../../../figma-plugin/src/operations/base-operation.js');
      
      const params = { 
        operation: 'create',
        collectionId: 'test-collection',
        variableName: 'Test Variable',
        variableType: 'COLOR'
      };
      
      await handleManageVariables(params);
      
      expect(BaseOperation.validateStringParam).toHaveBeenCalledWith(
        'create',
        'operation',
        ['create', 'update', 'delete', 'get', 'list', 'bind', 'unbind', 'get_bindings']
      );
    });

    it('should reject invalid operations', async () => {
      const { BaseOperation } = await import('../../../figma-plugin/src/operations/base-operation.js');
      (BaseOperation.validateStringParam as any).mockImplementationOnce(() => {
        throw new Error('Invalid operation: invalid');
      });
      
      await expect(handleManageVariables({ operation: 'invalid' })).rejects.toThrow('Invalid operation: invalid');
    });
  });

  describe('create operation', () => {
    beforeEach(() => {
      const mockCollection = {
        id: 'collection123',
        name: 'Test Collection',
        modes: [
          { modeId: 'mode1', name: 'light' },
          { modeId: 'mode2', name: 'dark' }
        ]
      };
      
      const mockVariable = {
        id: 'var123',
        name: 'Test Variable',
        resolvedType: 'COLOR',
        variableCollectionId: 'collection123',
        description: '',
        scopes: [],
        codeSyntax: {},
        hiddenFromPublishing: false,
        setValueForMode: vi.fn()
      };
      
      mockFigma.variables.getVariableCollectionByIdAsync.mockResolvedValue(mockCollection);
      mockFigma.variables.createVariable.mockReturnValue(mockVariable);
    });

    it('should create a variable with basic parameters', async () => {
      const params = {
        operation: 'create',
        collectionId: 'collection123',
        variableName: 'Test Variable',
        variableType: 'COLOR'
      };
      
      const result = await handleManageVariables(params);
      
      expect(mockFigma.variables.getVariableCollectionByIdAsync).toHaveBeenCalledWith('VariableCollectionId:collection123');
      expect(mockFigma.variables.createVariable).toHaveBeenCalledWith('Test Variable', expect.any(Object), 'COLOR');
      expect(result.variableId).toBe('var123');
      expect(result.name).toBe('Test Variable');
      expect(result.type).toBe('COLOR');
    });

    it('should handle collection ID normalization', async () => {
      const params = {
        operation: 'create',
        collectionId: 'VariableCollectionId:collection123',
        variableName: 'Test Variable',
        variableType: 'COLOR'
      };
      
      await handleManageVariables(params);
      
      expect(mockFigma.variables.getVariableCollectionByIdAsync).toHaveBeenCalledWith('VariableCollectionId:collection123');
    });

    it('should set variable properties', async () => {
      const mockVariable = {
        id: 'var123',
        name: 'Test Variable',
        resolvedType: 'COLOR',
        variableCollectionId: 'collection123',
        description: '',
        scopes: [],
        codeSyntax: {},
        hiddenFromPublishing: false,
        setValueForMode: vi.fn()
      };
      
      mockFigma.variables.createVariable.mockReturnValue(mockVariable);
      
      const params = {
        operation: 'create',
        collectionId: 'collection123',
        variableName: 'Test Variable',
        variableType: 'COLOR',
        description: 'Test description',
        scopes: ['FILL_COLOR'],
        codeSyntax: { web: 'var(--test)' },
        hiddenFromPublishing: true
      };
      
      await handleManageVariables(params);
      
      expect(mockVariable.description).toBe('Test description');
      expect(mockVariable.scopes).toEqual(['FILL_COLOR']);
      expect(mockVariable.codeSyntax).toEqual({ web: 'var(--test)' });
      expect(mockVariable.hiddenFromPublishing).toBe(true);
    });

    it('should set mode values', async () => {
      const mockVariable = {
        id: 'var123',
        name: 'Test Variable',
        resolvedType: 'COLOR',
        variableCollectionId: 'collection123',
        description: '',
        scopes: [],
        codeSyntax: {},
        hiddenFromPublishing: false,
        setValueForMode: vi.fn()
      };
      
      mockFigma.variables.createVariable.mockReturnValue(mockVariable);
      
      const params = {
        operation: 'create',
        collectionId: 'collection123',
        variableName: 'Test Variable',
        variableType: 'COLOR',
        modeValues: {
          light: '#FF0000',
          dark: '#00FF00'
        }
      };
      
      await handleManageVariables(params);
      
      expect(mockVariable.setValueForMode).toHaveBeenCalledWith('mode1', { r: 1, g: 0, b: 0 });
      expect(mockVariable.setValueForMode).toHaveBeenCalledWith('mode2', { r: 0, g: 1, b: 0 });
    });

    it('should handle color parsing', async () => {
      const mockVariable = {
        id: 'var123',
        name: 'Test Variable',
        resolvedType: 'COLOR',
        variableCollectionId: 'collection123',
        description: '',
        scopes: [],
        codeSyntax: {},
        hiddenFromPublishing: false,
        setValueForMode: vi.fn()
      };
      
      mockFigma.variables.createVariable.mockReturnValue(mockVariable);
      
      const params = {
        operation: 'create',
        collectionId: 'collection123',
        variableName: 'Test Variable',
        variableType: 'COLOR',
        modeValues: {
          light: '#FF0000',
          dark: 'FF00FF'
        }
      };
      
      await handleManageVariables(params);
      
      expect(mockVariable.setValueForMode).toHaveBeenCalledWith('mode1', { r: 1, g: 0, b: 0 });
      expect(mockVariable.setValueForMode).toHaveBeenCalledWith('mode2', { r: 1, g: 0, b: 1 });
    });

    it('should throw error for missing collection', async () => {
      mockFigma.variables.getVariableCollectionByIdAsync.mockResolvedValue(null);
      
      const params = {
        operation: 'create',
        collectionId: 'collection123',
        variableName: 'Test Variable',
        variableType: 'COLOR'
      };
      
      await expect(handleManageVariables(params)).rejects.toThrow('Variable collection not found');
    });
  });

  describe('update operation', () => {
    beforeEach(() => {
      const mockVariable = {
        id: 'var123',
        name: 'Test Variable',
        resolvedType: 'COLOR',
        variableCollectionId: 'collection123',
        description: '',
        scopes: [],
        codeSyntax: {},
        hiddenFromPublishing: false,
        setValueForMode: vi.fn()
      };
      
      mockFigma.variables.getVariableByIdAsync.mockResolvedValue(mockVariable);
    });

    it('should update variable properties', async () => {
      const params = {
        operation: 'update',
        variableId: 'var123',
        variableName: 'Updated Variable',
        description: 'Updated description'
      };
      
      const result = await handleManageVariables(params);
      
      expect(mockFigma.variables.getVariableByIdAsync).toHaveBeenCalledWith('VariableID:var123');
      expect(result.name).toBe('Updated Variable');
      expect(result.message).toContain('Successfully updated variable');
    });

    it('should handle variable ID normalization', async () => {
      const params = {
        operation: 'update',
        variableId: 'VariableID:var123',
        variableName: 'Updated Variable'
      };
      
      await handleManageVariables(params);
      
      expect(mockFigma.variables.getVariableByIdAsync).toHaveBeenCalledWith('VariableID:var123');
    });

    it('should throw error for missing variable', async () => {
      mockFigma.variables.getVariableByIdAsync.mockResolvedValue(null);
      
      const params = {
        operation: 'update',
        variableId: 'var123'
      };
      
      await expect(handleManageVariables(params)).rejects.toThrow('Variable not found');
    });
  });

  describe('delete operation', () => {
    it('should delete a variable', async () => {
      const mockVariable = {
        id: 'var123',
        name: 'Test Variable',
        remove: vi.fn()
      };
      
      mockFigma.variables.getVariableByIdAsync.mockResolvedValue(mockVariable);
      
      const params = {
        operation: 'delete',
        variableId: 'var123'
      };
      
      const result = await handleManageVariables(params);
      
      expect(mockFigma.variables.getVariableByIdAsync).toHaveBeenCalledWith('VariableID:var123');
      expect(mockVariable.remove).toHaveBeenCalled();
      expect(result.deletedVariableId).toBe('var123');
      expect(result.deletedName).toBe('Test Variable');
    });
  });

  describe('get operation', () => {
    it('should get variable details', async () => {
      const mockVariable = {
        id: 'var123',
        name: 'Test Variable',
        resolvedType: 'COLOR',
        variableCollectionId: 'collection123',
        description: 'Test description',
        scopes: ['FILL_COLOR'],
        codeSyntax: { web: 'var(--test)' },
        hiddenFromPublishing: false,
        valuesByMode: {
          mode1: { r: 1, g: 0, b: 0 },
          mode2: { r: 0, g: 1, b: 0 }
        }
      };
      
      const mockCollection = {
        id: 'collection123',
        name: 'Test Collection',
        modes: [
          { modeId: 'mode1', name: 'light' },
          { modeId: 'mode2', name: 'dark' }
        ]
      };
      
      mockFigma.variables.getVariableByIdAsync.mockResolvedValue(mockVariable);
      mockFigma.variables.getVariableCollectionByIdAsync.mockResolvedValue(mockCollection);
      
      const params = {
        operation: 'get',
        variableId: 'var123'
      };
      
      const result = await handleManageVariables(params);
      
      expect(result.id).toBe('var123');
      expect(result.name).toBe('Test Variable');
      expect(result.type).toBe('COLOR');
      expect(result.collectionName).toBe('Test Collection');
      expect(result.valuesByMode.light).toEqual({ r: 1, g: 0, b: 0 });
      expect(result.valuesByMode.dark).toEqual({ r: 0, g: 1, b: 0 });
    });
  });

  describe('list operation', () => {
    it('should list variables in collection', async () => {
      const mockCollection = {
        id: 'collection123',
        name: 'Test Collection',
        variableIds: ['var1', 'var2']
      };
      
      const mockVariable1 = {
        id: 'var1',
        name: 'Variable 1',
        resolvedType: 'COLOR',
        description: '',
        scopes: [],
        hiddenFromPublishing: false
      };
      
      const mockVariable2 = {
        id: 'var2',
        name: 'Variable 2',
        resolvedType: 'FLOAT',
        description: '',
        scopes: [],
        hiddenFromPublishing: false
      };
      
      mockFigma.variables.getVariableCollectionByIdAsync.mockResolvedValue(mockCollection);
      mockFigma.variables.getVariableByIdAsync
        .mockResolvedValueOnce(mockVariable1)
        .mockResolvedValueOnce(mockVariable2);
      
      const params = {
        operation: 'list',
        collectionId: 'collection123'
      };
      
      const result = await handleManageVariables(params);
      
      expect(result.collectionId).toBe('collection123');
      expect(result.collectionName).toBe('Test Collection');
      expect(result.variables).toHaveLength(2);
      expect(result.variables[0].name).toBe('Variable 1');
      expect(result.variables[1].name).toBe('Variable 2');
      expect(result.totalCount).toBe(2);
    });
  });

  describe('bind operation', () => {
    it('should bind variable to node property', async () => {
      const mockVariable = {
        id: 'var123',
        name: 'Test Variable',
        resolvedType: 'FLOAT'
      };
      
      const mockNode = {
        id: 'node123',
        name: 'Test Node',
        type: 'RECTANGLE',
        fills: [],
        setBoundVariable: vi.fn()
      };
      
      mockFigma.variables.getVariableByIdAsync.mockResolvedValue(mockVariable);
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockReturnValue(mockNode);
      
      const params = {
        operation: 'bind',
        variableId: 'var123',
        id: 'node123',
        property: 'width'
      };
      
      const result = await handleManageVariables(params);
      
      expect(mockFigma.variables.getVariableByIdAsync).toHaveBeenCalledWith('VariableID:var123');
      expect(findNodeById).toHaveBeenCalledWith('node123');
      expect(mockNode.setBoundVariable).toHaveBeenCalledWith('width', mockVariable);
      expect(result.variableId).toBe('var123');
      expect(result.nodeId).toBe('node123');
      expect(result.property).toBe('width');
    });
  });

  describe('color parsing utility', () => {
    it('should parse hex colors correctly', async () => {
      // Test a simple color parsing case
      const mockVariable = {
        id: 'var123',
        name: 'Test Variable',
        resolvedType: 'COLOR',
        variableCollectionId: 'collection123',
        description: '',
        scopes: [],
        codeSyntax: {},
        hiddenFromPublishing: false,
        setValueForMode: vi.fn()
      };
      
      const mockCollection = {
        id: 'collection123',
        modes: [{ modeId: 'mode1', name: 'light' }]
      };
      
      mockFigma.variables.createVariable.mockReturnValue(mockVariable);
      mockFigma.variables.getVariableCollectionByIdAsync.mockResolvedValue(mockCollection);
      
      const params = {
        operation: 'create',
        collectionId: 'collection123',
        variableName: 'Test Variable',
        variableType: 'COLOR',
        modeValues: { light: '#FF0000' }
      };
      
      await handleManageVariables(params);
      
      expect(mockVariable.setValueForMode).toHaveBeenCalledWith('mode1', { r: 1, g: 0, b: 0 });
    });
  });
});