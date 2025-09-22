# Rally MCP Server - Docker Deployment Guide

This guide covers deploying the Rally MCP Server using Docker containers for both development and production environments.

## Overview

The Rally MCP Server provides Docker support with:
- **Multi-stage builds** for optimized production images
- **Development containers** with hot reload
- **Docker Compose** for orchestration
- **Health checks** and monitoring
- **Security best practices**

## Quick Start

### Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd mcp-rally

# Create development environment file
cp .env.example .env.development
# Edit .env.development with your Rally API key

# Start development environment
./docker/scripts/run-dev.sh
```

The development server will be available at `http://localhost:3000` with hot reload enabled.

### Production Environment

```bash
# Create production environment file
cp .env.docker .env.production
# Edit .env.production with your Rally API key

# Start production environment
./docker/scripts/run-prod.sh
```

## Docker Images

### Production Image (`Dockerfile`)
- **Base**: Node.js 18 Alpine (minimal size)
- **Multi-stage build** for optimization
- **Non-root user** for security
- **Health checks** included
- **Size**: ~150MB

### Development Image (`Dockerfile.dev`)
- **Hot reload** with volume mounts
- **Debug port** exposed (9229)
- **Development tools** included
- **Size**: ~300MB

## Environment Configuration

### Required Variables

```bash
RALLY_API_KEY=your_rally_api_key_here
RALLY_BASE_URL=https://rally1.rallydev.com
```

### Docker-Specific Variables

```bash
# Transport configuration
RALLY_TRANSPORT=sse
RALLY_SERVER_PORT=3000
RALLY_SERVER_HOST=0.0.0.0

# Application environment
NODE_ENV=production

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### Environment Files

- `.env.development` - Development environment
- `.env.production` - Production environment
- `.env.docker` - Docker template file

## Build Commands

### Manual Build

```bash
# Build production image
docker build -t rally-mcp:latest .

# Build development image
docker build -f Dockerfile.dev -t rally-mcp:dev .
```

### Using Build Script

```bash
# Build all images with version tag
./docker/scripts/build.sh v1.0.0

# Build with latest tag
./docker/scripts/build.sh
```

## Docker Compose

### Development (`docker-compose.dev.yml`)

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Start with rebuild
docker-compose -f docker-compose.dev.yml up --build

# Start in background
docker-compose -f docker-compose.dev.yml up -d
```

Features:
- Hot reload with volume mounts
- Debug port exposure
- Development logging
- Optional Rally mock server

### Production (`docker-compose.yml`)

```bash
# Start production environment
docker-compose up -d

# View logs
docker-compose logs -f

# Stop environment
docker-compose down
```

Features:
- Resource limits
- Health checks
- Security hardening
- Read-only filesystem

## Running Individual Containers

### Production Container

```bash
docker run -d \
  --name rally-mcp \
  -p 3000:3000 \
  --env-file .env.production \
  rally-mcp:latest
```

### Development Container

```bash
docker run -d \
  --name rally-mcp-dev \
  -p 3000:3000 \
  -p 9229:9229 \
  -v $(pwd)/src:/app/src:ro \
  --env-file .env.development \
  rally-mcp:dev
```

## Health Monitoring

### Health Check Endpoint

The container exposes a health check endpoint:

```bash
curl http://localhost:3000/health
```

### Docker Health Status

```bash
# Check container health
docker ps

# View health check logs
docker inspect rally-mcp | grep -A 10 "Health"
```

## Container Management

### Viewing Logs

```bash
# Docker Compose
docker-compose logs -f rally-mcp

# Individual container
docker logs -f rally-mcp
```

### Accessing Container

```bash
# Docker Compose
docker-compose exec rally-mcp sh

# Individual container
docker exec -it rally-mcp sh
```

### Resource Monitoring

```bash
# Container stats
docker stats rally-mcp

# Resource usage
docker system df
```

## Networking

### Ports

- **3000**: SSE transport (HTTP/WebSocket)
- **9229**: Node.js debug port (development only)

### Networks

- **rally-network**: Production network
- **rally-dev-network**: Development network

## Security

### Production Security Features

- **Non-root user** (rallymcp:1001)
- **Read-only filesystem**
- **Security options**: `no-new-privileges:true`
- **Tmpfs mounts** for temporary files
- **Resource limits**

### Secrets Management

Use Docker secrets or environment variables:

```bash
# Using Docker secrets
echo "your_api_key" | docker secret create rally_api_key -

# Mount secret in container
docker service create \
  --secret rally_api_key \
  --env RALLY_API_KEY_FILE=/run/secrets/rally_api_key \
  rally-mcp:latest
```

## Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   # Check logs
   docker logs rally-mcp

   # Verify environment file
   cat .env.production
   ```

2. **Rally API connection failed**
   ```bash
   # Test from container
   docker exec rally-mcp curl -s https://rally1.rallydev.com

   # Check API key
   docker exec rally-mcp printenv | grep RALLY
   ```

3. **Port already in use**
   ```bash
   # Find process using port
   lsof -i :3000

   # Use different port
   docker run -p 3001:3000 rally-mcp:latest
   ```

### Performance Tuning

```bash
# Increase memory limit
docker run --memory=1g rally-mcp:latest

# Adjust connection pool
docker run -e CONNECTION_POOL_SIZE=20 rally-mcp:latest
```

## Production Deployment

### Container Orchestration

#### Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml rally-mcp
```

#### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rally-mcp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rally-mcp
  template:
    metadata:
      labels:
        app: rally-mcp
    spec:
      containers:
      - name: rally-mcp
        image: rally-mcp:latest
        ports:
        - containerPort: 3000
        env:
        - name: RALLY_API_KEY
          valueFrom:
            secretKeyRef:
              name: rally-secrets
              key: api-key
```

### Load Balancing

```bash
# Using nginx proxy
docker run -d \
  --name nginx-proxy \
  -p 80:80 \
  -v /var/run/docker.sock:/tmp/docker.sock:ro \
  nginx:alpine
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Build and Push Docker Image

on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Build Docker image
      run: |
        docker build -t rally-mcp:${{ github.ref_name }} .

    - name: Push to registry
      run: |
        echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
        docker push rally-mcp:${{ github.ref_name }}
```

## Best Practices

1. **Use specific image tags** in production
2. **Implement proper logging** with structured JSON
3. **Set resource limits** to prevent resource exhaustion
4. **Use secrets** for sensitive data
5. **Regular security updates** of base images
6. **Monitor container health** and metrics
7. **Backup configurations** and environment files

## Support

For Docker-specific issues:
1. Check container logs: `docker logs rally-mcp`
2. Verify environment configuration
3. Test Rally API connectivity
4. Review Docker compose configuration
5. Check resource usage and limits