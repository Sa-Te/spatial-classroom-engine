#!/bin/bash

# Properly handle Ctrl+C to kill all background processes
trap 'kill $(jobs -p) 2>/dev/null; exit' SIGINT SIGTERM

echo "Starting dev servers..."
echo "Web server: http://localhost:3000"
echo "API server: http://localhost:8081"

# Start web server in background
cd apps/web && npm run dev &
WEB_PID=$!

# Start API server in background
cd ../services/app-go && go run cmd/api/main.go &
API_PID=$!

echo "Servers started. Press Ctrl+C to stop all servers."

# Wait for all background processes
wait