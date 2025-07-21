// Figma MCP Write Plugin - Main Entry Point
console.log('Figma MCP Write Plugin starting...');

import { operationRouter } from './router/operation-router.js';
import { HandlerRegistry } from './types.js';

class FigmaPlugin {
  private handlers: HandlerRegistry = {};
  private initialized = false;

  constructor() {
    this.initializePlugin();
    this.setupUIMessageHandler();
  }

  private async initializePlugin(): Promise<void> {
    try {
      console.log('Initializing plugin with auto-discovery router...');
      
      // Initialize the operation router
      await operationRouter.initialize();
      
      // Get all discovered operations
      this.handlers = operationRouter.getOperations();
      
      console.log(`Plugin initialized with ${Object.keys(this.handlers).length} operations`);
      this.initialized = true;
      
      // Debug: Log discovered operations
      this.logDiscoveredOperations();
    } catch (error) {
      console.error('❌ Failed to initialize plugin:', error);
      // Fallback to legacy initialization
      this.initializeLegacyHandlers();
    }
  }

  private initializeLegacyHandlers(): void {
    console.log('Legacy handler initialization disabled - using auto-discovery only');
    console.log('Legacy handlers moved to /legacy-handlers-deprecated/ for reference');
    console.log('Current operations located in /src/operations/ with auto-discovery');
    this.initialized = false;
  }
  
  private logDiscoveredOperations(): void {
    const operations = Object.keys(this.handlers).sort();
    
    console.log('Discovered operations by category:');
    
    const categories = {
      'Node Operations': operations.filter(op => op.includes('NODE') || op.includes('CREATE_') || op.includes('UPDATE_') || op.includes('DELETE_') || op.includes('DUPLICATE_') || op.includes('MOVE_')),
      'Text Operations': operations.filter(op => op.includes('TEXT')),
      'Style Operations': operations.filter(op => op.includes('STYLE')),
      'Layout Operations': operations.filter(op => op.includes('LAYOUT') || op.includes('CONSTRAINT') || op.includes('ALIGNMENT') || op.includes('HIERARCHY')),
      'Component Operations': operations.filter(op => op.includes('COMPONENT') || op.includes('INSTANCE')),
      'Variable Operations': operations.filter(op => op.includes('VARIABLE') || op.includes('COLLECTION')),
      'Dev Mode Operations': operations.filter(op => op.includes('ANNOTATION') || op.includes('MEASUREMENT') || op.includes('DEV_RESOURCE')),
      'Selection Operations': operations.filter(op => op.includes('SELECTION')),
      'Export Operations': operations.filter(op => op.includes('EXPORT')),
      'System Operations': operations.filter(op => op.includes('PING') || op.includes('SYNC') || op.includes('FONTS'))
    };
    
    for (const [category, ops] of Object.entries(categories)) {
      if (ops.length > 0) {
        console.log(`  ${category}: ${ops.length} operations`);
        ops.forEach(op => console.log(`    - ${op}`));
      }
    }
    
    const uncategorized = operations.filter(op => !Object.values(categories).flat().includes(op));
    if (uncategorized.length > 0) {
      console.log(`  Other Operations: ${uncategorized.length} operations`);
      uncategorized.forEach(op => console.log(`    - ${op}`));
    }
    // Debug logging handled by logDiscoveredOperations()
    console.log('SYNC_FONTS handler exists:', !!this.handlers['SYNC_FONTS']);
    console.log('PING_TEST handler exists:', !!this.handlers['PING_TEST']);
  }

  private setupUIMessageHandler(): void {
    // Handle messages from UI thread (which manages WebSocket connection)
    figma.ui.onmessage = async (msg) => {
      console.log('📨 Received from UI:', msg.type);
      
      // Handle special plugin control messages
      if (msg.type === 'CLOSE') {
        console.log('👋 Closing plugin');
        figma.closePlugin();
        return;
      }
      
      // Handle operation messages from UI (wrapped in pluginMessage)
      const message = msg.pluginMessage || msg; // Support both wrapped and direct messages
      if (message.type && message.id && this.handlers[message.type]) {
        await this.handlePluginOperation(message.type, message.payload, message.id);
      } else {
        console.error('Unknown message or missing handler:', message.type);
        
        // Send error response
        figma.ui.postMessage({
          type: 'OPERATION_RESPONSE',
          id: message.id || 'unknown',
          operation: message.type || 'unknown',
          success: false,
          error: `Unknown operation: ${message.type || 'undefined'}`
        });
      }
    };
  }

  // Handle operations from MCP server via UI thread
  private async handlePluginOperation(operation: string, payload: any, id: string): Promise<void> {
    
    try {
      const handler = this.handlers[operation];
      
      if (!handler) {
        throw new Error(`Unknown operation: ${operation}`);
      }

      // Comprehensive null-safe payload handling
      let safePayload = payload;
      if (!payload || typeof payload !== 'object') {
        safePayload = {};
      } else {
        // Deep null-safe payload processing
        safePayload = this.sanitizePayload(payload);
      }

      const result = await handler(safePayload);
      
      // Send success response back to UI thread
      // KISS: handlers return data directly or throw errors
      figma.ui.postMessage({
        type: 'OPERATION_RESPONSE',
        id,
        operation,
        result
      });
      
      console.log(`${operation} completed successfully`);
      
    } catch (error) {
      console.error(`${operation} failed:`, error.toString());
      
      // Send error response back to UI thread
      figma.ui.postMessage({
        type: 'OPERATION_RESPONSE',
        id,
        operation,
        error: error instanceof Error ? error.toString() : 'Unknown error'
      });
    }
  }


  async start(): Promise<void> {
    try {
      // Show UI for WebSocket connection and monitoring
      figma.showUI(__html__, { width: 320, height: 300 });

      // Set up plugin lifecycle handlers
      this.setupLifecycleHandlers();

      console.log('🚀 Plugin initialization complete');
    } catch (error) {
      console.error('❌ Plugin initialization failed:', error);
      figma.notify('Plugin initialization failed', { error: true });
    }
  }

  private setupLifecycleHandlers(): void {
    // Handle plugin close
    figma.on('close', () => {
      console.log('👋 Plugin closing...');
    });

    // Handle selection changes (optional - for debugging)
    figma.on('selectionchange', () => {
      const selection = figma.currentPage.selection;
      console.log(`Selection changed: ${selection.length} nodes selected`);
    });
  }

  getStatus(): any {
    return {
      handlers: Object.keys(this.handlers),
      timestamp: Date.now()
    };
  }

  /**
   * Recursively sanitize payload to handle null values
   */
  private sanitizePayload(obj: any): any {
    if (obj === null || obj === undefined) {
      return undefined; // Convert null to undefined for safer destructuring
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizePayload(item));
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value === null) {
          // Skip null values entirely to prevent destructuring issues
          continue;
        }
        sanitized[key] = this.sanitizePayload(value);
      }
      return sanitized;
    }
    
    return obj;
  }
}

// Initialize and start the plugin
const plugin = new FigmaPlugin();
plugin.start().catch(error => {
  console.error('💥 Fatal error starting plugin:', error);
  figma.notify('Failed to start plugin', { error: true });
});

// Export for debugging
(globalThis as any).plugin = plugin;