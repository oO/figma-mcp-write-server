/**
 * Plugin Logger - Unified logging system for Figma plugin
 * 
 * Routes log messages to server via WebSocket when connected,
 * falls back to console when offline. Critical errors are buffered
 * for transmission when connection is restored.
 */

export type LogType = 'message' | 'warning' | 'error';

interface LogMessage {
  message: string;
  data?: any;
  type: LogType;
  timestamp: number;
}

interface MessageRouter {
  isConnected(): boolean;
  send(message: any): Promise<void>;
}

class PluginLogger {
  private criticalBuffer: LogMessage[] = [];
  private maxBufferSize = 100; // Limit buffer to prevent memory issues
  private messageRouter: MessageRouter | null = null;

  /**
   * Initialize logger with message router
   */
  initialize(messageRouter: MessageRouter) {
    this.messageRouter = messageRouter;
  }

  /**
   * Log a message with specified type
   */
  log(message: string, type: LogType = 'message', data?: any) {
    // Always log to console for immediate developer visibility
    const emoji = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '💬';
    const consoleMethod = type === 'error' ? console.error : 
                         type === 'warning' ? console.warn : console.log;
    
    consoleMethod(`${emoji} ${message}`, data);
    
    // Send to server if connected
    if (this.messageRouter?.isConnected()) {
      this.flushCriticalBuffer();
      this.sendToServer(message, data, type);
    } else if (type === 'error') {
      // Buffer only critical errors for later transmission
      this.addToCriticalBuffer({ message, data, type, timestamp: Date.now() });
    }
  }

  /**
   * Log a regular message
   */
  message(message: string, data?: any) {
    this.log(message, 'message', data);
  }

  /**
   * Log a warning
   */
  warning(message: string, data?: any) {
    this.log(message, 'warning', data);
  }

  /**
   * Log an error
   */
  error(message: string, data?: any) {
    this.log(message, 'error', data);
  }

  /**
   * Flush critical buffer when connection is restored
   */
  onConnectionRestored() {
    if (this.messageRouter?.isConnected()) {
      this.flushCriticalBuffer();
    }
  }

  /**
   * Get current buffer status (for debugging)
   */
  getBufferStatus() {
    return {
      criticalBufferSize: this.criticalBuffer.length,
      maxBufferSize: this.maxBufferSize,
      isConnected: this.messageRouter?.isConnected() || false
    };
  }

  private sendToServer(message: string, data?: any, type: LogType) {
    if (!this.messageRouter) return;

    this.messageRouter.send({
      type: 'LOG_MESSAGE',
      payload: { message, data, type, timestamp: Date.now() }
    }).catch(() => {
      // Ignore transmission errors - console already logged
      // Don't log the error to avoid infinite loops
    });
  }

  private addToCriticalBuffer(logMessage: LogMessage) {
    this.criticalBuffer.push(logMessage);
    
    // Remove oldest if buffer is full
    if (this.criticalBuffer.length > this.maxBufferSize) {
      this.criticalBuffer.shift();
    }
  }

  private flushCriticalBuffer() {
    if (this.criticalBuffer.length === 0 || !this.messageRouter?.isConnected()) {
      return;
    }

    // Send buffered critical logs
    for (const logMessage of this.criticalBuffer) {
      this.sendToServer(logMessage.message, logMessage.data, logMessage.type);
    }

    this.criticalBuffer = [];
  }
}

// Export singleton instance
export const pluginLogger = new PluginLogger();

// Export convenience functions  
export function pluginLog(message: string, type: LogType = 'message', data?: any) {
  pluginLogger.log(message, type, data);
}

export function logMessage(message: string, data?: any) {
  pluginLogger.message(message, data);
}

export function logWarning(message: string, data?: any) {
  pluginLogger.warning(message, data);
}

export function logError(message: string, data?: any) {
  pluginLogger.error(message, data);
}