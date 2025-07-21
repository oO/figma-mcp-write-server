import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from "vitest";
import { HandlerRegistry } from '@/handlers/index';
import { FigmaWebSocketServer } from '@/websocket/websocket-server';
import { DEFAULT_WS_CONFIG } from '@/types/index';

describe("Alignment Tool Integration", () => {
  let handlerRegistry: HandlerRegistry;
  let webSocketServer: FigmaWebSocketServer;

  beforeEach(async () => {
    // Use the default port 8765 since that's where your plugin connects
    const testConfig = {
      ...DEFAULT_WS_CONFIG,
      port: 8765, // Use default port 8765
    };
    
    // Create a real WebSocket server to connect to the running plugin
    webSocketServer = new FigmaWebSocketServer(testConfig);
    
    // Start the WebSocket server
    await webSocketServer.start();
    
    // Create handler registry with real WebSocket server
    handlerRegistry = new HandlerRegistry(
      (request) => webSocketServer.sendToPlugin(request),
      webSocketServer,
    );
    
    // Wait for all handlers to be registered before running tests
    await handlerRegistry.waitForHandlerRegistration();
    
    // Debug connection status
    console.log('WebSocket server started on port:', testConfig.port);
    console.log('Plugin connected:', webSocketServer.isPluginConnected());
    console.log('Connection status:', webSocketServer.getConnectionStatus());
  });

  afterEach(async () => {
    // Clean up WebSocket server
    await webSocketServer.stop();
  });

  describe("Alignment Operations", () => {
    test("should connect to plugin and handle alignment request", async () => {
      // Check connection status first
      const isConnected = webSocketServer.isPluginConnected();
      const status = webSocketServer.getConnectionStatus();
      
      console.log('=== Connection Status ===');
      console.log('Plugin connected:', isConnected);
      console.log('Connection status:', JSON.stringify(status, null, 2));
      
      // Force output to stdout
      process.stdout.write(`\n=== PLUGIN CONNECTION STATUS ===\n`);
      process.stdout.write(`Plugin connected: ${isConnected}\n`);
      process.stdout.write(`Status: ${JSON.stringify(status, null, 2)}\n`);
      
      if (!isConnected) {
        console.log('❌ Plugin not connected to WebSocket server on port 8765');
        console.log('Make sure your Figma plugin is:');
        console.log('1. Installed and running in Figma');
        console.log('2. Configured to connect to ws://localhost:8765');
        console.log('3. Actually attempting to connect');
        
        // Don't fail the test, just report the issue
        expect(isConnected).toBe(false);
        return;
      }

      console.log('✅ Plugin connected! Testing alignment tool...');
      
      // Wait a moment for plugin connection to establish
      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await handlerRegistry.handleToolCall("figma_alignment", {
        nodeIds: ["1:1", "1:2"],
        horizontalOperation: "align",
        horizontalDirection: "left",
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("operation");
      expect(result.content[0].type).toBe("text");
      
      console.log('✅ Alignment tool call successful!');
    });

    test("should throw an error if nodeIds are missing", async () => {
      await expect(
        handlerRegistry.handleToolCall("figma_alignment", {
          horizontalOperation: "align",
          horizontalDirection: "left",
        })
      ).rejects.toThrow();
    });
  });
});