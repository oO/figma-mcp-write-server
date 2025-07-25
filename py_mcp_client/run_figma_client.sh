#!/bin/bash

# Figma MCP Client Launcher Script
# Runs the Python client for the Figma MCP Write Server

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null && python -c "import sys; exit(0 if sys.version_info >= (3, 7) else 1)" 2>/dev/null; then
    PYTHON_CMD="python"
else
    echo "Error: Python 3.7+ is required but not found."
    echo "Please install Python 3.7 or later and ensure it's in your PATH."
    exit 1
fi

# Check if required Python packages are installed
if ! $PYTHON_CMD -c "import fastmcp, prompt_toolkit, psutil, yaml" 2>/dev/null; then
    echo "Error: Required Python packages are missing."
    echo "Please install the required packages:"
    echo "  pip install fastmcp prompt-toolkit psutil pyyaml"
    exit 1
fi

# Change to script directory and run the Figma client
cd "$SCRIPT_DIR"
echo "Starting Figma MCP Client..."
exec $PYTHON_CMD src/figma_client.py