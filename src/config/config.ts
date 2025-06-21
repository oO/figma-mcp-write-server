import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir, platform } from 'os';
import * as yaml from 'js-yaml';

export interface FontDatabaseConfig {
  enabled: boolean;
  databasePath?: string;
  maxAgeHours: number;
  syncOnStartup: boolean;
  backgroundSync: boolean;
}

export interface ServerConfig {
  port: number;
  host: string;
  fontDatabase: FontDatabaseConfig;
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    enableFileLogging: boolean;
    logPath?: string;
  };
}

const DEFAULT_CONFIG: ServerConfig = {
  port: 8765,
  host: 'localhost',
  fontDatabase: {
    enabled: true,
    maxAgeHours: 24,
    syncOnStartup: true,
    backgroundSync: true
  },
  logging: {
    level: 'info',
    enableFileLogging: false
  }
};

/**
 * Get platform-specific application data directory
 */
function getAppDataDir(): string {
  const platformType = platform();
  
  switch (platformType) {
    case 'win32':
      return process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
    case 'darwin':
      return join(homedir(), 'Library', 'Application Support');
    case 'linux':
      return process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
    default:
      // Fallback for other Unix-like systems
      return join(homedir(), '.config');
  }
}

/**
 * Get platform-specific cache/data directory
 */
function getCacheDir(): string {
  const platformType = platform();
  
  switch (platformType) {
    case 'win32':
      return process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
    case 'darwin':
      return join(homedir(), 'Library', 'Caches');
    case 'linux':
      return process.env.XDG_CACHE_HOME || join(homedir(), '.cache');
    default:
      // Fallback for other Unix-like systems
      return join(homedir(), '.cache');
  }
}

/**
 * Get default paths for figma-mcp-write-server
 */
export function getDefaultPaths() {
  const appName = 'figma-mcp-write-server';
  const configDir = join(getAppDataDir(), appName);
  const cacheDir = join(getCacheDir(), appName);
  
  return {
    configDir,
    cacheDir,
    configFile: join(configDir, 'config.yaml'),
    databasePath: join(cacheDir, 'fonts.db'),
    logPath: join(cacheDir, 'server.log')
  };
}

/**
 * Load configuration from file with defaults
 */
export function loadConfig(configPath?: string): ServerConfig {
  const paths = getDefaultPaths();
  const configFile = configPath || paths.configFile;
  
  let config = { ...DEFAULT_CONFIG };
  
  // Set platform-specific defaults
  config.fontDatabase.databasePath = paths.databasePath;
  config.logging.logPath = paths.logPath;
  
  // Load from file if it exists
  if (existsSync(configFile)) {
    try {
      const fileContent = readFileSync(configFile, 'utf8');
      const fileConfig = yaml.load(fileContent) as Partial<ServerConfig>;
      
      // Deep merge configuration
      config = mergeConfig(config, fileConfig);
    } catch (error) {
      console.warn(`Failed to load config from ${configFile}:`, error);
      console.warn('Using default configuration');
    }
  } else {
    // Create default config file
    try {
      saveConfig(config, configFile);
      console.info(`Created default config file at ${configFile}`);
    } catch (error) {
      console.warn(`Failed to create config file at ${configFile}:`, error);
    }
  }
  
  // Validate and normalize paths
  config = normalizeConfig(config);
  
  return config;
}

/**
 * Save configuration to file
 */
export function saveConfig(config: ServerConfig, configPath?: string): void {
  const paths = getDefaultPaths();
  const configFile = configPath || paths.configFile;
  
  // Ensure directory exists
  const configDir = dirname(configFile);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  
  // Convert to YAML and save
  const yamlContent = yaml.dump(config, {
    indent: 2,
    lineWidth: 100,
    noRefs: true
  });
  
  writeFileSync(configFile, yamlContent, 'utf8');
}

/**
 * Deep merge two configuration objects
 */
function mergeConfig(base: ServerConfig, override: Partial<ServerConfig>): ServerConfig {
  const result: ServerConfig = { ...base };
  
  // Handle each property explicitly to avoid TypeScript issues
  if (override.port !== undefined) result.port = override.port;
  if (override.host !== undefined) result.host = override.host;
  if (override.fontDatabase !== undefined) {
    result.fontDatabase = { ...result.fontDatabase, ...override.fontDatabase };
  }
  if (override.logging !== undefined) {
    result.logging = { ...result.logging, ...override.logging };
  }
  
  return result;
}

/**
 * Normalize and validate configuration
 */
function normalizeConfig(config: ServerConfig): ServerConfig {
  const paths = getDefaultPaths();
  
  // Ensure database path is absolute
  if (config.fontDatabase.databasePath && !isAbsolutePath(config.fontDatabase.databasePath)) {
    config.fontDatabase.databasePath = join(paths.cacheDir, config.fontDatabase.databasePath);
  }
  
  // Ensure log path is absolute
  if (config.logging.logPath && !isAbsolutePath(config.logging.logPath)) {
    config.logging.logPath = join(paths.cacheDir, config.logging.logPath);
  }
  
  // Validate port range
  if (config.port < 1 || config.port > 65535) {
    console.warn(`Invalid port ${config.port}, using default 8765`);
    config.port = 8765;
  }
  
  // Validate max age hours
  if (config.fontDatabase.maxAgeHours < 1) {
    console.warn(`Invalid maxAgeHours ${config.fontDatabase.maxAgeHours}, using default 24`);
    config.fontDatabase.maxAgeHours = 24;
  }
  
  return config;
}

/**
 * Check if path is absolute (cross-platform)
 */
function isAbsolutePath(path: string): boolean {
  // Windows: starts with drive letter (C:) or UNC path (\\)
  if (platform() === 'win32') {
    return /^[a-zA-Z]:\\/.test(path) || path.startsWith('\\\\');
  }
  // Unix-like: starts with /
  return path.startsWith('/');
}

/**
 * Get configuration schema for documentation
 */
export function getConfigSchema(): any {
  return {
    type: 'object',
    properties: {
      port: {
        type: 'number',
        minimum: 1,
        maximum: 65535,
        description: 'WebSocket server port'
      },
      host: {
        type: 'string',
        description: 'WebSocket server host'
      },
      fontDatabase: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            description: 'Enable SQLite font database for fast search'
          },
          databasePath: {
            type: 'string',
            description: 'Path to SQLite database file (absolute or relative to cache dir)'
          },
          maxAgeHours: {
            type: 'number',
            minimum: 1,
            description: 'Maximum age of cached font data before sync (hours)'
          },
          syncOnStartup: {
            type: 'boolean',
            description: 'Automatically sync fonts on server startup if needed'
          },
          backgroundSync: {
            type: 'boolean',
            description: 'Enable background font synchronization'
          }
        }
      },
      logging: {
        type: 'object',
        properties: {
          level: {
            type: 'string',
            enum: ['error', 'warn', 'info', 'debug'],
            description: 'Logging level'
          },
          enableFileLogging: {
            type: 'boolean',
            description: 'Enable logging to file'
          },
          logPath: {
            type: 'string',
            description: 'Path to log file (absolute or relative to cache dir)'
          }
        }
      }
    }
  };
}