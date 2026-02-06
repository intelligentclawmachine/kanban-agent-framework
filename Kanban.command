#!/bin/bash
# Kanban Agent UI Launcher
# Double-click this file to start the Kanban server

cd "$(dirname "$0")"

# Kill any existing server on port 3001
lsof -ti:3001 | xargs kill -9 2>/dev/null

echo "🚀 Starting Kanban Agent UI..."
echo "   Server: http://localhost:3001"
echo ""

# Start the server
node server.js

# Keep terminal open if there's an error
read -p "Press Enter to close..."
