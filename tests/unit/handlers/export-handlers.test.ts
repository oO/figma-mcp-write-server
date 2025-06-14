import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { ExportHandlers } from "../../../src/handlers/export-handlers.js";

describe("ExportHandlers", () => {
  let exportHandlers: ExportHandlers;
  let mockSendToPlugin: jest.Mock;

  beforeEach(() => {
    mockSendToPlugin = jest.fn();
    exportHandlers = new ExportHandlers(mockSendToPlugin);
  });

  describe("getTools", () => {
    test("should return manage_exports tool", () => {
      const tools = exportHandlers.getTools();
      const toolNames = tools.map((tool) => tool.name);

      expect(toolNames).toContain("manage_exports");
      expect(tools).toHaveLength(1);
    });

    test("should have correct manage_exports schema", () => {
      const tools = exportHandlers.getTools();
      const manageExportsTool = tools.find(
        (tool) => tool.name === "manage_exports",
      );

      expect(manageExportsTool).toBeDefined();
      expect(manageExportsTool?.inputSchema.required).toContain("operation");
      expect(
        manageExportsTool?.inputSchema.properties.operation.enum,
      ).toContain("export_single");
      expect(
        manageExportsTool?.inputSchema.properties.operation.enum,
      ).toContain("export_bulk");
      expect(
        manageExportsTool?.inputSchema.properties.operation.enum,
      ).toContain("export_library");
      expect(
        manageExportsTool?.inputSchema.properties.operation.enum,
      ).toContain("list_presets");
      expect(
        manageExportsTool?.inputSchema.properties.operation.enum,
      ).toContain("apply_preset");
    });
  });

  describe("export_single operation", () => {
    test("should export single node successfully", async () => {
      const mockResponse = {
        success: true,
        data: {
          nodeId: "node-1",
          nodeName: "Rectangle 1",
          format: "PNG",
          filename: "Rectangle_1.png",
          size: 1024,
          success: true,
          message: "Successfully exported Rectangle 1 as PNG",
        },
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await exportHandlers.handle("manage_exports", {
        operation: "export_single",
        nodeId: "node-1",
        format: "PNG",
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: "EXPORT_SINGLE",
        payload: {
          nodeId: "node-1",
          format: "PNG",
          settings: {},
          organizationStrategy: "flat",
          output: "file",
          dataFormat: "base64",
        },
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("Rectangle_1.png");
    });

    test("should fail without nodeId", async () => {
      await expect(
        exportHandlers.handle("manage_exports", {
          operation: "export_single",
          format: "PNG",
        }),
      ).rejects.toThrow("nodeId is required");
    });

    test("should handle export failure", async () => {
      const mockResponse = {
        success: false,
        error: "Node not found",
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await expect(
        exportHandlers.handle("manage_exports", {
          operation: "export_single",
          nodeId: "invalid-node",
          format: "PNG",
        }),
      ).rejects.toThrow("Node not found");
    });

    test("should apply custom settings", async () => {
      const mockResponse = {
        success: true,
        data: { success: true },
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await exportHandlers.handle("manage_exports", {
        operation: "export_single",
        nodeId: "node-1",
        format: "JPG",
        settings: {
          scale: 2,
          quality: 80,
          includeId: true,
          suffix: "high-res",
        },
        organizationStrategy: "by_type",
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: "EXPORT_SINGLE",
        payload: {
          nodeId: "node-1",
          format: "JPG",
          settings: {
            scale: 2,
            quality: 80,
            suffix: "high-res",
            includeId: true,
          },
          organizationStrategy: "by_type",
          output: "file",
          dataFormat: "base64",
        },
      });
    });
  });

  describe("export_bulk operation", () => {
    test("should export multiple nodes successfully", async () => {
      const mockResponse = {
        success: true,
        data: {
          operation: "export_bulk",
          totalNodes: 2,
          successCount: 2,
          errorCount: 0,
          format: "PNG",
          exports: [
            { nodeId: "node-1", nodeName: "Rectangle 1", success: true },
            { nodeId: "node-2", nodeName: "Rectangle 2", success: true },
          ],
        },
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await exportHandlers.handle("manage_exports", {
        operation: "export_bulk",
        nodeIds: ["node-1", "node-2"],
        format: "PNG",
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: "EXPORT_BULK",
        payload: {
          nodeIds: ["node-1", "node-2"],
          format: "PNG",
          settings: {},
          organizationStrategy: "flat",
          exportPreset: undefined,
          output: "file",
          dataFormat: "base64",
        },
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("successCount: 2");
    });

    test("should fail without nodeIds", async () => {
      await expect(
        exportHandlers.handle("manage_exports", {
          operation: "export_bulk",
          format: "PNG",
        }),
      ).rejects.toThrow("nodeIds array is required");
    });

    test("should apply export preset", async () => {
      const mockResponse = {
        success: true,
        data: {
          operation: "export_bulk",
          preset: "ios_app_icon",
          totalNodes: 1,
          successCount: 13, // 13 sizes for iOS icons
          errorCount: 0,
        },
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await exportHandlers.handle("manage_exports", {
        operation: "export_bulk",
        nodeIds: ["node-1"],
        exportPreset: "ios_app_icon",
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: "EXPORT_BULK",
        payload: expect.objectContaining({
          nodeIds: ["node-1"],
          exportPreset: "ios_app_icon",
          settings: expect.objectContaining({
            preset: expect.objectContaining({
              formats: ["PNG"],
              sizes: expect.arrayContaining([20, 29, 40, 1024]),
            }),
          }),
        }),
      });
    });
  });

  describe("export_library operation", () => {
    test("should export library components successfully", async () => {
      const mockResponse = {
        success: true,
        data: {
          operation: "export_library",
          assetType: "components",
          totalAssets: 5,
          successCount: 5,
          errorCount: 0,
          exports: [
            { assetId: "comp-1", assetName: "Button", success: true },
            { assetId: "comp-2", assetName: "Card", success: true },
          ],
        },
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await exportHandlers.handle("manage_exports", {
        operation: "export_library",
        assetType: "components",
        format: "PNG",
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: "EXPORT_LIBRARY",
        payload: {
          assetType: "components",
          format: "PNG",
          filters: {},
          settings: {},
          organizationStrategy: "flat",
        },
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("components");
    });

    test("should fail without assetType", async () => {
      await expect(
        exportHandlers.handle("manage_exports", {
          operation: "export_library",
          format: "PNG",
        }),
      ).rejects.toThrow("assetType is required");
    });

    test("should apply filters", async () => {
      const mockResponse = {
        success: true,
        data: { operation: "export_library", assetType: "styles" },
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await exportHandlers.handle("manage_exports", {
        operation: "export_library",
        assetType: "styles",
        filters: {
          name: "Primary",
          published: true,
        },
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: "EXPORT_LIBRARY",
        payload: expect.objectContaining({
          filters: {
            name: "Primary",
            published: true,
          },
        }),
      });
    });
  });

  describe("list_presets operation", () => {
    test("should return available export presets", async () => {
      const result = await exportHandlers.handle("manage_exports", {
        operation: "list_presets",
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("ios_app_icon");
      expect(result.content[0].text).toContain("android_assets");
      expect(result.content[0].text).toContain("web_assets");
      expect(result.content[0].text).toContain("marketing_assets");
      expect(result.content[0].text).toContain("print_ready");
      expect(result.content[0].text).toContain("total: 5");
    });

    test("should include preset descriptions", async () => {
      const result = await exportHandlers.handle("manage_exports", {
        operation: "list_presets",
      });

      expect(result.content[0].text).toContain(
        "iOS App Icon - All required sizes",
      );
      expect(result.content[0].text).toContain(
        "Android Assets - Multiple density variants",
      );
    });
  });

  describe("apply_preset operation", () => {
    test("should apply preset to nodes successfully", async () => {
      const mockResponse = {
        success: true,
        data: {
          operation: "export_bulk",
          preset: "web_assets",
          totalNodes: 1,
          successCount: 6, // 2 formats × 3 scales
          errorCount: 0,
        },
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await exportHandlers.handle("manage_exports", {
        operation: "apply_preset",
        presetId: "web_assets",
        nodeIds: ["node-1"],
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("web_assets");
    });

    test("should fail with invalid preset", async () => {
      await expect(
        exportHandlers.handle("manage_exports", {
          operation: "apply_preset",
          presetId: "invalid_preset",
          nodeIds: ["node-1"],
        }),
      ).rejects.toThrow("Invalid preset ID: invalid_preset");
    });

    test("should fail without nodeIds", async () => {
      await expect(
        exportHandlers.handle("manage_exports", {
          operation: "apply_preset",
          presetId: "ios_app_icon",
        }),
      ).rejects.toThrow("nodeIds array is required");
    });
  });

  describe("error handling", () => {
    test("should handle unknown operations", async () => {
      await expect(
        exportHandlers.handle("manage_exports", {
          operation: "unknown_operation",
        }),
      ).rejects.toThrow("Validation failed");
    });

    test("should handle unknown tools", async () => {
      await expect(exportHandlers.handle("unknown_tool", {})).rejects.toThrow(
        "Unknown tool: unknown_tool",
      );
    });

    test("should handle plugin communication failures", async () => {
      mockSendToPlugin.mockRejectedValue(new Error("Plugin connection failed"));

      await expect(
        exportHandlers.handle("manage_exports", {
          operation: "export_single",
          nodeId: "node-1",
        }),
      ).rejects.toThrow("Plugin connection failed");
    });
  });

  describe("validation", () => {
    test("should validate format parameter", async () => {
      await expect(
        exportHandlers.handle("manage_exports", {
          operation: "export_single",
          nodeId: "node-1",
          format: "INVALID_FORMAT",
        }),
      ).rejects.toThrow("Validation failed");
    });

    test("should validate organization strategy", async () => {
      await expect(
        exportHandlers.handle("manage_exports", {
          operation: "export_single",
          nodeId: "node-1",
          organizationStrategy: "invalid_strategy",
        }),
      ).rejects.toThrow("Validation failed");
    });

    test("should validate asset type for library exports", async () => {
      await expect(
        exportHandlers.handle("manage_exports", {
          operation: "export_library",
          assetType: "invalid_type",
        }),
      ).rejects.toThrow("Validation failed");
    });
  });
});
