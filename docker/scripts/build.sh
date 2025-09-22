#!/bin/bash
# Rally MCP Server - Docker Build Script
# Build production and development images

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="rally-mcp"
VERSION=${1:-latest}

echo -e "${GREEN}Building Rally MCP Server Docker Images${NC}"
echo "Version: $VERSION"
echo ""

# Build production image
echo -e "${YELLOW}Building production image...${NC}"
docker build -t ${IMAGE_NAME}:${VERSION} -t ${IMAGE_NAME}:latest .

# Build development image
echo -e "${YELLOW}Building development image...${NC}"
docker build -f Dockerfile.dev -t ${IMAGE_NAME}:dev-${VERSION} -t ${IMAGE_NAME}:dev .

# Display image information
echo -e "${GREEN}Build completed successfully!${NC}"
echo ""
echo "Available images:"
docker images | grep ${IMAGE_NAME}

echo ""
echo -e "${GREEN}Usage:${NC}"
echo "Production:  docker run -d -p 3000:3000 --env-file .env.production ${IMAGE_NAME}:${VERSION}"
echo "Development: docker-compose -f docker-compose.dev.yml up"