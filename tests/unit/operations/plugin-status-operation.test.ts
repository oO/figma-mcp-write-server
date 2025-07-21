import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock global figma object
const mockFigma = {
  pluginId: 'test-plugin-id',
  apiVersion: '1.0.0',
  editorType: 'figma',
  mode: 'dev',
  fileKey: 'test-file-key',
  root: { name: 'Test Document' },
  currentPage: { name: 'Page 1', id: 'page-1' },
  currentUser: { id: 'user-1', name: 'Test User' },
  activeUsers: null // Only available in FigJam
};

// Mock PLUGIN_VERSION
global.PLUGIN_VERSION = '1.0.0';
global.figma = mockFigma as any;

// Import after setting up mocks
import { handlePluginStatus } from '../../../figma-plugin/src/operations/plugin-status-operation';

describe('Plugin Status Operation', () => {
  beforeEach(() => {
    // Reset figma mock to defaults
    global.figma = { ...mockFigma } as any;
  });

  describe('figma_info operation', () => {
    it('should return basic figma information', async () => {
      const result = await handlePluginStatus({ operation: 'figma_info' });

      expect(result).toEqual({
        pluginId: 'test-plugin-id',
        apiVersion: '1.0.0',
        editorType: 'figma',
        mode: 'dev',
        pluginVersion: '1.0.0',
        fileKey: 'test-file-key',
        fileName: 'Test Document',
        currentPage: {
          name: 'Page 1',
          id: 'page-1'
        },
        currentUser: {
          id: 'user-1',
          name: 'Test User'
        }
      });
    });

    it('should handle missing fileKey gracefully', async () => {
      global.figma = { 
        ...mockFigma, 
        fileKey: undefined 
      } as any;

      const result = await handlePluginStatus({ operation: 'figma_info' });

      expect(result.pluginId).toBe('test-plugin-id');
      expect(result.fileKey).toBeUndefined();
    });

    it('should handle missing root name gracefully', async () => {
      global.figma = { 
        ...mockFigma, 
        root: { name: undefined } 
      } as any;

      const result = await handlePluginStatus({ operation: 'figma_info' });

      expect(result.pluginId).toBe('test-plugin-id');
      expect(result.fileName).toBeUndefined();
    });

    it('should handle missing root gracefully', async () => {
      global.figma = { 
        ...mockFigma, 
        root: undefined 
      } as any;

      const result = await handlePluginStatus({ operation: 'figma_info' });

      expect(result.pluginId).toBe('test-plugin-id');
      expect(result.fileName).toBeUndefined();
    });

    it('should handle missing currentPage gracefully', async () => {
      global.figma = { 
        ...mockFigma, 
        currentPage: undefined 
      } as any;

      const result = await handlePluginStatus({ operation: 'figma_info' });

      expect(result.pluginId).toBe('test-plugin-id');
      expect(result.currentPage).toBeUndefined();
    });

    it('should handle missing currentUser gracefully', async () => {
      global.figma = { 
        ...mockFigma, 
        currentUser: undefined 
      } as any;

      const result = await handlePluginStatus({ operation: 'figma_info' });

      expect(result.pluginId).toBe('test-plugin-id');
      expect(result.currentUser).toBeUndefined();
    });

    it('should include activeUsers when in FigJam', async () => {
      global.figma = { 
        ...mockFigma, 
        editorType: 'figjam',
        activeUsers: [
          { id: 'user-1', name: 'User 1' },
          { id: 'user-2', name: 'User 2' }
        ]
      } as any;

      const result = await handlePluginStatus({ operation: 'figma_info' });

      expect(result.editorType).toBe('figjam');
      expect(result.activeUsers).toHaveLength(2);
      expect(result.activeUsers[0].name).toBe('User 1');
    });

    it('should not include activeUsers when not in FigJam', async () => {
      global.figma = { 
        ...mockFigma, 
        editorType: 'figma' // Not figjam
      } as any;

      const result = await handlePluginStatus({ operation: 'figma_info' });

      expect(result.editorType).toBe('figma');
      expect(result.activeUsers).toBeUndefined();
    });

    it('should handle errors when accessing properties', async () => {
      // Create a figma object that throws errors when accessing properties
      global.figma = new Proxy(mockFigma, {
        get(target, prop) {
          if (prop === 'fileKey') {
            throw new Error('Permission denied');
          }
          if (prop === 'currentUser') {
            throw new Error('User access denied');
          }
          if (prop === 'currentPage') {
            throw new Error('Page access denied');
          }
          if (prop === 'activeUsers') {
            throw new Error('Active users access denied');
          }
          return target[prop as keyof typeof target];
        }
      }) as any;

      const result = await handlePluginStatus({ operation: 'figma_info' });

      // Should still return basic properties
      expect(result.pluginId).toBe('test-plugin-id');
      expect(result.apiVersion).toBe('1.0.0');
      // Properties that throw errors should be missing
      expect(result.fileKey).toBeUndefined();
      expect(result.currentUser).toBeUndefined();
      expect(result.currentPage).toBeUndefined();
    });

    it('should handle errors when accessing root.name property', async () => {
      // Create a figma object that throws error when accessing root.name
      global.figma = {
        ...mockFigma,
        get root() {
          throw new Error('Root access denied');
        }
      } as any;

      const result = await handlePluginStatus({ operation: 'figma_info' });

      // Should still return basic properties
      expect(result.pluginId).toBe('test-plugin-id');
      expect(result.apiVersion).toBe('1.0.0');
      // Root-dependent properties should be missing
      expect(result.fileName).toBeUndefined();
    });
  });

  describe('default operation', () => {
    it('should return basic information for unknown operation', async () => {
      const result = await handlePluginStatus({ operation: 'unknown_operation' });

      expect(result).toEqual({
        pluginId: 'test-plugin-id',
        apiVersion: '1.0.0',
        editorType: 'figma',
        mode: 'dev',
        pluginVersion: '1.0.0'
      });
    });

    it('should handle null operation', async () => {
      const result = await handlePluginStatus({ operation: null });

      expect(result.pluginId).toBe('test-plugin-id');
      expect(result.pluginVersion).toBe('1.0.0');
    });

    it('should handle undefined operation', async () => {
      const result = await handlePluginStatus({ operation: undefined });

      expect(result.pluginId).toBe('test-plugin-id');
      expect(result.pluginVersion).toBe('1.0.0');
    });
  });

  describe('error handling', () => {
    it('should handle errors through BaseOperation.executeOperation', async () => {
      // Mock BaseOperation to throw an error
      const originalFigma = global.figma;
      global.figma = null as any;

      await expect(
        handlePluginStatus({ operation: 'figma_info' })
      ).rejects.toThrow();

      global.figma = originalFigma;
    });
  });
});