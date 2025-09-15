#!/usr/bin/env node

// Test script to demonstrate Countly MCP Server capabilities
console.log('Countly MCP Server Tool Reference');
console.log('==================================\n');

console.log('📱 APP MANAGEMENT TOOLS:');
console.log('- list_apps: List all available applications');
console.log('- get_app_by_name: Get app information by name\n');

console.log('📊 ANALYTICS TOOLS:');
console.log('- get_analytics_data: Get analytics data with various methods');
console.log('- get_dashboard_data: Get aggregated dashboard data');
console.log('- get_countries_data: Get countries analytics');
console.log('- get_sessions_data: Get sessions analytics');
console.log('- get_users_data: Get user analytics');
console.log('- get_locations_data: Get location analytics');
console.log('- get_carriers_data: Get carriers analytics');
console.log('- get_devices_data: Get devices analytics');
console.log('- get_app_versions_data: Get app versions analytics\n');

console.log('👥 USER MANAGEMENT TOOLS:');
console.log('- list_users: List users');
console.log('- get_user_details: Get detailed user information');
console.log('- create_user: Create a new user');
console.log('- update_user: Update user information');
console.log('- delete_user: Delete a user\n');

console.log('📝 EVENT TOOLS:');
console.log('- create_event: Record event data');
console.log('- create_event_definition: Create event schema/definition');
console.log('- get_events_overview: Get events overview');
console.log('- get_top_events: Get top events');
console.log('- get_event_groups: Get event groups\n');

console.log('🔔 ALERT TOOLS:');
console.log('- create_alert: Create a new alert');
console.log('- list_alerts: List all alerts');
console.log('- get_alert: Get specific alert details');
console.log('- update_alert: Update an existing alert');
console.log('- delete_alert: Delete an alert\n');

console.log('🔑 TOKEN MANAGEMENT TOOLS:');
console.log('- create_token: Create a new API token');
console.log('- list_tokens: List all tokens');
console.log('- update_token: Update token permissions');
console.log('- delete_token: Delete a token\n');

console.log('🗄️ DATABASE TOOLS:');
console.log('- list_databases: List available databases');
console.log('- query_database: Execute database queries');
console.log('- get_document: Get specific document from collection');
console.log('- aggregate_collection: Perform aggregation operations');
console.log('- get_collection_indexes: Get collection indexes');
console.log('- get_db_statistics: Get MongoDB statistics (mongotop/mongostat)\n');

console.log('💥 CRASH ANALYTICS TOOLS:');
console.log('- resolve_crash: Mark a crash group as resolved');
console.log('- unresolve_crash: Mark a crash group as unresolved');
console.log('- view_crash: Mark a crash group as viewed');
console.log('- share_crash: Share crash data with external users');
console.log('- unshare_crash: Stop sharing crash data');
console.log('- hide_crash: Hide a crash group from view');
console.log('- show_crash: Show a hidden crash group');
console.log('- add_crash_comment: Add a comment to a crash group');
console.log('- edit_crash_comment: Edit an existing crash comment');
console.log('- delete_crash_comment: Delete a comment from a crash group\n');

console.log('📚 USAGE EXAMPLES:');
console.log('');
console.log('1. List all apps:');
console.log('   { "name": "list_apps", "arguments": {} }');
console.log('');
console.log('2. Get dashboard data by app name:');
console.log('   { "name": "get_dashboard_data", "arguments": { "app_name": "MyApp" } }');
console.log('');
console.log('3. Get sessions data for last 30 days:');
console.log('   { "name": "get_sessions_data", "arguments": { "app_name": "MyApp", "period": "30days" } }');
console.log('');
console.log('4. Create an event:');
console.log('   { "name": "create_event", "arguments": { "app_name": "MyApp", "events": [{"key": "button_click", "count": 1}] } }');
console.log('');
console.log('5. Query database:');
console.log('   { "name": "query_database", "arguments": { "query": {"collection": "events"}, "limit": 10 } }');
console.log('');
console.log('6. Resolve a crash:');
console.log('   { "name": "resolve_crash", "arguments": { "app_name": "MyApp", "crash_id": "crash123" } }');
console.log('');
console.log('7. Add comment to crash:');
console.log('   { "name": "add_crash_comment", "arguments": { "app_name": "MyApp", "crash_id": "crash123", "comment": "Fixed in v1.2.3" } }');
console.log('');

console.log('🚀 Total Tools Available: 41');
console.log('');
console.log('Note: Most tools support both app_id and app_name parameters.');
console.log('If no app is specified, the system will show available apps to choose from.');
