import {
  Tool,
  ToolHandler,
  ToolResult,
  validateAndParse,
} from "../types/index.js";
import { ManageExportsSchema } from "../types/schemas.js";
import * as yaml from "js-yaml";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Export preset type definitions
type ExportPreset = {
  formats: string[];
  organization: string;
  description: string;
  sizes?: number[];
  densities?: { suffix: string; scale: number }[];
  scales?: number[];
  quality?: number;
  dpi?: number;
};

type ExportPresets = {
  [key: string]: ExportPreset;
};

// Predefined export configurations
const EXPORT_PRESETS: ExportPresets = {
  ios_app_icon: {
    formats: ["PNG"],
    sizes: [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024],
    organization: "by_size",
    description: "iOS App Icon - All required sizes",
  },
  android_assets: {
    formats: ["PNG"],
    densities: [
      { suffix: "mdpi", scale: 1 },
      { suffix: "hdpi", scale: 1.5 },
      { suffix: "xhdpi", scale: 2 },
      { suffix: "xxhdpi", scale: 3 },
      { suffix: "xxxhdpi", scale: 4 },
    ],
    organization: "by_density",
    description: "Android Assets - Multiple density variants",
  },
  web_assets: {
    formats: ["PNG", "SVG"],
    scales: [1, 2, 3],
    organization: "by_scale",
    description: "Web Assets - Responsive scaling",
  },
  marketing_assets: {
    formats: ["PNG", "JPG"],
    sizes: [1080, 1920, 2560],
    quality: 90,
    organization: "by_size",
    description: "Marketing Assets - High quality for social media",
  },
  print_ready: {
    formats: ["PDF", "PNG"],
    dpi: 300,
    quality: 100,
    organization: "flat",
    description: "Print Ready - High resolution for printing",
  },
};

export class ExportHandlers implements ToolHandler {
  private sendToPlugin: (request: any) => Promise<any>;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.sendToPlugin = sendToPluginFn;
  }

  getTools(): Tool[] {
    return [
      {
        name: "manage_exports",
        description: `Export Figma nodes as files or base64 data.

🔧 OUTPUT CONTROL:
- output: "file" (save to disk) | "data" (return base64/hex)
- outputDirectory: "/path" (when output="file")
- dataFormat: "base64" | "hex" (when output="data")

📁 EXAMPLES:
File: {nodeId: "123", format: "PNG", output: "file", outputDirectory: "/Users/me/exports"}
Data: {nodeId: "123", format: "PNG", output: "data", dataFormat: "base64"}`,
        inputSchema: {
          type: "object",
          properties: {
            operation: {
              type: "string",
              enum: [
                "export_single",
                "export_bulk",
                "export_library",
                "list_presets",
                "apply_preset",
              ],
              description: "Export operation to perform",
            },
            // Single node export parameters
            nodeId: {
              type: "string",
              description: "ID of the node to export (for export_single)",
            },
            // Bulk export parameters
            nodeIds: {
              type: "array",
              items: { type: "string" },
              description: "Array of node IDs to export (for export_bulk)",
            },
            // Export format and settings
            format: {
              type: "string",
              enum: ["PNG", "SVG", "JPG", "PDF"],
              default: "PNG",
              description: "Export format",
            },
            settings: {
              type: "object",
              properties: {
                scale: {
                  type: "number",
                  default: 1,
                  description: "Export scale factor",
                },
                quality: {
                  type: "number",
                  minimum: 1,
                  maximum: 100,
                  description: "Quality for JPG exports (1-100)",
                },
                dpi: {
                  type: "number",
                  description: "DPI for high-resolution exports",
                },
                constraint: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: ["SCALE", "WIDTH", "HEIGHT"],
                    },
                    value: { type: "number" },
                  },
                  description: "Size constraint for export",
                },
                padding: {
                  type: "number",
                  description: "Padding around exported content",
                },
                includeId: {
                  type: "boolean",
                  default: false,
                  description: "Include node ID in filename",
                },
                suffix: {
                  type: "string",
                  description: "Custom suffix for filename",
                },
              },
              description: "Advanced export settings",
            },
            // Preset management
            exportPreset: {
              type: "string",
              enum: [
                "ios_app_icon",
                "android_assets",
                "web_assets",
                "marketing_assets",
                "print_ready",
              ],
              description: "Predefined export configuration",
            },
            presetId: {
              type: "string",
              description: "ID of preset to apply (for apply_preset operation)",
            },
            // Organization strategy
            organizationStrategy: {
              type: "string",
              enum: [
                "flat",
                "by_type",
                "by_component",
                "by_size",
                "by_density",
                "by_scale",
              ],
              default: "flat",
              description: "How to organize exported files",
            },
            // Output control (simplified)
            output: {
              type: "string",
              enum: ["file", "data"],
              default: "file",
              description: "Whether to save files to disk or return data",
            },
            // File output parameters (when output="file")
            outputDirectory: {
              type: "string",
              description:
                "Directory to save files (defaults to platform-specific: ~/Documents/Figma Exports on Windows, ~/Downloads/Figma Exports on macOS)",
            },
            // Data output parameters (when output="data")
            dataFormat: {
              type: "string",
              enum: ["base64", "hex"],
              default: "base64",
              description: "Format for returned binary data",
            },
            maxDataSize: {
              type: "number",
              description: "Maximum size (bytes) for data return",
            },
            // Library export parameters
            assetType: {
              type: "string",
              enum: ["components", "styles", "variables"],
              description:
                "Type of library assets to export (for export_library)",
            },
            filters: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Filter assets by name pattern",
                },
                published: {
                  type: "boolean",
                  description: "Only include published assets",
                },
                libraryId: {
                  type: "string",
                  description: "Specific library to export from",
                },
              },
              description: "Filters for library asset export",
            },
          },
          required: ["operation"],
        },
      },
    ];
  }

  async handle(toolName: string, args: any): Promise<ToolResult> {
    switch (toolName) {
      case "manage_exports":
        return this.manageExports(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  async manageExports(args: any): Promise<ToolResult> {
    const validation = validateAndParse(
      ManageExportsSchema,
      args,
      "manageExports",
    );

    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.error}`);
    }

    const params = validation.data;

    switch (params.operation) {
      case "export_single":
        return this.exportSingle(params);
      case "export_bulk":
        return this.exportBulk(params);
      case "export_library":
        return this.exportLibrary(params);
      case "list_presets":
        return this.listPresets();
      case "apply_preset":
        return this.applyPreset(params);
      default:
        throw new Error(`Unknown export operation: ${params.operation}`);
    }
  }

  private async exportSingle(params: any): Promise<ToolResult> {
    if (!params.nodeId) {
      throw new Error("nodeId is required for export_single operation");
    }

    const payload: any = {
      nodeId: params.nodeId,
      format: params.format || "PNG",
      settings: params.settings || {},
      organizationStrategy: params.organizationStrategy || "flat",
    };

    // Pass through simplified output parameters
    if (params.output !== undefined) payload.output = params.output;
    if (params.outputDirectory !== undefined)
      payload.outputDirectory = params.outputDirectory;
    if (params.dataFormat !== undefined) payload.dataFormat = params.dataFormat;
    if (params.maxDataSize !== undefined)
      payload.maxDataSize = params.maxDataSize;

    const response = await this.sendToPlugin({
      type: "EXPORT_SINGLE",
      payload,
    });

    if (!response.success) {
      throw new Error(response.error || "Export failed");
    }

    // Process the export data
    const processedData = await this.processExportData(response.data, params);

    return {
      content: [
        {
          type: "text",
          text: yaml.dump(processedData, { indent: 2, lineWidth: 100 }),
        },
      ],
      isError: false,
    };
  }

  private async exportBulk(params: any): Promise<ToolResult> {
    if (!params.nodeIds || params.nodeIds.length === 0) {
      throw new Error("nodeIds array is required for export_bulk operation");
    }

    let exportSettings = params.settings || {};

    // Apply preset if specified
    if (params.exportPreset && EXPORT_PRESETS[params.exportPreset]) {
      const preset = EXPORT_PRESETS[params.exportPreset] as ExportPreset;
      exportSettings = {
        ...exportSettings,
        preset: preset,
        presetId: params.exportPreset,
      };
    }

    const payload: any = {
      nodeIds: params.nodeIds,
      format: params.format || "PNG",
      settings: exportSettings,
      organizationStrategy: params.organizationStrategy || "flat",
      exportPreset: params.exportPreset,
    };

    // Pass through simplified output parameters
    if (params.output !== undefined) payload.output = params.output;
    if (params.outputDirectory !== undefined)
      payload.outputDirectory = params.outputDirectory;
    if (params.dataFormat !== undefined) payload.dataFormat = params.dataFormat;
    if (params.maxDataSize !== undefined)
      payload.maxDataSize = params.maxDataSize;

    const response = await this.sendToPlugin({
      type: "EXPORT_BULK",
      payload,
    });

    if (!response.success) {
      throw new Error(response.error || "Bulk export failed");
    }

    // Process bulk export data
    const processedData = await this.processBulkExportData(
      response.data,
      params,
    );

    return {
      content: [
        {
          type: "text",
          text: yaml.dump(processedData, { indent: 2, lineWidth: 100 }),
        },
      ],
      isError: false,
    };
  }

  private async exportLibrary(params: any): Promise<ToolResult> {
    if (!params.assetType) {
      throw new Error("assetType is required for export_library operation");
    }

    const payload = {
      assetType: params.assetType,
      format: params.format || "PNG",
      filters: params.filters || {},
      settings: params.settings || {},
      organizationStrategy: params.organizationStrategy || "flat",
    };

    const response = await this.sendToPlugin({
      type: "EXPORT_LIBRARY",
      payload,
    });

    if (!response.success) {
      throw new Error(response.error || "Library export failed");
    }

    return {
      content: [
        {
          type: "text",
          text: yaml.dump(response.data, { indent: 2, lineWidth: 100 }),
        },
      ],
      isError: false,
    };
  }

  private async listPresets(): Promise<ToolResult> {
    const presetList = Object.entries(EXPORT_PRESETS).map(([id, preset]) => {
      const settings: any = {};
      if (preset.sizes) settings.sizes = preset.sizes;
      if (preset.densities) settings.densities = preset.densities;
      if (preset.scales) settings.scales = preset.scales;
      if (preset.quality) settings.quality = preset.quality;
      if (preset.dpi) settings.dpi = preset.dpi;

      return {
        id,
        description: preset.description,
        formats: preset.formats,
        organization: preset.organization,
        settings,
      };
    });

    const data = {
      presets: presetList,
      total: presetList.length,
    };

    return {
      content: [
        {
          type: "text",
          text: yaml.dump(data, { indent: 2, lineWidth: 100 }),
        },
      ],
      isError: false,
    };
  }

  private async applyPreset(params: any): Promise<ToolResult> {
    if (!params.presetId || !EXPORT_PRESETS[params.presetId]) {
      throw new Error(
        `Invalid preset ID: ${params.presetId}. Use list_presets to see available presets.`,
      );
    }

    if (!params.nodeIds || params.nodeIds.length === 0) {
      throw new Error("nodeIds array is required for apply_preset operation");
    }

    const preset = EXPORT_PRESETS[params.presetId] as ExportPreset;

    // Apply preset configuration to bulk export
    const bulkParams = {
      operation: "export_bulk",
      nodeIds: params.nodeIds,
      format: preset.formats[0], // Use first format from preset
      exportPreset: params.presetId,
      organizationStrategy: preset.organization,
      settings: {
        ...(preset.quality && { quality: preset.quality }),
        ...(preset.dpi && { dpi: preset.dpi }),
        ...(params.settings && params.settings),
      },
    };

    return this.exportBulk(bulkParams);
  }

  private async processExportData(exportData: any, params: any): Promise<any> {
    // If user wants data returned directly, convert to requested format
    if (params.output === "data") {
      const requestedFormat =
        exportData.requestedDataFormat || params.dataFormat;
      if (requestedFormat === "hex" && exportData.data) {
        // Convert array or base64 to hex format
        const buffer = this.convertDataToBinary(exportData);
        exportData.data = buffer.toString("hex");
        exportData.dataFormat = "hex";
      } else if (
        requestedFormat === "base64" &&
        exportData.dataFormat === "array"
      ) {
        // Convert array to base64 format
        const buffer = this.convertDataToBinary(exportData);
        exportData.data = buffer.toString("base64");
        exportData.dataFormat = "base64";
      }
      return exportData;
    }

    // Otherwise, save to file system
    if (exportData.data && exportData.filename) {
      const savedFile = await this.saveExportToFile(
        exportData,
        params.outputDirectory,
      );

      // Return file info instead of binary data
      return {
        ...exportData,
        data: undefined, // Remove binary data from response
        fullPath: savedFile.fullPath,
        relativePath: savedFile.relativePath,
        outputDirectory: savedFile.outputDirectory,
        defaultOutputDirectory: savedFile.defaultOutputDirectory,
        usingDefaultPath: savedFile.usingDefaultPath,
        method: "file_system",
        message: `Exported to ${savedFile.fullPath}${savedFile.usingDefaultPath ? " (using default path)" : ""}`,
      };
    }

    return exportData;
  }

  private async processBulkExportData(
    bulkData: any,
    params: any,
  ): Promise<any> {
    // If user wants data returned directly, convert to requested format
    if (params.output === "data") {
      const requestedFormat = params.dataFormat;
      if (requestedFormat === "hex" && bulkData.exports) {
        // Convert array or base64 to hex format for all exports
        bulkData.exports = bulkData.exports.map((exportItem: any) => {
          if (exportItem.data) {
            const buffer = this.convertDataToBinary(exportItem);
            exportItem.data = buffer.toString("hex");
            exportItem.dataFormat = "hex";
          }
          return exportItem;
        });
      } else if (requestedFormat === "base64" && bulkData.exports) {
        // Convert array to base64 format for all exports
        bulkData.exports = bulkData.exports.map((exportItem: any) => {
          if (exportItem.data && exportItem.dataFormat === "array") {
            const buffer = this.convertDataToBinary(exportItem);
            exportItem.data = buffer.toString("base64");
            exportItem.dataFormat = "base64";
          }
          return exportItem;
        });
      }
      return bulkData;
    }

    // Process each export in the bulk data
    if (bulkData.exports && Array.isArray(bulkData.exports)) {
      const processedExports = [];

      for (const exportItem of bulkData.exports) {
        if (exportItem.success && exportItem.data && exportItem.filename) {
          const savedFile = await this.saveExportToFile(
            exportItem,
            params.outputDirectory,
          );

          processedExports.push({
            ...exportItem,
            data: undefined, // Remove binary data from response
            fullPath: savedFile.fullPath,
            relativePath: savedFile.relativePath,
            outputDirectory: savedFile.outputDirectory,
            defaultOutputDirectory: savedFile.defaultOutputDirectory,
            usingDefaultPath: savedFile.usingDefaultPath,
            method: "file_system",
            message: `Exported to ${savedFile.fullPath}${savedFile.usingDefaultPath ? " (using default path)" : ""}`,
          });
        } else {
          // Keep failed exports as-is
          processedExports.push(exportItem);
        }
      }

      return {
        ...bulkData,
        exports: processedExports,
      };
    }

    return bulkData;
  }

  private async saveExportToFile(
    exportData: any,
    outputDirectory?: string,
  ): Promise<any> {
    const defaultPath = this.getDefaultExportPath();
    const outputDir = outputDirectory || defaultPath;
    const fullPath = path.join(outputDir, exportData.filename);

    try {
      // Create directory structure with better error handling
      try {
        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
      } catch (mkdirError) {
        // Try alternative paths if default fails
        if (!outputDirectory) {
          // Fall back to current working directory
          const fallbackDir = path.join(process.cwd(), "figma-exports");
          await fs.promises.mkdir(fallbackDir, { recursive: true });
          const fallbackPath = path.join(fallbackDir, exportData.filename);

          const binaryData = this.convertDataToBinary(exportData);
          await fs.promises.writeFile(fallbackPath, binaryData);

          return {
            fullPath: fallbackPath,
            relativePath: exportData.filename,
            outputDirectory: fallbackDir,
            defaultOutputDirectory: defaultPath,
            usingDefaultPath: false,
            fallbackUsed: true,
            message: `Saved to fallback directory due to permission issue: ${fallbackPath}`,
          };
        }
        throw mkdirError;
      }

      // Convert data to binary buffer
      const binaryData = this.convertDataToBinary(exportData);

      // Write actual binary data to file
      await fs.promises.writeFile(fullPath, binaryData);

      return {
        fullPath,
        relativePath: exportData.filename,
        outputDirectory: outputDir,
        defaultOutputDirectory: defaultPath,
        usingDefaultPath: !outputDirectory,
      };
    } catch (error) {
      // Provide specific error guidance
      let errorMessage = `Failed to save file: ${error instanceof Error ? error.message : "Unknown error"}`;

      if (error instanceof Error) {
        if (error.message.includes("EACCES")) {
          errorMessage +=
            "\nSuggestion: Try setting a different outputDirectory with write permissions.";
        } else if (error.message.includes("ENOENT")) {
          errorMessage +=
            "\nSuggestion: Check that the output directory path exists and is valid.";
        } else if (error.message.includes("ENOSPC")) {
          errorMessage += "\nSuggestion: Free up disk space and try again.";
        }
      }

      throw new Error(errorMessage);
    }
  }

  private convertDataToBinary(exportData: any): Buffer {
    if (exportData.dataFormat === "array") {
      // Convert regular array back to Buffer
      return Buffer.from(exportData.data);
    } else if (exportData.dataFormat === "base64") {
      // Convert base64 to Buffer (for backward compatibility)
      return Buffer.from(exportData.data, "base64");
    } else {
      throw new Error(`Unknown data format: ${exportData.dataFormat}`);
    }
  }

  private getDefaultExportPath(): string {
    const homeDir = os.homedir();
    const platform = os.platform();

    switch (platform) {
      case "win32":
        // Windows: Use Documents/Figma Exports
        return path.join(homeDir, "Documents", "Figma Exports");

      case "darwin":
        // macOS: Use Downloads/Figma Exports
        return path.join(homeDir, "Downloads", "Figma Exports");

      default:
        // Unsupported platform
        throw new Error(
          `Unsupported platform: ${platform}. This export system only supports Windows (win32) and macOS (darwin).`,
        );
    }
  }
}
