import asyncio
import json
import yaml
import signal
import os
from typing import Optional

from fastmcp import Client
from fastmcp.client.transports import StdioTransport

from prompt_toolkit import PromptSession

async def _print_tool_list(tool_map: dict):
    """Prints the list of available tools in a pretty format."""
    print("\nAvailable tools:")
    for tool_name in sorted(tool_map.keys()):
        tool_info = tool_map[tool_name]
        print(f"  - {tool_info.name}: {tool_info.description}")

def find_server_pid(command_name: str, script_path: str) -> Optional[int]:
    """Find the PID of our server process."""
    try:
        import psutil
        current_pid = os.getpid()
        for proc in psutil.process_iter(['pid', 'ppid', 'name', 'cmdline']):
            try:
                if (proc.info['ppid'] == current_pid and 
                    proc.info['cmdline'] and len(proc.info['cmdline']) >= 2 and
                    command_name in proc.info['cmdline'][0] and script_path in proc.info['cmdline'][1]):
                    return proc.info['pid']
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
    except ImportError:
        pass
    return None

def cleanup_server_process(server_pid: int):
    """Send SIGTERM to the server process."""
    if server_pid:
        try:
            import psutil
            proc = psutil.Process(server_pid)
            proc.send_signal(signal.SIGTERM)
        except (psutil.NoSuchProcess, ImportError, Exception):
            pass

class MCPClient:
    """Generic MCP client for connecting to any MCP server."""
    
    def __init__(self, transport=None, command=None, args=None, cwd=None, init_delay=2.0):
        if transport:
            self.transport = transport
        elif command:
            self.transport = StdioTransport(command=command, args=args or [], cwd=cwd)
        else:
            self.transport = StdioTransport()
        
        self.client = None
        self.server_pid = None
        self.command_name = command
        self.script_path = args[0] if args else None
        self.init_delay = init_delay
    
    async def __aenter__(self):
        self.client = Client(transport=self.transport)
        await self.client.__aenter__()
        
        # Track server PID for cleanup if we launched a process
        if self.command_name and self.script_path:
            self.server_pid = find_server_pid(self.command_name, self.script_path)
        
        # Wait for server initialization if we launched a process
        if self.command_name and self.init_delay > 0:
            print(f"Waiting {self.init_delay}s for server to initialize...")
            await asyncio.sleep(self.init_delay)
        
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.__aexit__(exc_type, exc_val, exc_tb)
        
        # Clean up server process
        if self.server_pid:
            cleanup_server_process(self.server_pid)
            await asyncio.sleep(0.5)
    
    async def get_tools(self):
        """Get available tools from the server."""
        tools = await self.client.list_tools()
        return {tool.name: tool for tool in tools}
    
    async def call_tool(self, tool_name: str, arguments: dict):
        """Call a tool on the server."""
        return await self.client.call_tool(tool_name, arguments=arguments)
    
    async def run_interactive_session(self):
        """Run an interactive command session."""
        tool_map = await self.get_tools()
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
                    response = await self.call_tool(tool_name, arguments)
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

async def main():
    """Main function that creates a generic MCP client."""
    # Generic transport - can be configured for any MCP server
    transport = StdioTransport()
    
    try:
        async with MCPClient(transport) as client:
            print("MCP Client connected to server via STDIO.")
            await client.run_interactive_session()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())