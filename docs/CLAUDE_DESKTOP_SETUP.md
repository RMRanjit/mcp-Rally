# Claude Desktop Setup for MCP Rally Server

This guide explains how to integrate the MCP Rally server with Claude Desktop, enabling you to use Rally's Project Management and Agile tools directly within Claude Desktop conversations.

## Prerequisites

1. **Claude Desktop**: Download and install Claude Desktop from [claude.ai](https://claude.ai/download)
2. **Node.js**: Version 18.0.0 or higher
3. **Rally Account**: Valid Rally Software account with API access
4. **Rally API Key**: Obtain from your Rally account settings

## Quick Setup

### 1. Environment Configuration

The MCP Rally server will automatically load environment variables from `.env.development` if it exists, or fall back to `.env`. For development, copy the development template:

```bash
cp .env.development .env.development.local
```

If you prefer to use the standard `.env` file:

```bash
cp .env.example .env
```

Edit your chosen environment file and ensure it contains your Rally API key:

```bash
# Rally API Configuration (Required)
RALLY_API_KEY=your_actual_rally_api_key_here
RALLY_BASE_URL=https://rally1.rallydev.com
RALLY_INTEGRATION_VENDOR=Claude-Desktop

# Transport Configuration (Required for Claude Desktop)
RALLY_TRANSPORT=stdio
```

### 2. Build the Project

Ensure the server is built and ready:

```bash
npm install
npm run build
```

### 3. Configure Claude Desktop

Claude Desktop reads MCP server configurations from a JSON file. The location depends on your operating system:

#### macOS
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

#### Windows
```
%APPDATA%/Claude/claude_desktop_config.json
```

#### Linux
```
~/.config/Claude/claude_desktop_config.json
```

### 4. Add MCP Rally Server Configuration

Edit (or create) the Claude Desktop configuration file and add the MCP Rally server:

**Option A: Using the Node.js startup script (Recommended)**
```json
{
  "mcpServers": {
    "mcp-rally": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-rally/scripts/start-for-claude.js"
      ]
    }
  }
}
```

**Option B: Using the shell script**
```json
{
  "mcpServers": {
    "mcp-rally": {
      "command": "/absolute/path/to/mcp-rally/scripts/start-for-claude.sh"
    }
  }
}
```

**Option C: Direct configuration with environment variables**
```json
{
  "mcpServers": {
    "mcp-rally": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-rally/dist/index.js"
      ],
      "env": {
        "RALLY_TRANSPORT": "stdio",
        "RALLY_API_KEY": "your_rally_api_key_here",
        "RALLY_BASE_URL": "https://rally1.rallydev.com",
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/mcp-rally` with the actual absolute path to your MCP Rally project directory.

### 5. Restart Claude Desktop

After updating the configuration file, restart Claude Desktop for the changes to take effect.

## Verification

### Test the Integration

1. Open Claude Desktop
2. Start a new conversation
3. The MCP Rally server should appear in the available tools/servers
4. Try using Rally-related prompts like:
   - "Show me my Rally projects"
   - "List user stories in project X"
   - "Create a new defect in Rally"

### Check Connection Status

If the integration isn't working, check:

1. **Configuration file syntax**: Ensure the JSON is valid
2. **File paths**: Verify all paths are absolute and correct
3. **Environment variables**: Ensure RALLY_API_KEY is set correctly
4. **Build status**: Verify `npm run build` completed successfully

## Configuration Options

### Environment Variables

The following environment variables can be configured:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RALLY_API_KEY` | Yes | - | Your Rally API key |
| `RALLY_BASE_URL` | No | `https://rally1.rallydev.com` | Rally server URL |
| `RALLY_TRANSPORT` | No | `stdio` | Transport type for MCP (should be `stdio` for Claude Desktop) |
| `RALLY_INTEGRATION_VENDOR` | No | `Claude-Desktop` | Integration identifier |
| `NODE_ENV` | No | `development` | Node environment |
| `LOG_LEVEL` | No | `info` | Logging level |

### Startup Script Options

The included startup scripts provide several benefits:

- **Environment loading**: Automatically loads `.env.development` first, then falls back to `.env`
- **Error handling**: Provides clear error messages for missing configuration
- **Graceful shutdown**: Handles process termination properly
- **Path resolution**: Works regardless of current working directory
- **API Key validation**: Ensures Rally API key is configured before starting

## Troubleshooting

### Common Issues

1. **"RALLY_API_KEY is required" error**
   - Solution: Ensure your `.env.development` or `.env` file exists and contains a valid `RALLY_API_KEY`
   - The startup script will look for `.env.development` first, then fall back to `.env`

2. **"Cannot find module" errors**
   - Solution: Run `npm install` and `npm run build` in the project directory

3. **Claude Desktop doesn't show Rally tools**
   - Solution: Check the configuration file syntax and restart Claude Desktop

4. **Permission denied errors**
   - Solution: Ensure startup scripts are executable (`chmod +x scripts/start-for-claude.sh`)

### Debug Mode

To enable debug logging, add to your `.env` file:

```bash
LOG_LEVEL=debug
ENABLE_DEBUG=true
ENABLE_REQUEST_LOGGING=true
```

### Testing Outside Claude Desktop

You can test the server independently:

```bash
# Test with stdio transport
npm run start:stdio

# Test with SSE transport
npm run start:sse
```

## Security Considerations

- **API Key Protection**: Never commit your `.env` file to version control
- **File Permissions**: Ensure your configuration files have appropriate permissions
- **Network Access**: The server requires internet access to communicate with Rally

## Advanced Configuration

### Custom Rally Server

If you're using a custom Rally server, update the `RALLY_BASE_URL`:

```bash
RALLY_BASE_URL=https://your-rally-server.com
```

### Performance Tuning

For high-volume usage, consider adjusting:

```bash
HTTP_TIMEOUT=60000
CONNECTION_POOL_SIZE=20
```

### CORS Configuration

If running in SSE mode (not typical for Claude Desktop):

```bash
ENABLE_CORS=true
CORS_ORIGINS=https://claude.ai
```

## Support

For issues specific to the MCP Rally server, check:

1. The project's issue tracker
2. Server logs (enable debug mode)
3. Rally API documentation
4. MCP (Model Context Protocol) documentation

For Claude Desktop issues, refer to Claude's official documentation and support channels.