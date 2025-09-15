#!/bin/bash

# Countly MCP Server HTTP Startup Script

# Default values
PORT=3101
HOSTNAME="localhost"
CORS_ENABLED=true
TRANSPORT_TYPE="stdio"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --http)
      TRANSPORT_TYPE="http"
      shift
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    --hostname)
      HOSTNAME="$2"
      shift 2
      ;;
    --no-cors)
      CORS_ENABLED=false
      shift
      ;;
    --help)
      echo "Countly MCP Server Startup Script"
      echo ""
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --http              Start in HTTP transport mode (default: stdio)"
      echo "  --port PORT         HTTP server port (default: 3101)"
      echo "  --hostname HOST     HTTP server hostname (default: localhost)"
      echo "  --no-cors           Disable CORS headers"
      echo "  --help              Show this help message"
      echo ""
      echo "Environment Variables:"
      echo "  COUNTLY_API_KEY     Your Countly API key (required)"
      echo "  COUNTLY_SERVER_URL  Your Countly server URL (required)"
      echo ""
      echo "Examples:"
      echo "  # Start in stdio mode (default)"
      echo "  $0"
      echo ""
      echo "  # Start HTTP server on port 3101"
      echo "  $0 --http --port 3101"
      echo ""
      echo "  # Start HTTP server accessible from all interfaces"
      echo "  $0 --http --hostname 0.0.0.0 --port 8080"
      echo ""
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Check required environment variables
if [ -z "$COUNTLY_API_KEY" ]; then
  echo "Error: COUNTLY_API_KEY environment variable is required"
  echo "Example: export COUNTLY_API_KEY=your_api_key_here"
  exit 1
fi

if [ -z "$COUNTLY_SERVER_URL" ]; then
  echo "Error: COUNTLY_SERVER_URL environment variable is required"
  echo "Example: export COUNTLY_SERVER_URL=https://your-countly-server.com"
  exit 1
fi

# Build the project if needed
if [ ! -d "build" ] || [ ! -f "build/index.js" ]; then
  echo "Building project..."
  npm run build
  if [ $? -ne 0 ]; then
    echo "Error: Build failed"
    exit 1
  fi
fi

# Prepare arguments
ARGS=()
if [ "$TRANSPORT_TYPE" = "http" ]; then
  ARGS+=("--http" "--port" "$PORT" "--hostname" "$HOSTNAME")
  if [ "$CORS_ENABLED" = false ]; then
    ARGS+=("--no-cors")
  fi
fi

# Show startup information
echo "Starting Countly MCP Server..."
echo "Transport: $TRANSPORT_TYPE"
if [ "$TRANSPORT_TYPE" = "http" ]; then
  echo "HTTP Server: http://$HOSTNAME:$PORT"
  echo "MCP Endpoint: http://$HOSTNAME:$PORT/mcp"
  echo "Ping Check: http://$HOSTNAME:$PORT/mcp/ping"
fi
echo "Countly Server: $COUNTLY_SERVER_URL"
echo ""

# Start the server
exec node build/index.js "${ARGS[@]}"
