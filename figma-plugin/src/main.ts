// Figma MCP Write Plugin - Main Entry Point
console.log('🎨 Figma MCP Write Plugin starting...');

import { NodeHandler } from './handlers/node-handler.js';
import { TextHandler } from './handlers/text-handler.js';
import { SelectionHandler } from './handlers/selection-handler.js';
import { StyleHandler } from './handlers/style-handler.js';
import { HierarchyHandler } from './handlers/hierarchy-handler.js';
import { LayoutHandler } from './handlers/layout-handler.js';
import { HandlerRegistry } from './types.js';

class FigmaPlugin {
  private handlers: HandlerRegistry = {};

  constructor() {
    this.initializeHandlers();
    this.setupUIMessageHandler();
  }

  private initializeHandlers(): void {
    // Create handler instances
    const nodeHandler = new NodeHandler();
    const textHandler = new TextHandler();
    const selectionHandler = new SelectionHandler();
    const styleHandler = new StyleHandler();
    const hierarchyHandler = new HierarchyHandler();
    const layoutHandler = new LayoutHandler();

    // Register all operations
    Object.assign(this.handlers, 
      nodeHandler.getOperations(),
      textHandler.getOperations(),
      selectionHandler.getOperations(),
      styleHandler.getOperations(),
      hierarchyHandler.getOperations(),
      layoutHandler.getOperations()
    );

    console.log(`✅ Registered ${Object.keys(this.handlers).length} operations:`, Object.keys(this.handlers));
    
    // Debug: Specifically check for MANAGE_STYLES and MANAGE_HIERARCHY
    console.log('🔍 MANAGE_STYLES handler exists:', !!this.handlers['MANAGE_STYLES']);
    console.log('🔍 MANAGE_HIERARCHY handler exists:', !!this.handlers['MANAGE_HIERARCHY']);
  }

  private setupUIMessageHandler(): void {
    // Handle messages from UI thread (which manages WebSocket connection)
    figma.ui.onmessage = async (msg) => {
      console.log('📨 Received from UI:', msg.type);
      
      switch (msg.type) {
        case 'PLUGIN_OPERATION':
          console.log('🔧 About to handle operation:', msg.operation);
          await this.handlePluginOperation(msg.operation, msg.payload, msg.id);
          break;
          
        case 'CLOSE':
          console.log('👋 Closing plugin');
          figma.closePlugin();
          break;
          
        default:
          console.log('❓ Unknown message type:', msg.type);
      }
    };
  }

  // Handle operations from MCP server via UI thread
  private async handlePluginOperation(operation: string, payload: any, id: string): Promise<void> {
    console.log(`🔧 Executing ${operation}:`, payload);
    console.log('🔍 Available handlers:', Object.keys(this.handlers));
    console.log('🔍 Looking for handler:', operation);
    
    try {
      const handler = this.handlers[operation];
      
      if (!handler) {
        console.error(`❌ Handler not found for operation: ${operation}`);
        console.error('❌ Available handlers:', Object.keys(this.handlers));
        throw new Error(`Unknown operation: ${operation}`);
      }
      
      console.log(`✅ Found handler for ${operation}, executing...`);

      const result = await handler(payload);
      
      // Send success response back to UI thread
      figma.ui.postMessage({
        type: 'OPERATION_RESPONSE',
        id,
        success: result.success,
        data: result.success ? result.data : result,
        error: result.success ? undefined : result.error
      });
      
      console.log(`✅ ${operation} completed successfully`);
      
    } catch (error) {
      console.error(`❌ ${operation} failed:`, error);
      
      // Send error response back to UI thread
      figma.ui.postMessage({
        type: 'OPERATION_RESPONSE',
        id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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
      console.log(`🎯 Selection changed: ${selection.length} nodes selected`);
    });
  }

  getStatus(): any {
    return {
      handlers: Object.keys(this.handlers),
      timestamp: Date.now()
    };
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