import { logger } from '../logger.js';

/**
 * Format bytes as human-readable size (like ls -h)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0B';
  
  const units = ['B', 'K', 'M', 'G', 'T'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  if (i === 0) {
    return bytes + 'B';
  }
  
  const size = bytes / Math.pow(k, i);
  
  // Format with appropriate decimal places
  if (size >= 100) {
    return Math.round(size) + units[i];
  } else if (size >= 10) {
    return size.toFixed(1).replace(/\.0$/, '') + units[i];
  } else {
    return size.toFixed(1) + units[i];
  }
}

/**
 * Get PNG color type name from image data
 */
export function getPngColorType(imageBytes: Uint8Array): string {
  try {
    // Check PNG signature
    const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    for (let i = 0; i < 8; i++) {
      if (imageBytes[i] !== pngSignature[i]) {
        throw new Error('Not a valid PNG file');
      }
    }
    
    // Read IHDR chunk length
    const ihdrLength = (imageBytes[8] << 24) | (imageBytes[9] << 16) | (imageBytes[10] << 8) | imageBytes[11];
    if (ihdrLength !== 13) {
      throw new Error('Invalid IHDR chunk length');
    }
    
    // Verify IHDR chunk type
    const chunkType = String.fromCharCode(imageBytes[12], imageBytes[13], imageBytes[14], imageBytes[15]);
    if (chunkType !== 'IHDR') {
      throw new Error('IHDR chunk not found at expected position');
    }
    
    // Read color type from byte 25 (8 + 4 + 4 + 4 + 4 + 1)
    const colorType = imageBytes[25];
    
    // PNG color types:
    switch (colorType) {
      case 0:
        return 'Grayscale';
      case 2:
        return 'RGB';
      case 3:
        return 'Palette';
      case 4:
        return 'Grayscale+Alpha';
      case 6:
        return 'RGBA';
      default:
        throw new Error(`Unknown PNG color type: ${colorType}`);
    }
  } catch (error) {
    logger.debug('Failed to analyze PNG color type:', error);
    // Default fallback - assume RGBA
    return 'RGBA';
  }
}

/**
 * Get MIME type for export format
 */
export function getImageMimeType(format: string): string | null {
  const mimeTypeMap: Record<string, string> = {
    'PNG': 'image/png',
    'DATA': 'image/png' // Raw image data is always PNG from Figma
  };

  return mimeTypeMap[format] || null;
}

/**
 * Generate filename for image export
 */
export function generateImageFilename(imageHash: string, format: string, suffix?: string): string {
  const hashPrefix = imageHash.substring(0, 8); // First 8 characters of hash
  const fileExtension = format === 'DATA' ? 'png' : format.toLowerCase();
  const suffixPart = suffix ? `_${suffix}` : '';
  
  return `image_${hashPrefix}${suffixPart}.${fileExtension}`;
}

/**
 * Format MCP image content response
 */
export function formatMcpImageContent(base64Data: string, format: string): any {
  const mimeType = getImageMimeType(format);
  if (!mimeType) {
    throw new Error(`Unsupported format for MCP image content: ${format}`);
  }
  
  return {
    content: [{
      type: 'image',
      data: base64Data,
      mimeType: mimeType
    }],
    isError: false
  };
}