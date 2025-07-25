#!/usr/bin/env node

import { FigmaMCPServer } from './mcp-server.js';
import { ServerConfig } from './types/index.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createServer } from 'http';
import { logger } from './utils/logger.js';

const execAsync = promisify(exec);

// Utility function to check port status
async function checkPortStatus(port: number): Promise<void> {
  logger.log(`🔍 Checking port ${port} status...`);
  
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
      logger.log(`🔌 Port ${port} is available`);
    } else {
      logger.log(`Port ${port} is in use`);
      
      // Find what's using the port
      try {
        const { stdout } = await execAsync(`lsof -ti :${port}`);
        const pids = stdout.trim().split('\n').filter(pid => pid);
        
        if (pids.length > 0) {
          logger.log(`📋 Process(es) using port ${port}:`);
          for (const pid of pids) {
            try {
              const { stdout: processInfo } = await execAsync(`ps -p ${pid} -o pid,comm,args --no-headers`);
              logger.log(`   PID ${pid}: ${processInfo.trim()}`);
            } catch (error) {
              logger.log(`   PID ${pid}: (process info unavailable)`);
            }
          }
          logger.log(`💡 To kill these processes: kill -9 ${pids.join(' ')}`);
        }
      } catch (error) {
        logger.log('   (Unable to identify processes using this port)');
      }
    }
  } catch (error) {
    logger.log(`Error checking port ${port}:`, error);
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
        logger.log(`
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
  24 comprehensive tools for Figma automation including:
  - Node management (create, update, delete, duplicate)
  - Style operations (fills, strokes, effects, text styles)
  - Layout and positioning (alignments, transforms)
  - Export functionality (images, assets)
  - Variable and component management
  - Selection and navigation tools

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
    logger.warn(`📡 Received ${signal}, shutting down gracefully...\n`);
    try {
      await server.stop();
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };
  
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', { promise, reason }); 
    shutdown('unhandledRejection');
  });
  
  try {
    await server.start();
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
