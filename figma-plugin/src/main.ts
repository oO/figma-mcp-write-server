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
      
      // Handle operation messages directly (no PLUGIN_OPERATION wrapper)
      if (msg.type && msg.id && this.handlers[msg.type]) {
        console.log('🔧 About to handle operation:', msg.type);
        await this.handlePluginOperation(msg.type, msg.payload, msg.id);
      } else {
        console.log('❓ Unknown message or missing handler:', msg.type);
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