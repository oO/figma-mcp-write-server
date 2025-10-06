import { Resource, ResourceContents } from '@modelcontextprotocol/sdk/types';
import { readdir, readFile, stat, access } from 'fs/promises';
import { join, dirname, resolve } from 'path';
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
    // Use resolve to ensure absolute path and handle Windows paths correctly
    this.resourcesPath = resolve(join(__dirname, '..', '..', 'mcp-resources'));
    console.log(`[ResourceRegistry] Initialized with path: ${this.resourcesPath}`);
    console.log(`[ResourceRegistry] __dirname: ${__dirname}`);
    console.log(`[ResourceRegistry] Platform: ${process.platform}`);
    console.log(`[ResourceRegistry] import.meta.url: ${import.meta.url}`);
  }

  /**
   * Get all available resources
   */
  async getResources(): Promise<Resource[]> {
    try {
      console.log(`[ResourceRegistry] Scanning directory: ${this.resourcesPath}`);
      
      // Check if directory exists and is accessible
      try {
        await access(this.resourcesPath);
        console.log(`[ResourceRegistry] Directory is accessible`);
      } catch (accessError) {
        console.error(`[ResourceRegistry] Directory not accessible:`, accessError);
        return [];
      }
      
      const resources: Resource[] = [];
      const items = await readdir(this.resourcesPath);
      console.log(`[ResourceRegistry] Found ${items.length} items:`, items);

      for (const item of items) {
        if (item.endsWith('.md')) {
          const fullPath = join(this.resourcesPath, item);
          const title = await this.extractTitle(fullPath);
          const resource = {
            uri: `figma://${item}`,
            name: title || item.replace('.md', ''),
            mimeType: 'text/markdown',
            description: `${title || item.replace('.md', '')} - Figma MCP usage guide`
          };
          console.log(`[ResourceRegistry] Adding resource:`, resource);
          resources.push(resource);
        }
      }

      console.log(`[ResourceRegistry] Returning ${resources.length} resources`);
      return resources;
    } catch (error) {
      console.error(`[ResourceRegistry] Error scanning resources:`, error);
      return [];
    }
  }

  /**
   * Get content for a specific resource URI
   */
  async getResourceContent(uri: string): Promise<ResourceContents> {
    console.log(`[ResourceRegistry] Getting content for URI: ${uri}`);
    
    if (!uri.startsWith('figma://')) {
      console.error(`[ResourceRegistry] Invalid URI scheme: ${uri}`);
      throw new Error(`Resource not found: ${uri}`);
    }

    const filename = uri.replace('figma://', '');
    const fullPath = resolve(join(this.resourcesPath, filename));
    console.log(`[ResourceRegistry] Resolved file path: ${fullPath}`);
    
    try {
      // Check if file exists and is accessible
      await access(fullPath);
      console.log(`[ResourceRegistry] File is accessible: ${fullPath}`);
      
      const content = await readFile(fullPath, 'utf-8');
      console.log(`[ResourceRegistry] Successfully read content (${content.length} chars)`);
      
      const result = {
        uri: uri,
        contents: [
          {
            uri: uri,
            text: content,
            mimeType: 'text/markdown'
          }
        ]
      };
      console.log(`[ResourceRegistry] Returning resource content for: ${uri}`);
      return result;
    } catch (error) {
      console.error(`[ResourceRegistry] Error reading file ${fullPath}:`, error);
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