import { OperationResult, OperationHandler } from '../types.js';

/**
 * Auto-discovery operation router for the Figma plugin.
 * Automatically discovers and registers operations from the operations directory.
 * 
 * Convention:
 * - Operation files should be named: kebab-case.ts (e.g., manage-nodes.ts)
 * - Each file should export a function named: handle[MessageType] (e.g., handleManageNodes)
 * - Message types are auto-generated: manage-nodes.ts → MANAGE_NODES
 */
export class OperationRouter {
  private operations: Record<string, OperationHandler> = {};
  private initialized = false;

  /**
   * Initialize the router by discovering all operations
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Import all operation modules
      const operationModules = await this.importOperations();
      
      // Register discovered operations
      for (const [messageType, handler] of Object.entries(operationModules)) {
        this.operations[messageType] = handler;
      }

      console.log(`Auto-discovered ${Object.keys(this.operations).length} operations:`, 
                  Object.keys(this.operations).sort());
      
      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize operation router:', error);
      throw error;
    }
  }

  /**
   * Import all operation modules using dynamic imports
   */
  private async importOperations(): Promise<Record<string, OperationHandler>> {
    const operations: Record<string, OperationHandler> = {};

    // Define all operation modules to import
    const operationImports = [
      // Node operations
      { module: () => import('../operations/manage-nodes.js'), messageTypes: ['MANAGE_NODES'] },
      
      // Effect operations
      { module: () => import('../operations/manage-effects.js'), messageTypes: ['CREATE_EFFECT', 'UPDATE_EFFECT', 'DELETE_EFFECT', 'GET_EFFECTS', 'REORDER_EFFECT', 'DUPLICATE_EFFECT'] },
      
      // Text operations
      { module: () => import('../operations/manage-text.js'), messageTypes: ['MANAGE_TEXT'] },
      
      // Style operations
      { module: () => import('../operations/manage-styles.js'), messageTypes: ['MANAGE_STYLES'] },
      
      // Layout operations
      { module: () => import('../operations/manage-auto-layout.js'), messageTypes: ['MANAGE_AUTO_LAYOUT'] },
      { module: () => import('../operations/manage-constraints.js'), messageTypes: ['MANAGE_CONSTRAINTS'] },
      { module: () => import('../operations/manage-alignment.js'), messageTypes: ['MANAGE_ALIGNMENT'] },
      { module: () => import('../operations/manage-hierarchy.js'), messageTypes: ['MANAGE_HIERARCHY'] },
      
      // Component operations
      { module: () => import('../operations/manage-components.js'), messageTypes: ['MANAGE_COMPONENTS'] },
      { module: () => import('../operations/manage-instances.js'), messageTypes: ['MANAGE_INSTANCES'] },
      
      // Variable operations (unified - handles both variables and collections)
      { module: () => import('../operations/manage-variables.js'), messageTypes: ['MANAGE_VARIABLES', 'MANAGE_COLLECTIONS'] },
      
      // Boolean and vector operations
      { module: () => import('../operations/manage-boolean.js'), messageTypes: ['BOOLEAN_OPERATION'] },
      { module: () => import('../operations/manage-vector.js'), messageTypes: ['VECTOR_OPERATION'] },
      
      // Dev mode operations
      { module: () => import('../operations/manage-annotations.js'), messageTypes: ['ANNOTATION_OPERATION'] },
      { module: () => import('../operations/manage-measurements.js'), messageTypes: ['MEASUREMENT_OPERATION'] },
      { module: () => import('../operations/manage-dev-resources.js'), messageTypes: ['DEV_RESOURCE_OPERATION'] },
      
      // Export and other operations
      { module: () => import('../operations/manage-exports.js'), messageTypes: ['EXPORT_SINGLE', 'EXPORT_BULK', 'EXPORT_NODE'] },
      { module: () => import('../operations/export-settings-operations.js'), messageTypes: ['MANAGE_EXPORTS'] },
      { module: () => import('../operations/manage-fills.js'), messageTypes: ['MANAGE_FILLS'] },
      { module: () => import('../operations/manage-strokes.js'), messageTypes: ['MANAGE_STROKES'] },
      { module: () => import('../operations/manage-fonts.js'), messageTypes: ['MANAGE_FONTS'] },
      { module: () => import('../operations/manage-selection.js'), messageTypes: ['MANAGE_SELECTION'] },
      { module: () => import('../operations/manage-pages.js'), messageTypes: ['MANAGE_PAGES'] },
      
      // System operations
      { module: () => import('../operations/ping-test.js'), messageTypes: ['PING_TEST'] },
      { module: () => import('../operations/plugin-status-operation.js'), messageTypes: ['PLUGIN_STATUS'] },
      { module: () => import('../operations/sync-fonts.js'), messageTypes: ['SYNC_FONTS'] }
    ];

    // Import each module and register its operations
    for (const { module, messageTypes } of operationImports) {
      try {
        const operationModule = await module();
        
        // Register each message type from this module
        for (const messageType of messageTypes) {
          const handlerName = this.messageTypeToHandlerName(messageType);
          const handler = operationModule[handlerName];
          
          if (handler && typeof handler === 'function') {
            operations[messageType] = handler;
          } else {
            console.warn(`⚠️  Operation ${messageType} handler '${handlerName}' not found in module`);
          }
        }
      } catch (error) {
        // Log warning but continue - some operations might not exist yet
        console.warn(`⚠️  Failed to import operation module for ${messageTypes.join(', ')}:`, error);
      }
    }

    return operations;
  }

  /**
   * Convert message type to handler function name
   * MANAGE_NODES → handleManageNodes
   */
  private messageTypeToHandlerName(messageType: string): string {
    return 'handle' + messageType
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * Get all registered operations
   */
  getOperations(): Record<string, OperationHandler> {
    if (!this.initialized) {
      throw new Error('OperationRouter not initialized. Call initialize() first.');
    }
    return { ...this.operations };
  }

  /**
   * Get a specific operation handler
   */
  getOperation(messageType: string): OperationHandler | undefined {
    return this.operations[messageType];
  }

  /**
   * Check if an operation is registered
   */
  hasOperation(messageType: string): boolean {
    return messageType in this.operations;
  }

  /**
   * Handle a message by routing to the appropriate operation
   */
  async handleMessage(messageType: string, params: any): Promise<OperationResult> {
    const handler = this.getOperation(messageType);
    if (!handler) {
      throw new Error(`Unknown operation: ${messageType}`);
    }
    
    return await handler(params);
  }
}

// Export singleton instance
export const operationRouter = new OperationRouter();