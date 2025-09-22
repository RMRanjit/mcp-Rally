#!/bin/bash
# Rally MCP Server - Production Run Script
# Start production environment

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Rally MCP Server Production Environment${NC}"

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}Error: .env.production not found.${NC}"
    echo "Please create .env.production with your Rally API key and production settings."
    echo "You can copy from .env.example as a template."
    exit 1
fi

# Validate required environment variables
echo -e "${YELLOW}Validating environment configuration...${NC}"
if ! grep -q "RALLY_API_KEY=" .env.production; then
    echo -e "${RED}Error: RALLY_API_KEY not found in .env.production${NC}"
    exit 1
fi

# Start production environment
echo -e "${YELLOW}Starting production containers...${NC}"
docker-compose up -d --build

# Show container status
echo -e "${GREEN}Production environment started successfully!${NC}"
echo ""
echo "Container status:"
docker-compose ps

echo ""
echo "View logs with: docker-compose logs -f"
echo "Stop with: docker-compose down"