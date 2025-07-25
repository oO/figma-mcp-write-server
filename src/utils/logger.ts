import * as fs from "fs";
import * as path from "path";
import { homedir, platform } from "os";

export type LogType = "message" | "warning" | "error" | "debug";

// Default log path that doesn't depend on config
function getDefaultLogPath(): string {
  const platformType = platform();
  const appName = "figma-mcp-write-server";

  let cacheDir: string;
  switch (platformType) {
    case "win32":
      cacheDir =
        process.env.LOCALAPPDATA || path.join(homedir(), "AppData", "Local");
      break;
    case "darwin":
      cacheDir = path.join(homedir(), "Library", "Caches");
      break;
    default:
      cacheDir = process.env.XDG_CACHE_HOME || path.join(homedir(), ".cache");
  }

  return path.join(cacheDir, appName, "server.log");
}

/**
 * Internal logging function - used by logger interface
 * @param message - The message to log
 * @param type - Log type
 * @param data - Optional data to include in the log
 */
function writeLog(message: string, type: LogType, data?: any): void {
  const logPath = getDefaultLogPath();
  const timestamp = new Date().toISOString();

  // Get emoji for log type
  const getLogEmoji = (logType: LogType): string => {
    switch (logType) {
      case "message":
        return "✅";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      case "debug":
        return "🐛";
      default:
        return "💬";
    }
  };

  // Filter out base64 data to keep logs manageable
  const cleanData = data
    ? JSON.parse(
        JSON.stringify(data, (key, value) => {
          if (
            key === "data" &&
            typeof value === "string" &&
            value.length > 100
          ) {
            return `[BASE64_DATA_${value.length}_CHARS]`;
          }
          // Also filter base64 data from YAML text content
          if (
            key === "text" &&
            typeof value === "string" &&
            value.includes("data: >-")
          ) {
            return value.replace(
              /data: >-[\s\S]*?(?=\n\w|$)/g,
              "data: [BASE64_DATA_FILTERED]",
            );
          }
          return value;
        }),
      )
    : data;

  const logEntry = `${getLogEmoji(type)} ${timestamp}: ${message}${cleanData ? " " + JSON.stringify(cleanData, null, 2) : ""}\n`;
  try {
    // Ensure directory exists
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, logEntry);
  } catch (e) {
    // Ignore logging errors to avoid breaking JSON-RPC communication
  }
}

/**
 * Server logger with console-style interface
 */
class ServerLogger {
  log(message: string, data?: any): void {
    writeLog(message, "message", data);
  }

  info(message: string, data?: any): void {
    writeLog(message, "message", data);
  }

  warn(message: string, data?: any): void {
    writeLog(message, "warning", data);
  }

  error(message: string, data?: any): void {
    writeLog(message, "error", data);
  }

  debug(message: string, data?: any): void {
    writeLog(message, "debug", data);
  }
}

// Export singleton logger instance
export const logger = new ServerLogger();
