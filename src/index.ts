#!/usr/bin/env node

import { FigmaMCPServer } from './mcp-server.js';
import { ServerConfig } from './types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createServer } from 'http';

const execAsync = promisify(exec);

// Utility function to check port status
async function checkPortStatus(port: number): Promise<void> {
  console.error(`\n🔍 Checking port ${port} status...`);
  
  try {
    // Check if port is available
    const testServer = createServer();
    const isAvailable = await new Promise<boolean>((resolve) => {
      testServer.listen(port, () => {
        testServer.close(() => resolve(true));
      });
      testServer.on('error', () => resolve(false));
    });
    
    if (isAvailable) {
      console.error(`✅ Port ${port} is available`);
    } else {
      console.error(`❌ Port ${port} is in use`);
      
      // Find what's using the port
      try {
        const { stdout } = await execAsync(`lsof -ti :${port}`);
        const pids = stdout.trim().split('\n').filter(pid => pid);
        
        if (pids.length > 0) {
          console.error(`📋 Process(es) using port ${port}:`);
          for (const pid of pids) {
            try {
              const { stdout: processInfo } = await execAsync(`ps -p ${pid} -o pid,comm,args --no-headers`);
              console.error(`   PID ${pid}: ${processInfo.trim()}`);
            } catch (error) {
              console.error(`   PID ${pid}: (process info unavailable)`);
            }
          }
          console.error(`\n💡 To kill these processes: kill -9 ${pids.join(' ')}`);
        }
      } catch (error) {
        console.error('   (Unable to identify processes using this port)');
      }
    }
  } catch (error) {
    console.error(`❌ Error checking port ${port}:`, error);
  }
}

// Parse command line arguments
async function parseArgs(): Promise<Partial<ServerConfig>> {
  const args = process.argv.slice(2);
  const config: Partial<ServerConfig> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    
    switch (key) {
      case '--port':
        if (value) config.port = parseInt(value, 10);
        break;
      case '--check-port':
        if (value) {
          await checkPortStatus(parseInt(value, 10));
          process.exit(0);
        }
        break;
      case '--help':
      case '-h':
        console.error(`
Figma MCP Write Server - Model Context Protocol server with Figma write access

Usage: figma-mcp-write-server [options]

Options:
  --port <number>              WebSocket server port (default: 8765)
  --check-port <number>        Check if a port is available and show what's using it
  --help, -h                   Show this help message

Description:
  MCP server with built-in WebSocket server for Figma plugin communication.
  Includes automatic port management with zombie process detection and cleanup.

Architecture:
  Claude Desktop ↔ MCP Server (WebSocket Server) ↔ Figma MCP Write Bridge Plugin (WebSocket Client)

Setup:
  1. Start this MCP server: node dist/index.js
  2. Open Figma Desktop and import the plugin from figma-plugin/manifest.json
  3. Run the "Figma MCP Write Bridge" plugin - it will auto-connect to the MCP server
  4. Use MCP tools from Claude Desktop

Port Management:
  - Automatically detects if port 8765 is in use
  - Identifies and kills zombie processes when possible
  - Falls back to alternative ports (8766, 8767, etc.) if needed
  - Provides clear error messages for port conflicts

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
  
  # Check what's using port 8765
  node dist/index.js --check-port 8765
`);
        process.exit(0);
    }
  }
  
  return config;
}

async function main() {
  const config = await parseArgs();
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
