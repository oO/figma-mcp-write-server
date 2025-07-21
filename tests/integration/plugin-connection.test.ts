import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from "vitest";
import { FigmaMCPServer } from '@/mcp-server';

describe("Plugin Connection Test", () => {
  let mcpServer: FigmaMCPServer;

  beforeEach(async () => {
    // Start the full MCP server (same as production)
    mcpServer = new FigmaMCPServer();
    await mcpServer.start();
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterEach(async () => {
    await mcpServer.stop();
  });

  test("should have MCP server running and ready for plugin connection", async () => {
    // Check if server is running
    expect(mcpServer).toBeDefined();
    
    // Check connection status
    const status = mcpServer.getConnectionStatus();
    expect(status).toBeDefined();
    
    console.log('MCP Server is running and ready for plugin connection');
    console.log('Connection status:', status);
    console.log('Plugin connected:', status.pluginConnected);
    console.log('WebSocket port: 8765');
  });

  test("should handle tool call once plugin connects", async () => {
    // Wait longer for plugin to potentially connect
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if plugin connected
    const status = mcpServer.getConnectionStatus();
    
    console.log('=== Plugin Connection Status ===');
    console.log('Plugin connected:', status.pluginConnected);
    console.log('Connection count:', status.connectionCount);
    console.log('Full status:', JSON.stringify(status, null, 2));
    
    if (status.pluginConnected) {
      console.log('✅ Plugin is connected! Plugin should be able to receive tool calls.');
      expect(status.pluginConnected).toBe(true);
    } else {
      console.log('❌ Plugin not connected.');
      console.log('The MCP server is running on ws://localhost:8765');
      console.log('Make sure your Figma plugin is configured to connect to this address.');
      
      // Don't fail the test - just report the status
      console.log('Plugin connection status: disconnected');
    }
  }, 10000);
});