import asyncio
import os
import shutil
import sys
import json
import yaml

from fastmcp import Client
from fastmcp.client.transports import StdioTransport

from prompt_toolkit import PromptSession

async def _print_tool_list(tool_map: dict):
    """Prints the list of available tools in a pretty format."""
    print("\nAvailable tools:")
    for tool_name in sorted(tool_map.keys()):
        tool_info = tool_map[tool_name]
        print(f"  - {tool_info.name}: {tool_info.description}")

async def main():
    # Get the absolute path to the project root, which is two directories up
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    print(f"Project root: {project_root}")

    # Find the node executable in the system's PATH
    node_path = shutil.which('node')
    if not node_path:
        raise EnvironmentError("Node.js executable not found. Please ensure Node.js is installed and in your PATH.")

    # The command to start the server
    server_script = "dist/index.js"
    print(f"Running server command: {node_path} {server_script}")

    # Explicitly create an StdioTransport with the correct parameters
    transport = StdioTransport(command=node_path, args=[server_script], cwd=project_root)

    # The Client will use the specified transport
    try:
        async with Client(transport=transport) as client:
            print("MCP Client connected to server via STDIO.")

            # Wait for the server to initialize its handlers
            print("Waiting for server to initialize...")
            await asyncio.sleep(2)

            # --- Confirm plugin connection ---
            print("Waiting for Figma plugin to connect...")
            plugin_connected = False
            retries = 0
            max_retries = 30 # Wait up to 30 * 1 second = 30 seconds
            while not plugin_connected and retries < max_retries:
                try:
                    status_response = await client.call_tool("figma_plugin_status", arguments={"operation": "status"})
                    
                    if status_response.content and status_response.content[0].text:
                        status_data = yaml.safe_load(status_response.content[0].text)
                        if status_data and status_data.get("connected") == True:
                            plugin_connected = True
                            print("Figma plugin connected!")
                        else:
                            print(f"Plugin not yet connected. Retrying in 1 second... ({retries + 1}/{max_retries})")
                            await asyncio.sleep(1)
                    else:
                        print(f"Could not get plugin status. Retrying in 1 second... ({retries + 1}/{max_retries})")
                        await asyncio.sleep(1)
                except Exception as e:
                    print(f"Error checking plugin status: {e}. Retrying in 1 second... ({retries + 1}/{max_retries})")
                    await asyncio.sleep(1)
                retries += 1

            if not plugin_connected:
                print("Warning: Figma plugin did not connect within the expected time.")

            # Get the list of tools
            tools = await client.list_tools()
            tool_map = {tool.name: tool for tool in tools}
            tool_names = list(tool_map.keys())

            session = PromptSession()

            print("\nReady to receive commands.")
            print("Type 'help' for a list of tools.")
            print("Type 'help <tool_name>' for tool usage.")
            print("Type 'tool_name, {arg1: value1, arg2: value2}' to call a tool.")
            print("Type 'exit' to quit.")

            while True:
                try:
                    line = await session.prompt_async("> ")
                    line = line.strip()

                    if not line:
                        continue

                    if line.lower() == 'exit':
                        break

                    if line.lower() == 'help':
                        await _print_tool_list(tool_map)
                        continue

                    if line.lower().startswith('help '):
                        help_tool_name = line.split(' ', 1)[1]
                        if help_tool_name in tool_map:
                            tool_info = tool_map[help_tool_name]
                            print(f"\nTool: {tool_info.name}")
                            print(f"Description: {tool_info.description}")
                            print("Input Schema:")
                            print(yaml.dump(tool_info.inputSchema, indent=2))
                        else:
                            print(f"Tool '{help_tool_name}' not found.")
                        continue

                    try:
                        # Parse the input as JSON string
                        parts = line.split(', ', 1)
                        if len(parts) != 2:
                            print("Invalid command format. Please use 'tool_name, {arg1: value1, ...}'.")
                            continue

                        tool_name = parts[0].strip()
                        arguments_str = parts[1].strip()

                        try:
                            arguments = json.loads(arguments_str)
                        except json.JSONDecodeError as e:
                            print(f"Error parsing JSON arguments: {e}")
                            continue

                        if not isinstance(arguments, dict):
                            print("Invalid arguments format. Arguments must be a JSON dictionary.")
                            continue

                        if tool_name not in tool_map:
                            print(f"Tool '{tool_name}' not found. Type 'help' for available tools.")
                            continue

                        print(f"Calling tool '{tool_name}' with arguments: {arguments}")
                        response = await client.call_tool(tool_name, arguments=arguments)
                        print("Server response:")
                        if response.structured_content:
                            print(yaml.dump(response.structured_content, indent=2))
                        elif response.content:
                            print(response.content[0].text)
                        else:
                            print(response)

                    except Exception as e:
                        print(f"Error executing command: {e}")

                except EOFError:
                    break
                except KeyboardInterrupt:
                    break
    finally:
        await transport.terminate()

if __name__ == "__main__":
    asyncio.run(main())