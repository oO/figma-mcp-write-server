# Python MCP Client

A Python client for connecting to Model Context Protocol (MCP) servers, with a specialized launcher for the Figma MCP Write Server.

## Components

- **`src/MCPClient.py`** - Generic MCP client that works with any MCP server
- **`src/figma_client.py`** - Figma-specific launcher that configures the generic client for the Figma MCP Write Server
- **`src/requirements.txt`** - Python package dependencies

## Installation

### Prerequisites

- **Python 3.7+** - Required for async/await support
- **Node.js** - Required to run the Figma MCP Write Server
- **Figma Desktop App** - Required for the plugin to connect

### Install Python Dependencies

```bash
pip install -r py_mcp_client/src/requirements.txt
```

Or install manually:
```bash
pip install fastmcp prompt-toolkit psutil pyyaml
```

### Build the Server

Make sure the Figma MCP Write Server is built:

```bash
# From the project root
npm install
npm run build
```

## Usage

### Quick Start (Recommended)

Use the convenience scripts:

**Unix/Linux/macOS:**
```bash
cd py_mcp_client
./run_figma_client.sh
```

**Windows:**
```cmd
cd py_mcp_client
run_figma_client.bat
```

These scripts will:
- Check for Python 3.7+ 
- Verify all required packages are installed
- Start the Figma MCP server and connect the client
- Provide helpful error messages if anything is missing

### Manual Usage

**Run the Figma client directly:**
```bash
python3 py_mcp_client/src/figma_client.py
```

**Use the generic client with any MCP server:**
```python
from src.MCPClient import MCPClient

# Connect to any MCP server via STDIO
async with MCPClient(command="your-server-command", args=["arg1", "arg2"]) as client:
    await client.run_interactive_session()
```

## Interactive Commands

Once connected, you can use these commands:

- **`help`** - List all available tools
- **`help <tool_name>`** - Show detailed help for a specific tool
- **`tool_name, {arg1: value1, arg2: value2}`** - Call a tool with JSON arguments
- **`exit`** - Quit the client

### Example Session

```
> help
Available tools:
  - figma_nodes: Create, update, move, delete, and duplicate design elements
  - figma_text: Create and style text with typography controls
  - figma_fills: Manage fill properties including colors and gradients
  ...

> figma_nodes, {"operation": "create", "nodeType": "RECTANGLE", "properties": {"width": 100, "height": 100}}
Server response:
status: success
nodeId: "123:456"
message: Rectangle created successfully

> exit
```

## Architecture

### Generic MCP Client (`src/MCPClient.py`)

The `MCPClient` class provides:
- **STDIO Transport** - Communicates with MCP servers via stdin/stdout
- **Process Management** - Automatically tracks and cleans up server processes
- **Interactive Session** - Command-line interface for tool interaction
- **Cross-platform Support** - Works on Windows, macOS, and Linux

### Figma Launcher (`src/figma_client.py`)

The Figma launcher only handles Figma-specific concerns:
- **Server Path Resolution** - Finds Node.js and builds path to `dist/index.js`
- **Project Root Detection** - Locates the project directory
- **Configuration** - Passes server startup parameters to the generic client

This separation allows the generic client to work with any MCP server while keeping Figma-specific logic isolated.

## Troubleshooting

### Python Not Found
```
Error: Python 3.7+ is required but not found.
```
Install Python 3.7+ and ensure it's in your PATH.

### Missing Dependencies
```
Error: Required Python packages are missing.
```
Run: `pip install fastmcp prompt-toolkit psutil pyyaml`

### Node.js Not Found
```
Node.js executable not found. Please ensure Node.js is installed and in your PATH.
```
Install Node.js and ensure `node` command is available.

### Server Build Missing
If you get connection errors, make sure the server is built:
```bash
npm run build
```

### Figma Plugin Not Connected
The client will work even if the Figma plugin isn't connected, but tools that require Figma access will return errors. Make sure:
1. Figma Desktop App is running
2. The Figma plugin is installed and active
3. The plugin shows "Connected" status

## Development

### Using the Generic Client

The `MCPClient` can connect to any MCP server:

```python
from src.MCPClient import MCPClient

# Connect via pre-configured transport
transport = SomeOtherTransport()
async with MCPClient(transport=transport) as client:
    tools = await client.get_tools()
    response = await client.call_tool("tool_name", {"arg": "value"})

# Or launch a server process
async with MCPClient(
    command="/path/to/server", 
    args=["--config", "file"], 
    cwd="/server/directory",
    init_delay=1.0  # Wait 1 second for server startup
) as client:
    await client.run_interactive_session()
```

### Creating Custom Launchers

Follow the pattern in `src/figma_client.py`:

```python
def get_my_server_command():
    return {
        'command': '/path/to/my/server',
        'args': ['--port', '8080'],
        'cwd': '/server/working/dir'
    }

async def main():
    config = get_my_server_command()
    async with MCPClient(**config) as client:
        await client.run_interactive_session()
```