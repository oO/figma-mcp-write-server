#!/bin/bash

# Complete Figma MCP Server startup script
echo "🎨 Starting Figma MCP Write Server with WebSocket Bridge"
echo "========================================================"

# Kill any existing processes
echo "🛑 Stopping any existing servers..."
pkill -f "tsx src/index-websocket" 2>/dev/null || true
pkill -f "node dist/index.js" 2>/dev/null || true

# Start WebSocket bridge in background
echo "🌉 Starting WebSocket bridge..."
cd /Users/olivier/Projects/figma-mcp-write-server
npx tsx src/index-websocket.ts &
BRIDGE_PID=$!

# Wait a moment for bridge to start
sleep 2

echo "✅ WebSocket bridge started (PID: $BRIDGE_PID)"
echo "🔌 Plugin can connect to ws://localhost:3002"
echo ""
echo "🚀 Starting MCP server..."
echo "💡 MCP clients should connect via stdio transport"
echo ""

# Start MCP server (this will run in foreground)
node dist/index.js

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BRIDGE_PID 2>/dev/null || true
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM EXIT