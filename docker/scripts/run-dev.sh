#!/bin/bash
# Rally MCP Server - Development Run Script
# Start development environment with hot reload

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Rally MCP Server Development Environment${NC}"

# Check if .env.development exists
if [ ! -f .env.development ]; then
    echo -e "${YELLOW}Warning: .env.development not found. Creating from template...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env.development
        echo "Please edit .env.development with your Rally API key"
    else
        echo "Error: .env.example not found. Please create .env.development manually."
        exit 1
    fi
fi

# Start development environment
echo -e "${YELLOW}Starting development containers...${NC}"
docker-compose -f docker-compose.dev.yml up --build

echo -e "${GREEN}Development environment stopped.${NC}"