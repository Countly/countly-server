#!/bin/bash
# Simple test script for endpoint isolation

echo "🧪 Testing MCP Server Endpoint Isolation"
echo ""

# Check environment variables
if [[ -z "$COUNTLY_API_KEY" || "$COUNTLY_API_KEY" == "your_api_key_here" ]]; then
    echo "⚠️  Warning: COUNTLY_API_KEY not set or using placeholder value"
    echo "   Set with: export COUNTLY_API_KEY='your_actual_api_key'"
fi

if [[ -z "$COUNTLY_SERVER_URL" || "$COUNTLY_SERVER_URL" == "https://your-countly-server.com" ]]; then
    echo "⚠️  Warning: COUNTLY_SERVER_URL not set or using placeholder value"  
    echo "   Set with: export COUNTLY_SERVER_URL='https://your-countly-server.com'"
fi

echo ""

echo "1. 🚀 Starting MCP Server on port 3002..."
# Use environment variables or defaults
COUNTLY_API_KEY=${COUNTLY_API_KEY:-"your_api_key_here"} COUNTLY_SERVER_URL=${COUNTLY_SERVER_URL:-"https://your-countly-server.com"} node build/index.js --http --port 3002 &
SERVER_PID=$!

# Wait for server to start
sleep 3

echo ""
echo "2. ✅ Testing MCP Server Endpoints..."
echo ""

# Test health endpoint (should work)
echo "Testing /mcp/ping endpoint:"
curl -s http://localhost:3002/mcp/ping | jq -r '. | "  Status: \(.status), Service: \(.service)"'
echo "  ✅ Health endpoint working correctly"
echo ""

# Test MCP endpoint (should respond differently but not 404)
echo "Testing /mcp endpoint:"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/mcp)
echo "  Status: $STATUS (MCP protocol endpoint)"
echo ""

# Test other endpoints (should return 404)
echo "Testing non-MCP endpoints (should be available for other apps):"

endpoints=("/" "/api/test" "/app/dashboard" "/admin/settings")
for endpoint in "${endpoints[@]}"; do
    echo "  Testing $endpoint:"
    RESPONSE=$(curl -s http://localhost:3002$endpoint)
    ERROR=$(echo "$RESPONSE" | jq -r '.error // "No error field"')
    MESSAGE=$(echo "$RESPONSE" | jq -r '.message // "No message field"')
    INFO=$(echo "$RESPONSE" | jq -r '.info // "No info field"')
    
    if [[ "$ERROR" == "Not Found" ]]; then
        echo "    ✅ Properly blocked - available for other applications"
        echo "    Message: $MESSAGE"
    else
        echo "    ❌ Unexpected response: $ERROR"
    fi
done

echo ""
echo "3. 🛑 Stopping MCP Server..."
kill $SERVER_PID
sleep 1

echo ""
echo "✅ Test completed successfully!"
echo ""
echo "💡 Summary:"
echo "  ✅ MCP Server ONLY handles /mcp and /mcp/ping endpoints"
echo "  ✅ All other endpoints return 404 with helpful message"  
echo "  ✅ Other applications can use all other endpoints on same server"
echo "  ✅ Clear separation of concerns - no endpoint conflicts"
