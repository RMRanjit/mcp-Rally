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

```
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
├── docs/                     # Documentation
│   ├── CLAUDE_DESKTOP_SETUP.md
│   ├── STARTUP_GUIDE.md
│   ├── requirements.md
│   └── tasks.md
├── examples/                 # Configuration examples
├── tests/                    # Test suite
├── scripts/                  # Startup scripts
└── package.json             # Dependencies and scripts
- 🏗️ **SOLID Architecture**: Clean, maintainable, and extensible design

## Quick Start

### Prerequisites

- Node.js 18+
- Rally API access and API key
- TypeScript knowledge for customization

### Installation

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

| Rally Format | MCP Format | Type |
|--------------|------------|------|
| `CurrentProjectName` | `current-project-name` | Built-in |
| `c_MyCustomField` | `custom-my-custom-field` | Custom |
| `_ref` | `metadata-ref` | Metadata |

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

1. Build the project:
```bash
npm run build
```

2. Configure production environment:
```bash
cp .env.production .env
# Set RALLY_API_KEY and other production values
```

3. Start the server:
```bash
npm start
```

## Development Guidelines

This project follows the Claude Code methodology:

- **Golden Rule**: No code changes without corresponding tasks in `tasks.md`
- **SOLID Principles**: Clean architecture with dependency injection
- **Quality Gates**: TypeScript strict mode, ESLint compliance, 80% test coverage
- **File Limits**: Max 500 lines per file, max 50 lines per function

See `tasks.md` for current implementation status and planned work.

## Requirements Traceability

All features map back to formal requirements:

- **req-001 to req-004**: User Story operations
- **req-005 to req-007**: Defect management
- **req-008 to req-009**: Task handling
- **req-010**: Cross-artifact queries
- **req-011 to req-013**: Security and authentication
- **req-014 to req-015**: Transport layer support
- **req-016 to req-018**: Data transformation
- **req-019 to req-020**: Performance and error handling

See `requirements.md` for detailed acceptance criteria.

## Contributing

1. Review `requirements.md` for feature requirements
2. Check `design.md` for architectural decisions
3. Follow `tasks.md` for implementation planning
4. Maintain code quality standards (ESLint, tests)
5. Update documentation for new features

## License

MIT License - see LICENSE file for details.