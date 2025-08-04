import { ToolHandler, Tool, ManageImagesSchema } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig } from '../utils/unified-handler.js';
import { logger } from "../utils/logger.js";
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class ImagesHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_images',
        description: 'List image hashes in a page, get detailed information about a specific image, export image data, or create image nodes from any source type. Use the "source" parameter for auto-detection of URLs, file paths, or image hashes. Supports bulk operations with mixed source types. Supports DATA format (MCP image content) and PNG format (filesystem export). Use figma_exports for JPG/SVG/PDF conversion.',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { 
              type: 'string', 
              enum: ['list', 'get', 'export', 'create'],
              description: 'Image operation to perform' 
            },
            pageId: { 
              type: 'string',
              description: 'Page ID to search for images (optional - defaults to current page)'
            },
            imageHash: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Image hash(es) - single string for create/get operations, array for bulk export operations'
            },
            includeMetadata: {
              type: 'boolean',
              description: 'Include detailed metadata like dimensions and file size (default: true for get)'
            },
            includeUsage: {
              type: 'boolean',
              description: 'Include nodes, styles, and components using each image (default: true)'
            },
            filterByHash: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter results to only include specific image hashes'
            },
            filterByNode: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter results to only include images used by specific node IDs'
            },
            format: {
              type: 'string',
              enum: ['DATA', 'PNG'],
              description: 'Export format - DATA returns MCP image content, PNG saves to filesystem'
            },
            outputDirectory: {
              type: 'string',
              description: 'Directory to save files (defaults to ~/Downloads/Figma Exports)'
            },
            suffix: {
              type: 'string',
              description: 'Custom suffix for filename'
            },
            // Create operation parameters
            source: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Image source(s) - URL, local file path, or image hash. Auto-detects type. Single string or array for bulk creation'
            },
            x: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'X position(s) for the new image node(s) - single number or array for bulk creation'
            },
            y: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Y position(s) for the new image node(s) - single number or array for bulk creation'
            },
            name: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Name(s) for the new image node(s) - single string or array for bulk creation'
            },
            imageBytes: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Base64 encoded image data (internal use - converted from path) - single string or array for bulk creation'
            }
          },
          required: ['operation']
        },
        examples: [
          '{"operation": "list"}',
          '{"operation": "list", "pageId": "0:1"}',
          '{"operation": "get", "imageHash": "e07fbab29ff01c78724308f6a5e10179d6e0cde1"}',
          '{"operation": "get", "imageHash": "abc123", "includeMetadata": true, "includeUsage": true}',
          '{"operation": "export", "imageHash": "abc123", "format": "DATA"}',
          '{"operation": "export", "imageHash": "abc123", "format": "PNG", "outputDirectory": "~/Downloads"}',
          '{"operation": "export", "imageHash": "abc123", "format": "PNG", "suffix": "exported"}',
          '{"operation": "export", "imageHash": ["abc123", "def456"], "format": "PNG"}',
          
          // Create operation - single images
          '{"operation": "create", "source": "https://example.com/image.png"}',
          '{"operation": "create", "source": "~/Desktop/screenshot.png", "x": 100, "y": 200}',
          '{"operation": "create", "source": "abc123def456", "name": "Reused Image"}',
          
          // Create operation - bulk images (mixed sources auto-detected)
          '{"operation": "create", "source": ["https://example.com/img1.png", "~/local/img2.png", "abc123"]}',
          '{"operation": "create", "source": ["https://example.com/photo.jpg", "existing456"], "x": [0, 200], "name": ["Web Photo", "Library Asset"]}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_images') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_images',
      operation: 'images',
      bulkParams: ['imageHash', 'source', 'url', 'path', 'x', 'y', 'name', 'imageBytes'],
      paramConfigs: {
        operation: { expectedType: 'string' as const, required: true },
        pageId: { expectedType: 'string' as const },
        imageHash: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        includeMetadata: { expectedType: 'boolean' as const },
        includeUsage: { expectedType: 'boolean' as const },
        filterByHash: { expectedType: 'array' as const, arrayItemType: 'string' as const },
        filterByNode: { expectedType: 'array' as const, arrayItemType: 'string' as const },
        format: { expectedType: 'string' as const },
        outputDirectory: { expectedType: 'string' as const },
        suffix: { expectedType: 'string' as const },
        source: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        url: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        path: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        x: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        y: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        name: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        imageBytes: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true }
      },
      pluginMessageType: 'MANAGE_IMAGES',
      schema: ManageImagesSchema,
      // Use custom handler for export operations that return MCP image content
      customHandler: this.shouldUseMcpImageContent(args) ? 
        (validatedArgs: any) => this.handleExportWithMcpImageContent(validatedArgs) : 
        undefined
    };

    // Preprocess local image paths for create operation
    const processedArgs = await this.preprocessImagePaths(args);
    
    const result = await this.unifiedHandler.handle(processedArgs, config);
    
    // Post-process result for FILE format exports (DATA exports use custom handler)
    if (result && result.content && result.content[0] && result.content[0].text && 
        args.operation === 'export' && args.format !== 'DATA') {
      const yamlContent = result.content[0].text;
      const data = yaml.load(yamlContent);
      
      // Process the export result for file saving
      if (data && typeof data === 'object') {
        const processedData = await this.processFileExport(data, args);
        result.content[0].text = yaml.dump(processedData);
      }
    }
    
    return result;
  }

  /**
   * Determine if we should use MCP image content for this request
   */
  private shouldUseMcpImageContent(args: any): boolean {
    return (
      args.operation === 'export' &&
      args.format === 'DATA' &&
      args.imageHash
    );
  }

  /**
   * Custom handler for export operations that should return MCP image content
   */
  private async handleExportWithMcpImageContent(args: any): Promise<any> {
    // Send request to plugin
    const response = await this.unifiedHandler.sendPluginRequest(({
      type: 'MANAGE_IMAGES',
      payload: args
    }) as any);

    // Check if response has MCP image content format (single DATA export)
    if (response && response.content && Array.isArray(response.content)) {
      return response; // Already in MCP format from plugin
    }

    // Handle bulk DATA exports
    if (Array.isArray(response)) {
      const content: any[] = [];
      const textMetadata: any[] = [];
      
      for (const item of response) {
        if (item.success && item.data && item.format === 'DATA') {
          // Add image content block
          content.push({
            type: 'image',
            data: item.data,
            mimeType: 'image/png'
          });
          
          // Collect metadata without base64 data
          textMetadata.push({
            imageHash: item.imageHash,
            format: item.format,
            size: item.size,
            message: item.message
          });
        } else {
          // Failed export or non-DATA format, add to text metadata
          textMetadata.push(item);
        }
      }
      
      // Add text content block with all metadata
      if (textMetadata.length > 0) {
        content.push({
          type: 'text',
          text: yaml.dump(textMetadata, { 
            indent: 2, 
            quotingType: '"',
            forceQuotes: false
          })
        });
      }
      
      return {
        content: content,
        isError: false
      };
    }

    // If not in MCP format, return as text (shouldn't happen for DATA format)
    return {
      content: [{
        type: 'text',
        text: typeof response === 'string' ? response : JSON.stringify(response, null, 2)
      }],
      isError: false
    };
  }

  /**
   * Process file export result (save to filesystem)
   */
  private async processFileExport(data: any, args: any): Promise<any> {
    // Handle single export result
    if (data.data && data.filename && data.success) {
      const savedFile = await this.saveExportToFile(data, args.outputDirectory);
      return {
        ...data,
        data: undefined, // Remove binary data from response
        fullPath: savedFile.fullPath,
        relativePath: savedFile.relativePath,
        outputDirectory: savedFile.outputDirectory,
        actualFilename: savedFile.actualFilename,
        originalFilename: savedFile.originalFilename,
        wasRenamed: savedFile.wasRenamed,
        method: 'file_system',
        message: `Exported to ${savedFile.fullPath}${savedFile.wasRenamed ? ` (renamed from ${savedFile.originalFilename})` : ''}`
      };
    }
    
    // Handle bulk export results
    if (Array.isArray(data)) {
      const processedResults = [];
      for (const exportItem of data) {
        if (exportItem.data && exportItem.filename && exportItem.success) {
          try {
            const savedFile = await this.saveExportToFile(exportItem, args.outputDirectory);
            processedResults.push({
              ...exportItem,
              data: undefined, // Remove binary data from response
              fullPath: savedFile.fullPath,
              relativePath: savedFile.relativePath,
              outputDirectory: savedFile.outputDirectory,
              actualFilename: savedFile.actualFilename,
              originalFilename: savedFile.originalFilename,
              wasRenamed: savedFile.wasRenamed,
              method: 'file_system',
              message: `Exported to ${savedFile.fullPath}${savedFile.wasRenamed ? ` (renamed from ${savedFile.originalFilename})` : ''}`
            });
          } catch (error) {
            processedResults.push({
              ...exportItem,
              success: false,
              error: `Failed to save file: ${error}`
            });
          }
        } else {
          // Keep failed exports as-is
          processedResults.push(exportItem);
        }
      }
      return processedResults;
    }
    
    return data;
  }

  /**
   * Save export data to file
   */
  private async saveExportToFile(data: any, outputDirectory?: string): Promise<{
    fullPath: string;
    relativePath: string;
    outputDirectory: string;
    actualFilename: string;
    originalFilename: string;
    wasRenamed: boolean;
  }> {
    const resolvedOutputDir = this.resolveOutputDirectory(outputDirectory);
    const uniquePath = this.resolveUniqueFilename(data.filename, resolvedOutputDir);
    const actualFilename = path.basename(uniquePath);
    const wasRenamed = actualFilename !== data.filename;
    
    // Convert base64 to bytes
    const imageBytes = Buffer.from(data.data, 'base64');
    
    try {
      fs.writeFileSync(uniquePath, imageBytes);
      
      return {
        fullPath: uniquePath,
        relativePath: path.relative(process.cwd(), uniquePath),
        outputDirectory: resolvedOutputDir,
        actualFilename,
        originalFilename: data.filename,
        wasRenamed
      };
    } catch (error) {
      throw new Error(`Failed to save image to ${uniquePath}: ${error}`);
    }
  }

  /**
   * Get default export directory based on platform
   */
  private getDefaultExportPath(): string {
    const homeDir = os.homedir();
    const platform = os.platform();

    switch (platform) {
      case 'win32':
        return path.join(homeDir, 'Documents', 'Figma Exports');
      case 'darwin':
        return path.join(homeDir, 'Downloads', 'Figma Exports');
      default:
        return path.join(homeDir, 'Downloads', 'Figma Exports');
    }
  }

  /**
   * Resolve output directory, expanding ~ and creating if needed
   */
  private resolveOutputDirectory(outputDirectory?: string): string {
    let resolvedDir: string;
    
    if (!outputDirectory) {
      resolvedDir = this.getDefaultExportPath();
    } else if (outputDirectory.startsWith('~')) {
      resolvedDir = path.join(os.homedir(), outputDirectory.slice(1));
    } else {
      resolvedDir = path.resolve(outputDirectory);
    }
    
    // Create directory if it doesn't exist
    try {
      if (!fs.existsSync(resolvedDir)) {
        fs.mkdirSync(resolvedDir, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Failed to create output directory ${resolvedDir}: ${error}`);
    }
    
    return resolvedDir;
  }

  /**
   * Resolve unique filename to prevent overwriting existing files
   */
  private resolveUniqueFilename(baseFilename: string, outputDir: string): string {
    const fullPath = path.join(outputDir, baseFilename);
    
    if (!fs.existsSync(fullPath)) {
      return fullPath;
    }
    
    const { dir, name, ext } = path.parse(fullPath);
    let counter = 1;
    let uniquePath;
    
    do {
      const paddedCounter = counter.toString().padStart(3, '0');
      const uniqueFilename = `${name}-${paddedCounter}${ext}`;
      uniquePath = path.join(dir, uniqueFilename);
      counter++;
    } while (fs.existsSync(uniquePath));
    
    return uniquePath;
  }

  /**
   * Preprocess arguments to handle source auto-detection and load local image files
   * Supports both single and bulk operations
   */
  private async preprocessImagePaths(args: any): Promise<any> {
    // Handle null/undefined args
    if (!args || typeof args !== 'object') {
      return args || {};
    }

    // Only process create operations
    if (args.operation !== 'create') {
      return args;
    }

    let processedArgs = { ...args };

    // Handle unified 'source' parameter with auto-detection
    if (processedArgs.source) {
      processedArgs = await this.processSourceParameter(processedArgs);
      
      // Process path operations if source was converted to path
      if (processedArgs.path) {
        return await this.processPathParameter(processedArgs);
      }
      
      return processedArgs;
    }

    return processedArgs;
  }

  /**
   * Process path parameter by loading local files
   */
  private async processPathParameter(args: any): Promise<any> {
    const processedArgs = { ...args };
    
    if (!processedArgs.path) {
      return processedArgs;
    }
    
    try {
      if (Array.isArray(processedArgs.path)) {
        // Handle bulk path preprocessing
        const imageBytesList: string[] = [];
        
        for (let i = 0; i < processedArgs.path.length; i++) {
          const currentPath = processedArgs.path[i];
          if (!currentPath) {
            // Skip null entries (from automatic bulk conversion)
            imageBytesList.push(null as any);
            continue;
          }
          
          // Expand tilde and resolve relative paths
          const expandedPath = currentPath.startsWith('~') ? 
            path.join(os.homedir(), currentPath.slice(1)) : 
            currentPath;
          const resolvedPath = path.resolve(expandedPath);
          
          // Check if file exists and is readable
          if (!fs.existsSync(resolvedPath)) {
            throw new Error(`Image file not found at index ${i}: ${currentPath}`);
          }
          
          const stats = fs.statSync(resolvedPath);
          if (!stats.isFile()) {
            throw new Error(`Path at index ${i} is not a file: ${currentPath}`);
          }
          
          // Read the image file as bytes and encode as Base64
          const imageBytes = fs.readFileSync(resolvedPath);
          const base64Data = imageBytes.toString('base64');
          imageBytesList.push(base64Data);
        }
        
        // Update imageBytes array, merging with any existing imageBytes
        if (processedArgs.imageBytes && Array.isArray(processedArgs.imageBytes)) {
          // Merge with existing imageBytes array, preserving null slots
          for (let i = 0; i < imageBytesList.length; i++) {
            if (imageBytesList[i] !== null && imageBytesList[i] !== undefined) {
              processedArgs.imageBytes[i] = imageBytesList[i];
            }
          }
        } else {
          processedArgs.imageBytes = imageBytesList;
        }
        
        // Remove path since we're now using imageBytes
        delete processedArgs.path;
        
      } else {
        // Handle single path preprocessing
        const expandedPath = processedArgs.path.startsWith('~') ? 
          path.join(os.homedir(), processedArgs.path.slice(1)) : 
          processedArgs.path;
        const resolvedPath = path.resolve(expandedPath);
        
        // Check if file exists and is readable
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`Image file not found: ${processedArgs.path}`);
        }
        
        const stats = fs.statSync(resolvedPath);
        if (!stats.isFile()) {
          throw new Error(`Path is not a file: ${processedArgs.path}`);
        }
        
        // Read the image file as bytes and encode as Base64
        const imageBytes = fs.readFileSync(resolvedPath);
        const base64Data = imageBytes.toString('base64');
        
        // Add imageBytes for plugin to process
        processedArgs.imageBytes = base64Data;
        
        // Remove path since we're now using imageBytes
        delete processedArgs.path;
      }
      
    } catch (error) {
      throw new Error(`Failed to load image(s): ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return processedArgs;
  }

  /**
   * Process the unified 'source' parameter by auto-detecting the type and converting to appropriate parameters
   */
  private async processSourceParameter(args: any): Promise<any> {
    const processedArgs = { ...args };
    const sources = Array.isArray(args.source) ? args.source : [args.source];
    
    const urls: string[] = [];
    const paths: string[] = [];
    const hashes: string[] = [];
    
    for (const source of sources) {
      if (!source) continue;
      
      const sourceType = this.detectSourceType(source);
      switch (sourceType) {
        case 'url':
          urls.push(source);
          break;
        case 'path':
          paths.push(source);
          break;
        case 'hash':
          hashes.push(source);
          break;
      }
    }
    
    // Set the appropriate parameters based on detected types
    if (urls.length > 0) {
      processedArgs.url = Array.isArray(args.source) ? urls : urls[0];
    }
    if (paths.length > 0) {
      processedArgs.path = Array.isArray(args.source) ? paths : paths[0];
    }
    if (hashes.length > 0) {
      processedArgs.imageHash = Array.isArray(args.source) ? hashes : hashes[0];
    }
    
    // Remove the source parameter since we've converted it
    delete processedArgs.source;
    
    return processedArgs;
  }

  /**
   * Auto-detect the type of image source
   */
  private detectSourceType(source: string): 'url' | 'path' | 'hash' {
    // URL detection (starts with http:// or https://)
    if (source.startsWith('http://') || source.startsWith('https://')) {
      return 'url';
    }
    
    // Path detection (contains file path patterns)
    if (source.includes('/') || source.includes('\\') || source.startsWith('~') || source.startsWith('.')) {
      return 'path';
    }
    
    // Hash detection (hexadecimal string, typically 40 chars for SHA-1)
    if (/^[a-fA-F0-9]{8,}$/.test(source)) {
      return 'hash';
    }
    
    // Default to path if unclear (safer assumption)
    return 'path';
  }
}