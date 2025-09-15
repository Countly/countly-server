# HTTP Transport Support for Countly MCP Server

The Countly M**🔒 Endpoint Isolation**: The MCP server **only** handles requests to `/mcp` and `/mcp/ping` endpoints, leaving all other endpoints **completely available** for other applications running on the same server.

When running in HTTP mode, the server provides:

- **MCP Endpoint**: `http://hostname:port/mcp` 
  - **Only** endpoint that handles MCP protocol requests using Server-Sent Events (SSE)
  - All MCP tool calls and communication go through this endpoint
- **Ping/Health Check**: `http://hostname:port/mcp/ping`
  - Minimal health status endpoint for monitoring under MCP namespace
  - Returns server status and metadata

**✅ Other Applications**: All other endpoints (e.g., `/`, `/api/*`, `/app/*`, `/health`, etc.) are **completely available** for other applications on the same server.w supports **HTTP transport** for remote MCP server capabilities, in addition to the default stdio transport for local usage.

## Transport Modes

### 1. Stdio Transport (Default)
- **Use case**: Local MCP clients (Claude Desktop, etc.)
- **Protocol**: stdin/stdout communication
- **Configuration**: Standard MCP configuration files

### 2. HTTP Transport (New)
- **Use case**: Remote MCP clients, web applications, ChatGPT connectors
- **Protocol**: HTTP with Server-Sent Events (SSE)
- **Configuration**: HTTP server settings

## Quick Start

### HTTP Mode
```bash
# Basic HTTP server
npm run build
./start-server.sh --http

# Custom port and hostname
./start-server.sh --http --port 8080 --hostname 0.0.0.0

# Or directly with node
node build/index.js --http --port 3101 --hostname 0.0.0.0
```

### Stdio Mode (Default)
```bash
# Standard stdio mode
npm run build
./start-server.sh

# Or directly with node
node build/index.js
```

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--http` | Start in HTTP transport mode | stdio mode |
| `--port PORT` | HTTP server port | 3101 |
| `--hostname HOST` | HTTP server hostname | localhost |
| `--no-cors` | Disable CORS headers | CORS enabled |
| `--help` | Show help message | - |

## Environment Variables

Both transport modes require these environment variables:

```bash
export COUNTLY_API_KEY="your_api_key_here"
export COUNTLY_SERVER_URL="https://your-countly-server.com"
```

## HTTP Endpoints

**🔒 Endpoint Isolation**: The MCP server **only** handles requests to specific endpoints, leaving all other endpoints available for other applications running on the same server.

When running in HTTP mode, the server provides:

- **MCP Endpoint**: `http://hostname:port/mcp` 
  - **Only** endpoint that handles MCP protocol requests using Server-Sent Events (SSE)
  - All MCP tool calls and communication go through this endpoint
- **Health Check**: `http://hostname:port/mcp/ping`
  - Minimal health status endpoint for monitoring
  - Returns server status and metadata

**✅ Other Applications**: All other endpoints (e.g., `/api/*`, `/app/*`, `/`, etc.) are **completely available** for other applications on the same server.

### Ping/Health Check Response
```json
{
  "status": "healthy",
  "service": "countly-mcp-server", 
  "version": "1.0.0",
  "mcp": {
    "endpoint": "/mcp",
    "ping": "/mcp/ping",
    "protocol": "Server-Sent Events"
  },
  "timestamp": "2025-09-15T14:54:00.000Z"
}
```

### Non-MCP Endpoint Response
```json
{
  "error": "Not Found",
  "message": "This server only handles MCP protocol requests",
  "availableEndpoints": {
    "mcp": "/mcp",
    "ping": "/mcp/ping"
  },
  "info": "Other endpoints on this server are available for other applications"
}
```

## Configuration Examples

### Local Development (stdio)
```json
{
  "mcpServers": {
    "countly-analytics": {
      "command": "node",
      "args": ["build/index.js"],
      "env": {
        "COUNTLY_API_KEY": "your_api_key_here",
        "COUNTLY_SERVER_URL": "https://your-countly-server.com"
      }
    }
  }
}
```

### Remote HTTP Server
```json
{
  "mcpServers": {
    "countly-analytics-http": {
      "command": "node", 
      "args": ["build/index.js", "--http", "--port", "3101", "--hostname", "0.0.0.0"],
      "env": {
        "COUNTLY_API_KEY": "your_api_key_here",
        "COUNTLY_SERVER_URL": "https://your-countly-server.com"
      }
    }
  }
}
```

## Use Cases

### 1. Local MCP Client (Stdio)
Perfect for Claude Desktop and other local MCP clients:
```bash
./start-server.sh
```

### 2. Remote MCP Access (HTTP)
Enable remote access for web applications or distributed systems:
```bash
./start-server.sh --http --hostname 0.0.0.0 --port 8080
```

### 3. ChatGPT Connectors (HTTP)
For OpenAI ChatGPT custom GPT integrations:
```bash
./start-server.sh --http --port 443 --hostname your-domain.com
```

### 4. Development Server (HTTP with CORS)
For web application development:
```bash
./start-server.sh --http --port 3101
# CORS enabled by default for cross-origin requests
```

## Security Considerations

### HTTP Mode
- **Authentication**: Uses Countly API key (set via environment variable)
- **CORS**: Enabled by default, can be disabled with `--no-cors`
- **Network**: Consider firewall rules and reverse proxy for production

### Production Deployment
```bash
# Secure production setup
./start-server.sh --http --hostname 127.0.0.1 --port 3101 --no-cors
# Use nginx or Apache as reverse proxy with SSL/TLS
```

## Monitoring

### Health Checks
```bash
# Check server status
curl http://localhost:3101/mcp/ping

# Expected response
{
  "status": "healthy",
  "service": "countly-mcp-server",
  "version": "1.0.0", 
  "timestamp": "2024-09-11T10:30:00.000Z"
}
```

### Logs
The server outputs diagnostic information to stderr:
```
Starting Countly MCP Server...
Transport: http
HTTP Server: http://0.0.0.0:8080
MCP Endpoint: http://0.0.0.0:8080/mcp
Health Check: http://0.0.0.0:8080/mcp/ping
Countly Server: https://your-countly-server.com

Countly MCP server running on HTTP at http://0.0.0.0:8080/mcp
Health check available at: http://0.0.0.0:8080/mcp/ping
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Use different port
   ./start-server.sh --http --port 3101
   ```

2. **Cannot connect remotely**
   ```bash
   # Bind to all interfaces
   ./start-server.sh --http --hostname 0.0.0.0
   ```

3. **CORS issues**
   ```bash
   # CORS is enabled by default, disable if needed
   ./start-server.sh --http --no-cors
   ```

4. **Environment variables not set**
   ```bash
   export COUNTLY_API_KEY="your_api_key_here"
   export COUNTLY_SERVER_URL="https://your-countly-server.com"
   ```

## Integration Examples

### Connecting from JavaScript
```javascript
// Connect to HTTP MCP server
const mcpClient = new MCPClient();
await mcpClient.connect({
  type: 'http',
  url: 'http://localhost:3101/mcp'
});

// Use Countly tools
const result = await mcpClient.callTool('get_dashboard_data', {
  app_name: 'My Mobile App',
  period: '7days'
});
```

### ChatGPT Custom GPT
Configure your Custom GPT to use:
- **Base URL**: `https://your-domain.com/mcp`
- **Authentication**: API key via environment variable

This enables ChatGPT to directly access your Countly analytics data and perform operations through natural language commands.
