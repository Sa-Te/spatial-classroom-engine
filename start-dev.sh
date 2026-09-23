#!/bin/bash

# Script to properly start development servers with clean shutdown

echo "=== Spatial Classroom Engine Dev Server Manager ==="

# Function to kill processes on specific ports
kill_port_processes() {
    local port=$1
    echo "Checking for processes on port $port..."
    
    # Find and kill processes using the port
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pids" ]; then
        echo "Killing processes on port $port: $pids"
        kill -9 $pids 2>/dev/null || true
        sleep 1  # Give processes time to die
    fi
}

# Kill any existing processes on our ports
kill_port_processes 8081
kill_port_processes 3000

# Double-check with netstat
echo "Double-checking port usage..."
netstat -an | grep ":8081 " | grep LISTEN && echo "Port 8081 still in use!" || echo "Port 8081 is free"
netstat -an | grep ":3000 " | grep LISTEN && echo "Port 3000 still in use!" || echo "Port 3000 is free"

echo ""
echo "Starting development servers..."

# Start API server
echo "Starting Go API server on port 8081..."
cd services/app-go
API_PORT=8081 go run cmd/api/main.go &
API_PID=$!
cd ../..

# Wait for API to start
sleep 3

# Check if API server is running
if kill -0 $API_PID 2>/dev/null; then
    echo "✅ Go API server started successfully (PID: $API_PID)"
else
    echo "❌ Failed to start Go API server"
    exit 1
fi

# Start web server  
echo "Starting Next.js web server on port 3000..."
cd apps/web
PORT=3000 npm run dev &
WEB_PID=$!
cd ../..

# Wait for web to start
sleep 3

# Check if web server is running
if kill -0 $WEB_PID 2>/dev/null; then
    echo "✅ Next.js web server started successfully (PID: $WEB_PID)"
    echo ""
    echo "Servers are running:"
    echo "  Web: http://localhost:3000"
    echo "  API: http://localhost:8081"
    echo ""
    echo "To stop servers, press Ctrl+C"
else
    echo "❌ Failed to start Next.js web server"
    # Kill API if it's still running
    kill $API_PID 2>/dev/null
    exit 1
fi

# Cleanup function
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $API_PID $WEB_PID 2>/dev/null || true
    sleep 2
    echo "Servers shut down."
    exit 0
}

# Trap termination signals
trap cleanup INT TERM

# Wait for processes to complete or be interrupted
echo "Waiting for servers (Ctrl+C to stop)..."
wait $API_PID $WEB_PID