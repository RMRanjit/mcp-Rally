#!/bin/bash

# Startup script for Claude Desktop integration (Shell version)
# Loads environment variables from .env file and starts the MCP Rally server

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load environment variables from .env file
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
else
    echo "Warning: .env file not found at $PROJECT_ROOT/.env"
    echo "Please create a .env file with your Rally API key"
fi

# Check if RALLY_API_KEY is set
if [ -z "$RALLY_API_KEY" ]; then
    echo "Error: RALLY_API_KEY environment variable is required"
    echo "Please create a .env file with your Rally API key"
    exit 1
fi

# Set default transport to stdio for Claude Desktop
export RALLY_TRANSPORT=${RALLY_TRANSPORT:-stdio}

# Change to project root directory
cd "$PROJECT_ROOT"

# Start the server
exec node dist/index.js