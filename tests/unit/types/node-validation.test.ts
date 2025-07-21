import { describe, it, expect } from 'vitest';
import { UnifiedNodeOperationsSchema } from '../../../src/types/node-operations.js';
import { validateAndParse } from '../../../src/types/validation-utils.js';

describe('Node Validation via UnifiedNodeOperationsSchema', () => {
  describe('Text Node Creation Rejection', () => {
    it('should reject text nodes with helpful error message', () => {
      const textNodeData = {
        nodeType: 'text',
        name: 'Test Text Node',
        x: 100,
        y: 350,
        width: 200,
        height: 50,
        operation: 'create'
      };

      const result = validateAndParse(UnifiedNodeOperationsSchema, textNodeData, 'nodes');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain(
          "Text nodes should be created using the figma_text tool, not figma_nodes. Use figma_text for text node creation and management."
        );
      }
    });

    it('should accept valid node types for creation', () => {
      const validNodeTypes = ['rectangle', 'ellipse', 'frame', 'star', 'polygon'];
      
      validNodeTypes.forEach(nodeType => {
        const nodeData = {
          nodeType,
          name: 'Test Node',
          x: 100,
          y: 350,
          width: 200,
          height: 50,
          operation: 'create'
        };

        const result = UnifiedNodeOperationsSchema.safeParse(nodeData);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Generic Node Updates', () => {
    it('should accept generic node updates like position, size, stroke', () => {
      const validUpdate = {
        operation: 'update',
        nodeId: 'test-id',
        x: 100,
        y: 200,
        width: 300,
        height: 150,
        strokeWeight: 2,
        fillColor: '#FF0000'
      };

      const result = UnifiedNodeOperationsSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('should accept bulk updates with array parameters', () => {
      const bulkUpdate = {
        operation: 'update',
        id: ['node-1', 'node-2', 'node-3'],
        x: [100, 200, 300],
        y: [50, 50, 50],
        fillColor: ['#FF0000', '#00FF00', '#0000FF']
      };

      const result = UnifiedNodeOperationsSchema.safeParse(bulkUpdate);
      expect(result.success).toBe(true);
    });
  });

  describe('Node Management Operations', () => {
    it('should accept delete operations', () => {
      const deleteOperation = {
        operation: 'delete',
        id: 'test-id'
      };

      const result = UnifiedNodeOperationsSchema.safeParse(deleteOperation);
      expect(result.success).toBe(true);
    });

    it('should accept duplicate operations', () => {
      const duplicateOperation = {
        operation: 'duplicate',
        nodeId: 'test-id',
        count: 2,
        offsetX: 100,
        offsetY: 200
      };

      const result = UnifiedNodeOperationsSchema.safeParse(duplicateOperation);
      expect(result.success).toBe(true);
    });

    it('should accept bulk delete operations', () => {
      const bulkDelete = {
        operation: 'delete',
        id: ['node-1', 'node-2', 'node-3']
      };

      const result = UnifiedNodeOperationsSchema.safeParse(bulkDelete);
      expect(result.success).toBe(true);
    });
  });

  describe('Node Export Operations', () => {
    it('should accept export operations', () => {
      const exportOperation = {
        operation: 'export',
        id: 'test-id',
        format: 'PNG',
        scale: 2
      };

      const result = UnifiedNodeOperationsSchema.safeParse(exportOperation);
      expect(result.success).toBe(true);
    });

    it('should accept bulk export operations', () => {
      const bulkExport = {
        operation: 'export',
        id: ['node-1', 'node-2'],
        format: ['PNG', 'SVG'],
        scale: [1, 2]
      };

      const result = UnifiedNodeOperationsSchema.safeParse(bulkExport);
      expect(result.success).toBe(true);
    });
  });
  
  describe('Bulk Text Node Rejection', () => {
    it('should reject text nodes in bulk array operations', () => {
      const bulkTextData = {
        nodeType: ['rectangle', 'text', 'ellipse'],
        operation: 'create',
        x: [100, 200, 300],
        y: [100, 100, 100]
      };

      const result = validateAndParse(UnifiedNodeOperationsSchema, bulkTextData, 'nodes');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('figma_text tool');
      }
    });
  });
});