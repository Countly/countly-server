#!/bin/bash

# Build the project
echo "Building Countly MCP Server..."
npm run build

echo "✅ Countly MCP Server built successfully!"
echo ""
echo "🔧 Setup Instructions:"
echo "1. Set your environment variables:"
echo "   export COUNTLY_SERVER_URL='https://your-countly-server.com'"
echo "   export COUNTLY_API_KEY='your_api_key_here'"
echo ""
echo "2. Or copy and configure .env file:"
echo "   cp .env.example .env"
echo "   # Edit .env with your Countly server details"
echo ""
echo "3. Test the server:"
echo "   node build/index.js"
echo ""
echo "4. Configure your MCP client to use this server:"
echo "   See mcp-config.json for example configuration"
echo ""
echo "📚 For more information, see README.md"
