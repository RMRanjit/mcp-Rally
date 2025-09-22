#!/bin/bash
# Rally MCP Server - Development Docker Helper Script

set -e

COMPOSE_FILE="docker/compose/docker-compose.development.yml"

show_usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  up      - Start development environment"
    echo "  down    - Stop development environment"
    echo "  logs    - Show container logs"
    echo "  restart - Restart development environment"
    echo "  build   - Build development image"
    echo "  shell   - Open shell in development container"
    echo "  status  - Show container status"
    echo ""
    echo "Examples:"
    echo "  $0 up          # Start development environment"
    echo "  $0 logs -f     # Follow logs in real-time"
    echo "  $0 shell       # Open bash shell in container"
}

case "${1:-help}" in
    up)
        echo "🚀 Starting Rally MCP development environment..."
        docker-compose -f "$COMPOSE_FILE" up -d "${@:2}"
        echo "✅ Development environment started"
        echo "📊 Run '$0 logs' to view logs"
        ;;
    down)
        echo "🛑 Stopping Rally MCP development environment..."
        docker-compose -f "$COMPOSE_FILE" down "${@:2}"
        echo "✅ Development environment stopped"
        ;;
    logs)
        docker-compose -f "$COMPOSE_FILE" logs "${@:2}"
        ;;
    restart)
        echo "🔄 Restarting Rally MCP development environment..."
        docker-compose -f "$COMPOSE_FILE" restart "${@:2}"
        echo "✅ Development environment restarted"
        ;;
    build)
        echo "🔨 Building Rally MCP development image..."
        docker-compose -f "$COMPOSE_FILE" build "${@:2}"
        echo "✅ Development image built"
        ;;
    shell)
        echo "🐚 Opening shell in Rally MCP development container..."
        docker-compose -f "$COMPOSE_FILE" exec rally-mcp-dev bash
        ;;
    status)
        docker-compose -f "$COMPOSE_FILE" ps
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