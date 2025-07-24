import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function getDefaultExportPath(): string {
  const homeDir = os.homedir();
  const platform = os.platform();

  switch (platform) {
    case 'win32':
      // Windows: Use Documents/Figma Exports
      return path.join(homeDir, 'Documents', 'Figma Exports');

    case 'darwin':
      // macOS: Use Downloads/Figma Exports
      return path.join(homeDir, 'Downloads', 'Figma Exports');

    default:
      // Linux and other platforms: Use Downloads/Figma Exports
      return path.join(homeDir, 'Downloads', 'Figma Exports');
  }
}

/**
 * Debug logging function for development and troubleshooting
 * Logs to figma-mcp-debug.log in the default export directory
 * Automatically filters out large base64 data to keep logs manageable
 */
export function debugLog(message: string, data?: any): void {
  const defaultExportPath = getDefaultExportPath();
  const logPath = path.join(defaultExportPath, 'figma-mcp-debug.log');
  const timestamp = new Date().toISOString();
  
  // Filter out base64 data to keep logs manageable
  const cleanData = data ? JSON.parse(JSON.stringify(data, (key, value) => {
    if (key === 'data' && typeof value === 'string' && value.length > 100) {
      return `[BASE64_DATA_${value.length}_CHARS]`;
    }
    // Also filter base64 data from YAML text content
    if (key === 'text' && typeof value === 'string' && value.includes('data: >-')) {
      return value.replace(/data: >-[\s\S]*?(?=\n\w|$)/g, 'data: [BASE64_DATA_FILTERED]');
    }
    return value;
  })) : data;
  
  const logEntry = `${timestamp}: ${message}${cleanData ? ' ' + JSON.stringify(cleanData, null, 2) : ''}\n`;
  try {
    // Ensure directory exists
    fs.mkdirSync(defaultExportPath, { recursive: true });
    fs.appendFileSync(logPath, logEntry);
  } catch (e) {
    // Ignore logging errors to avoid breaking JSON-RPC communication
  }
}