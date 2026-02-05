#!/bin/bash

# Kanban System - Quick Start Script
# Starts the API server and opens the dashboard

echo "🚀 Starting Kanban API Server..."
cd "$(dirname "$0")"

# Start the server in background
node server.js > /tmp/server.log 2>&1 &
SERVER_PID=$!

echo "Waiting for server to start..."
sleep 3

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Server started successfully (PID: $SERVER_PID)"
    echo ""
    echo "📋 Available endpoints:"
    echo "   Tasks:     http://localhost:3001/api/v1/tasks"
    echo "   Events:    http://localhost:3001/api/v1/events"
    echo "   Sync:      http://localhost:3001/api/v1/sync/status"
    echo ""
    echo "🌐 Opening dashboard in browser..."
    open "file://$(pwd)/agent-dashboard.html"
    echo ""
    echo "Press Ctrl+C to stop the server"
    
    # Keep script running
    wait $SERVER_PID
else
    echo "❌ Failed to start server. Check /tmp/server.log for errors."
    cat /tmp/server.log
fi
