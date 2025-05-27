#!/usr/bin/env node

import { FigmaMCPServer } from './mcp-server.js';
import { ServerConfig } from './types.js';

// Parse command line arguments
const args = process.argv.slice(2);
const config: Partial<ServerConfig> = {};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i];
  const value = args[i + 1];
  
  switch (key) {
    case '--port':
      if (value) config.port = parseInt(value, 10);
      break;
    case '--cors-origin':
      if (value) config.corsOrigin = value;
      break;
    case '--plugin-id':
      if (value) config.pluginId = value;
      break;
    case '--max-message-size':
      if (value) config.maxMessageSize = parseInt(value, 10);
      break;
    case '--heartbeat-interval':
      if (value) config.heartbeatInterval = parseInt(value, 10);
      break;
    case '--help':
    case '-h':
      console.log(`
Figma MCP Write Server - Model Context Protocol server with Figma write access

Usage: figma-mcp-write-server [options]

Options:
  --port <number>              Server port (default: 3001)
  --cors-origin <string>       CORS origin (default: *)
  --plugin-id <string>         Plugin ID for authentication (default: figma-mcp-write-plugin)
  --max-message-size <number>  Maximum message size in bytes (default: 1048576)
  --heartbeat-interval <number> Heartbeat interval in ms (default: 30000)
  --help, -h                   Show this help message

Description:
  This MCP server provides write access to Figma through a companion plugin.
  It connects to a WebSocket bridge server that handles plugin communication.

Setup:
  1. Start the WebSocket bridge: npx tsx src/index-websocket.ts
  2. Start this MCP server: node dist/index.js
  3. Open Figma and install the companion Figma plugin
  4. Run the plugin to establish connection
  5. Use MCP tools to interact with your Figma design

Available MCP Tools:
  - create_rectangle    Create rectangle shapes
  - create_ellipse      Create ellipse/circle shapes  
  - create_text         Create text elements
  - create_frame        Create frame containers
  - update_node         Update existing node properties
  - move_node           Move nodes to new positions
  - delete_node         Delete nodes
  - duplicate_node      Duplicate existing nodes
  - get_selection       Get currently selected nodes
  - set_selection       Set node selection
  - get_page_nodes      List all nodes on current page
  - export_node         Export nodes as images
  - get_plugin_status   Check plugin connection status

Examples:
  # Start server with default settings
  figma-mcp-write-server
  
  # Start server on custom port
  figma-mcp-write-server --port 3002
  
  # Start with custom heartbeat interval
  figma-mcp-write-server --heartbeat-interval 15000
`);
      process.exit(0);
  }
}

async function main() {
  console.log('🎨 Figma MCP Write Server');
  console.log('==========================');
  
  const server = new FigmaMCPServer(config);
  
  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
    try {
      await server.stop();
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };
  
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
  
  try {
    await server.start();
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
