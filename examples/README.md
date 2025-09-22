# Claude Desktop Configuration Examples

This directory contains example configuration files for integrating the MCP Rally server with Claude Desktop.

## Configuration Files

### `claude-desktop-config.json` (Recommended)
Uses the Node.js startup script which automatically loads environment variables from the `.env` file.

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

**Advantages:**
- Automatically loads `.env` file
- Better error handling and logging
- Cross-platform compatibility
- Graceful shutdown handling

### `claude-desktop-config-shell.json`
Uses the shell script for environments where shell scripts are preferred.

```json
{
  "mcpServers": {
    "mcp-rally": {
      "command": "/absolute/path/to/mcp-rally/scripts/start-for-claude.sh"
    }
  }
}
```

**Advantages:**
- Simple shell-based approach
- Fast startup
- Unix/Linux friendly

### `claude-desktop-config-direct.json`
Direct configuration with environment variables specified in the config file.

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

**Advantages:**
- No dependency on external scripts
- All configuration in one place
- Good for CI/CD or containerized environments

**Disadvantages:**
- API key exposed in config file
- Less flexible for different environments

## Setup Instructions

1. Choose one of the configuration approaches above
2. Copy the chosen configuration file content
3. Update the file paths to match your actual installation directory
4. For direct configuration, replace `your_rally_api_key_here` with your actual Rally API key
5. Save the configuration to Claude Desktop's config location:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%/Claude/claude_desktop_config.json`
   - **Linux:** `~/.config/Claude/claude_desktop_config.json`
6. Restart Claude Desktop

## Security Note

When using the direct configuration approach, be aware that your Rally API key will be stored in the Claude Desktop configuration file. Ensure this file has appropriate permissions and is not accessible to unauthorized users.

For better security, use the startup script approach which loads credentials from a separate `.env` file that can be properly secured and excluded from version control.

## Testing Your Configuration

After setting up the configuration:

1. Restart Claude Desktop
2. Start a new conversation
3. Look for the MCP Rally server in the available tools/servers
4. Test with prompts like:
   - "What Rally projects do I have access to?"
   - "Show me the user stories in [project name]"
   - "Help me create a new task in Rally"

If the server doesn't appear or doesn't work:
1. Check Claude Desktop's logs for error messages
2. Verify your file paths are correct and absolute
3. Ensure the MCP Rally server builds successfully (`npm run build`)
4. Test the server independently using the startup scripts