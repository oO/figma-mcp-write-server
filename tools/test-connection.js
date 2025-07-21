// Simple connection test script
import { FigmaMCPServer } from './src/mcp-server.js';

console.log('🚀 Starting MCP Server...');

const mcpServer = new FigmaMCPServer();

try {
  await mcpServer.start();
  console.log('✅ MCP Server started successfully');
  
  // Wait a moment for any connections
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const status = mcpServer.getConnectionStatus();
  console.log('=== Connection Status ===');
  console.log('Plugin connected:', status.pluginConnected);
  console.log('Connection count:', status.connectionCount);
  console.log('Full status:', JSON.stringify(status, null, 2));
  
  if (status.pluginConnected) {
    console.log('✅ Plugin is connected!');
  } else {
    console.log('❌ Plugin not connected');
    console.log('Server is listening on ws://localhost:8765');
    console.log('Make sure your Figma plugin connects to this address');
  }
  
  // Keep server running for a bit to allow plugin connection
  console.log('Keeping server running for 10 seconds...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Check status again
  const finalStatus = mcpServer.getConnectionStatus();
  console.log('=== Final Status ===');
  console.log('Plugin connected:', finalStatus.pluginConnected);
  
} catch (error) {
  console.error('❌ Error:', error);
} finally {
  await mcpServer.stop();
  console.log('🛑 MCP Server stopped');
}