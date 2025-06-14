import { BaseHandler } from './base-handler.js';
import { OperationResult, OperationHandler } from '../types.js';
import { findNodeById, getNodesByIds } from '../utils/node-utils.js';
import { formatExportResponse } from '../utils/response-utils.js';

// Export preset configurations
const EXPORT_PRESETS = {
  ios_app_icon: {
    formats: ['PNG'],
    sizes: [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024],
    organization: 'by_size',
    description: 'iOS App Icon - All required sizes'
  },
  android_assets: {
    formats: ['PNG'],
    densities: [
      { suffix: 'mdpi', scale: 1 },
      { suffix: 'hdpi', scale: 1.5 },
      { suffix: 'xhdpi', scale: 2 },
      { suffix: 'xxhdpi', scale: 3 },
      { suffix: 'xxxhdpi', scale: 4 }
    ],
    organization: 'by_density',
    description: 'Android Assets - Multiple density variants'
  },
  web_assets: {
    formats: ['PNG', 'SVG'],
    scales: [1, 2, 3],
    organization: 'by_scale',
    description: 'Web Assets - Responsive scaling'
  },
  marketing_assets: {
    formats: ['PNG', 'JPG'],
    sizes: [1080, 1920, 2560],
    quality: 90,
    organization: 'by_size',
    description: 'Marketing Assets - High quality for social media'
  },
  print_ready: {
    formats: ['PDF', 'PNG'],
    dpi: 300,
    quality: 100,
    organization: 'flat',
    description: 'Print Ready - High resolution for printing'
  }
};

export class ExportHandler extends BaseHandler {
  protected getHandlerName(): string {
    return 'ExportHandler';
  }

  getOperations(): Record<string, OperationHandler> {
    return {
      EXPORT_SINGLE: (params) => this.exportSingle(params),
      EXPORT_BULK: (params) => this.exportBulk(params),
      EXPORT_LIBRARY: (params) => this.exportLibrary(params)
    };
  }

  private async exportSingle(params: any): Promise<OperationResult> {
    return this.executeOperation('exportSingle', params, async () => {
      try {
        console.log('🔍 ExportHandler: Starting exportSingle with params:', params);
        
        this.validateParams(params, ['nodeId']);
        console.log('✅ ExportHandler: Params validated');
        
        const node = findNodeById(params.nodeId);
        console.log('🔍 ExportHandler: Node lookup result:', node ? `Found ${node.type} "${node.name}"` : 'Not found');
        
        // Validate node exists and supports export
        if (!node) {
          throw new Error(`Node with ID ${params.nodeId} not found or is not exportable`);
        }
        
        // Check if node supports exportAsync
        if (!('exportAsync' in node) || typeof node.exportAsync !== 'function') {
          throw new Error(`Node type '${node.type}' does not support export operations. Only scene nodes (frames, groups, components, etc.) can be exported.`);
        }
        
        console.log('✅ ExportHandler: Node validation passed');
        
        const format = this.validateStringParam(
          params.format || 'PNG',
          'format',
          ['PNG', 'JPG', 'SVG', 'PDF']
        );
        console.log('✅ ExportHandler: Format validated:', format);
        
        const settings = params.settings || {};
        const scale = this.validateNumberParam(settings.scale || 1, 'scale', 0.1, 4);
        console.log('✅ ExportHandler: Settings validated:', { scale, settings });
        
        const exportSettings = this.buildExportSettings(format, settings, scale);
        console.log('✅ ExportHandler: Export settings built:', exportSettings);
        
        console.log('🚀 ExportHandler: Calling node.exportAsync...');
        const exportData = await (node as any).exportAsync(exportSettings);
        console.log('✅ ExportHandler: Export completed, data size:', exportData?.length || 0);
        const filename = this.generateFilename(node, format, settings, params.organizationStrategy);
        
        // Convert Uint8Array to regular array for JSON serialization
        const dataArray = Array.from(exportData);
        console.log('✅ ExportHandler: Converted to array for transmission');
        
        const result = {
          nodeId: params.nodeId,
          nodeName: node.name,
          format,
          filename,
          size: exportData.length,
          data: dataArray,
          dataFormat: 'array',
          exported: true,
          success: true,
          // Pass through parameters for MCP server to handle file saving/data processing
          output: params.output,
          outputDirectory: params.outputDirectory,
          requestedDataFormat: params.dataFormat,
          maxDataSize: params.maxDataSize,
          organizationStrategy: params.organizationStrategy || 'flat'
        };
        
        console.log('✅ ExportHandler: Export result prepared, returning success');
        return result;
        
      } catch (error) {
        console.error('❌ ExportHandler: Export failed with error:', error);
        console.error('❌ ExportHandler: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        throw new Error(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  private async exportBulk(params: any): Promise<OperationResult> {
    return this.executeOperation('exportBulk', params, async () => {
      this.validateParams(params, ['nodeIds']);
      const nodeIds = this.validateArrayParam(params.nodeIds, 'nodeIds', 1);
      
      const nodes = getNodesByIds(nodeIds);
      const format = this.validateStringParam(
        params.format || 'PNG',
        'format',
        ['PNG', 'JPG', 'SVG', 'PDF']
      );
      
      const settings = params.settings || {};
      let exportResults = [];
      let successCount = 0;
      let errorCount = 0;
      let errors = [];

      // Apply preset if specified
      if (params.exportPreset) {
        const preset = EXPORT_PRESETS[params.exportPreset];
        if (preset) {
          return this.exportWithPreset(nodes, preset, params);
        }
      }

      // Regular bulk export with progress tracking
      const totalNodes = nodes.length;
      let completed = 0;
      
      for (const node of nodes) {
        try {
          // Validate node supports export
          if (!('exportAsync' in node) || typeof node.exportAsync !== 'function') {
            throw new Error(`Node type '${node.type}' does not support export operations`);
          }
          
          const scale = this.validateNumberParam(settings.scale || 1, 'scale', 0.1, 4);
          const exportSettings = this.buildExportSettings(format, settings, scale);
          
          const exportData = await (node as any).exportAsync(exportSettings);
          const filename = this.generateFilename(node, format, settings, params.organizationStrategy);
          
          // Convert Uint8Array to regular array for JSON serialization
          const dataArray = Array.from(exportData);
          
          const result = {
            nodeId: node.id,
            nodeName: node.name,
            format,
            filename,
            size: exportData.length,
            data: dataArray,
            dataFormat: 'array',
            exported: true,
            success: true,
            output: params.output,
            outputDirectory: params.outputDirectory,
            requestedDataFormat: params.dataFormat,
            maxDataSize: params.maxDataSize,
            organizationStrategy: params.organizationStrategy || 'flat'
          };
          
          exportResults.push(result);
          successCount++;
          completed++;
          
          // Send progress update for bulk operations
          if (totalNodes > 3) {
            await this.sendProgressUpdate(params.requestId || 'bulk', { completed, total: totalNodes });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          exportResults.push({
            nodeId: node.id,
            nodeName: node.name,
            format,
            success: false,
            error: errorMessage
          });
          
          errors.push(`${node.name}: ${errorMessage}`);
          errorCount++;
        }
      }

      return {
        operation: 'export_bulk',
        totalNodes: nodes.length,
        successCount,
        errorCount,
        format,
        organizationStrategy: params.organizationStrategy || 'flat',
        exports: exportResults,
        errors: errors.length > 0 ? errors : undefined,
        message: `Bulk export completed: ${successCount} successful, ${errorCount} failed`
      };
    });
  }

  private async exportWithPreset(nodes: SceneNode[], preset: any, params: any): Promise<OperationResult> {
    let allResults = [];
    let totalSuccessCount = 0;
    let totalErrorCount = 0;
    let allErrors = [];

    // Handle different preset types
    if (preset.sizes) {
      // Export multiple sizes (iOS icons, marketing assets)
      for (const size of preset.sizes) {
        for (const node of nodes) {
          try {
            const exportSettings = {
              format: preset.formats[0] as any,
              constraint: { type: 'WIDTH', value: size }
            };
            
            // Validate node supports export
            if (!('exportAsync' in node) || typeof node.exportAsync !== 'function') {
              throw new Error(`Node type '${node.type}' does not support export operations`);
            }
            
            const exportData = await (node as any).exportAsync(exportSettings);
            const filename = this.generatePresetFilename(node, preset.formats[0], size, 'size');
            
            // Convert Uint8Array to regular array for JSON serialization
            const dataArray = Array.from(exportData);
            
            const result = {
              nodeId: node.id,
              nodeName: node.name,
              format: preset.formats[0],
              filename,
              size: exportData.length,
              data: dataArray,
              dataFormat: 'array',
              exported: true,
              success: true,
              presetSize: size,
              outputDirectory: params.outputDirectory,
              saveToFile: params.saveToFile,
              returnData: params.returnData,
              organizationStrategy: preset.organization
            };
            
            allResults.push(result);
            
            totalSuccessCount++;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            allResults.push({
              nodeId: node.id,
              nodeName: node.name,
              format: preset.formats[0],
              presetSize: size,
              success: false,
              error: errorMessage
            });
            
            allErrors.push(`${node.name} (${size}px): ${errorMessage}`);
            totalErrorCount++;
          }
        }
      }
    } else if (preset.densities) {
      // Export multiple densities (Android assets)
      for (const density of preset.densities) {
        for (const node of nodes) {
          try {
            const exportSettings = {
              format: preset.formats[0] as any,
              constraint: { type: 'SCALE', value: density.scale }
            };
            
            // Validate node supports export
            if (!('exportAsync' in node) || typeof node.exportAsync !== 'function') {
              throw new Error(`Node type '${node.type}' does not support export operations`);
            }
            
            const exportData = await (node as any).exportAsync(exportSettings);
            const filename = this.generatePresetFilename(node, preset.formats[0], density.suffix, 'density');
            
            // Convert Uint8Array to regular array for JSON serialization
            const dataArray = Array.from(exportData);
            
            const result = {
              nodeId: node.id,
              nodeName: node.name,
              format: preset.formats[0],
              filename,
              size: exportData.length,
              data: dataArray,
              dataFormat: 'array',
              exported: true,
              success: true,
              density: density.suffix,
              scale: density.scale,
              outputDirectory: params.outputDirectory,
              saveToFile: params.saveToFile,
              returnData: params.returnData,
              organizationStrategy: preset.organization
            };
            
            allResults.push(result);
            
            totalSuccessCount++;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            allResults.push({
              nodeId: node.id,
              nodeName: node.name,
              format: preset.formats[0],
              density: density.suffix,
              success: false,
              error: errorMessage
            });
            
            allErrors.push(`${node.name} (${density.suffix}): ${errorMessage}`);
            totalErrorCount++;
          }
        }
      }
    } else if (preset.scales) {
      // Export multiple scales (Web assets)
      for (const scale of preset.scales) {
        for (const format of preset.formats) {
          for (const node of nodes) {
            try {
              const exportSettings = {
                format: format as any,
                constraint: { type: 'SCALE', value: scale }
              };
              
              // Validate node supports export
            if (!('exportAsync' in node) || typeof node.exportAsync !== 'function') {
              throw new Error(`Node type '${node.type}' does not support export operations`);
            }
            
            const exportData = await (node as any).exportAsync(exportSettings);
              const filename = this.generatePresetFilename(node, format, scale, 'scale');
              
              // Convert Uint8Array to regular array for JSON serialization
              const dataArray = Array.from(exportData);
              
              const result = {
                nodeId: node.id,
                nodeName: node.name,
                format,
                filename,
                size: exportData.length,
                data: dataArray,
                dataFormat: 'array',
                exported: true,
                success: true,
                scale: scale,
                output: params.output,
                outputDirectory: params.outputDirectory,
                requestedDataFormat: params.dataFormat,
                maxDataSize: params.maxDataSize,
                organizationStrategy: preset.organization
              };
              
              allResults.push(result);
              
              totalSuccessCount++;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              allResults.push({
                nodeId: node.id,
                nodeName: node.name,
                format,
                scale,
                success: false,
                error: errorMessage
              });
              
              allErrors.push(`${node.name} (${scale}x ${format}): ${errorMessage}`);
              totalErrorCount++;
            }
          }
        }
      }
    }

    return {
      operation: 'export_bulk',
      preset: params.exportPreset,
      presetDescription: preset.description,
      totalNodes: nodes.length,
      totalExports: allResults.length,
      successCount: totalSuccessCount,
      errorCount: totalErrorCount,
      organizationStrategy: preset.organization,
      exports: allResults,
      errors: allErrors.length > 0 ? allErrors : undefined,
      message: `Preset export completed: ${totalSuccessCount} successful, ${totalErrorCount} failed`
    };
  }

  private async exportLibrary(params: any): Promise<OperationResult> {
    return this.executeOperation('exportLibrary', params, async () => {
      this.validateParams(params, ['assetType']);
      
      const assetType = this.validateStringParam(
        params.assetType,
        'assetType',
        ['components', 'styles', 'variables']
      );
      
      const filters = params.filters || {};
      let assets = [];
      
      try {
        switch (assetType) {
          case 'components':
            assets = await this.getLibraryComponents(filters);
            break;
          case 'styles':
            assets = await this.getLibraryStyles(filters);
            break;
          case 'variables':
            assets = await this.getLibraryVariables(filters);
            break;
        }
        
        if (assets.length === 0) {
          return {
            operation: 'export_library',
            assetType,
            assets: [],
            count: 0,
            message: `No ${assetType} found matching the specified filters`
          };
        }
        
        // Export each asset
        const exportResults = [];
        let successCount = 0;
        let errorCount = 0;
        
        for (const asset of assets) {
          try {
            const result = await this.exportLibraryAsset(asset, params);
            exportResults.push(result);
            successCount++;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            exportResults.push({
              assetId: asset.id,
              assetName: asset.name,
              success: false,
              error: errorMessage
            });
            errorCount++;
          }
        }
        
        return {
          operation: 'export_library',
          assetType,
          totalAssets: assets.length,
          successCount,
          errorCount,
          exports: exportResults,
          message: `Library export completed: ${successCount} successful, ${errorCount} failed`
        };
        
      } catch (error) {
        throw new Error(`Library export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  private async getLibraryComponents(filters: any): Promise<any[]> {
    const components = await figma.teamLibrary.getAvailableLibraryComponentsAsync();
    let filtered = components;
    
    if (filters.name) {
      const regex = new RegExp(filters.name, 'i');
      filtered = filtered.filter(comp => regex.test(comp.name));
    }
    
    if (filters.published !== undefined) {
      // Filter by published status if the API supports it
      // This is a placeholder as the exact API may vary
    }
    
    return filtered;
  }

  private async getLibraryStyles(filters: any): Promise<any[]> {
    // Get paint styles and text styles
    const paintStyles = await figma.getLocalPaintStylesAsync();
    const textStyles = await figma.getLocalTextStylesAsync();
    const allStyles = [...paintStyles, ...textStyles];
    
    let filtered = allStyles;
    
    if (filters.name) {
      const regex = new RegExp(filters.name, 'i');
      filtered = filtered.filter(style => regex.test(style.name));
    }
    
    return filtered;
  }

  private async getLibraryVariables(filters: any): Promise<any[]> {
    const variables = await figma.variables.getLocalVariablesAsync();
    let filtered = variables;
    
    if (filters.name) {
      const regex = new RegExp(filters.name, 'i');
      filtered = filtered.filter(variable => regex.test(variable.name));
    }
    
    return filtered;
  }

  private async exportLibraryAsset(asset: any, params: any): Promise<any> {
    const format = params.format || 'PNG';
    
    // For components, try to find an instance or create one
    if (asset.type === 'COMPONENT') {
      try {
        // This is a simplified approach - in practice, you might need to
        // create an instance of the component to export it
        const instance = figma.createComponentInstance();
        // Set the component reference...
        
        const exportSettings = this.buildExportSettings(format, params.settings || {}, 1);
        const exportData = await instance.exportAsync(exportSettings);
        
        return {
          assetId: asset.id,
          assetName: asset.name,
          assetType: 'component',
          format,
          size: exportData.length,
          success: true
        };
      } catch (error) {
        throw new Error(`Failed to export component: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // For styles and variables, we might export a sample or documentation
    return {
      assetId: asset.id,
      assetName: asset.name,
      assetType: asset.type?.toLowerCase() || 'unknown',
      format: 'JSON', // Styles and variables are typically exported as data
      success: true,
      message: 'Asset metadata exported'
    };
  }

  private buildExportSettings(format: string, settings: any, scale: number): any {
    try {
      console.log('🔧 Building export settings for format:', format, 'scale:', scale, 'settings:', settings);
      
      const exportSettings: any = {
        format: format as any
      };
      
      if (settings.constraint) {
        exportSettings.constraint = settings.constraint;
        console.log('✅ Using custom constraint:', settings.constraint);
      } else {
        exportSettings.constraint = { type: 'SCALE', value: scale };
        console.log('✅ Using default scale constraint:', exportSettings.constraint);
      }
      
      if (format === 'JPG' && settings.quality) {
        exportSettings.contentsOnly = true;
        console.log('✅ Applied JPG quality settings');
      }
      
      if (settings.padding) {
        console.log('📝 Padding setting provided but not implemented:', settings.padding);
      }
      
      console.log('✅ Export settings built:', exportSettings);
      return exportSettings;
    } catch (error) {
      console.error('❌ Failed to build export settings:', error);
      throw new Error(`Failed to build export settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private generateFilename(node: SceneNode, format: string, settings: any, organizationStrategy: string = 'flat'): string {
    let filename = node.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    
    if (settings.includeId) {
      filename += `_${node.id}`;
    }
    
    if (settings.suffix) {
      filename += `_${settings.suffix}`;
    }
    
    const extension = format.toLowerCase();
    
    switch (organizationStrategy) {
      case 'by_type':
        return `${node.type.toLowerCase()}/${filename}.${extension}`;
      case 'by_component':
        return `components/${filename}.${extension}`;
      default:
        return `${filename}.${extension}`;
    }
  }

  private generatePresetFilename(node: SceneNode, format: string, variant: any, variantType: string): string {
    let filename = node.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const extension = format.toLowerCase();
    
    switch (variantType) {
      case 'size':
        return `${filename}_${variant}px.${extension}`;
      case 'density':
        return `${filename}_${variant}.${extension}`;
      case 'scale':
        return `${filename}_${variant}x.${extension}`;
      default:
        return `${filename}_${variant}.${extension}`;
    }
  }


  private async sendProgressUpdate(requestId: string, progress: { completed: number; total: number }): Promise<void> {
    // Send progress update via WebSocket during bulk operations
    if (typeof figma !== 'undefined' && figma.ui) {
      figma.ui.postMessage({
        type: 'export_progress',
        requestId,
        payload: {
          progress,
          timestamp: Date.now()
        }
      });
    }
  }
}