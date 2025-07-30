import { OperationResult, OperationHandler } from './types.js';
import { logger } from './logger.js';
import { OPERATION_FILES, importOperation } from './generated-operations.js';

/**
 * Convention-based operation router for the Figma plugin.
 * Automatically discovers operations by scanning the operations directory at build time.
 * 
 * Convention:
 * - Each operation file exports functions named exactly as their operation (e.g., MANAGE_NODES)
 * - All exported functions from operation files are considered operations
 * - Template and base files are filtered out automatically
 */
class OperationRouter {
  private operations: Record<string, OperationHandler> = {};

  /**
   * Initialize the router by discovering all operations
   */
  initialize(): void {
    
    try {
      this.operations = this.importOperations();
      const operationCount = Object.keys(this.operations).length;
      
    } catch (error) {
      logger.error('❌ Failed to initialize operation router:', error);
      throw error;
    }
  }

  /**
   * Import all operations using convention-based discovery with build-time automation
   */
  private importOperations(): Record<string, OperationHandler> {
    const operations: Record<string, OperationHandler> = {};

    // Filter out template and base files that aren't actual operations
    const operationFiles = OPERATION_FILES.filter(fileName => 
      !fileName.startsWith('_') && 
      !fileName.includes('template') && 
      fileName !== 'base-operation'
    );


    // Import each operation module synchronously
    for (const fileName of operationFiles) {
      try {
        const module = importOperation(fileName);
        
        // All exported functions are considered operations
        for (const [exportName, exportValue] of Object.entries(module)) {
          if (typeof exportValue === 'function' && this.isValidOperationName(exportName)) {
            operations[exportName] = exportValue as OperationHandler;
          }
        }
        
      } catch (error) {
        logger.warn(`⚠️ Failed to import operation module: ${fileName}`, error);
        // Continue loading other operations instead of failing completely
      }
    }

    return operations;
  }

  /**
   * Check if an export name is a valid operation name
   * Operations should be UPPER_CASE constants
   */
  private isValidOperationName(name: string): boolean {
    // Skip common non-operation exports
    if (['default', 'metadata', 'BaseOperation'].includes(name)) {
      return false;
    }
    
    // Operation names should be UPPER_CASE with underscores
    return /^[A-Z][A-Z0-9_]*$/.test(name);
  }


  /**
   * Get all discovered operations
   */
  getOperations(): Record<string, OperationHandler> {
    return { ...this.operations };
  }

  /**
   * Get a specific operation handler
   */
  getOperation(operationType: string): OperationHandler | undefined {
    return this.operations[operationType];
  }

  /**
   * Check if an operation exists
   */
  hasOperation(operationType: string): boolean {
    return operationType in this.operations;
  }

  /**
   * Get operation statistics
   */
  getStats(): { totalOperations: number; operationFiles: number } {
    return {
      totalOperations: Object.keys(this.operations).length,
      operationFiles: OPERATION_FILES.length
    };
  }
}

// Export singleton instance
export const operationRouter = new OperationRouter();