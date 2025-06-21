// Figma MCP Write Plugin - Main Entry Point
console.log('🎨 Figma MCP Write Plugin starting...');

import { NodeHandler } from './handlers/node-handler.js';
import { TextHandler } from './handlers/text-handler.js';
import { SelectionHandler } from './handlers/selection-handler.js';
import { StyleHandler } from './handlers/style-handler.js';
import { HierarchyHandler } from './handlers/hierarchy-handler.js';
import { LayoutHandler } from './handlers/layout-handler.js';
import { ComponentHandler } from './handlers/component-handler.js';
import { VariableHandler } from './handlers/variable-handler.js';
import { ExportHandler } from './handlers/export-handler.js';
import { ImageHandler } from './handlers/image-handler.js';
import { FontHandler } from './handlers/font-handler.js';
import { TypographyHandler } from './handlers/typography-handler.js';
import { AlignmentHandler } from './handlers/alignment-handler.js';
import { performBooleanOperation, performVectorOperation } from './handlers/boolean-handler.js';
import { 
  performAnnotationOperation, 
  performMeasurementOperation, 
  performDevResourceOperation 
} from './handlers/dev-mode-handler.js';
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
    const componentHandler = new ComponentHandler();
    const variableHandler = new VariableHandler();
    const exportHandler = new ExportHandler();
    const imageHandler = new ImageHandler();
    const fontHandler = new FontHandler();
    const typographyHandler = new TypographyHandler();
    const alignmentHandler = new AlignmentHandler();

    // Register all operations
    Object.assign(this.handlers, 
      nodeHandler.getOperations(),
      textHandler.getOperations(),
      selectionHandler.getOperations(),
      styleHandler.getOperations(),
      hierarchyHandler.getOperations(),
      layoutHandler.getOperations(),
      componentHandler.getOperations(),
      variableHandler.getOperations(),
      exportHandler.getOperations(),
      imageHandler.getOperations(),
      fontHandler.getOperations(),
      typographyHandler.getOperations(),
      alignmentHandler.getOperations(),
      // Boolean and vector operations
      {
        'BOOLEAN_OPERATION': performBooleanOperation,
        'VECTOR_OPERATION': performVectorOperation
      },
      // Dev mode operations
      {
        'ANNOTATION_OPERATION': performAnnotationOperation,
        'MEASUREMENT_OPERATION': performMeasurementOperation,
        'DEV_RESOURCE_OPERATION': performDevResourceOperation
      },
      // Font sync operation
      {
        'SYNC_FONTS': this.syncFonts.bind(this)
      },
      // Connection test operations
      {
        'PING_TEST': this.handlePingTest.bind(this)
      }
    );

    console.log(`✅ Registered ${Object.keys(this.handlers).length} operations:`, Object.keys(this.handlers));
    
    // Debug: Specifically check for component, variable, and boolean operations
    console.log('🔍 MANAGE_COMPONENTS handler exists:', !!this.handlers['MANAGE_COMPONENTS']);
    console.log('🔍 MANAGE_INSTANCES handler exists:', !!this.handlers['MANAGE_INSTANCES']);
    console.log('🔍 MANAGE_COLLECTIONS handler exists:', !!this.handlers['MANAGE_COLLECTIONS']);
    console.log('🔍 MANAGE_VARIABLES handler exists:', !!this.handlers['MANAGE_VARIABLES']);
    console.log('🔍 MANAGE_ALIGNMENT handler exists:', !!this.handlers['MANAGE_ALIGNMENT']);
    console.log('🔍 BOOLEAN_OPERATION handler exists:', !!this.handlers['BOOLEAN_OPERATION']);
    console.log('🔍 VECTOR_OPERATION handler exists:', !!this.handlers['VECTOR_OPERATION']);
    console.log('🔍 ANNOTATION_OPERATION handler exists:', !!this.handlers['ANNOTATION_OPERATION']);
    console.log('🔍 MEASUREMENT_OPERATION handler exists:', !!this.handlers['MEASUREMENT_OPERATION']);
    console.log('🔍 DEV_RESOURCE_OPERATION handler exists:', !!this.handlers['DEV_RESOURCE_OPERATION']);
    console.log('🔍 MANAGE_FONTS handler exists:', !!this.handlers['MANAGE_FONTS']);
    console.log('🔍 MANAGE_TYPOGRAPHY handler exists:', !!this.handlers['MANAGE_TYPOGRAPHY']);
    console.log('🔍 SYNC_FONTS handler exists:', !!this.handlers['SYNC_FONTS']);
    console.log('🔍 PING_TEST handler exists:', !!this.handlers['PING_TEST']);
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

      const result = await handler(payload);
      
      // Send success response back to UI thread
      figma.ui.postMessage({
        type: 'OPERATION_RESPONSE',
        id,
        operation,
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
        operation,
        success: false,
        error: error instanceof Error ? error.toString() : 'Unknown error'
      });
    }
  }

  // Font sync operation for database synchronization
  private async syncFonts(payload: any): Promise<any> {
    try {
      // Get all available fonts using Figma API
      const availableFonts = await figma.listAvailableFontsAsync();
      
      // Return raw font data for sync service processing
      return availableFonts;
    } catch (error) {
      console.error('❌ Font sync failed:', error);
      throw new Error(`Font sync failed: ${error instanceof Error ? error.toString() : 'Unknown error'}`);
    }
  }

  // Connection test operation
  private async handlePingTest(payload: any): Promise<any> {
    try {
      const startTime = payload.timestamp || Date.now();
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          pong: true,
          roundTripTime: responseTime,
          pluginVersion: '0.27.1',
          timestamp: Date.now()
        }
      };
    } catch (error) {
      console.error('❌ Ping test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.toString() : 'Unknown error'
      };
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