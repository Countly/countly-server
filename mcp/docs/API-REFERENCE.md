# API Reference

This document provides a comprehensive reference for all available tools in the Countly MCP Server.

## Tool Categories

### Analytics Tools
Tools for retrieving analytics data from your Countly applications.

### App Management Tools  
Tools for managing Countly applications (create, update, delete, list).

### Database Tools
Direct database access tools for advanced queries and operations.

### User Management Tools
Tools for managing app users and user data.

### Event Management Tools
Tools for creating and managing custom events.

### System Tools
Health checks, monitoring, and server management tools.

## Common Parameters

Most tools accept these common parameters:

- `app_id` (string, optional): Application ID
- `app_name` (string, optional): Application name (alternative to app_id)
- `period` (string, optional): Time period for data retrieval (e.g., "30days", "[20240101,20240131]")

## Tool Reference

### Analytics Tools

#### `mcp_countly_get_dashboard_data`
Get aggregated dashboard data for an application.

**Parameters:**
- `app_id` (optional): Application ID
- `app_name` (optional): Application name
- `period` (optional): Time period

**Example:**
```json
{
  "app_name": "My Mobile App",
  "period": "30days"
}
```

#### `mcp_countly_get_session_data`
Get detailed session analytics data.

**Parameters:**
- `app_id` (optional): Application ID  
- `app_name` (optional): Application name
- `period` (optional): Time period

#### `mcp_countly_get_events_data`
Get events analytics data.

**Parameters:**
- `app_id` (optional): Application ID
- `app_name` (optional): Application name
- `event` (optional): Specific event key to filter by
- `period` (optional): Time period

### App Management Tools

#### `mcp_countly_list_apps`
List all available applications.

**Parameters:** None

#### `mcp_countly_create_app`
Create a new application (requires global admin privileges).

**Parameters:**
- `name` (required): Application name
- `category` (optional): App category
- `country` (optional): Country code
- `timezone` (optional): Timezone

#### `mcp_countly_update_app`
Update an existing application.

**Parameters:**
- `app_id` (optional): Application ID
- `app_name` (optional): Application name
- `name` (optional): New application name
- `category` (optional): App category
- `country` (optional): Country code
- `timezone` (optional): Timezone

### Database Tools

#### `mcp_countly_query_database`
Query documents from a database collection.

**Parameters:**
- `collection` (required): Collection name to query
- `database` (optional): Database name (default: "countly")
- `filter` (optional): MongoDB query filter as JSON string
- `limit` (optional): Maximum number of documents (default: 20)
- `skip` (optional): Number of documents to skip
- `sort` (optional): MongoDB sort criteria as JSON string
- `projection` (optional): MongoDB projection as JSON string

#### `mcp_countly_aggregate_collection`
Run MongoDB aggregation pipeline on a collection.

**Parameters:**
- `collection` (required): Collection name
- `aggregation` (required): MongoDB aggregation pipeline as JSON string
- `database` (optional): Database name (default: "countly")

### Error Handling

All tools return structured responses with error handling:

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

**Error Response:**
```json
{
  "error": true,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

## Rate Limiting

The MCP server respects Countly API rate limits. If you encounter rate limiting:

1. Reduce request frequency
2. Use more specific queries
3. Implement exponential backoff in your applications

## Authentication

All requests require valid Countly API credentials configured in the `.env` file:

```bash
COUNTLY_URL=https://your-countly-server.com
COUNTLY_API_KEY=your_api_key_here
COUNTLY_APP_KEY=your_app_key_here
```

## Best Practices

1. **Use App Names**: Prefer `app_name` over `app_id` for better readability
2. **Specific Time Periods**: Use specific date ranges instead of broad periods when possible
3. **Limit Results**: Use pagination parameters to limit large result sets
4. **Error Handling**: Always check response status and handle errors gracefully
5. **Caching**: Cache frequently accessed data to reduce API calls

## Support

For additional help:
- Check the [HTTP Transport Guide](HTTP-TRANSPORT.md)
- Review [examples](../examples/) folder
- Submit issues on GitHub
