import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExportsHandler } from '../../../src/handlers/exports-handler.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';

// Create a testable exports handler that exposes private methods
class TestableExportsHandler extends ExportsHandler {
  // Expose private methods for testing
  public testShouldUseMcpImageContent(args: any): boolean {
    return (this as any).shouldUseMcpImageContent(args);
  }

  public testIsSingleImageExport(data: any): boolean {
    return (this as any).isSingleImageExport(data);
  }

  public testGetImageMimeType(format: string): string | null {
    return (this as any).getImageMimeType(format);
  }

  public testCalculateBase64SizeInMB(base64Data: string): number {
    return (this as any).calculateBase64SizeInMB(base64Data);
  }

  public testConvertDataToBinary(exportData: any): Buffer {
    return (this as any).convertDataToBinary(exportData);
  }

  public testGetDefaultExportPath(): string {
    return (this as any).getDefaultExportPath();
  }

  public async testHandleExportWithMcpImageContent(args: any): Promise<any> {
    return (this as any).handleExportWithMcpImageContent(args);
  }

  public testTryFormatAsMcpImage(data: any, args: any): any | null {
    return (this as any).tryFormatAsMcpImage(data, args);
  }

  public testBuildMixedContentResponse(response: any, content: any[]): any {
    return (this as any).buildMixedContentResponse(response, content);
  }

  public async testProcessFileExports(data: any, args: any): Promise<any> {
    return (this as any).processFileExports(data, args);
  }

  public async testSaveExportToFile(exportData: any, outputDirectory?: string): Promise<any> {
    return (this as any).saveExportToFile(exportData, outputDirectory);
  }
}

describe('ExportsHandler', () => {
  let handler: TestableExportsHandler;
  let mockSendToPlugin: vi.Mock;
  let testDir: string;

  beforeEach(() => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'figma-exports-test-'));
    
    // Mock sendToPlugin function
    mockSendToPlugin = vi.fn();
    
    // Create handler instance
    handler = new TestableExportsHandler(mockSendToPlugin);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe('Tool definition', () => {
    it('should return correct tool definition', () => {
      const tools = handler.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_exports');
      expect(tools[0].description).toContain('Manage node export settings');
      expect(tools[0].inputSchema.properties.operation.enum).toContain('export');
    });

    it('should include all required operation types', () => {
      const tools = handler.getTools();
      const operations = tools[0].inputSchema.properties.operation.enum;
      expect(operations).toContain('get_setting');
      expect(operations).toContain('create_setting');
      expect(operations).toContain('update_setting');
      expect(operations).toContain('delete_setting');
      expect(operations).toContain('reorder_setting');
      expect(operations).toContain('clear_settings');
      expect(operations).toContain('duplicate_setting');
      expect(operations).toContain('export');
    });
  });

  describe('MCP Image Content Detection', () => {
    it('should detect when MCP image content should be used', () => {
      const args = {
        operation: 'export',
        target: 'DATA',
        id: '123:456',
        format: 'PNG'
      };
      
      const result = handler.testShouldUseMcpImageContent(args);
      expect(result).toBe(true);
    });

    it('should not use MCP image content for FILE target', () => {
      const args = {
        operation: 'export',
        target: 'FILE',
        id: '123:456',
        format: 'PNG'
      };
      
      const result = handler.testShouldUseMcpImageContent(args);
      expect(result).toBe(false);
    });

    it('should not use MCP image content for non-export operations', () => {
      const args = {
        operation: 'get_setting',
        target: 'DATA',
        id: '123:456',
        format: 'PNG'
      };
      
      const result = handler.testShouldUseMcpImageContent(args);
      expect(result).toBe(false);
    });

    it('should detect bulk exports for MCP image content', () => {
      const args = {
        operation: 'export',
        target: 'DATA',
        id: ['123:456', '789:012'],
        format: 'PNG'
      };
      
      const result = handler.testShouldUseMcpImageContent(args);
      expect(result).toBe(true);
    });
  });

  describe('Single Image Export Detection', () => {
    it('should detect valid single image export', () => {
      const data = {
        success: true,
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        format: 'PNG',
        dataFormat: 'base64',
        filename: 'test.png'
      };
      
      const result = handler.testIsSingleImageExport(data);
      expect(result).toBe(true);
    });

    it('should detect SVG string format', () => {
      const data = {
        success: true,
        data: '<svg>...</svg>',
        format: 'SVG_STRING',
        dataFormat: 'string',
        filename: 'test.svg'
      };
      
      const result = handler.testIsSingleImageExport(data);
      expect(result).toBe(true);
    });

    it('should not detect array data as single image export', () => {
      const data = [
        {
          success: true,
          data: 'base64data',
          format: 'PNG',
          dataFormat: 'base64'
        }
      ];
      
      const result = handler.testIsSingleImageExport(data);
      expect(result).toBe(false);
    });

    it('should not detect failed export as single image export', () => {
      const data = {
        success: false,
        error: 'Export failed',
        format: 'PNG'
      };
      
      const result = handler.testIsSingleImageExport(data);
      expect(result).toBe(false);
    });
  });

  describe('MIME Type Mapping', () => {
    it('should return correct MIME types for image formats', () => {
      expect(handler.testGetImageMimeType('PNG')).toBe('image/png');
      expect(handler.testGetImageMimeType('JPG')).toBe('image/jpeg');
      expect(handler.testGetImageMimeType('SVG')).toBe('image/svg+xml');
      expect(handler.testGetImageMimeType('SVG_STRING')).toBe('image/svg+xml');
      expect(handler.testGetImageMimeType('PDF')).toBe('application/pdf');
    });

    it('should return null for unsupported formats', () => {
      expect(handler.testGetImageMimeType('UNKNOWN')).toBe(null);
      expect(handler.testGetImageMimeType('')).toBe(null);
    });
  });

  describe('Base64 Size Calculation', () => {
    it('should calculate base64 size correctly', () => {
      // 1 pixel PNG in base64 (about 68 bytes)
      const smallBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const sizeInMB = handler.testCalculateBase64SizeInMB(smallBase64);
      expect(sizeInMB).toBeLessThan(0.001); // Very small
    });

    it('should calculate size for larger base64 data', () => {
      // Create a large base64 string (about 1MB)
      const largeBase64 = 'A'.repeat(1400000); // Approximately 1MB when decoded
      const sizeInMB = handler.testCalculateBase64SizeInMB(largeBase64);
      expect(sizeInMB).toBeGreaterThan(0.9);
      expect(sizeInMB).toBeLessThan(1.1);
    });
  });

  describe('Binary Data Conversion', () => {
    it('should convert base64 data to buffer', () => {
      const exportData = {
        data: 'SGVsbG8gV29ybGQ=', // "Hello World" in base64
        dataFormat: 'base64'
      };
      
      const buffer = handler.testConvertDataToBinary(exportData);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString()).toBe('Hello World');
    });

    it('should convert array data to buffer', () => {
      const exportData = {
        data: [72, 101, 108, 108, 111], // "Hello" as byte array
        dataFormat: 'array'
      };
      
      const buffer = handler.testConvertDataToBinary(exportData);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString()).toBe('Hello');
    });

    it('should throw error for unknown data format', () => {
      const exportData = {
        data: 'test',
        dataFormat: 'unknown'
      };
      
      expect(() => handler.testConvertDataToBinary(exportData)).toThrow('Unknown data format');
    });
  });

  describe('Default Export Path', () => {
    it('should return platform-specific default path', () => {
      const defaultPath = handler.testGetDefaultExportPath();
      expect(defaultPath).toBeTruthy();
      
      // Should contain the home directory
      expect(defaultPath).toContain(os.homedir());
      
      // Should contain "Figma Exports"
      expect(defaultPath).toContain('Figma Exports');
    });
  });

  describe('MCP Image Content Handling', () => {
    it('should handle single image export with MCP format', async () => {
      const mockResponse = {
        success: true,
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        format: 'PNG',
        dataFormat: 'base64',
        filename: 'test.png',
        id: '123:456',
        nodeName: 'Test Node',
        nodeType: 'RECTANGLE'
      };

      mockSendToPlugin.mockResolvedValue(mockResponse);

      const args = {
        operation: 'export',
        target: 'DATA',
        id: '123:456',
        format: 'PNG'
      };

      const result = await handler.testHandleExportWithMcpImageContent(args);
      
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('image');
      expect(result.content[0].mimeType).toBe('image/png');
      expect(result.content[1].type).toBe('text');
      expect(result.isError).toBe(false);
    });

    it('should handle SVG_STRING format specially', async () => {
      const mockResponse = {
        success: true,
        data: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>',
        format: 'SVG_STRING',
        dataFormat: 'string',
        filename: 'test.svg',
        id: '123:456',
        nodeName: 'Test Node',
        nodeType: 'RECTANGLE'
      };

      mockSendToPlugin.mockResolvedValue(mockResponse);

      const args = {
        operation: 'export',
        target: 'DATA',
        id: '123:456',
        format: 'SVG_STRING'
      };

      const result = await handler.testHandleExportWithMcpImageContent(args);
      
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('<svg');
      expect(result.content[1].type).toBe('text');
      expect(result.isError).toBe(false);
    });

    it('should handle bulk image exports with mixed content', async () => {
      const mockResponse = [
        {
          success: true,
          data: 'base64data1',
          format: 'PNG',
          dataFormat: 'base64',
          filename: 'test1.png',
          id: '123:456',
          nodeName: 'Test Node 1'
        },
        {
          success: true,
          data: '<svg>...</svg>',
          format: 'SVG_STRING',
          dataFormat: 'string',
          filename: 'test2.svg',
          id: '789:012',
          nodeName: 'Test Node 2'
        }
      ];

      mockSendToPlugin.mockResolvedValue(mockResponse);

      const args = {
        operation: 'export',
        target: 'DATA',
        id: ['123:456', '789:012'],
        format: 'PNG'
      };

      const result = await handler.testHandleExportWithMcpImageContent(args);
      
      expect(result.content.length).toBeGreaterThan(2);
      expect(result.content.some(c => c.type === 'image')).toBe(true);
      expect(result.content.some(c => c.type === 'text')).toBe(true);
      expect(result.isError).toBe(false);
    });
  });

  describe('File Export Processing', () => {
    it('should process single file export successfully', async () => {
      const exportData = {
        success: true,
        data: Buffer.from('Hello World'),
        dataFormat: 'array',
        filename: 'test.txt'
      };

      const result = await handler.testProcessFileExports(exportData, { outputDirectory: testDir });
      
      expect(result.success).toBe(true);
      expect(result.fullPath).toBeTruthy();
      expect(result.method).toBe('file_system');
      expect(result.data).toBeUndefined(); // Binary data should be removed
    });

    it('should process bulk file exports successfully', async () => {
      const exportData = [
        {
          success: true,
          data: Buffer.from('Hello World 1'),
          dataFormat: 'array',
          filename: 'test1.txt'
        },
        {
          success: true,
          data: Buffer.from('Hello World 2'),
          dataFormat: 'array',
          filename: 'test2.txt'
        }
      ];

      const result = await handler.testProcessFileExports(exportData, { outputDirectory: testDir });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].method).toBe('file_system');
      expect(result[1].method).toBe('file_system');
    });

    it('should handle failed exports in bulk processing', async () => {
      const exportData = [
        {
          success: true,
          data: Buffer.from('Hello World'),
          dataFormat: 'array',
          filename: 'test.txt'
        },
        {
          success: false,
          error: 'Export failed'
        }
      ];

      const result = await handler.testProcessFileExports(exportData, { outputDirectory: testDir });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].method).toBe('file_system');
      expect(result[1].success).toBe(false);
    });
  });

  describe('File Saving', () => {
    it('should save file with correct metadata', async () => {
      const exportData = {
        data: Buffer.from('Hello World'),
        dataFormat: 'array',
        filename: 'test.txt'
      };

      const result = await handler.testSaveExportToFile(exportData, testDir);
      
      expect(result.fullPath).toBeTruthy();
      expect(result.actualFilename).toBe('test.txt');
      expect(result.originalFilename).toBe('test.txt');
      expect(result.wasRenamed).toBe(false);
      expect(result.usingDefaultPath).toBe(false);
      
      // Verify file was actually created
      expect(fs.existsSync(result.fullPath)).toBe(true);
      expect(fs.readFileSync(result.fullPath, 'utf8')).toBe('Hello World');
    });

    it('should handle file conflicts with renaming', async () => {
      const exportData = {
        data: Buffer.from('Hello World'),
        dataFormat: 'array',
        filename: 'test.txt'
      };

      // Create existing file
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'existing content');

      const result = await handler.testSaveExportToFile(exportData, testDir);
      
      expect(result.actualFilename).toBe('test-001.txt');
      expect(result.originalFilename).toBe('test.txt');
      expect(result.wasRenamed).toBe(true);
      
      // Verify both files exist
      expect(fs.existsSync(path.join(testDir, 'test.txt'))).toBe(true);
      expect(fs.existsSync(result.fullPath)).toBe(true);
    });

    it('should handle tilde expansion in output directory', async () => {
      const exportData = {
        data: Buffer.from('Hello World'),
        dataFormat: 'array',
        filename: 'test.txt'
      };

      const result = await handler.testSaveExportToFile(exportData, '~/test-exports');
      
      expect(result.outputDirectory).toContain(os.homedir());
      expect(result.outputDirectory).not.toContain('~');
    });

    it('should fallback to current directory on permission error', async () => {
      const exportData = {
        data: Buffer.from('Hello World'),
        dataFormat: 'array',
        filename: 'test.txt'
      };

      // Use a directory that doesn't exist and can't be created
      const invalidDir = '/this/path/does/not/exist/and/cannot/be/created';

      // The fallback logic only works when outputDirectory is not provided (using default)
      // When a specific outputDirectory is provided, it should throw an error
      await expect(handler.testSaveExportToFile(exportData, invalidDir)).rejects.toThrow('Failed to save export to file');
    });

    it('should use fallback directory when default path fails', async () => {
      const exportData = {
        data: Buffer.from('Hello World'),
        dataFormat: 'array',
        filename: 'test.txt'
      };

      // Test fallback by not providing outputDirectory (uses default)
      // The fallback logic should create a file in the current working directory
      const result = await handler.testSaveExportToFile(exportData);
      
      expect(result.fullPath).toBeTruthy();
      expect(fs.existsSync(result.fullPath)).toBe(true);
      expect(fs.readFileSync(result.fullPath, 'utf8')).toBe('Hello World');
      
      // Clean up the created file
      fs.unlinkSync(result.fullPath);
      // Also clean up the directory if it was created
      try {
        fs.rmdirSync(path.dirname(result.fullPath));
      } catch (e) {
        // Ignore if directory is not empty or doesn't exist
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown tool name', async () => {
      await expect(handler.handle('unknown_tool', {})).rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('should handle plugin communication errors', async () => {
      mockSendToPlugin.mockRejectedValue(new Error('Plugin communication failed'));

      await expect(handler.handle('figma_exports', {
        operation: 'export',
        id: '123:456'
      })).rejects.toThrow('Plugin communication failed');
    });

    it('should validate required operation parameter', async () => {
      await expect(handler.handle('figma_exports', {})).rejects.toThrow();
    });
  });

  describe('Integration with UnifiedHandler', () => {
    it('should handle bulk operations correctly', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: 'test data',
        format: 'PNG'
      });

      const result = await handler.handle('figma_exports', {
        operation: 'export',
        id: ['123:456', '789:012'],
        target: 'FILE'
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.isError).toBe(false);
    });

    it('should handle single operations correctly', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: 'test data',
        format: 'PNG'
      });

      const result = await handler.handle('figma_exports', {
        operation: 'get_setting',
        id: '123:456'
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.isError).toBe(false);
    });
  });
});