import { logger } from '../logger.js';

/**
 * Convert Base64 string to Uint8Array using UI thread for efficiency
 * Shared utility for both fills and images operations
 */
export async function convertBase64ToBytes(base64Data: string): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    const handleMessage = (event: MessageEvent) => {
      // Handle both message formats (fills uses different format than images)
      if (event.data.pluginMessage?.type === 'base64Converted' || 
          event.data.type === 'BASE64_CONVERSION_RESULT') {
        figma.ui.off('message', handleMessage);
        
        const success = event.data.pluginMessage?.success ?? event.data.success;
        if (success) {
          const bytes = event.data.pluginMessage?.bytes ?? event.data.bytes;
          resolve(bytes);
        } else {
          const error = event.data.pluginMessage?.error ?? event.data.error;
          reject(new Error(error));
        }
      }
    };
    
    figma.ui.on('message', handleMessage);
    
    // Send conversion request
    figma.ui.postMessage({ 
      type: 'convertBase64', 
      base64: base64Data,
      requestId: `image_${Date.now()}`
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      figma.ui.off('message', handleMessage);
      reject(new Error('Timeout converting Base64 to bytes'));
    }, 10000);
  });
}