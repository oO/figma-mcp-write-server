import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ExportsHandler } from '../../../src/handlers/exports-handler.js';

// Create a test instance to access private methods
class TestableExportsHandler extends ExportsHandler {
  // Expose the private method for testing
  public testResolveUniqueFilename(baseFilename: string, outputDir: string): string {
    return (this as any).resolveUniqueFilename(baseFilename, outputDir);
  }
}

describe('ExportsHandler - resolveUniqueFilename', () => {
  let handler: TestableExportsHandler;
  let testDir: string;
  let mockSendToPlugin: (request: any) => Promise<any>;

  beforeEach(() => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'figma-exports-test-'));
    
    // Mock sendToPlugin function
    mockSendToPlugin = async (request: any) => ({ success: true });
    
    // Create handler instance
    handler = new TestableExportsHandler(mockSendToPlugin);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Basic functionality', () => {
    it('should return original filename when no conflict exists', () => {
      const result = handler.testResolveUniqueFilename('test.png', testDir);
      const expected = path.join(testDir, 'test.png');
      expect(result).toBe(expected);
    });

    it('should add -001 suffix when original file exists', () => {
      // Create the original file
      const originalPath = path.join(testDir, 'test.png');
      fs.writeFileSync(originalPath, 'test data');

      const result = handler.testResolveUniqueFilename('test.png', testDir);
      const expected = path.join(testDir, 'test-001.png');
      expect(result).toBe(expected);
    });

    it('should increment to -002 when -001 also exists', () => {
      // Create original and -001 files
      fs.writeFileSync(path.join(testDir, 'test.png'), 'test data');
      fs.writeFileSync(path.join(testDir, 'test-001.png'), 'test data');

      const result = handler.testResolveUniqueFilename('test.png', testDir);
      const expected = path.join(testDir, 'test-002.png');
      expect(result).toBe(expected);
    });
  });

  describe('Zero padding transitions', () => {
    it('should correctly transition from -009 to -010 (not -0010)', () => {
      const baseName = 'test.png';
      
      // Create files from original through -009
      fs.writeFileSync(path.join(testDir, 'test.png'), 'data');
      for (let i = 1; i <= 9; i++) {
        const paddedNum = i.toString().padStart(3, '0');
        fs.writeFileSync(path.join(testDir, `test-${paddedNum}.png`), 'data');
      }

      const result = handler.testResolveUniqueFilename(baseName, testDir);
      const expected = path.join(testDir, 'test-010.png');
      expect(result).toBe(expected);
      expect(result).not.toContain('test-0010.png');
    });

    it('should correctly transition from -099 to -100', () => {
      const baseName = 'test.png';
      
      // Create files from original through -099
      fs.writeFileSync(path.join(testDir, 'test.png'), 'data');
      for (let i = 1; i <= 99; i++) {
        const paddedNum = i.toString().padStart(3, '0');
        fs.writeFileSync(path.join(testDir, `test-${paddedNum}.png`), 'data');
      }

      const result = handler.testResolveUniqueFilename(baseName, testDir);
      const expected = path.join(testDir, 'test-100.png');
      expect(result).toBe(expected);
    });

    it('should handle numbers beyond 999 correctly', () => {
      const baseName = 'test.png';
      
      // Create files from original through -999
      fs.writeFileSync(path.join(testDir, 'test.png'), 'data');
      for (let i = 1; i <= 999; i++) {
        const paddedNum = i.toString().padStart(3, '0');
        fs.writeFileSync(path.join(testDir, `test-${paddedNum}.png`), 'data');
      }

      const result = handler.testResolveUniqueFilename(baseName, testDir);
      const expected = path.join(testDir, 'test-1000.png');
      expect(result).toBe(expected);
    });
  });

  describe('Edge cases with filenames', () => {
    it('should handle filenames with spaces (converted to underscores)', () => {
      const baseName = 'my file.png';
      fs.writeFileSync(path.join(testDir, 'my file.png'), 'data');

      const result = handler.testResolveUniqueFilename(baseName, testDir);
      const expected = path.join(testDir, 'my file-001.png');
      expect(result).toBe(expected);
    });

    it('should handle filenames with existing dashes', () => {
      const baseName = 'test-file.png';
      fs.writeFileSync(path.join(testDir, 'test-file.png'), 'data');

      const result = handler.testResolveUniqueFilename(baseName, testDir);
      const expected = path.join(testDir, 'test-file-001.png');
      expect(result).toBe(expected);
    });

    it('should handle filenames with multiple dots', () => {
      const baseName = 'test.backup.png';
      fs.writeFileSync(path.join(testDir, 'test.backup.png'), 'data');

      const result = handler.testResolveUniqueFilename(baseName, testDir);
      const expected = path.join(testDir, 'test.backup-001.png');
      expect(result).toBe(expected);
    });

    it('should handle filenames without extensions', () => {
      const baseName = 'test';
      fs.writeFileSync(path.join(testDir, 'test'), 'data');

      const result = handler.testResolveUniqueFilename(baseName, testDir);
      const expected = path.join(testDir, 'test-001');
      expect(result).toBe(expected);
    });

    it('should handle very long filenames', () => {
      const longName = 'a'.repeat(200);
      const baseName = `${longName}.png`;
      fs.writeFileSync(path.join(testDir, baseName), 'data');

      const result = handler.testResolveUniqueFilename(baseName, testDir);
      const expected = path.join(testDir, `${longName}-001.png`);
      expect(result).toBe(expected);
    });

    it('should handle filenames that already look like numbered versions', () => {
      const baseName = 'test-001.png';
      fs.writeFileSync(path.join(testDir, 'test-001.png'), 'data');

      const result = handler.testResolveUniqueFilename(baseName, testDir);
      const expected = path.join(testDir, 'test-001-001.png');
      expect(result).toBe(expected);
    });
  });

  describe('Different file extensions', () => {
    it('should handle PNG files correctly', () => {
      fs.writeFileSync(path.join(testDir, 'image.png'), 'data');
      const result = handler.testResolveUniqueFilename('image.png', testDir);
      expect(result).toBe(path.join(testDir, 'image-001.png'));
    });

    it('should handle JPG files correctly', () => {
      fs.writeFileSync(path.join(testDir, 'image.jpg'), 'data');
      const result = handler.testResolveUniqueFilename('image.jpg', testDir);
      expect(result).toBe(path.join(testDir, 'image-001.jpg'));
    });

    it('should handle SVG files correctly', () => {
      fs.writeFileSync(path.join(testDir, 'icon.svg'), 'data');
      const result = handler.testResolveUniqueFilename('icon.svg', testDir);
      expect(result).toBe(path.join(testDir, 'icon-001.svg'));
    });

    it('should handle PDF files correctly', () => {
      fs.writeFileSync(path.join(testDir, 'document.pdf'), 'data');
      const result = handler.testResolveUniqueFilename('document.pdf', testDir);
      expect(result).toBe(path.join(testDir, 'document-001.pdf'));
    });

    it('should handle uppercase extensions correctly', () => {
      fs.writeFileSync(path.join(testDir, 'image.PNG'), 'data');
      const result = handler.testResolveUniqueFilename('image.PNG', testDir);
      expect(result).toBe(path.join(testDir, 'image-001.PNG'));
    });
  });

  describe('Performance considerations', () => {
    it('should handle many existing files efficiently', () => {
      const baseName = 'test.png';
      
      // Create 50 files to test performance
      fs.writeFileSync(path.join(testDir, 'test.png'), 'data');
      for (let i = 1; i <= 50; i++) {
        const paddedNum = i.toString().padStart(3, '0');
        fs.writeFileSync(path.join(testDir, `test-${paddedNum}.png`), 'data');
      }

      const start = Date.now();
      const result = handler.testResolveUniqueFilename(baseName, testDir);
      const end = Date.now();

      expect(result).toBe(path.join(testDir, 'test-051.png'));
      expect(end - start).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Directory edge cases', () => {
    it('should handle non-existent directory gracefully', () => {
      const nonExistentDir = path.join(testDir, 'does-not-exist');
      
      // Should not throw an error, just return the path
      const result = handler.testResolveUniqueFilename('test.png', nonExistentDir);
      const expected = path.join(nonExistentDir, 'test.png');
      expect(result).toBe(expected);
    });

    it('should handle relative paths correctly', () => {
      const relativePath = path.relative(process.cwd(), testDir);
      fs.writeFileSync(path.join(testDir, 'test.png'), 'data');

      const result = handler.testResolveUniqueFilename('test.png', relativePath);
      expect(result).toContain('test-001.png');
    });
  });
});