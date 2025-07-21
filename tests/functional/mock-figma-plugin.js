#!/usr/bin/env node

/**
 * Mock Figma Plugin WebSocket Server
 * Simulates the Figma plugin WebSocket client for testing
 */

import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

class MockFigmaPlugin {
  constructor(port = 8765) {
    this.port = port;
    this.ws = null;
    this.isConnected = false;
    this.requestHandlers = new Map();
    this.setupHandlers();
  }

  setupHandlers() {
    // Mock responses for different operation types
    this.requestHandlers.set('PING_TEST', (payload) => ({
      success: true,
      data: {
        pong: true,
        pluginVersion: '1.0.0-mock',
        roundTripTime: 10,
        timestamp: Date.now()
      }
    }));

    this.requestHandlers.set('CREATE_NODE', (payload) => ({
      success: true,
      data: {
        id: `mock:${uuidv4()}`,
        name: payload.name || 'Mock Node',
        type: payload.nodeType?.toUpperCase() || 'RECTANGLE',
        x: payload.x || 0,
        y: payload.y || 0,
        width: payload.width || 100,
        height: payload.height || 100,
        fills: payload.fillColor ? [{ 
          type: 'SOLID', 
          color: this.hexToRgb(payload.fillColor) 
        }] : []
      }
    }));

    this.requestHandlers.set('UPDATE_NODE', (payload) => ({
      success: true,
      data: {
        id: payload.id || payload.nodeId,
        updated: true,
        changes: Object.keys(payload).filter(key => 
          !['operation', 'id', 'nodeId'].includes(key)
        )
      }
    }));

    this.requestHandlers.set('DELETE_NODE', (payload) => ({
      success: true,
      data: {
        deleted: Array.isArray(payload.id) ? payload.id : [payload.id || payload.nodeId],
        count: Array.isArray(payload.id) ? payload.id.length : 1
      }
    }));

    this.requestHandlers.set('DUPLICATE_NODE', (payload) => ({
      success: true,
      data: {
        original: payload.id || payload.nodeId,
        duplicates: Array.from({ length: payload.count || 1 }, () => `mock:${uuidv4()}`),
        count: payload.count || 1
      }
    }));

    this.requestHandlers.set('MANAGE_STYLES', (payload) => {
      if (payload.operation === 'list') {
        return {
          success: true,
          data: {
            styles: [
              { id: 'S:mock1', name: 'Primary Blue', type: 'PAINT' },
              { id: 'S:mock2', name: 'Heading 1', type: 'TEXT' },
              { id: 'S:mock3', name: 'Drop Shadow', type: 'EFFECT' }
            ]
          }
        };
      }
      return {
        success: true,
        data: {
          id: `S:mock:${uuidv4()}`,
          name: payload.name || 'Mock Style',
          type: payload.type?.toUpperCase() || 'PAINT',
          operation: payload.operation
        }
      };
    });

    this.requestHandlers.set('MANAGE_SELECTION', (payload) => {
      if (payload.operation === 'get') {
        return {
          success: true,
          data: {
            selection: [
              { id: 'mock:sel1', name: 'Selected Node 1', type: 'RECTANGLE' },
              { id: 'mock:sel2', name: 'Selected Node 2', type: 'TEXT' }
            ],
            count: 2
          }
        };
      }
      return {
        success: true,
        data: {
          operation: payload.operation,
          nodeIds: payload.nodeIds || [],
          count: Array.isArray(payload.nodeIds) ? payload.nodeIds.length : 1
        }
      };
    });

    this.requestHandlers.set('MANAGE_TEXT', (payload) => ({
      success: true,
      data: {
        id: `mock:text:${uuidv4()}`,
        characters: payload.characters || 'Mock Text',
        fontSize: payload.fontSize || 16,
        fontFamily: payload.fontFamily || 'Inter',
        operation: payload.operation
      }
    }));

    this.requestHandlers.set('MANAGE_FONTS', (payload) => ({
      success: true,
      data: {
        fonts: [
          { family: 'Inter', style: 'Regular', available: true },
          { family: 'Inter', style: 'Bold', available: true },
          { family: 'Roboto', style: 'Regular', available: false }
        ],
        operation: payload.operation
      }
    }));

    this.requestHandlers.set('MANAGE_EFFECTS', (payload) => ({
      success: true,
      data: {
        id: `E:mock:${uuidv4()}`,
        type: 'DROP_SHADOW',
        operation: payload.operation
      }
    }));

    this.requestHandlers.set('MANAGE_COMPONENTS', (payload) => ({
      success: true,
      data: {
        id: `C:mock:${uuidv4()}`,
        name: payload.name || 'Mock Component',
        operation: payload.operation
      }
    }));

    this.requestHandlers.set('PLUGIN_STATUS', (payload) => ({
      success: true,
      data: {
        connected: true,
        version: '1.0.0-mock',
        operation: payload.operation
      }
    }));
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 0, b: 0 };
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`🔌 Mock Figma Plugin connecting to ws://localhost:${this.port}`);
      
      this.ws = new WebSocket(`ws://localhost:${this.port}`);
      
      this.ws.on('open', () => {
        console.log('✅ Mock plugin connected to MCP server');
        this.isConnected = true;
        
        // Send initial connection message
        this.ws.send(JSON.stringify({
          type: 'PLUGIN_CONNECTED',
          payload: {
            pluginVersion: '1.0.0-mock',
            timestamp: Date.now()
          }
        }));
        
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('❌ Failed to parse message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('🔌 Mock plugin disconnected');
        this.isConnected = false;
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        reject(error);
      });

      // Connection timeout
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  }

  handleMessage(message) {
    console.log('📨 Mock plugin received:', message.type);
    
    const handler = this.requestHandlers.get(message.type);
    if (handler) {
      const response = handler(message.payload || {});
      
      // Add slight delay to simulate real plugin processing
      setTimeout(() => {
        this.ws.send(JSON.stringify(response));
      }, 10);
    } else {
      console.warn('⚠️ No handler for message type:', message.type);
      this.ws.send(JSON.stringify({
        success: false,
        error: `Mock plugin: Unknown message type ${message.type}`
      }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// If run directly, start the mock plugin
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.argv[2] ? parseInt(process.argv[2]) : 8765;
  const mockPlugin = new MockFigmaPlugin(port);
  
  console.log('🚀 Starting Mock Figma Plugin...');
  
  mockPlugin.connect().then(() => {
    console.log('✅ Mock plugin ready for testing');
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('🛑 Shutting down mock plugin...');
      mockPlugin.disconnect();
      process.exit(0);
    });
  }).catch(error => {
    console.error('❌ Failed to start mock plugin:', error);
    process.exit(1);
  });
}

export default MockFigmaPlugin;