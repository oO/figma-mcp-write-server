import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImagesHandler } from '../../../src/handlers/images-handler.js';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as os from 'os';

// Mock fs operations for file path testing
vi.mock('fs');
vi.mock('os');

describe('ImagesHandler', () => {
  let handler: ImagesHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendToPlugin = vi.fn();
    handler = new ImagesHandler(mockSendToPlugin);
    
    // Setup default mocks
    vi.mocked(os.homedir).mockReturnValue('/home/user');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any);
    vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('mock-image-data'));
  });

  describe('Tool Definition', () => {
    it('should define figma_images tool with correct schema', () => {
      const tools = handler.getTools();
      expect(tools).toHaveLength(1);
      
      const tool = tools[0];
      expect(tool.name).toBe('figma_images');
      expect(tool.description).toContain('image hashes');
      expect(tool.description).toContain('export image data');
      expect(tool.description).toContain('create image nodes');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should include all required operations in schema', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema as any;
      
      const operationProperty = schema.properties?.operation;
      expect(operationProperty).toBeDefined();
      expect(operationProperty.enum).toEqual(['list', 'get', 'export', 'create']);
    });

    it('should support both single and array imageHash parameters', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema as any;
      
      const imageHashProperty = schema.properties?.imageHash;
      expect(imageHashProperty.oneOf).toBeDefined();
      expect(imageHashProperty.oneOf[0].type).toBe('string');
      expect(imageHashProperty.oneOf[1].type).toBe('array');
    });

    it('should include create operation specific parameters', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema as any;
      
      expect(schema.properties.source).toBeDefined();
      expect(schema.properties.x).toBeDefined();
      expect(schema.properties.y).toBeDefined();
      expect(schema.properties.name).toBeDefined();
    });
  });

  describe('Operation Handling', () => {
    it('should handle list operation', async () => {
      const params = {
        operation: 'list',
        includeMetadata: true,
        includeUsage: true
      };

      mockSendToPlugin.mockResolvedValue({
        pageId: '0:1',
        pageName: 'Page 1',
        imageCount: 2,
        images: [
          {
            imageHash: 'hash123',
            width: 800,
            height: 600,
            usedBy: {
              nodeIds: ['node1', 'node2'],
              styleIds: ['style1']
            }
          }
        ]
      });

      const result = await handler.handle('figma_images', params);
      
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_IMAGES',
        payload: params
      });
      
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      
      // Basic validation without type assertions
      const textContent = result.content[0].text;
      expect(textContent).toContain('hash123');
      expect(textContent).toContain('Page 1');
    });

    it('should handle get operation', async () => {
      const params = {
        operation: 'get',
        imageHash: 'hash123'
      };

      mockSendToPlugin.mockResolvedValue({
        imageHash: 'hash123',
        width: 800,
        height: 600,
        size: '245K',
        colorType: 'RGB'
      });

      const result = await handler.handle('figma_images', params);
      
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      
      const textContent = result.content[0].text;
      expect(textContent).toContain('hash123');
      expect(textContent).toContain('RGB');
    });

    it('should handle export operation with DATA format', async () => {
      const params = {
        operation: 'export',
        imageHash: 'hash123',
        format: 'DATA'
      };

      // Mock the custom handler method directly to test MCP content flow
      const customHandlerSpy = vi.spyOn(handler as any, 'handleExportWithMcpImageContent')
        .mockResolvedValue({
          content: [{
            type: 'image',
            data: 'base64encodeddata',
            mimeType: 'image/png'
          }],
          isError: false
        });

      const result = await handler.handle('figma_images', params);
      
      // Should return MCP image content directly from custom handler
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('image');
      expect(result.content[0].data).toBe('base64encodeddata');
      expect(result.content[0].mimeType).toBe('image/png');
      
      customHandlerSpy.mockRestore();
    });





    it('should handle single source parameter', async () => {
      const params = {
        operation: 'create',
        source: 'https://example.com/image.png',
        x: 100,
        y: 200,
        name: 'Single Image'
      };

      mockSendToPlugin.mockResolvedValue({
        success: true,
        nodeId: 'node1',
        nodeName: 'Single Image'
      });

      const result = await handler.handle('figma_images', params);

      // Should be processed as single operation
      expect(mockSendToPlugin).toHaveBeenCalledTimes(1);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_IMAGES',
        payload: {
          operation: 'create',
          url: 'https://example.com/image.png',
          x: 100,
          y: 200,
          name: 'Single Image'
        }
      });
    });

    it('should handle string coordinates (UnifiedHandler converts automatically)', async () => {
      const params = {
        operation: 'create',
        source: 'https://example.com/image.png',
        x: '250',  // String coordinate (MCP/XML format)
        y: '500',  // String coordinate (MCP/XML format)
        name: 'Priority Test'
      };

      mockSendToPlugin.mockResolvedValue({
        success: true,
        nodeId: 'node1',
        nodeName: 'Priority Test',
        imageHash: 'new_hash',
        width: 800,
        height: 600,
        position: { x: 250, y: 500 },
        message: 'Created image node'
      });

      const result = await handler.handle('figma_images', params);

      // Should be processed as single operation with UnifiedHandler converting strings to numbers
      expect(mockSendToPlugin).toHaveBeenCalledTimes(1);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_IMAGES',
        payload: {
          operation: 'create',
          url: 'https://example.com/image.png',
          x: 250,  // UnifiedHandler converts string to number
          y: 500,  // UnifiedHandler converts string to number
          name: 'Priority Test'
        }
      });
      
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
    });


    it('should handle unified source parameter with URL auto-detection', async () => {
      const params = {
        operation: 'create',
        source: 'https://example.com/image.png',
        x: 100,
        y: 200,
        name: 'Auto URL'
      };

      mockSendToPlugin.mockResolvedValue({
        success: true,
        nodeId: 'node1',
        nodeName: 'Auto URL',
        imageHash: 'new_hash',
        message: 'Created image node'
      });

      const result = await handler.handle('figma_images', params);

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_IMAGES',
        payload: {
          operation: 'create',
          url: 'https://example.com/image.png', // Should be detected as URL
          x: 100,
          y: 200,
          name: 'Auto URL'
        }
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
    });

    it('should handle unified source parameter with hash auto-detection', async () => {
      const params = {
        operation: 'create',
        source: 'abc123def456789',
        name: 'Auto Hash'
      };

      mockSendToPlugin.mockResolvedValue({
        success: true,
        nodeId: 'node1',
        nodeName: 'Auto Hash',
        message: 'Created image node'
      });

      const result = await handler.handle('figma_images', params);

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_IMAGES',
        payload: {
          operation: 'create',
          imageHash: 'abc123def456789', // Should be detected as hash
          name: 'Auto Hash'
        }
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
    });

    it('should handle unified source parameter with mixed bulk sources', async () => {
      const params = {
        operation: 'create',
        source: [
          'https://example.com/remote.png',
          '~/local/image.png', 
          'abc123def456'
        ],
        x: [0, 100, 200],
        name: ['Remote', 'Local', 'Existing']
      };

      // Mock file system for path
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any);
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('local-data'));

      mockSendToPlugin.mockResolvedValue([
        { success: true, nodeId: 'node1', nodeName: 'Remote', index: 0 },
        { success: true, nodeId: 'node2', nodeName: 'Local', index: 1 },
        { success: true, nodeId: 'node3', nodeName: 'Existing', index: 2 }
      ]);

      const result = await handler.handle('figma_images', params);

      // Should be processed as 3 separate calls after auto-detection
      expect(mockSendToPlugin).toHaveBeenCalledTimes(3);
      
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
    });
  });

  describe('File Path Preprocessing', () => {
    it('should preprocess file paths for create operation', async () => {
      const params = {
        operation: 'create',
        source: '~/Documents/image.png',
        name: 'Local Photo'
      };

      // Mock file system operations
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any);
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('png-file-data'));

      mockSendToPlugin.mockResolvedValue({
        success: true,
        nodeId: 'node456',
        nodeName: 'Local Photo'
      });

      await handler.handle('figma_images', params);
      
      // Should have preprocessed the file path to imageBytes
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_IMAGES',
        payload: expect.objectContaining({
          operation: 'create',
          imageBytes: 'cG5nLWZpbGUtZGF0YQ==', // base64 encoded 'png-file-data'
          name: 'Local Photo'
          // path should be removed
        })
      });
    });

    it('should expand tilde paths correctly', async () => {
      const params = {
        operation: 'create',
        source: '~/Documents/image.png'
      };

      vi.mocked(os.homedir).mockReturnValue('/home/user');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any);
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('test-data'));

      mockSendToPlugin.mockResolvedValue({ success: true });

      await handler.handle('figma_images', params);

      // Should resolve tilde path correctly
      expect(fs.readFileSync).toHaveBeenCalledWith('/home/user/Documents/image.png');
    });

    it('should handle file not found error', async () => {
      const params = {
        operation: 'create',
        source: '/nonexistent/file.png'
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(handler.handle('figma_images', params))
        .rejects.toThrow('Image file not found: /nonexistent/file.png');
    });

    it('should not preprocess non-create operations', async () => {
      // Clear any previous calls first
      vi.clearAllMocks();
      
      const params = {
        operation: 'list',
        source: '~/some/path.png' // Should be ignored
      };

      mockSendToPlugin.mockResolvedValue({ images: [] });

      await handler.handle('figma_images', params);

      // Should not have called fs operations for reading the file
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle plugin errors', async () => {
      const params = {
        operation: 'get',
        imageHash: 'nonexistent'
      };

      mockSendToPlugin.mockRejectedValue(new Error('Image not found: nonexistent'));

      await expect(handler.handle('figma_images', params))
        .rejects.toThrow('Image not found: nonexistent');
    });

    it('should handle unknown tool name', async () => {
      await expect(handler.handle('unknown_tool', {}))
        .rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('should handle missing required parameters', async () => {
      const params = {
        operation: 'get'
        // missing imageHash
      };

      mockSendToPlugin.mockRejectedValue(new Error('imageHash is required for get operation'));

      await expect(handler.handle('figma_images', params))
        .rejects.toThrow('imageHash is required for get operation');
    });
  });

  describe('MCP Image Content Detection', () => {
    it('should use custom handler for DATA format exports', async () => {
      // Test that the shouldUseMcpImageContent method returns true for correct params
      const dataParams = {
        operation: 'export',
        format: 'DATA',
        imageHash: 'hash123'
      };

      // Create a spy on the private method to verify it's called correctly
      const shouldUseMcpContentSpy = vi.spyOn(handler as any, 'shouldUseMcpImageContent');
      
      mockSendToPlugin.mockResolvedValue({
        content: [{ type: 'image', data: 'test', mimeType: 'image/png' }]
      });

      await handler.handle('figma_images', dataParams);
      
      // Verify the method was called and returned true for MCP content conditions
      expect(shouldUseMcpContentSpy).toHaveBeenCalledWith(dataParams);
    });
  });

  describe('Export Operation - Advanced Cases', () => {
    it('should handle bulk DATA export with mixed results', async () => {
      const params = {
        operation: 'export',
        imageHash: ['hash1', 'hash2', 'hash3'],
        format: 'DATA'
      };

      // Mock custom handler to simulate mixed success/failure
      const customHandlerSpy = vi.spyOn(handler as any, 'handleExportWithMcpImageContent')
        .mockResolvedValue({
          content: [
            { 
              type: 'text', 
              text: yaml.dump([
                { imageHash: 'hash1', format: 'DATA', size: '10 KB', message: 'Exported' },
                { imageHash: 'hash2', format: 'DATA', size: '20 KB', message: 'Exported' },
                { imageHash: 'hash3', success: false, error: 'Image not found' }
              ])
            }
          ],
          isError: false
        });

      const result = await handler.handle('figma_images', params);
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('hash3');
      expect(result.content[0].text).toContain('Image not found');
      
      customHandlerSpy.mockRestore();
    });

    it('should handle PNG export with custom suffix', async () => {
      const params = {
        operation: 'export',
        imageHash: 'hash123',
        format: 'PNG',
        suffix: 'final-version'
      };

      mockSendToPlugin.mockResolvedValue({
        success: true,
        imageHash: 'hash123',
        data: Buffer.from('test').toString('base64'),
        filename: 'image-hash123-final-version.png',
        format: 'PNG',
        size: '10 KB'
      });

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const result = await handler.handle('figma_images', params);
      const yamlData = yaml.load(result.content[0].text) as any;
      
      expect(yamlData.actualFilename).toBe('image-hash123-final-version.png');
      expect(yamlData.method).toBe('file_system');
    });

    it('should handle bulk PNG export', async () => {
      const params = {
        operation: 'export',
        imageHash: ['hash1', 'hash2'],
        format: 'PNG',
        outputDirectory: '~/Desktop/exports'
      };

      mockSendToPlugin.mockResolvedValue([
        {
          success: true,
          imageHash: 'hash1',
          data: Buffer.from('data1').toString('base64'),
          filename: 'image-hash1.png',
          format: 'PNG'
        },
        {
          success: true,
          imageHash: 'hash2',
          data: Buffer.from('data2').toString('base64'),
          filename: 'image-hash2.png',
          format: 'PNG'
        }
      ]);

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const result = await handler.handle('figma_images', params);
      
      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
    });

    it('should handle export failures in bulk operations', async () => {
      const params = {
        operation: 'export',
        imageHash: ['hash1', 'hash2'],
        format: 'PNG'
      };

      mockSendToPlugin.mockResolvedValue([
        {
          success: true,
          imageHash: 'hash1',
          data: Buffer.from('data1').toString('base64'),
          filename: 'image-hash1.png',
          format: 'PNG'
        },
        {
          success: false,
          imageHash: 'hash2',
          error: 'Image hash2 not found'
        }
      ]);

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const result = await handler.handle('figma_images', params);
      
      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      
      const yamlContent = result.content[0].text;
      expect(yamlContent).toContain('hash2 not found');
    });
  });

  describe('File System Operations', () => {
    it('should resolve Windows default export path', async () => {
      vi.mocked(os.platform).mockReturnValue('win32');
      vi.mocked(os.homedir).mockReturnValue('C:\\Users\\TestUser');
      
      const params = {
        operation: 'export',
        imageHash: 'hash123',
        format: 'PNG'
      };

      mockSendToPlugin.mockResolvedValue({
        success: true,
        imageHash: 'hash123',
        data: Buffer.from('test').toString('base64'),
        filename: 'image.png',
        format: 'PNG'
      });

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const result = await handler.handle('figma_images', params);
      const yamlData = yaml.load(result.content[0].text) as any;
      
      expect(yamlData.outputDirectory).toContain('TestUser');
      expect(yamlData.outputDirectory).toContain('Documents');
      expect(yamlData.outputDirectory).toContain('Figma Exports');
    });

    it('should resolve Linux default export path', async () => {
      vi.mocked(os.platform).mockReturnValue('linux');
      vi.mocked(os.homedir).mockReturnValue('/home/testuser');
      
      const params = {
        operation: 'export',
        imageHash: 'hash123',
        format: 'PNG'
      };

      mockSendToPlugin.mockResolvedValue({
        success: true,
        imageHash: 'hash123',
        data: Buffer.from('test').toString('base64'),
        filename: 'image.png',
        format: 'PNG'
      });

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const result = await handler.handle('figma_images', params);
      const yamlData = yaml.load(result.content[0].text) as any;
      
      expect(yamlData.outputDirectory).toContain('/home/testuser/Downloads/Figma Exports');
    });

    it('should handle complex filename conflicts', async () => {
      const params = {
        operation: 'export',
        imageHash: 'hash123',
        format: 'PNG'
      };

      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = path.toString();
        // Simulate first 5 variations already exist
        return pathStr.endsWith('image-hash123.png') ||
               pathStr.endsWith('image-hash123-001.png') ||
               pathStr.endsWith('image-hash123-002.png') ||
               pathStr.endsWith('image-hash123-003.png') ||
               pathStr.endsWith('image-hash123-004.png');
      });

      mockSendToPlugin.mockResolvedValue({
        success: true,
        imageHash: 'hash123',
        data: Buffer.from('test').toString('base64'),
        filename: 'image-hash123.png',
        format: 'PNG'
      });

      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const result = await handler.handle('figma_images', params);
      const yamlData = yaml.load(result.content[0].text) as any;
      
      expect(yamlData.actualFilename).toBe('image-hash123-005.png');
      expect(yamlData.wasRenamed).toBe(true);
      expect(yamlData.originalFilename).toBe('image-hash123.png');
    });

    it('should handle write failures gracefully', async () => {
      const params = {
        operation: 'export',
        imageHash: 'hash123',
        format: 'PNG'
      };

      mockSendToPlugin.mockResolvedValue({
        success: true,
        imageHash: 'hash123',
        data: Buffer.from('test').toString('base64'),
        filename: 'image.png',
        format: 'PNG'
      });

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await expect(handler.handle('figma_images', params))
        .rejects.toThrow('Failed to save image');
    });
  });

  describe('Filtering Options', () => {
    it('should apply filterByHash to list operation', async () => {
      const params = {
        operation: 'list',
        filterByHash: ['hash1', 'hash2']
      };

      mockSendToPlugin.mockResolvedValue({
        pageId: '0:1',
        images: [
          { imageHash: 'hash1' },
          { imageHash: 'hash2' }
        ]
      });

      await handler.handle('figma_images', params);
      
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_IMAGES',
        payload: {
          operation: 'list',
          filterByHash: ['hash1', 'hash2']
        }
      });
    });

    it('should apply filterByNode to list operation', async () => {
      const params = {
        operation: 'list',
        filterByNode: ['node1', 'node2'],
        pageId: '0:1'
      };

      mockSendToPlugin.mockResolvedValue({
        pageId: '0:1',
        images: []
      });

      await handler.handle('figma_images', params);
      
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_IMAGES',
        payload: {
          operation: 'list',
          filterByNode: ['node1', 'node2'],
          pageId: '0:1'
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined args gracefully', async () => {
      await expect(handler.handle('figma_images', {}))
        .rejects.toThrow('Required parameter \'operation\' is missing');
    });

    it('should handle empty create operation parameters', async () => {
      const params = {
        operation: 'create'
        // No url, path, or imageHash
      };

      mockSendToPlugin.mockRejectedValue(new Error('Either url, imageBytes, or imageHash is required'));

      await expect(handler.handle('figma_images', params))
        .rejects.toThrow('Either url, imageBytes, or imageHash is required');
    });

    it('should handle invalid format for export', async () => {
      const params = {
        operation: 'export',
        imageHash: 'hash123',
        format: 'INVALID_FORMAT'
      };

      await expect(handler.handle('figma_images', params))
        .rejects.toThrow('Validation failed');
    });

    it('should handle directory creation failures', async () => {
      const params = {
        operation: 'export',
        imageHash: 'hash123',
        format: 'PNG',
        outputDirectory: '/restricted/path'
      };

      mockSendToPlugin.mockResolvedValue({
        success: true,
        imageHash: 'hash123',
        data: Buffer.from('test').toString('base64'),
        filename: 'image.png',
        format: 'PNG'
      });

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await expect(handler.handle('figma_images', params))
        .rejects.toThrow('Failed to create output directory');
    });

    it('should handle non-file paths in create operation', async () => {
      const params = {
        operation: 'create',
        source: '/home/user'
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => false } as any);

      await expect(handler.handle('figma_images', params))
        .rejects.toThrow('Path is not a file: /home/user');
    });
  });
});