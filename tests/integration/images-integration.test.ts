import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImagesHandler } from '../../src/handlers/images-handler.js';
import { UnifiedHandler } from '../../src/utils/unified-handler.js';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock dependencies
vi.mock('fs');
vi.mock('os');
vi.mock('../../src/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    log: vi.fn(),
    error: vi.fn()
  }
}));

describe('Images Handler Integration Tests', () => {
  let handler: ImagesHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendToPlugin = vi.fn();
    handler = new ImagesHandler(mockSendToPlugin);
    
    // Setup default OS mocks
    vi.mocked(os.homedir).mockReturnValue('/home/testuser');
    vi.mocked(os.platform).mockReturnValue('darwin');
  });

  describe('List and Get Image Workflow', () => {
    it('should list images and then get details for specific image', async () => {
      // Step 1: List images
      mockSendToPlugin.mockResolvedValueOnce({
        pageId: '0:1',
        pageName: 'Design Page',
        imageCount: 3,
        images: [
          { imageHash: 'img1', width: 800, height: 600 },
          { imageHash: 'img2', width: 1920, height: 1080 },
          { imageHash: 'img3', width: 512, height: 512 }
        ]
      });

      const listResult = await handler.handle('figma_images', {
        operation: 'list',
        includeMetadata: true
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_IMAGES',
        payload: {
          operation: 'list',
          includeMetadata: true
        }
      });

      const listData = yaml.load(listResult.content[0].text) as any;
      expect(listData.imageCount).toBe(3);
      expect(listData.images).toHaveLength(3);

      // Step 2: Get details for specific image
      mockSendToPlugin.mockResolvedValueOnce({
        imageHash: 'img1',
        width: 800,
        height: 600,
        size: '245 KB',
        colorType: 'RGBA',
        usedBy: {
          nodeIds: ['rect1', 'rect2'],
          styleIds: ['style1']
        }
      });

      const getResult = await handler.handle('figma_images', {
        operation: 'get',
        imageHash: 'img1'
      });

      const getDataText = getResult.content[0].text;
      expect(getDataText).toContain('img1');
      expect(getDataText).toContain('245 KB');
      expect(getDataText).toContain('RGBA');
      expect(getDataText).toContain('rect1');
      expect(getDataText).toContain('style1');
    });
  });

  describe('Export Workflow - DATA Format', () => {
    it('should export single image as MCP content', async () => {
      const customHandlerSpy = vi.spyOn(handler as any, 'handleExportWithMcpImageContent')
        .mockResolvedValue({
          content: [{
            type: 'image',
            data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            mimeType: 'image/png'
          }],
          isError: false
        });

      const result = await handler.handle('figma_images', {
        operation: 'export',
        imageHash: 'test_hash',
        format: 'DATA'
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('image');
      expect(result.content[0].data).toContain('iVBORw0KGgo');
      expect(result.content[0].mimeType).toBe('image/png');

      customHandlerSpy.mockRestore();
    });

    it('should export multiple images with MCP content and metadata', async () => {
      const customHandlerSpy = vi.spyOn(handler as any, 'handleExportWithMcpImageContent')
        .mockResolvedValue({
          content: [
            { type: 'image', data: 'image1data', mimeType: 'image/png' },
            { type: 'image', data: 'image2data', mimeType: 'image/png' },
            { 
              type: 'text', 
              text: yaml.dump([
                { imageHash: 'hash1', format: 'DATA', size: '10 KB', message: 'Exported successfully' },
                { imageHash: 'hash2', format: 'DATA', size: '15 KB', message: 'Exported successfully' }
              ])
            }
          ],
          isError: false
        });

      const result = await handler.handle('figma_images', {
        operation: 'export',
        imageHash: ['hash1', 'hash2'],
        format: 'DATA'
      });

      expect(result.content).toHaveLength(3);
      expect(result.content[0].type).toBe('image');
      expect(result.content[1].type).toBe('image');
      expect(result.content[2].type).toBe('text');
      
      const metadata = yaml.load(result.content[2].text) as any[];
      expect(metadata).toHaveLength(2);
      expect(metadata[0].imageHash).toBe('hash1');
      expect(metadata[1].imageHash).toBe('hash2');

      customHandlerSpy.mockRestore();
    });
  });

  describe('Export Workflow - PNG Format', () => {
    it('should export and save PNG files to filesystem', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        imageHash: 'test_hash',
        data: Buffer.from('fake-png-data').toString('base64'),
        filename: 'image-test_hash.png',
        format: 'PNG',
        size: '25 KB'
      });

      // Mock filesystem operations
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const result = await handler.handle('figma_images', {
        operation: 'export',
        imageHash: 'test_hash',
        format: 'PNG',
        outputDirectory: '~/Downloads/test-exports'
      });

      // Verify file operations
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        '/home/testuser/Downloads/test-exports',
        { recursive: true }
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/home/testuser/Downloads/test-exports/image-test_hash.png',
        expect.any(Buffer)
      );

      // Verify response
      const yamlData = yaml.load(result.content[0].text) as any;
      expect(yamlData.success).toBe(true);
      expect(yamlData.fullPath).toBe('/home/testuser/Downloads/test-exports/image-test_hash.png');
      expect(yamlData.method).toBe('file_system');
      expect(yamlData.wasRenamed).toBe(false);
    });

    it('should handle bulk PNG export with mixed results', async () => {
      mockSendToPlugin.mockResolvedValue([
        {
          success: true,
          imageHash: 'hash1',
          data: Buffer.from('png1').toString('base64'),
          filename: 'image-hash1.png',
          format: 'PNG'
        },
        {
          success: false,
          imageHash: 'hash2',
          error: 'Image not found in Figma file'
        },
        {
          success: true,
          imageHash: 'hash3',
          data: Buffer.from('png3').toString('base64'),
          filename: 'image-hash3.png',
          format: 'PNG'
        }
      ]);

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const result = await handler.handle('figma_images', {
        operation: 'export',
        imageHash: ['hash1', 'hash2', 'hash3'],
        format: 'PNG'
      });

      const yamlData = yaml.load(result.content[0].text) as any;
      expect(yamlData).toHaveLength(3);
      
      // First export should succeed
      expect(yamlData[0].success).toBe(true);
      expect(yamlData[0].actualFilename).toBe('image-hash1.png');
      expect(yamlData[0].method).toBe('file_system');
      
      // Second export should fail
      expect(yamlData[1].success).toBe(false);
      expect(yamlData[1].error).toBe('Image not found in Figma file');
      
      // Third export should succeed
      expect(yamlData[2].success).toBe(true);
      expect(yamlData[2].actualFilename).toBe('image-hash3.png');
      expect(yamlData[2].method).toBe('file_system');

      // Should only have called writeFileSync for successful exports
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    });
  });

  describe('Create Image Workflow', () => {
    it('should create image from URL with positioning', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        nodeId: 'rect_node_123',
        nodeName: 'Product Image',
        imageHash: 'new_image_hash',
        width: 800,
        height: 600,
        position: { x: 100, y: 200 },
        positionReason: 'user_specified',
        message: 'Created image node'
      });

      const result = await handler.handle('figma_images', {
        operation: 'create',
        url: 'https://example.com/product.jpg',
        x: 100,
        y: 200,
        name: 'Product Image'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_IMAGES',
        payload: {
          operation: 'create',
          url: 'https://example.com/product.jpg',
          x: 100,
          y: 200,
          name: 'Product Image'
        }
      });

      const resultText = result.content[0].text;
      expect(resultText).toContain('rect_node_123');
      expect(resultText).toContain('Product Image');
      expect(resultText).toContain('new_image_hash');
      expect(resultText).toContain('x: 100');
      expect(resultText).toContain('y: 200');
    });

    it('should create image from local file with preprocessing', async () => {
      // Mock file system for local image loading
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any);
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('fake-image-bytes'));

      mockSendToPlugin.mockResolvedValue({
        success: true,
        nodeId: 'rect_local_456',
        nodeName: 'Local Photo',
        imageHash: 'local_hash_123',
        width: 1024,
        height: 768,
        position: { x: 0, y: 0 },
        positionReason: 'smart_positioning',
        message: 'Created image node'
      });

      const result = await handler.handle('figma_images', {
        operation: 'create',
        path: '~/Desktop/photo.jpg',
        name: 'Local Photo'
      });

      // Should have preprocessed the file path
      expect(fs.readFileSync).toHaveBeenCalledWith('/home/testuser/Desktop/photo.jpg');
      
      // Should have sent base64 data instead of path
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_IMAGES',
        payload: {
          operation: 'create',
          imageBytes: Buffer.from('fake-image-bytes').toString('base64'),
          name: 'Local Photo'
        }
      });

      const resultText = result.content[0].text;
      expect(resultText).toContain('rect_local_456');
      expect(resultText).toContain('Local Photo');
      expect(resultText).toContain('local_hash_123');
    });

    it('should reuse existing image hash', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        nodeId: 'rect_reused_789',
        nodeName: 'Reused Image',
        imageHash: 'existing_hash_456',
        width: 512,
        height: 512,
        position: { x: 50, y: 100 },
        positionReason: 'user_specified',
        message: 'Created image node'
      });

      const result = await handler.handle('figma_images', {
        operation: 'create',
        imageHash: 'existing_hash_456',
        x: 50,
        y: 100,
        name: 'Reused Image'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_IMAGES',
        payload: {
          operation: 'create',
          imageHash: 'existing_hash_456',
          x: 50,
          y: 100,
          name: 'Reused Image'
        }
      });

      const resultText = result.content[0].text;
      expect(resultText).toContain('rect_reused_789');
      expect(resultText).toContain('Reused Image');
      expect(resultText).toContain('existing_hash_456');
    });
  });

  describe('Filtering and Search Integration', () => {
    it('should filter images by hash and then export filtered results', async () => {
      // Step 1: List with hash filter
      mockSendToPlugin.mockResolvedValueOnce({
        pageId: '0:1',
        pageName: 'Filtered Page',
        imageCount: 2,
        images: [
          { imageHash: 'target1', width: 800, height: 600 },
          { imageHash: 'target2', width: 1024, height: 768 }
        ]
      });

      const listResult = await handler.handle('figma_images', {
        operation: 'list',
        filterByHash: ['target1', 'target2', 'target3'] // target3 won't be found
      });

      const listData = yaml.load(listResult.content[0].text) as any;
      expect(listData.imageCount).toBe(2);
      expect(listData.images.map((img: any) => img.imageHash)).toEqual(['target1', 'target2']);

      // Step 2: Export the filtered images
      const customHandlerSpy = vi.spyOn(handler as any, 'handleExportWithMcpImageContent')
        .mockResolvedValue({
          content: [
            { type: 'image', data: 'data1', mimeType: 'image/png' },
            { type: 'image', data: 'data2', mimeType: 'image/png' },
            { 
              type: 'text',
              text: yaml.dump([
                { imageHash: 'target1', format: 'DATA', size: '150 KB' },
                { imageHash: 'target2', format: 'DATA', size: '200 KB' }
              ])
            }
          ],
          isError: false
        });

      const exportResult = await handler.handle('figma_images', {
        operation: 'export',
        imageHash: ['target1', 'target2'],
        format: 'DATA'
      });

      expect(exportResult.content).toHaveLength(3);
      const metadata = yaml.load(exportResult.content[2].text) as any[];
      expect(metadata.map((item: any) => item.imageHash)).toEqual(['target1', 'target2']);

      customHandlerSpy.mockRestore();
    });

    it('should filter by node and get usage information', async () => {
      mockSendToPlugin.mockResolvedValue({
        pageId: '0:1',
        pageName: 'Node Filtered',
        imageCount: 1,
        images: [
          {
            imageHash: 'node_image',
            width: 600,
            height: 400,
            usedBy: {
              nodeIds: ['target_node'],
              styleIds: []
            }
          }
        ]
      });

      const result = await handler.handle('figma_images', {
        operation: 'list',
        filterByNode: ['target_node'],
        includeUsage: true
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_IMAGES',
        payload: {
          operation: 'list',
          filterByNode: ['target_node'],
          includeUsage: true
        }
      });

      const resultText = result.content[0].text;
      expect(resultText).toContain('node_image');
      expect(resultText).toContain('target_node');
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle partial failures in bulk operations gracefully', async () => {
      // Test bulk export with some failures
      const customHandlerSpy = vi.spyOn(handler as any, 'handleExportWithMcpImageContent')
        .mockResolvedValue({
          content: [
            { type: 'image', data: 'success_data', mimeType: 'image/png' },
            {
              type: 'text',
              text: yaml.dump([
                { imageHash: 'good_hash', format: 'DATA', size: '100 KB', message: 'Exported' },
                { imageHash: 'bad_hash', success: false, error: 'Image corrupted' },
                { imageHash: 'missing_hash', success: false, error: 'Image not found' }
              ])
            }
          ],
          isError: false
        });

      const result = await handler.handle('figma_images', {
        operation: 'export',
        imageHash: ['good_hash', 'bad_hash', 'missing_hash'],
        format: 'DATA'
      });

      expect(result.content).toHaveLength(2); // 1 image + 1 metadata text
      expect(result.content[0].type).toBe('image');
      expect(result.content[1].type).toBe('text');
      
      const metadata = yaml.load(result.content[1].text) as any[];
      expect(metadata).toHaveLength(3);
      expect(metadata[0].success).not.toBe(false); // First one succeeded
      expect(metadata[1].success).toBe(false);
      expect(metadata[2].success).toBe(false);

      customHandlerSpy.mockRestore();
    });

    it('should recover from file system issues during PNG export', async () => {
      mockSendToPlugin.mockResolvedValue([
        {
          success: true,
          imageHash: 'hash1',
          data: Buffer.from('data1').toString('base64'),
          filename: 'image1.png',
          format: 'PNG'
        },
        {
          success: true,
          imageHash: 'hash2',
          data: Buffer.from('data2').toString('base64'),
          filename: 'image2.png',
          format: 'PNG'
        }
      ]);

      // Mock filesystem to fail on second write
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync)
        .mockReturnValueOnce(undefined) // First write succeeds
        .mockImplementationOnce(() => {
          throw new Error('Disk full');
        }); // Second write fails

      const result = await handler.handle('figma_images', {
        operation: 'export',
        imageHash: ['hash1', 'hash2'],
        format: 'PNG'
      });

      const yamlData = yaml.load(result.content[0].text) as any;
      expect(yamlData).toHaveLength(2);
      
      // First should succeed
      expect(yamlData[0].success).toBe(true);
      expect(yamlData[0].method).toBe('file_system');
      
      // Second should fail with file save error
      expect(yamlData[1].success).toBe(false);
      expect(yamlData[1].error).toContain('Failed to save file');
    });
  });

  describe('Cross-Platform Integration', () => {
    it('should handle different OS path conventions', async () => {
      const testCases = [
        {
          platform: 'win32',
          homedir: 'C:\\Users\\TestUser',
          expectedDefault: 'C:\\Users\\TestUser\\Documents\\Figma Exports'
        },
        {
          platform: 'darwin',
          homedir: '/Users/testuser',
          expectedDefault: '/Users/testuser/Downloads/Figma Exports'
        },
        {
          platform: 'linux',
          homedir: '/home/testuser',
          expectedDefault: '/home/testuser/Downloads/Figma Exports'
        }
      ];

      for (const testCase of testCases) {
        vi.mocked(os.platform).mockReturnValue(testCase.platform as any);
        vi.mocked(os.homedir).mockReturnValue(testCase.homedir);

        mockSendToPlugin.mockResolvedValue({
          success: true,
          imageHash: 'test',
          data: Buffer.from('test').toString('base64'),
          filename: 'test.png',
          format: 'PNG'
        });

        vi.mocked(fs.existsSync).mockReturnValue(false);
        vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
        vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

        const result = await handler.handle('figma_images', {
          operation: 'export',
          imageHash: 'test',
          format: 'PNG'
        });

        const yamlData = yaml.load(result.content[0].text) as any;
        expect(yamlData.outputDirectory).toBe(testCase.expectedDefault);
      }
    });
  });
});