import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnnotationsHandler } from '../../../src/handlers/annotations-handler';

describe('AnnotationsHandler', () => {
  let handler: AnnotationsHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    handler = new AnnotationsHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    it('should return figma_annotations tool', () => {
      const tools = handler.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_annotations');
      expect(tools[0].description).toContain('annotations');
    });

    it('should support annotation operations', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      const operations = schema.properties.operation.enum;
      
      expect(operations).toContain('add_annotation');
      expect(operations).toContain('edit_annotation');
      expect(operations).toContain('remove_annotation');
      expect(operations).toContain('list_annotations');
      expect(operations).toContain('list_categories');
      expect(operations).toContain('cleanup_orphaned');
    });

    it('should support annotation parameters', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.annotationId).toBeDefined();
      expect(schema.properties.label).toBeDefined();
      expect(schema.properties.labelMarkdown).toBeDefined();
      expect(schema.properties.pinProperty).toBeDefined();
      expect(schema.properties.categoryId).toBeDefined();
    });

    it('should support bulk operations for array parameters', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.annotationId.oneOf).toBeDefined();
      expect(schema.properties.label.oneOf).toBeDefined();
      expect(schema.properties.labelMarkdown.oneOf).toBeDefined();
      expect(schema.properties.categoryId.oneOf).toBeDefined();
    });

    it('should include pinProperty with correct enum values', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.pinProperty.type).toBe('array');
      expect(schema.properties.pinProperty.items.enum).toContain('width');
      expect(schema.properties.pinProperty.items.enum).toContain('height');
      expect(schema.properties.pinProperty.items.enum).toContain('fills');
      expect(schema.properties.pinProperty.items.enum).toContain('effects');
    });
  });

  describe('handle', () => {
    it('should handle add_annotation operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          message: 'Annotation created successfully using Figma native API',
          operation: 'add_annotation',
          nodeId: 'node-123',
          annotation: {
            label: 'Test annotation',
            properties: [{ type: 'width' }],
            categoryId: 'cat-1'
          }
        }
      });

      const result = await handler.handle('figma_annotations', {
        operation: 'add_annotation',
        annotationId: 'node-123',
        label: 'Test annotation',
        pinProperty: ['width'],
        categoryId: 'cat-1'
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'ANNOTATION_OPERATION',
        payload: {
          operation: 'add_annotation',
          annotationId: 'node-123',
          label: 'Test annotation',
          pinProperty: ['width'],
          categoryId: 'cat-1'
        }
      });
    });

    it('should handle list_annotations operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          annotations: [{
            label: 'Test annotation',
            properties: [{ type: 'width' }],
            categoryId: 'cat-1'
          }],
          count: 1,
          operation: 'list_annotations'
        }
      });

      const result = await handler.handle('figma_annotations', {
        operation: 'list_annotations',
        annotationId: 'node-123'
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'ANNOTATION_OPERATION',
        payload: {
          operation: 'list_annotations',
          annotationId: 'node-123'
        }
      });
    });

    it('should handle bulk operations', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          operation: 'annotations_add_annotation',
          mode: 'bulk',
          successCount: 2,
          totalItems: 2
        }
      });

      const result = await handler.handle('figma_annotations', {
        operation: 'add_annotation',
        annotationId: ['node-1', 'node-2'],
        label: ['Ann 1', 'Ann 2'],
        categoryId: 'cat-1'
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, {
        type: 'ANNOTATION_OPERATION',
        payload: {
          operation: 'add_annotation',
          annotationId: 'node-1',
          label: 'Ann 1',
          categoryId: 'cat-1'
        }
      });
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(2, {
        type: 'ANNOTATION_OPERATION',
        payload: {
          operation: 'add_annotation',
          annotationId: 'node-2',
          label: 'Ann 2',
          categoryId: 'cat-1'
        }
      });
    });

    it('should handle list_categories operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          categories: [
            { id: 'cat-1', label: 'Design Review', color: '#FF0000', isPreset: true },
            { id: 'cat-2', label: 'Dev Notes', color: '#00FF00', isPreset: false }
          ],
          count: 2,
          operation: 'list_categories'
        }
      });

      const result = await handler.handle('figma_annotations', {
        operation: 'list_categories'
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'ANNOTATION_OPERATION',
        payload: {
          operation: 'list_categories'
        }
      });
    });

    it('should handle errors from plugin', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: false,
        error: 'Node not found'
      });

      const result = await handler.handle('figma_annotations', {
        operation: 'add_annotation',
        annotationId: 'invalid-node',
        label: 'Test'
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Node not found');
    });

    it('should throw error for unknown tool', async () => {
      await expect(
        handler.handle('unknown_tool', {})
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });
  });

  describe('Conflict Resolution Utility', () => {
    // Utility function that matches the exact logic from annotation-operation.ts
    function resolveAnnotationLabelConflict(annotation: any): any {
      const cleaned = { ...annotation };
      
      if (cleaned.label !== undefined && cleaned.label !== null && 
          cleaned.labelMarkdown !== undefined && cleaned.labelMarkdown !== null) {
        if (cleaned.label === cleaned.labelMarkdown) {
          delete cleaned.labelMarkdown;
        } else if (cleaned.labelMarkdown === "") {
          delete cleaned.labelMarkdown;
        } else {
          delete cleaned.label;
        }
      }
      
      return cleaned;
    }

    describe('Identical Values Resolution', () => {
      it('should remove labelMarkdown when identical to label', () => {
        const input = {
          label: 'Same text',
          labelMarkdown: 'Same text',
          categoryId: 'test'
        };

        const result = resolveAnnotationLabelConflict(input);

        expect(result).toEqual({
          label: 'Same text',
          categoryId: 'test'
        });
        expect(result.labelMarkdown).toBeUndefined();
      });

      it('should handle empty strings when identical', () => {
        const input = {
          label: '',
          labelMarkdown: '',
          categoryId: 'test'
        };

        const result = resolveAnnotationLabelConflict(input);

        expect(result).toEqual({
          label: '',
          categoryId: 'test'
        });
      });
    });

    describe('Empty labelMarkdown Resolution', () => {
      it('should remove empty labelMarkdown and keep label', () => {
        const input = {
          label: 'Content',
          labelMarkdown: '',
          categoryId: 'test'
        };

        const result = resolveAnnotationLabelConflict(input);

        expect(result).toEqual({
          label: 'Content',
          categoryId: 'test'
        });
      });

      it('should NOT remove whitespace-only labelMarkdown', () => {
        const input = {
          label: 'Content',
          labelMarkdown: '   ',
          categoryId: 'test'
        };

        const result = resolveAnnotationLabelConflict(input);

        expect(result).toEqual({
          labelMarkdown: '   ',
          categoryId: 'test'
        });
        expect(result.label).toBeUndefined();
      });
    });

    describe('Different Values Resolution', () => {
      it('should remove label when values are different', () => {
        const input = {
          label: 'Plain text',
          labelMarkdown: '**Bold text**',
          categoryId: 'test'
        };

        const result = resolveAnnotationLabelConflict(input);

        expect(result).toEqual({
          labelMarkdown: '**Bold text**',
          categoryId: 'test'
        });
        expect(result.label).toBeUndefined();
      });

      it('should preserve markdown formatting over plain text', () => {
        const input = {
          label: 'Click here',
          labelMarkdown: '[Click here](https://example.com)',
          categoryId: 'test'
        };

        const result = resolveAnnotationLabelConflict(input);

        expect(result).toEqual({
          labelMarkdown: '[Click here](https://example.com)',
          categoryId: 'test'
        });
      });
    });

    describe('Real-World Figma Scenarios', () => {
      it('should handle Figma auto-duplication scenario', () => {
        const figmaAnnotation = {
          label: 'User provided text',
          labelMarkdown: 'User provided text',
          properties: [{ type: 'width' }],
          categoryId: 'design-review'
        };

        const result = resolveAnnotationLabelConflict(figmaAnnotation);

        expect(result).toEqual({
          label: 'User provided text',
          properties: [{ type: 'width' }],
          categoryId: 'design-review'
        });
      });

      it('should preserve intentional markdown formatting', () => {
        const userAnnotation = {
          label: 'Button component',
          labelMarkdown: '**Primary Button** with [design spec](https://spec.com)',
          properties: [{ type: 'fills' }, { type: 'effects' }],
          categoryId: 'component-docs'
        };

        const result = resolveAnnotationLabelConflict(userAnnotation);

        expect(result).toEqual({
          labelMarkdown: '**Primary Button** with [design spec](https://spec.com)',
          properties: [{ type: 'fills' }, { type: 'effects' }],
          categoryId: 'component-docs'
        });
      });
    });
  });
});