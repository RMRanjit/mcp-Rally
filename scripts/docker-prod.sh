#!/bin/bash
# Rally MCP Server - Production Docker Helper Script

set -e

COMPOSE_FILE="docker/compose/docker-compose.production.yml"

show_usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  up      - Start production environment"
    echo "  down    - Stop production environment"
    echo "  logs    - Show container logs"
    echo "  restart - Restart production environment"
    echo "  build   - Build production image"
    echo "  status  - Show container status"
    echo "  health  - Check container health"
    echo ""
    echo "Examples:"
    echo "  $0 up          # Start production environment"
    echo "  $0 logs -f     # Follow logs in real-time"
    echo "  $0 health      # Check health status"
}

case "${1:-help}" in
    up)
        echo "🚀 Starting Rally MCP production environment..."
        docker-compose -f "$COMPOSE_FILE" up -d "${@:2}"
        echo "✅ Production environment started"
        echo "📊 Run '$0 logs' to view logs"
        echo "🏥 Run '$0 health' to check health"
        ;;
    down)
        echo "🛑 Stopping Rally MCP production environment..."
        docker-compose -f "$COMPOSE_FILE" down "${@:2}"
        echo "✅ Production environment stopped"
        ;;
    logs)
        docker-compose -f "$COMPOSE_FILE" logs "${@:2}"
        ;;
    restart)
        echo "🔄 Restarting Rally MCP production environment..."
        docker-compose -f "$COMPOSE_FILE" restart "${@:2}"
        echo "✅ Production environment restarted"
        ;;
    build)
        echo "🔨 Building Rally MCP production image..."
        docker-compose -f "$COMPOSE_FILE" build "${@:2}"
        echo "✅ Production image built"
        ;;
    status)
        docker-compose -f "$COMPOSE_FILE" ps
        ;;
    health)
        echo "🏥 Checking Rally MCP server health..."
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            echo "✅ Server is healthy"
        else
            echo "❌ Server is not responding"
            echo "📊 Check logs with: $0 logs"
        fi
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac