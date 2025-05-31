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
    case '--help':
    case '-h':
      console.error(`
Figma MCP Write Server - Model Context Protocol server with Figma write access

Usage: figma-mcp-write-server [options]

Options:
  --port <number>              WebSocket server port (default: 8765)
  --help, -h                   Show this help message

Description:
  MCP server with built-in WebSocket server for Figma plugin communication.

Architecture:
  Claude Desktop ↔ MCP Server (WebSocket Server) ↔ Figma MCP Write Bridge Plugin (WebSocket Client)

Setup:
  1. Start this MCP server: node dist/index.js
  2. Open Figma Desktop and import the plugin from figma-plugin/manifest.json
  3. Run the "Figma MCP Write Bridge" plugin - it will auto-connect to the MCP server
  4. Use MCP tools from Claude Desktop

Available MCP Tools:
  - create_rectangle    Create rectangle shapes
  - create_ellipse      Create ellipse/circle shapes  
  - create_text         Create text elements
  - create_frame        Create frame containers
  - get_selection       Get currently selected nodes
  - get_plugin_status   Check plugin connection status

Examples:
  # Start server with default settings
  node dist/index.js
  
  # Start server with custom WebSocket port
  node dist/index.js --port 9000
`);
      process.exit(0);
  }
}

async function main() {
  const server = new FigmaMCPServer(config);
  
  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.error(`\n📡 Received ${signal}, shutting down gracefully...`);
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
