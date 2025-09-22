# Docker Configuration

This directory contains all Docker-related files for the Rally MCP Server.

## Directory Structure

```
docker/
├── README.md                           # This file
├── compose/                            # Docker Compose files
│   ├── docker-compose.production.yml   # Production deployment
│   └── docker-compose.development.yml  # Development environment
├── dockerfiles/                        # Dockerfile definitions
│   ├── Dockerfile.production           # Multi-stage production build
│   └── Dockerfile.development          # Development with hot reload
├── config/                             # Container configuration files
├── scripts/                            # Container startup and utility scripts
└── wiremock/                          # Mock server configurations for testing
```

## Quick Start

### Production Deployment
```bash
# From project root
docker-compose -f docker/compose/docker-compose.production.yml up -d

# Or from docker/compose directory
cd docker/compose
docker-compose -f docker-compose.production.yml up -d
```

### Development Environment
```bash
# From project root
docker-compose -f docker/compose/docker-compose.development.yml up -d

# Or from docker/compose directory
cd docker/compose
docker-compose -f docker-compose.development.yml up -d
```

### Direct Docker Build
```bash
# Production build
docker build -f docker/dockerfiles/Dockerfile.production -t rally-mcp:prod .

# Development build
docker build -f docker/dockerfiles/Dockerfile.development -t rally-mcp:dev .
```

## Configuration

- Environment files should be placed in the project root (`.env.production`, `.env.development`)
- Configuration templates are available in `config/` directory
- Custom startup scripts can be added to `scripts/` directory

## Features

- **Multi-stage builds** for optimized production images
- **Hot reload** support in development mode
- **Health checks** for container orchestration
- **Security hardening** with non-root user execution
- **Resource limits** and monitoring
- **Mock server integration** for testing