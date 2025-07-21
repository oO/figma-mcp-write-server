import { ManageExportsSchema, ToolHandler, ToolResult, Tool } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';
import { debugLog } from '../utils/debug-log.js';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function getDefaultExportPath(): string {
  const homeDir = os.homedir();
  const platform = os.platform();

  switch (platform) {
    case 'win32':
      // Windows: Use Documents/Figma Exports
      return path.join(homeDir, 'Documents', 'Figma Exports');

    case 'darwin':
      // macOS: Use Downloads/Figma Exports
      return path.join(homeDir, 'Downloads', 'Figma Exports');

    default:
      // Linux and other platforms: Use Downloads/Figma Exports
      return path.join(homeDir, 'Downloads', 'Figma Exports');
  }
}

export class ExportsHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_exports',
        description: 'Manage node export settings and perform exports using Figma API',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['get_setting', 'create_setting', 'update_setting', 'delete_setting', 'reorder_setting', 'clear_settings', 'duplicate_setting', 'export'],
              description: 'Export operation to perform'
            },
            // Core parameters
            id: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Node or page ID(s) - single string or array for bulk operations'
            },
            nodeId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Legacy parameter - use id instead. Node ID(s) - single string or array for bulk operations'
            },
            exportIndex: {
              type: 'number',
              description: 'Export setting index (optional - returns all if omitted for get_setting)'
            },
            newIndex: {
              type: 'number',
              description: 'New position for reorder_setting operation'
            },
            
            // Export settings parameters (flattened)
            format: {
              type: 'string',
              enum: ['PNG', 'JPG', 'SVG', 'PDF'],
              description: 'Export format (uses node\'s existing export settings if not specified)'
            },
            constraintType: {
              type: 'string',
              enum: ['SCALE', 'WIDTH', 'HEIGHT'],
              description: 'Size constraint type (for PNG/JPG only)'
            },
            constraintValue: {
              type: 'number',
              description: 'Size constraint value (required if constraintType provided)'
            },
            contentsOnly: {
              type: 'boolean',
              default: true,
              description: 'Include only contents (exclude background)'
            },
            useAbsoluteBounds: {
              type: 'boolean',
              default: false,
              description: 'Use absolute bounds for export'
            },
            colorProfile: {
              type: 'string',
              enum: ['DOCUMENT', 'SRGB', 'DISPLAY_P3_V4'],
              default: 'DOCUMENT',
              description: 'Color profile for export'
            },
            suffix: {
              type: 'string',
              default: '',
              description: 'Custom suffix for filename'
            },
            
            // SVG-specific parameters
            svgOutlineText: {
              type: 'boolean',
              default: true,
              description: 'Render text as vector paths (SVG only)'
            },
            svgIdAttribute: {
              type: 'boolean',
              default: false,
              description: 'Include layer names as ID attributes (SVG only)'
            },
            svgSimplifyStroke: {
              type: 'boolean',
              default: true,
              description: 'Simplify stroke paths (SVG only)'
            },
            
            // Export operation parameters
            target: {
              type: 'string',
              enum: ['FILE', 'DATA'],
              default: 'FILE',
              description: 'Export destination - FILE (save to disk) or DATA (return base64). Defaults to FILE.'
            },
            outputDirectory: {
              type: 'string',
              default: '~/Downloads/Figma Exports',
              description: 'Directory to save files (defaults to ~/Downloads/Figma Exports, for FILE target only)'
            },
            
            // Duplicate operation parameters
            fromId: {
              type: 'string',
              description: 'Source node or page ID for duplicate_setting operation'
            },
            toId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Target node or page ID(s) for duplicate_setting operation'
            },
            fromNodeId: {
              type: 'string',
              description: 'Legacy parameter - use fromId instead. Source node ID for duplicate_setting operation'
            },
            toNodeId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Legacy parameter - use toId instead. Target node ID(s) for duplicate_setting operation'
            },
            
            // Bulk operation control
            failFast: {
              type: 'boolean',
              default: false,
              description: 'Stop on first error in bulk operations'
            }
          },
          required: ['operation']
        },
        examples: [
          // Export settings management
          '{"operation": "get_setting", "id": "123:456", "exportIndex": 0}',
          '{"operation": "get_setting", "id": "123:456"}',
          '{"operation": "create_setting", "id": "123:456", "format": "PNG", "constraintType": "SCALE", "constraintValue": 2}',
          '{"operation": "update_setting", "id": "123:456", "exportIndex": 0, "format": "JPG", "constraintType": "WIDTH", "constraintValue": 1024}',
          '{"operation": "delete_setting", "id": "123:456", "exportIndex": 1}',
          '{"operation": "reorder_setting", "id": "123:456", "exportIndex": 0, "newIndex": 2}',
          '{"operation": "clear_settings", "id": "123:456"}',
          '{"operation": "duplicate_setting", "fromId": "123:456", "toId": "789:012"}',
          
          // Export operations
          '{"operation": "export", "id": "123:456", "exportIndex": 0}',
          '{"operation": "export", "id": "123:456", "target": "DATA", "format": "PNG", "constraintType": "SCALE", "constraintValue": 2}',
          '{"operation": "export", "id": "123:456", "format": "SVG", "svgOutlineText": true, "outputDirectory": "/Users/me/exports"}',
          
          // Bulk operations
          '{"operation": "export", "id": ["123:456", "789:012"], "format": "PNG", "failFast": true}',
          
          // Page export examples
          '{"operation": "export", "id": "0:1", "format": "PNG"}',
          '{"operation": "get_setting", "id": "0:1"}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_exports') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_exports',
      operation: 'exports',
      bulkParams: ['id', 'nodeId', 'toId', 'toNodeId'],
      paramConfigs: {
        // Core parameters
        operation: { expectedType: 'string' as const, allowSingle: true },
        id: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        nodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        exportIndex: { expectedType: 'number' as const, allowSingle: true },
        newIndex: { expectedType: 'number' as const, allowSingle: true },
        
        // Export settings parameters (flattened)
        format: { expectedType: 'string' as const, allowSingle: true },
        constraintType: { expectedType: 'string' as const, allowSingle: true },
        constraintValue: { expectedType: 'number' as const, allowSingle: true },
        contentsOnly: { expectedType: 'boolean' as const, allowSingle: true },
        useAbsoluteBounds: { expectedType: 'boolean' as const, allowSingle: true },
        colorProfile: { expectedType: 'string' as const, allowSingle: true },
        suffix: { expectedType: 'string' as const, allowSingle: true },
        
        // SVG-specific parameters
        svgOutlineText: { expectedType: 'boolean' as const, allowSingle: true },
        svgIdAttribute: { expectedType: 'boolean' as const, allowSingle: true },
        svgSimplifyStroke: { expectedType: 'boolean' as const, allowSingle: true },
        
        // Export operation parameters
        target: { expectedType: 'string' as const, allowSingle: true },
        outputDirectory: { expectedType: 'string' as const, allowSingle: true },
        
        // Duplicate operation parameters
        fromId: { expectedType: 'string' as const, allowSingle: true },
        toId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        fromNodeId: { expectedType: 'string' as const, allowSingle: true },
        toNodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        
        // Bulk operation control
        failFast: { expectedType: 'boolean' as const, allowSingle: true }
      },
      pluginMessageType: 'MANAGE_EXPORTS',
      schema: ManageExportsSchema,
      // Use custom handler for export operations that might need MCP image content
      customHandler: this.shouldUseMcpImageContent(args) ? 
        (validatedArgs: any) => this.handleExportWithMcpImageContent(validatedArgs) : 
        undefined
    };

    const result = await this.unifiedHandler.handle(args, config);
    
    // Post-process result for FILE target exports (DATA exports use custom handler)
    if (result && result.content && result.content[0] && result.content[0].text) {
      const yamlContent = result.content[0].text;
      const data = yaml.load(yamlContent);
      
      // Process the export result for file saving if target is FILE
      const targetMode = args.target || 'FILE';
      
      if (data && typeof data === 'object' && targetMode === 'FILE') {
        const processedData = await this.processFileExports(data, args);
        result.content[0].text = yaml.dump(processedData);
      }
    }
    
    return result;
  }

  private async processFileExports(data: any, args: any): Promise<any> {
    // Handle single export result
    if (data.data && data.filename && data.success) {
      const savedFile = await this.saveExportToFile(data, args.outputDirectory);
      return {
        ...data,
        data: undefined, // Remove binary data from response
        fullPath: savedFile.fullPath,
        relativePath: savedFile.relativePath,
        outputDirectory: savedFile.outputDirectory,
        defaultOutputDirectory: savedFile.defaultOutputDirectory,
        usingDefaultPath: savedFile.usingDefaultPath,
        actualFilename: savedFile.actualFilename,
        originalFilename: savedFile.originalFilename,
        wasRenamed: savedFile.wasRenamed,
        method: 'file_system',
        message: `Exported to ${savedFile.fullPath}${savedFile.usingDefaultPath ? ' (using default path)' : ''}${savedFile.wasRenamed ? ` (renamed from ${savedFile.originalFilename})` : ''}`
      };
    }
    
    // Handle bulk export results - data is directly an array
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
            defaultOutputDirectory: savedFile.defaultOutputDirectory,
            usingDefaultPath: savedFile.usingDefaultPath,
            actualFilename: savedFile.actualFilename,
            originalFilename: savedFile.originalFilename,
            wasRenamed: savedFile.wasRenamed,
            method: 'file_system',
            message: `Exported to ${savedFile.fullPath}${savedFile.usingDefaultPath ? ' (using default path)' : ''}${savedFile.wasRenamed ? ` (renamed from ${savedFile.originalFilename})` : ''}`
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

  private async saveExportToFile(exportData: any, outputDirectory?: string): Promise<any> {
    const defaultPath = this.getDefaultExportPath();
    let outputDir = outputDirectory || defaultPath;
    
    // Handle ~ expansion
    if (outputDir.startsWith('~')) {
      outputDir = outputDir.replace('~', os.homedir());
    }
    
    // Resolve unique filename to prevent overwriting
    const uniquePath = this.resolveUniqueFilename(exportData.filename, outputDir);
    const actualFilename = path.basename(uniquePath);

    try {
      // Create directory structure with better error handling
      try {
        await fs.promises.mkdir(path.dirname(uniquePath), { recursive: true });
      } catch (mkdirError) {
        // Try alternative paths if default fails
        if (!outputDirectory) {
          // Fall back to current working directory
          const fallbackDir = path.join(process.cwd(), 'figma-exports');
          await fs.promises.mkdir(fallbackDir, { recursive: true });
          const fallbackPath = this.resolveUniqueFilename(exportData.filename, fallbackDir);
          const fallbackFilename = path.basename(fallbackPath);

          const binaryData = this.convertDataToBinary(exportData);
          await fs.promises.writeFile(fallbackPath, binaryData);

          return {
            fullPath: fallbackPath,
            relativePath: fallbackFilename,
            outputDirectory: fallbackDir,
            defaultOutputDirectory: defaultPath,
            usingDefaultPath: false,
            fallbackUsed: true,
            actualFilename: fallbackFilename,
            originalFilename: exportData.filename,
            wasRenamed: fallbackFilename !== exportData.filename,
            message: `Saved to fallback directory due to permission issue: ${fallbackPath}`
          };
        }
        throw mkdirError;
      }

      // Convert data to binary buffer
      const binaryData = this.convertDataToBinary(exportData);

      // Write actual binary data to file
      await fs.promises.writeFile(uniquePath, binaryData);

      return {
        fullPath: uniquePath,
        relativePath: actualFilename,
        outputDirectory: outputDir,
        defaultOutputDirectory: defaultPath,
        usingDefaultPath: !outputDirectory,
        actualFilename: actualFilename,
        originalFilename: exportData.filename,
        wasRenamed: actualFilename !== exportData.filename
      };
    } catch (error) {
      throw new Error(`Failed to save export to file: ${(error as Error).message || error}`);
    }
  }

  private convertDataToBinary(exportData: any): Buffer {
    if (exportData.dataFormat === 'array') {
      // Convert regular array back to Buffer
      return Buffer.from(exportData.data);
    } else if (exportData.dataFormat === 'base64') {
      // Convert base64 to Buffer (for backward compatibility)
      return Buffer.from(exportData.data, 'base64');
    } else {
      throw new Error(`Unknown data format: ${exportData.dataFormat}`);
    }
  }

  private getDefaultExportPath(): string {
    const homeDir = os.homedir();
    const platform = os.platform();

    switch (platform) {
      case 'win32':
        // Windows: Use Documents/Figma Exports
        return path.join(homeDir, 'Documents', 'Figma Exports');

      case 'darwin':
        // macOS: Use Downloads/Figma Exports
        return path.join(homeDir, 'Downloads', 'Figma Exports');

      default:
        // Linux and other platforms: Use Downloads/Figma Exports
        return path.join(homeDir, 'Downloads', 'Figma Exports');
    }
  }

  /**
   * Resolve unique filename to prevent overwriting existing files
   * Automatically appends -001, -002, etc. to avoid conflicts
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
   * Try to format single image export as MCP image content
   * Returns MCP image content if applicable, null otherwise
   */
  private tryFormatAsMcpImage(data: any, args: any): any | null {
    // Only process export operations
    if (args.operation !== 'export') {
      return null;
    }

    // Check if this is a single export result with image data
    if (this.isSingleImageExport(data)) {
      const mimeType = this.getImageMimeType(data.format);
      if (mimeType) {
        // Validate size (1MB limit for Claude Desktop)
        const sizeInMB = this.calculateBase64SizeInMB(data.data);
        if (sizeInMB > 1) {
          // Continue anyway - some clients may support larger images
        }

        return {
          content: [{
            type: 'image',
            data: data.data,
            mimeType: mimeType
          }],
          isError: false
        };
      }
    }

    return null;
  }

  /**
   * Check if data represents a single image export
   */
  private isSingleImageExport(data: any): boolean {
    return (
      data && 
      typeof data === 'object' && 
      !Array.isArray(data) && 
      data.success === true &&
      data.data && 
      data.format && 
      (data.dataFormat === 'base64' || data.dataFormat === 'string') &&
      this.isImageFormat(data.format)
    );
  }

  /**
   * Check if format supports MCP content blocks
   */
  private isImageFormat(format: string): boolean {
    return ['PNG', 'JPG', 'SVG', 'SVG_STRING', 'PDF'].includes(format);
  }

  /**
   * Get MIME type for export format
   */
  private getImageMimeType(format: string): string | null {
    const mimeTypeMap: Record<string, string> = {
      'PNG': 'image/png',
      'JPG': 'image/jpeg',
      'SVG': 'image/svg+xml',
      'SVG_STRING': 'image/svg+xml',
      'PDF': 'application/pdf'
    };

    return mimeTypeMap[format] || null;
  }

  /**
   * Calculate size of base64 data in MB
   */
  private calculateBase64SizeInMB(base64Data: string): number {
    // Base64 encoding increases size by ~33%, so actual size is roughly 3/4 of base64 length
    const actualSizeBytes = (base64Data.length * 3) / 4;
    return actualSizeBytes / (1024 * 1024);
  }

  /**
   * Determine if we should use MCP image content for this request
   */
  private shouldUseMcpImageContent(args: any): boolean {
    return (
      args.operation === 'export' &&
      args.target === 'DATA' &&
      // Support both single and bulk exports for mixed content
      (this.isSingleNodeExport(args) || this.isBulkNodeExport(args)) &&
      this.isLikelyImageFormat(args.format)
    );
  }

  /**
   * Check if this is a single node export (not bulk)
   */
  private isSingleNodeExport(args: any): boolean {
    const nodeId = args.id || args.nodeId;
    return nodeId && typeof nodeId === 'string' && !Array.isArray(nodeId);
  }

  /**
   * Check if this is a bulk node export
   */
  private isBulkNodeExport(args: any): boolean {
    const nodeId = args.id || args.nodeId;
    return nodeId && Array.isArray(nodeId);
  }

  /**
   * Check if format is likely to be an image format
   */
  private isLikelyImageFormat(format: string): boolean {
    // If format is specified and it's an image format, return true
    if (format && this.isImageFormat(format)) {
      return true;
    }
    // If no format specified, we can't determine - default to false
    // (node might have image export settings, but we can't know without calling plugin)
    return false;
  }

  /**
   * Custom handler for export operations that should return MCP image content
   */
  private async handleExportWithMcpImageContent(args: any): Promise<any> {
    // Send request to plugin
    const response = await this.unifiedHandler.sendPluginRequest({
      type: 'MANAGE_EXPORTS',
      payload: args
    });

    // Build content array with mixed types
    const content: any[] = [];

    // Handle single image export
    if (this.isSingleImageExport(response)) {
      return this.buildMixedContentResponse(response, content);
    }

    // Handle bulk image exports
    if (Array.isArray(response)) {
      const textMetadata: any[] = [];
      
      for (const item of response) {
        if (this.isSingleImageExport(item)) {
          const mimeType = this.getImageMimeType(item.format);
          if (mimeType) {
            // Handle SVG_STRING specially - add as text content block
            if (item.format === 'SVG_STRING' && item.dataFormat === 'string') {
              // Add SVG source as text content block
              content.push({
                type: 'text',
                text: item.data
              });
            } else {
              // Validate size (1MB limit for Claude Desktop)
              const sizeInMB = this.calculateBase64SizeInMB(item.data);
              if (sizeInMB > 1) {
                // Continue anyway - some clients may support larger images
              }

              // Add image content block
              content.push({
                type: 'image',
                data: item.data,
                mimeType: mimeType
              });
            }

            // Collect metadata without base64 data
            textMetadata.push({
              id: item.id,
              nodeId: item.nodeId,
              nodeName: item.nodeName,
              nodeType: item.nodeType,
              format: item.format,
              filename: item.filename,
              size: item.size,
              target: item.target,
              message: item.message,
              settings: item.settings
            });
          } else {
            // Non-image format, add to text metadata
            textMetadata.push(item);
          }
        } else {
          // Failed export, add to text metadata
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

    // Fall back to normal YAML text response if not a valid image
    return {
      content: [{
        type: 'text',
        text: yaml.dump(response, { 
          indent: 2, 
          quotingType: '"',
          forceQuotes: false
        })
      }],
      isError: false
    };
  }

  /**
   * Build mixed content response for single image export
   */
  private buildMixedContentResponse(response: any, content: any[]): any {
    const mimeType = this.getImageMimeType(response.format);
    if (mimeType) {
      // Handle SVG_STRING specially - add as text content block
      if (response.format === 'SVG_STRING' && response.dataFormat === 'string') {
        // Add SVG source as text content block
        content.push({
          type: 'text',
          text: response.data
        });
      } else {
        // Validate size (1MB limit for Claude Desktop)
        const sizeInMB = this.calculateBase64SizeInMB(response.data);
        if (sizeInMB > 1) {
          // Continue anyway - some clients may support larger images
        }

        // Add image content block
        content.push({
          type: 'image',
          data: response.data,
          mimeType: mimeType
        });
      }

      // Add text content block with export metadata (without base64 data)
      const metadata = {
        id: response.id,
        nodeId: response.nodeId,
        nodeName: response.nodeName,
        nodeType: response.nodeType,
        format: response.format,
        filename: response.filename,
        size: response.size,
        target: response.target,
        message: response.message,
        settings: response.settings
      };

      content.push({
        type: 'text',
        text: yaml.dump(metadata, { 
          indent: 2, 
          quotingType: '"',
          forceQuotes: false
        })
      });

      return {
        content: content,
        isError: false
      };
    }

    // Fall back to normal YAML text response if not a valid image
    return {
      content: [{
        type: 'text',
        text: yaml.dump(response, { 
          indent: 2, 
          quotingType: '"',
          forceQuotes: false
        })
      }],
      isError: false
    };
  }

}



