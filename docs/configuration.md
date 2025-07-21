# Configuration Guide

The Figma MCP Write Server uses YAML configuration files for customizing server behavior, with support for command-line port overrides.

## Configuration File Location

The server automatically creates a configuration file on first run at these platform-specific locations:

- **Windows**: `%APPDATA%\figma-mcp-write-server\config.yaml`
- **macOS**: `~/Library/Application Support/figma-mcp-write-server/config.yaml`

## Default Configuration

See [config.example.yaml](../config.example.yaml) in the project root for a complete example configuration file.

```yaml
# Figma MCP Write Server Configuration
# WebSocket server settings
port: 8765
host: localhost

# Font database configuration
fontDatabase:
  # Enable SQLite database for fast font search (recommended)
  enabled: true
  
  # Database file path (defaults to platform-specific cache directory)
  # Windows: %LOCALAPPDATA%\figma-mcp-write-server\fonts.db
  # macOS: ~/Library/Caches/figma-mcp-write-server/fonts.db
  # databasePath: /custom/path/to/fonts.db
  
  # Maximum age of cached font data before sync (hours)
  maxAgeHours: 24
  
  # Automatically sync fonts on server startup if needed
  syncOnStartup: true
  
  # Enable background font synchronization
  backgroundSync: true

# Logging configuration
logging:
  # Log level: error, warn, info, debug
  level: info
  
  # Enable logging to file
  enableFileLogging: false
  
  # Log file path (defaults to platform-specific cache directory)
  # logPath: /custom/path/to/server.log
```

## Configuration Options

### Server Settings

- **`port`** - WebSocket server port (default: 8765)
- **`host`** - Server host address (default: localhost)

### Font Database

- **`enabled`** - Enable SQLite font database for faster font operations
- **`databasePath`** - Custom path for font database file
- **`maxAgeHours`** - Hours before font cache expires and requires sync
- **`syncOnStartup`** - Automatically sync fonts when server starts
- **`backgroundSync`** - Enable periodic background font synchronization

### Logging

- **`level`** - Log verbosity: `error`, `warn`, `info`, `debug`
- **`enableFileLogging`** - Write logs to file instead of console only
- **`logPath`** - Custom path for log file

## MCP Client Configuration

### Claude Desktop

Add to your Claude Desktop MCP settings file:

**Location:**
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Basic Configuration:**
```json
{
  "mcpServers": {
    "figma-mcp-write-server": {
      "command": "node",
      "args": ["/path/to/figma-mcp-write-server/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Custom Port Configuration:**
```json
{
  "mcpServers": {
    "figma-mcp-write-server": {
      "command": "node",
      "args": [
        "/path/to/figma-mcp-write-server/dist/index.js",
        "--port", "9000"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

Replace `/path/to/figma-mcp-write-server` with your actual installation path.

## Command Line Options

The server supports these command-line arguments:

- **`--port <number>`** - Override WebSocket server port (default: 8765)
- **`--check-port <number>`** - Check if a port is available and show what's using it
- **`--help, -h`** - Show help message

### Port Management

The server includes automatic port management:
- Detects if the default port 8765 is in use
- Identifies and kills zombie processes when possible  
- Falls back to alternative ports (8766, 8767, etc.) if needed
- Provides clear error messages for port conflicts

## Troubleshooting

### Port Conflicts
If port 8765 is in use:
1. Add `--port 9000` to the args array in your MCP configuration
2. Restart Claude Desktop
3. The server will use the specified port instead

### Font Database Issues
If font operations are slow:
1. Edit your config.yaml file to set `fontDatabase.enabled: true`
2. Restart the MCP server (restart Claude Desktop)
3. Check server logs for font sync progress

### MCP Connection Problems
If tools aren't available in Claude:
1. Verify the server path in MCP configuration is correct
2. Check Claude Desktop logs for MCP server startup errors
3. Restart Claude Desktop after configuration changes
4. Ensure Node.js 22.x is installed and accessible (required for better-sqlite3 binaries)

### Figma Plugin Connection
If the plugin can't connect:
1. Verify the MCP server is running (check Claude Desktop status)
2. Ensure Figma Desktop (not browser) is being used
3. Check firewall settings for the configured port
4. Restart both Claude Desktop and the Figma plugin

### Debug Mode
To enable debug logging, edit your config.yaml:
```yaml
logging:
  level: debug
  enableFileLogging: true
```
Then restart the MCP server and check the log file for detailed messages.

### Configuration File Issues
If the config file becomes corrupted:
1. Delete the config.yaml file from the application data directory
2. Restart the MCP server - it will create a new default configuration
3. Customize the new file as needed

## Advanced Configuration

### Custom Configuration File Location
You can specify a custom config file location by modifying the config loading code, though this requires code changes rather than command-line options.

### Network Configuration
For security, the server binds to localhost by default. To allow external connections, edit config.yaml:
```yaml
host: 0.0.0.0  # Allow connections from any IP (use with caution)
```

### Performance Tuning
For better performance with large font libraries:
```yaml
fontDatabase:
  enabled: true
  maxAgeHours: 168  # Cache for 1 week
  backgroundSync: true
```

## Next Steps

- **Usage Examples**: See [examples.md](examples.md) for practical usage scenarios
- **Development**: See [development.md](development.md) for architecture and contribution guidelines
- **Advanced Topics**: See [architecture.md](architecture.md) for technical implementation details