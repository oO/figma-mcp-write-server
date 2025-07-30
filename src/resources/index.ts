import { Resource, ResourceContents } from '@modelcontextprotocol/sdk/types';
import { readdir, readFile, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Central registry for all MCP resources
 * Scans mcp-resources folder and exposes structure via figma:// URI
 */
export class ResourceRegistry {
  private resourcesPath: string;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.resourcesPath = join(__dirname, '..', '..', 'mcp-resources');
  }

  /**
   * Get all available resources
   */
  async getResources(): Promise<Resource[]> {
    try {
      const resources: Resource[] = [];
      const items = await readdir(this.resourcesPath);

      for (const item of items) {
        if (item.endsWith('.md')) {
          const fullPath = join(this.resourcesPath, item);
          const title = await this.extractTitle(fullPath);
          resources.push({
            uri: `figma://${item}`,
            name: title || item.replace('.md', ''),
            mimeType: 'text/markdown',
            description: `${title || item.replace('.md', '')} - Figma MCP usage guide`
          });
        }
      }

      return resources;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get content for a specific resource URI
   */
  async getResourceContent(uri: string): Promise<ResourceContents> {
    if (!uri.startsWith('figma://')) {
      throw new Error(`Resource not found: ${uri}`);
    }

    const filename = uri.replace('figma://', '');
    const fullPath = join(this.resourcesPath, filename);
    
    try {
      const content = await readFile(fullPath, 'utf-8');
      return {
        uri: uri,
        contents: [
          {
            uri: uri,
            text: content,
            mimeType: 'text/markdown'
          }
        ]
      };
    } catch (error) {
      throw new Error(`Resource not found: ${uri}`);
    }
  }

  /**
   * Check if a resource URI is supported
   */
  isResourceSupported(uri: string): boolean {
    return uri.startsWith('figma://');
  }


  /**
   * Extract title from markdown file (first line starting with single #)
   */
  private async extractTitle(filePath: string): Promise<string | null> {
    try {
      if (!filePath.endsWith('.md')) {
        return null;
      }
      
      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
          return trimmed.substring(2).trim();
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
}