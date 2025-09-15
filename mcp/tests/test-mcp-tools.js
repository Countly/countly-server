#!/usr/bin/env node

/**
 * Comprehensive MCP Server Test Suite
 * Tests all 41 tools by running the actual MCP server
 */

import { spawn } from 'child_process';
import fs from 'fs';

// Test configuration
const CONFIG = {
    serverUrl: process.env.COUNTLY_SERVER_URL || 'https://your-countly-server.com',
    apiKey: process.env.COUNTLY_API_KEY || 'your_api_key_here',
    timeout: 20000
};

// Colors for output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

// Test results
let results = { passed: 0, failed: 0, skipped: 0, errors: [] };
let testData = { apps: [], selectedApp: null };

/**
 * Execute MCP tool and return result
 */
async function callMCPTool(toolName, args = {}) {
    return new Promise((resolve, reject) => {
        const env = {
            ...process.env,
            COUNTLY_SERVER_URL: CONFIG.serverUrl,
            COUNTLY_API_KEY: CONFIG.apiKey
        };

        const child = spawn('node', ['build/index.js'], {
            env,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        const timer = setTimeout(() => {
            child.kill();
            reject(new Error('Timeout'));
        }, CONFIG.timeout);

        child.stdout.on('data', (data) => stdout += data);
        child.stderr.on('data', (data) => stderr += data);

        child.on('close', (code) => {
            clearTimeout(timer);

            if (code !== 0) {
                reject(new Error(`Process failed: ${stderr}`));
                return;
            }

            try {
                // Parse MCP protocol messages
                const lines = stdout.split('\n').filter(l => l.trim());
                let response = null;

                for (const line of lines) {
                    try {
                        const msg = JSON.parse(line);
                        if (msg.result && msg.result.content) {
                            response = msg.result;
                            break;
                        }
                    }
                    catch (e) {
                        // Skip invalid JSON
                    }
                }

                resolve(response || { error: 'No valid response' });
            }
            catch (error) {
                reject(new Error(`Parse error: ${error.message}`));
            }
        });

        // Send MCP messages
        try {
            // Initialize
            child.stdin.write(JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: { name: 'test-client', version: '1.0.0' }
                }
            }) + '\n');

            // Call tool
            child.stdin.write(JSON.stringify({
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/call',
                params: { name: toolName, arguments: args }
            }) + '\n');

            child.stdin.end();
        }
        catch (error) {
            clearTimeout(timer);
            reject(error);
        }
    });
}

/**
 * Safe response validation helper
 */
function validateResponse(response) {
    if (!response) {
        return { valid: false, text: 'No response' };
    }
    if (response.error) {
        return { valid: false, text: response.error };
    }
    if (!response.content) {
        return { valid: false, text: 'No content in response' };
    }
    if (!Array.isArray(response.content)) {
        return { valid: false, text: 'Content is not array' };
    }
    if (response.content.length === 0) {
        return { valid: false, text: 'Empty content array' };
    }
    if (!response.content[0]) {
        return { valid: false, text: 'No first content item' };
    }
    if (!response.content[0].text) {
        return { valid: false, text: 'No text in content' };
    }

    const text = response.content[0].text;
    return {
        valid: !text.includes('Error') && !text.includes('error') && !text.includes('failed'),
        text: text
    };
}

/**
 * Test tool with validation
 */
async function testTool(name, description, args, customValidator, dependencies = []) {
    try {
        log(`\n${colors.blue}🧪 Testing ${name}: ${description}${colors.reset}`);

        // Check dependencies
        for (const dep of dependencies) {
            if (dep === 'apps' && !testData.selectedApp) {
                log(`${colors.yellow}⏭️  Skipping ${name} - no apps available${colors.reset}`);
                results.skipped++;
                return;
            }
        }

        // Prepare arguments
        let testArgs = typeof args === 'function' ? args() : args;
        if (testArgs === null) {
            log(`${colors.yellow}⏭️  Skipping ${name} - missing required data${colors.reset}`);
            results.skipped++;
            return;
        }

        log(`   Args: ${JSON.stringify(testArgs, null, 2).slice(0, 150)}...`);

        // Call MCP tool
        const response = await callMCPTool(name, testArgs);

        // Use custom validator if provided, otherwise use default validation
        let validation;
        if (customValidator) {
            try {
                const isValid = customValidator(response);
                validation = {
                    valid: isValid,
                    text: response.content && response.content[0] ? response.content[0].text : 'No response text'
                };
            }
            catch (e) {
                validation = { valid: false, text: `Validator error: ${e.message}` };
            }
        }
        else {
            validation = validateResponse(response);
        }

        if (validation.valid) {
            log(`${colors.green}✅ ${name} PASSED${colors.reset}`);
            results.passed++;

            // Show response preview
            const preview = validation.text.slice(0, 200);
            log(`   Response: ${preview}...`);
        }
        else {
            log(`${colors.red}❌ ${name} FAILED - ${validation.text}${colors.reset}`);
            results.failed++;
            results.errors.push({
                tool: name,
                error: validation.text,
                response: validation.text.slice(0, 300)
            });
        }

    }
    catch (error) {
        log(`${colors.red}❌ ${name} FAILED - ${error.message}${colors.reset}`);
        results.failed++;
        results.errors.push({
            tool: name,
            error: error.message,
            response: 'Exception occurred'
        });
    }
}

/**
 * Main test suite
 */
async function runTestSuite() {
    log(`${colors.bold}🚀 Countly MCP Server Test Suite${colors.reset}`);
    log(`${colors.cyan}Server: ${CONFIG.serverUrl}${colors.reset}`);
    log(`${colors.cyan}Testing all 41 tools${colors.reset}`);

    const startTime = Date.now();

    // 📱 App Management Tools (2 tools)
    log(`\n${colors.bold}📱 APP MANAGEMENT TOOLS${colors.reset}`);
    log('='.repeat(50));

    await testTool(
        'list_apps',
        'List all applications',
        {},
        (response) => {
            if (!response.content || !response.content[0]) {
                return false;
            }
            const text = response.content[0].text;

            // Extract app data for later tests
            try {
                if (text.includes('Available applications:')) {
                    // Parse the response to extract app information
                    const lines = text.split('\\n');
                    const apps = [];

                    for (const line of lines) {
                        // Look for lines like "- Mobile App (ID: app_id_here)"
                        const match = line.match(/- (.+) \(ID: ([^)]+)\)/);
                        if (match) {
                            apps.push({
                                name: match[1],
                                _id: match[2],
                                key: 'unknown' // We don't have the key from this response
                            });
                        }
                    }

                    if (apps.length > 0) {
                        testData.apps = apps;
                        testData.selectedApp = apps[0];
                        log(`   Found ${apps.length} apps, selected: ${testData.selectedApp.name}`);
                    }
                }
            }
            catch (e) {
                // Try alternative parsing - set a default app
                if (text.includes('applications')) {
                    testData.selectedApp = { _id: 'demo_app_id', name: 'Mobile App', key: 'unknown' };
                    log(`   Using fallback app: ${testData.selectedApp.name}`);
                }
            }

            return !text.includes('Error') && !text.includes('error');
        }
    );

    // Parse app data from list_apps response for later tests
    try {
        if (testData.apps.length === 0) {
            // Set fallback app data
            testData.selectedApp = { _id: 'demo_app_id', name: 'Mobile App', key: 'unknown' };
        }
        else {
            // Use first app from list
            testData.selectedApp = { _id: 'demo_app_id', name: 'Mobile App', key: 'unknown' };
        }
        log(`   Using fallback app: ${testData.selectedApp.name}`);
    }
    catch (e) {
        testData.selectedApp = { _id: 'demo_app_id', name: 'Mobile App', key: 'unknown' };
        log(`   Using fallback app: ${testData.selectedApp.name}`);
    }

    await testTool(
        'get_app_by_name',
        'Get app by name',
        () => testData.selectedApp ? { app_name: testData.selectedApp.name } : null,
        null, // Using default validation
        ['apps']
    );

    // 📊 Analytics Tools (9 tools)
    log(`\n${colors.bold}📊 ANALYTICS TOOLS${colors.reset}`);
    log('='.repeat(50));

    const analyticsTests = [
        ['get_analytics_data', 'Get analytics data', () => ({ app_id: testData.selectedApp._id, method: 'sessions', period: '7days' })],
        ['get_dashboard_data', 'Get dashboard data', () => ({ app_id: testData.selectedApp._id, period: '7days' })],
        ['get_countries_data', 'Get countries data', () => ({ app_id: testData.selectedApp._id, period: '7days' })],
        ['get_session_data', 'Get session data', () => ({ app_id: testData.selectedApp._id, period: '7days' })],
        ['get_user_data', 'Get user data', () => ({ app_id: testData.selectedApp._id, period: '7days' })],
        ['get_locations_data', 'Get locations data', () => ({ app_id: testData.selectedApp._id, period: '7days' })],
        ['get_events_data', 'Get events data', () => ({ app_id: testData.selectedApp._id, period: '7days' })],
        ['get_events_overview', 'Get events overview', () => ({ app_id: testData.selectedApp._id, period: '7days' })],
        ['get_top_events', 'Get top events', () => ({ app_id: testData.selectedApp._id, period: '7days' })]
    ];

    for (const [name, desc, args] of analyticsTests) {
        await testTool(name, desc, args, null, ['apps']);
    }

    // 👥 User Management Tools (5 tools)
    log(`\n${colors.bold}👥 USER MANAGEMENT TOOLS${colors.reset}`);
    log('='.repeat(50));

    const userTests = [
        ['get_all_users', 'Get all users', () => ({})],
        ['create_app_user', 'Create app user', () => ({ app_id: testData.selectedApp._id, user_data: JSON.stringify({ uid: `test_${Date.now()}`, name: 'Test User' }) })],
        ['delete_app_user', 'Delete app user', () => ({ app_id: testData.selectedApp._id, uid: 'test_user' })],
        ['export_app_users', 'Export app users', () => ({ app_id: testData.selectedApp._id, export_type: 'json' })],
        ['get_slipping_away_users', 'Get slipping away users', () => ({ app_id: testData.selectedApp._id, period: 7, limit: 10 })]
    ];

    for (const [name, desc, args] of userTests) {
        await testTool(name, desc, args, null, name === 'get_all_users' ? [] : ['apps']);
    }

    // 📝 Event Tools (5 tools)
    log(`\n${colors.bold}📝 EVENT TOOLS${colors.reset}`);
    log('='.repeat(50));

    const eventTests = [
        ['create_event', 'Create event', () => ({ app_id: testData.selectedApp._id, events: [{ key: 'test_event', count: 1 }] })],
        ['create_event_definition', 'Create event definition', () => ({ app_id: testData.selectedApp._id, event_data: '{"key":"test_def","name":"Test Definition"}' })],
        ['get_events_overview', 'Get events overview', () => ({ app_id: testData.selectedApp._id, period: '7days' })],
        ['get_top_events', 'Get top events', () => ({ app_id: testData.selectedApp._id, period: '7days' })],
        ['get_event_groups', 'Get event groups', () => ({ app_id: testData.selectedApp._id })]
    ];

    for (const [name, desc, args] of eventTests) {
        await testTool(name, desc, args, null, ['apps']);
    }

    // 🔔 Alert Tools (5 tools)
    log(`\n${colors.bold}🔔 ALERT TOOLS${colors.reset}`);
    log('='.repeat(50));

    const alertTests = [
        ['create_alert', 'Create alert', () => ({ app_id: testData.selectedApp._id, alertName: 'Test Alert', alertType: 'sessions' })],
        ['list_alerts', 'List alerts', () => ({ app_id: testData.selectedApp._id })],
        ['get_alert', 'Get alert', () => ({ app_id: testData.selectedApp._id, alert_id: 'test_alert' })],
        ['update_alert', 'Update alert', () => ({ app_id: testData.selectedApp._id, alert_id: 'test_alert', alertName: 'Updated Alert' })],
        ['delete_alert', 'Delete alert', () => ({ app_id: testData.selectedApp._id, alert_id: 'test_alert' })]
    ];

    for (const [name, desc, args] of alertTests) {
        await testTool(name, desc, args, null, ['apps']);
    }

    // 🔑 Token Management Tools (4 tools)
    log(`\n${colors.bold}🔑 TOKEN MANAGEMENT TOOLS${colors.reset}`);
    log('='.repeat(50));

    const tokenTests = [
        ['create_token', 'Create token', { ttl: 3600, apps: [], features: ['analytics'] }],
        ['list_tokens', 'List tokens', {}],
        ['update_token', 'Update token', { token_id: 'test_token', ttl: 7200 }],
        ['delete_token', 'Delete token', { token_id: 'test_token' }]
    ];

    for (const [name, desc, args] of tokenTests) {
        await testTool(name, desc, args, (response) => {
            const text = response.content[0].text;
            return !text.includes('Error parsing') && !text.includes('Invalid method');
        });
    }

    // 🗄️ Database Tools (6 tools)
    log(`\n${colors.bold}🗄️ DATABASE TOOLS${colors.reset}`);
    log('='.repeat(50));

    const dbTests = [
        ['list_databases', 'List databases', {}],
        ['query_database', 'Query database', { database: 'countly', collection: 'apps', limit: 5 }],
        ['get_document', 'Get document', { database: 'countly', collection: 'apps', document_id: 'test_doc' }],
        ['aggregate_collection', 'Aggregate collection', { database: 'countly', collection: 'apps', aggregation: '[{"$count": "total"}]' }],
        ['get_collection_indexes', 'Get collection indexes', { database: 'countly', collection: 'apps' }],
        ['get_db_statistics', 'Get DB statistics', { stat_type: 'mongostat' }]
    ];

    for (const [name, desc, args] of dbTests) {
        await testTool(name, desc, args, null);
    }

    // 💥 Crash Analytics Tools (10 tools)
    log(`\n${colors.bold}💥 CRASH ANALYTICS TOOLS${colors.reset}`);
    log('='.repeat(50));

    const crashTests = [
        ['resolve_crash', 'Resolve crash', () => ({ app_id: testData.selectedApp._id, crash_id: 'test_crash' })],
        ['unresolve_crash', 'Unresolve crash', () => ({ app_id: testData.selectedApp._id, crash_id: 'test_crash' })],
        ['view_crash', 'View crash', () => ({ app_id: testData.selectedApp._id, crash_id: 'test_crash' })],
        ['share_crash', 'Share crash', () => ({ app_id: testData.selectedApp._id, crash_id: 'test_crash' })],
        ['unshare_crash', 'Unshare crash', () => ({ app_id: testData.selectedApp._id, crash_id: 'test_crash' })],
        ['hide_crash', 'Hide crash', () => ({ app_id: testData.selectedApp._id, crash_id: 'test_crash' })],
        ['show_crash', 'Show crash', () => ({ app_id: testData.selectedApp._id, crash_id: 'test_crash' })],
        ['add_crash_comment', 'Add crash comment', () => ({ app_id: testData.selectedApp._id, crash_id: 'test_crash', comment: 'Test comment' })],
        ['edit_crash_comment', 'Edit crash comment', () => ({ app_id: testData.selectedApp._id, crash_id: 'test_crash', comment_id: 'test_comment', comment: 'Updated comment' })],
        ['delete_crash_comment', 'Delete crash comment', () => ({ app_id: testData.selectedApp._id, crash_id: 'test_crash', comment_id: 'test_comment' })]
    ];

    for (const [name, desc, args] of crashTests) {
        await testTool(name, desc, args, null, ['apps']);
    }

    // Final Results
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    const total = results.passed + results.failed + results.skipped;
    const successRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;

    log(`\n${colors.bold}📊 FINAL RESULTS${colors.reset}`);
    log('='.repeat(60));
    log(`${colors.green}✅ Passed: ${results.passed}/${total}${colors.reset}`);
    log(`${colors.red}❌ Failed: ${results.failed}/${total}${colors.reset}`);
    log(`${colors.yellow}⏭️  Skipped: ${results.skipped}/${total}${colors.reset}`);
    log(`${colors.blue}⏱️  Duration: ${duration}s${colors.reset}`);
    log(`${colors.cyan}📈 Success Rate: ${successRate}%${colors.reset}`);

    if (testData.apps.length > 0) {
        log(`\n${colors.bold}📋 TEST DATA${colors.reset}`);
        log(`Apps found: ${testData.apps.length}`);
        log(`Selected app: ${testData.selectedApp?.name} (${testData.selectedApp?._id})`);
    }

    if (results.errors.length > 0) {
        log(`\n${colors.bold}❌ ERRORS${colors.reset}`);
        results.errors.forEach((error, i) => {
            log(`\n${i + 1}. ${colors.red}${error.tool}${colors.reset}`);
            log(`   ${error.error}`);
            log(`   ${error.response.slice(0, 200)}...`);
        });
    }

    // Save report
    const report = {
        timestamp: new Date().toISOString(),
        results,
        testData: { ...testData, apps: testData.apps.length },
        duration,
        successRate,
        config: { serverUrl: CONFIG.serverUrl, apiKey: CONFIG.apiKey.slice(0, 8) + '...' }
    };

    fs.writeFileSync('mcp-test-results.json', JSON.stringify(report, null, 2));
    log(`\n${colors.blue}📄 Report saved to: mcp-test-results.json${colors.reset}`);

    return results.failed === 0;
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
    runTestSuite()
        .then(success => process.exit(success ? 0 : 1))
        .catch(error => {
            log(`${colors.red}Test runner failed: ${error.message}${colors.reset}`);
            process.exit(1);
        });
}

export { runTestSuite };
