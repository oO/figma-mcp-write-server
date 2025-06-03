// Figma MCP Write Plugin - Main Entry Point
console.log('🎨 Figma MCP Write Plugin starting...');

import { NodeHandler } from './handlers/node-handler.js';
import { TextHandler } from './handlers/text-handler.js';
import { SelectionHandler } from './handlers/selection-handler.js';
import { StyleHandler } from './handlers/style-handler.js';
import { HierarchyHandler } from './handlers/hierarchy-handler.js';
import { LayoutHandler } from './handlers/layout-handler.js';
import { MessageRouter } from './websocket/message-router.js';
import { HandlerRegistry } from './types.js';

class FigmaPlugin {
  private messageRouter: MessageRouter;
  private handlers: HandlerRegistry = {};

  constructor() {
    this.initializeHandlers();
    this.messageRouter = new MessageRouter(this.handlers);
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

    console.log(`✅ Registered ${Object.keys(this.handlers).length} operations`);
  }

  async start(): Promise<void> {
    try {
      // Show UI for connection monitoring
      figma.showUI(__html__, { width: 320, height: 300 });

      // Initialize message router and WebSocket connection
      await this.messageRouter.initialize();

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
    figma.on('close', async () => {
      console.log('👋 Plugin closing...');
      await this.messageRouter.close();
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
      connection: this.messageRouter.getConnectionStatus(),
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