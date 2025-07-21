#!/usr/bin/env node

/**
 * MCP Functional Test Client
 * Connects to the MCP server using stdio and tests each tool/operation
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import * as yaml from 'js-yaml';

class MCPFunctionalTestClient {
  constructor() {
    this.client = null;
    this.serverProcess = null;
    this.isConnected = false;
    this.testResults = [];
  }

  async connect() {
    console.log('🔌 Connecting to MCP server...');
    
    // Spawn the MCP server process with stdio transport
    this.serverProcess = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'inherit'], // stdin, stdout, stderr
      cwd: process.cwd()
    });

    // Create client with stdio transport
    const transport = new StdioClientTransport({
      stdin: this.serverProcess.stdin,
      stdout: this.serverProcess.stdout
    });

    this.client = new Client({
      name: 'functional-test-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    try {
      await this.client.connect(transport);
      this.isConnected = true;
      console.log('✅ Connected to MCP server');
      
      // Wait a moment for WebSocket connection to establish
      console.log('⏳ Waiting for plugin connection...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to MCP server:', error);
      return false;
    }
  }

  async listTools() {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    console.log('📋 Listing available tools...');
    const response = await this.client.listTools();
    
    console.log(`Found ${response.tools.length} tools:`);
    response.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    
    return response.tools;
  }

  async testTool(toolName, parameters = {}) {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    console.log(`\n🧪 Testing tool: ${toolName}`);
    console.log(`📥 Parameters:`, parameters);

    const startTime = Date.now();
    let result = {
      tool: toolName,
      parameters,
      success: false,
      error: null,
      response: null,
      duration: 0
    };

    try {
      const response = await this.client.callTool({
        name: toolName,
        arguments: parameters
      });

      const duration = Date.now() - startTime;
      result.duration = duration;
      result.response = response;
      result.success = !response.isError;

      if (response.isError) {
        result.error = 'Tool returned error response';
        console.log(`❌ Tool failed (${duration}ms):`, response.content[0]?.text || 'No error details');
      } else {
        console.log(`✅ Tool succeeded (${duration}ms)`);
        
        // Parse YAML response if available
        if (response.content && response.content[0]?.text) {
          try {
            const parsedResponse = yaml.load(response.content[0].text);
            console.log('📄 Response:', JSON.stringify(parsedResponse, null, 2));
          } catch (yamlError) {
            console.log('📄 Response (raw):', response.content[0].text);
          }
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      result.duration = duration;
      result.error = error.message;
      result.success = false;
      console.log(`❌ Tool threw exception (${duration}ms):`, error.message);
    }

    this.testResults.push(result);
    return result;
  }

  async runRefactoredToolTests() {
    console.log('\n🎯 Running tests for refactored tools...\n');

    // Test each refactored tool with basic operations
    const tests = [
      // Plugin status - basic connectivity test
      {
        tool: 'figma_plugin_status',
        params: { operation: 'ping' }
      },
      
      // Node operations
      {
        tool: 'figma_nodes',
        params: { 
          operation: 'create',
          nodeType: 'rectangle',
          name: 'Test Rectangle',
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          fillColor: '#FF5733'
        }
      },
      
      // Selection operations
      {
        tool: 'figma_selection',
        params: { operation: 'get' }
      },
      
      // Text operations
      {
        tool: 'figma_text',
        params: {
          operation: 'create',
          characters: 'Functional Test Text',
          fontSize: 24,
          fontFamily: 'Inter'
        }
      },
      
      // Font operations
      {
        tool: 'figma_fonts',
        params: { operation: 'list' }
      },
      
      // Component operations
      {
        tool: 'figma_components',
        params: { operation: 'list' }
      },
      
      // Style operations
      {
        tool: 'figma_styles',
        params: { operation: 'list' }
      },
      
      // Effects operations
      {
        tool: 'figma_effects',
        params: {
          operation: 'create',
          effectType: 'drop_shadow',
          offsetX: 4,
          offsetY: 4,
          radius: 8,
          color: '#000000',
          opacity: 0.25
        }
      }
    ];

    for (const test of tests) {
      await this.testTool(test.tool, test.params);
      
      // Small delay between tests to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  generateTestReport() {
    console.log('\n📊 FUNCTIONAL TEST REPORT');
    console.log('========================\n');

    const totalTests = this.testResults.length;
    const successful = this.testResults.filter(r => r.success).length;
    const failed = totalTests - successful;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((successful / totalTests) * 100).toFixed(1)}%\n`);

    if (failed > 0) {
      console.log('❌ FAILED TESTS:');
      this.testResults.filter(r => !r.success).forEach(result => {
        console.log(`  - ${result.tool}: ${result.error}`);
      });
      console.log('');
    }

    console.log('⏱️  PERFORMANCE:');
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${result.tool}: ${result.duration}ms`);
    });

    return {
      total: totalTests,
      successful,
      failed,
      successRate: (successful / totalTests) * 100,
      results: this.testResults
    };
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
    }
    
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
    }
    
    this.isConnected = false;
    console.log('🔌 Disconnected from MCP server');
  }
}

// Main execution
async function main() {
  const client = new MCPFunctionalTestClient();
  
  try {
    // Connect to MCP server
    const connected = await client.connect();
    if (!connected) {
      process.exit(1);
    }

    // List available tools
    await client.listTools();

    // Run tests for refactored tools
    await client.runRefactoredToolTests();

    // Generate report
    const report = client.generateTestReport();

    // Exit with appropriate code
    process.exit(report.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  } finally {
    await client.disconnect();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default MCPFunctionalTestClient;