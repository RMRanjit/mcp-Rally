# MCP Rally Integration Server

A Model Context Protocol (MCP) server that provides AI assistants with seamless access to Rally's Web Services API for agile project management.

## Overview

This MCP server enables AI assistants to interact with Rally (formerly CA Agile Central) through natural language commands, providing:

- **User Story Management**: Create, read, update, and query user stories
- **Defect Tracking**: Manage defects and bug reports
- **Task Management**: Handle development tasks and work items
- **Cross-Artifact Queries**: Search and analyze across all Rally artifacts

## Features

- 🔐 **Secure Authentication**: Rally API key authentication with HTTPS
- 🚀 **Dual Transport**: Supports both stdio (local) and SSE (remote) protocols
- 📊 **Data Transformation**: Automatic field name translation (CamelCase ↔ kebab-case)
- ⚡ **High Performance**: Async operations with connection pooling
- 🛡️ **Type Safety**: Full TypeScript implementation with Zod validation

## Project Structure

````
mcp-rally/
├── src/                      # Source code
│   ├── core/                 # Core MCP server components
│   ├── rally/                # Rally API client
│   ├── security/             # Authentication & security
│   ├── transport/            # MCP transport layers (stdio/SSE)
│   ├── data/                 # Data transformation
│   ├── schemas/              # JSON schema validation
│   ├── utils/                # Utilities and helpers
│   └── errors/               # Error handling
├── docker/                   # Container configuration
│   ├── compose/              # Docker Compose files
│   ├── dockerfiles/          # Dockerfile definitions
│   ├── config/               # Container configs
│   ├── scripts/              # Container utilities
│   └── wiremock/             # Mock server setup
├── docs/                     # Documentation
├── examples/                 # Configuration examples
├── tests/                    # Test suite
├── scripts/                  # Helper scripts (Docker, Claude)
└── package.json             # Dependencies and scripts

## Quick Start

### Prerequisites

- Node.js 18+
- Rally API access and API key
- TypeScript knowledge for customization

### Installation

#### Option 1: Docker (Recommended)

```bash
# Clone repository
git clone <repository-url>
cd mcp-rally

# Configure environment
cp .env.example .env.production
# Edit .env.production with your Rally API key

# Quick start with helper scripts
npm run docker:prod:up     # Start production environment
npm run docker:dev:up      # Start development environment
```

#### Option 2: Local Development

```bash
# Clone and install dependencies
git clone <repository-url>
cd mcp-rally
npm install

# Copy environment template and configure
cp .env.example .env
# Edit .env with your Rally API key
```

### Configuration

Required environment variables:

```bash
RALLY_API_KEY=your_rally_api_key_here
RALLY_BASE_URL=https://rally1.rallydev.com
RALLY_INTEGRATION_VENDOR=your_organization_name
```

### Development

```bash
# Start in development mode (stdio transport)
npm run dev

# Start with SSE transport
npm run dev:sse

# Run tests
npm test

# Build for production
npm run build
```

## Docker Usage

The Rally MCP server includes comprehensive Docker support for both development and production environments with multi-stage builds, security hardening, and convenient management scripts.

### Quick Docker Commands

```bash
# Production environment
npm run docker:prod:up      # Start production containers
npm run docker:prod:down    # Stop production containers
npm run docker:prod:logs    # View production logs

# Development environment
npm run docker:dev:up       # Start development containers
npm run docker:dev:down     # Stop development containers
npm run docker:dev:logs     # View development logs

# Build specific images
npm run docker:build:prod   # Build production image
npm run docker:build:dev    # Build development image
```

### Docker Compose Environments

#### Production Deployment

```bash
# Using Docker Compose directly
docker-compose -f docker/compose/docker-compose.production.yml up -d

# Using helper script
./scripts/docker-prod.sh up

# Check status and health
./scripts/docker-prod.sh status
./scripts/docker-prod.sh health
```

**Production Features:**
- Multi-stage build for optimized image size
- Non-root user execution for security
- Resource limits and health checks
- Read-only filesystem with tmpfs mounts
- Proper logging and monitoring

#### Development Environment

```bash
# Start development environment
docker-compose -f docker/compose/docker-compose.development.yml up -d

# Using helper script with hot reload
./scripts/docker-dev.sh up

# View logs in real-time
./scripts/docker-dev.sh logs -f

# Open shell in container
./scripts/docker-dev.sh shell
```

**Development Features:**
- Hot reload with volume mounts
- Source code synchronization
- Debug port exposure (9229)
- Development dependencies included
- Optional WireMock server for testing

### Environment Configuration

Create environment files for different deployment scenarios:

```bash
# Production environment
cp .env.example .env.production
# Configure for production with actual Rally API key

# Development environment
cp .env.example .env.development
# Configure for development with appropriate settings
```

### Docker Helper Scripts

#### Production Script (`./scripts/docker-prod.sh`)

```bash
./scripts/docker-prod.sh up       # Start production environment
./scripts/docker-prod.sh down     # Stop production environment
./scripts/docker-prod.sh logs     # View logs
./scripts/docker-prod.sh restart  # Restart services
./scripts/docker-prod.sh build    # Build production image
./scripts/docker-prod.sh status   # Show container status
./scripts/docker-prod.sh health   # Check health endpoint
```

#### Development Script (`./scripts/docker-dev.sh`)

```bash
./scripts/docker-dev.sh up        # Start development environment
./scripts/docker-dev.sh down      # Stop development environment
./scripts/docker-dev.sh logs      # View logs
./scripts/docker-dev.sh restart   # Restart services
./scripts/docker-dev.sh build     # Build development image
./scripts/docker-dev.sh shell     # Open container shell
./scripts/docker-dev.sh status    # Show container status
```

### Direct Docker Commands

#### Production Build & Run

```bash
# Build production image
docker build -f docker/dockerfiles/Dockerfile.production -t rally-mcp:prod .

# Run production container
docker run -d \
  --name rally-mcp-server \
  --env-file .env.production \
  -p 3000:3000 \
  --restart unless-stopped \
  rally-mcp:prod
```

#### Development Build & Run

```bash
# Build development image
docker build -f docker/dockerfiles/Dockerfile.development -t rally-mcp:dev .

# Run development container with volume mounts
docker run -d \
  --name rally-mcp-dev \
  --env-file .env.development \
  -p 3000:3000 -p 9229:9229 \
  -v $(pwd)/src:/app/src:ro \
  -v $(pwd)/package.json:/app/package.json:ro \
  rally-mcp:dev
```

### Container Architecture

#### Production Container
- **Base Image**: `node:18-alpine` (multi-stage build)
- **User**: Non-root user `rallymcp` (UID/GID 1001)
- **Security**: Read-only filesystem, no new privileges
- **Health Check**: HTTP endpoint monitoring
- **Resource Limits**: 512MB memory, 0.5 CPU cores
- **Ports**: 3000 (MCP server)

#### Development Container
- **Base Image**: `node:18-alpine` with development tools
- **Features**: Git, Bash, Curl for debugging
- **Volume Mounts**: Source code hot reload
- **Debug**: Node.js debug port 9229 exposed
- **Ports**: 3000 (MCP server), 9229 (debug)

### Mock Testing with WireMock

Enable mock Rally server for testing without real Rally API:

```bash
# Start development environment with mock server
docker-compose -f docker/compose/docker-compose.development.yml --profile mock up -d

# Mock server available at http://localhost:8080
# Configure mock responses in docker/wiremock/ directory
```

### Container Monitoring

#### Health Checks

All containers include built-in health checks:

```bash
# Check container health
docker inspect rally-mcp-server | grep -A 5 '"Health"'

# View health check logs
docker logs rally-mcp-server | grep health
```

#### Resource Monitoring

```bash
# View resource usage
docker stats rally-mcp-server

# Check container logs
docker logs -f rally-mcp-server
```

### Troubleshooting Docker Issues

#### Common Issues

1. **Container won't start**:
   ```bash
   # Check logs for errors
   docker logs rally-mcp-server

   # Verify environment variables
   docker exec rally-mcp-server env | grep RALLY
   ```

2. **Port conflicts**:
   ```bash
   # Check what's using port 3000
   lsof -i :3000

   # Use different port
   docker run -p 3001:3000 rally-mcp:prod
   ```

3. **Permission issues**:
   ```bash
   # Check container runs as non-root
   docker exec rally-mcp-server whoami

   # Verify file permissions
   docker exec rally-mcp-server ls -la /app
   ```

#### Debug Mode

Run containers in debug mode for troubleshooting:

```bash
# Development container with shell access
docker run -it --rm \
  --env-file .env.development \
  -v $(pwd)/src:/app/src \
  rally-mcp:dev bash

# Production container debug
docker run -it --rm \
  --env-file .env.production \
  --entrypoint bash \
  rally-mcp:prod
```

## MCP Tools Available

### User Story Management

- `create_user_story`: Create new user stories with validation
- `get_user_story`: Retrieve user story by ObjectID
- `update_user_story`: Modify existing user stories
- `query_user_stories`: Search user stories by criteria

### Defect Management

- `create_defect`: Log new defects with severity and state
- `query_defects`: Search defects by state, severity, owner
- `update_defect_state`: Change defect workflow states

### Task Management

- `create_task`: Create tasks linked to stories or defects
- `update_task`: Modify task progress and assignments

### General Operations

- `query_artifacts`: Cross-artifact search and analysis

## Architecture

The server follows SOLID principles with clear separation of concerns:

```
src/
├── core/           # Main server and dependency injection
├── transport/      # stdio and SSE transport implementations
├── rally/          # Rally API client and authentication
├── data/           # Field transformation and data mapping
├── schemas/        # Zod validation schemas
├── security/       # Authentication and security
└── utils/          # Performance and utility functions
```

## Data Transformation

Rally fields are automatically transformed for AI consumption:

| Rally Format         | MCP Format               | Type     |
| -------------------- | ------------------------ | -------- |
| `CurrentProjectName` | `current-project-name`   | Built-in |
| `c_MyCustomField`    | `custom-my-custom-field` | Custom   |
| `_ref`               | `metadata-ref`           | Metadata |

## Transport Modes

### Stdio Transport (Local Development)

```bash
npm run start:stdio
```

Ideal for local AI tools and development workflows.

### SSE Transport (Remote/Production)

```bash
npm run start:sse
```

Enables cloud-based AI services and remote access.

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test:coverage

# Run specific test files
npm test -- user-story.test.ts
```

## Production Deployment

### Docker Deployment (Recommended)

```bash
# Configure environment
cp .env.example .env.production
# Edit .env.production with your Rally API key

# Deploy with Docker Compose
docker-compose -f docker/compose/docker-compose.production.yml up -d

# Or use helper script
./scripts/docker-prod.sh up
```

### Local Deployment

1. Build the project:

```bash
npm run build
```

2. Configure production environment:

```bash
cp .env.example .env.production
# Set RALLY_API_KEY and other production values
```

3. Start the server:

```bash
npm run prod:start:sse  # For SSE transport
npm run prod:start:stdio  # For stdio transport
```

## License

MIT License - see LICENSE file for details.
