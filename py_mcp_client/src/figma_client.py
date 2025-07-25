import asyncio
import os
import shutil

from MCPClient import MCPClient

def get_figma_server_command():
    """Build the command to launch the Figma MCP server."""
    # Get the absolute path to the project root, which is three directories up from py_mcp_client/src/
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # Find the node executable
    node_path = shutil.which('node')
    if not node_path:
        raise EnvironmentError("Node.js executable not found. Please ensure Node.js is installed and in your PATH.")

    # The command to start the Figma MCP server
    server_script = "dist/index.js"
    
    return {
        'command': node_path,
        'args': [server_script],
        'cwd': project_root
    }

async def main():
    """Main function that starts the Figma MCP server and connects to it."""
    server_config = get_figma_server_command()
    print(f"Project root: {server_config['cwd']}")
    print(f"Running server command: {server_config['command']} {server_config['args'][0]}")

    try:
        async with MCPClient(**server_config) as client:
            print("MCP Client connected to Figma server via STDIO.")
            await client.run_interactive_session()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())