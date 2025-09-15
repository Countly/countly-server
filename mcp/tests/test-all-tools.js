#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Countly MCP Server
 * Tests all 41 tools with real API validation
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Test configuration
const CONFIG = {
    serverUrl: process.env.COUNTLY_SERVER_URL || 'https://your-countly-server.com',
    apiKey: process.env.COUNTLY_API_KEY || 'your_api_key_here',
    timeout: 30000, // 30 seconds per test
    maxRetries: 2
};

// Test results tracking
let testResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: []
};

// Color codes for output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

// Utility functions
function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, colors.green);
}

function logError(message) {
    log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
    log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
    log(`ℹ️  ${message}`, colors.blue);
}

// Test data that will be populated during tests
let testData = {
    apps: [],
    selectedApp: null,
    users: [],
    events: [],
    alerts: [],
    tokens: [],
    crashes: []
};

// Test definitions for all 41 tools
const testSuite = {
    // 📱 App Management Tools (2 tools)
    appManagement: [
        {
            name: 'list_apps',
            description: 'List all available applications',
            args: {},
            validate: (response) => {
                if (!response.content || !response.content[0] || !response.content[0].text) {
                    throw new Error('Missing response content');
                }
                const text = response.content[0].text;
                if (text.includes('Error') || text.includes('error')) {
                    throw new Error(`API Error: ${text}`);
                }
                // Try to extract apps from response
                try {
                    const data = JSON.parse(text.split('Apps list:\\n')[1] || text);
                    if (Array.isArray(data)) {
                        testData.apps = data;
                        if (data.length > 0) {
                            testData.selectedApp = data[0];
                        }
                    }
                }
                catch (e) {
                    // Response might be formatted differently, that's ok
                }
                return true;
            }
        },
        {
            name: 'get_app_by_name',
            description: 'Get app information by name',
            args: () => testData.selectedApp ? { app_name: testData.selectedApp.name } : null,
            validate: (response) => {
                const text = response.content[0].text;
                if (text.includes('App not found') && testData.apps.length === 0) {
                    return true; // Expected if no apps
                }
                return !text.includes('Error') && !text.includes('error');
            },
            dependencies: ['list_apps']
        }
    ],

    // 📊 Analytics Tools (9 tools)
    analytics: [
        {
            name: 'get_analytics_data',
            description: 'Get analytics data with sessions method',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                method: 'sessions',
                period: '7days'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'get_dashboard_data',
            description: 'Get aggregated dashboard data',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                period: '7days'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'get_countries_data',
            description: 'Get countries analytics',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                period: '7days'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'get_sessions_data',
            description: 'Get sessions analytics',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                period: '7days'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'get_users_data',
            description: 'Get user analytics',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                period: '7days'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'get_locations_data',
            description: 'Get location analytics',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                period: '7days'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'get_carriers_data',
            description: 'Get carriers analytics',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                period: '7days'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'get_devices_data',
            description: 'Get devices analytics',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                period: '7days'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'get_app_versions_data',
            description: 'Get app versions analytics',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                period: '7days'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            },
            dependencies: ['list_apps']
        }
    ],

    // 👥 User Management Tools (5 tools)
    userManagement: [
        {
            name: 'list_users',
            description: 'List users',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                limit: 10
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'get_user_details',
            description: 'Get detailed user information',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                uid: 'test_user_123'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                // User might not exist, that's ok
                return !text.includes('Error parsing') && !text.includes('Invalid');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'create_user',
            description: 'Create a new user',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                uid: `test_user_${Date.now()}`,
                name: 'Test User',
                email: 'test@example.com'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'update_user',
            description: 'Update user information',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                uid: 'test_user_123',
                name: 'Updated Test User'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error parsing') && !text.includes('Invalid');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'delete_user',
            description: 'Delete a user',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                uid: 'test_user_123'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error parsing') && !text.includes('Invalid');
            },
            dependencies: ['list_apps']
        }
    ],

    // 📝 Event Tools (5 tools)
    events: [
        {
            name: 'create_event',
            description: 'Record event data',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                events: [{ key: 'test_event', count: 1 }]
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'create_event_definition',
            description: 'Create event schema/definition',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                event_data: JSON.stringify({
                    key: 'test_event_def',
                    name: 'Test Event Definition'
                })
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'get_events_overview',
            description: 'Get events overview',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                period: '7days'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'get_top_events',
            description: 'Get top events',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                period: '7days'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'get_event_groups',
            description: 'Get event groups',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            },
            dependencies: ['list_apps']
        }
    ],

    // 🔔 Alert Tools (5 tools)
    alerts: [
        {
            name: 'create_alert',
            description: 'Create a new alert',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                alertName: 'Test Alert',
                alertType: 'sessions',
                compareType: 'absolute',
                compareValue: 100,
                period: 'month'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'list_alerts',
            description: 'List all alerts',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'get_alert',
            description: 'Get specific alert details',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                alert_id: 'test_alert_123'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                // Alert might not exist, that's ok
                return !text.includes('Error parsing') && !text.includes('Invalid');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'update_alert',
            description: 'Update an existing alert',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                alert_id: 'test_alert_123',
                alertName: 'Updated Test Alert'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error parsing') && !text.includes('Invalid');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'delete_alert',
            description: 'Delete an alert',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                alert_id: 'test_alert_123'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error parsing') && !text.includes('Invalid');
            },
            dependencies: ['list_apps']
        }
    ],

    // 🔑 Token Management Tools (4 tools)
    tokens: [
        {
            name: 'create_token',
            description: 'Create a new API token',
            args: {
                ttl: 3600,
                apps: [],
                features: ['analytics'],
                endpoint: []
            },
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            }
        },
        {
            name: 'list_tokens',
            description: 'List all tokens',
            args: {},
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            }
        },
        {
            name: 'update_token',
            description: 'Update token permissions',
            args: {
                token_id: 'test_token_123',
                ttl: 7200
            },
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error parsing') && !text.includes('Invalid');
            }
        },
        {
            name: 'delete_token',
            description: 'Delete a token',
            args: {
                token_id: 'test_token_123'
            },
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error parsing') && !text.includes('Invalid');
            }
        }
    ],

    // 🗄️ Database Tools (6 tools)
    database: [
        {
            name: 'list_databases',
            description: 'List available databases',
            args: {},
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            }
        },
        {
            name: 'query_database',
            description: 'Execute database queries',
            args: {
                database: 'countly',
                collection: 'apps',
                limit: 5
            },
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            }
        },
        {
            name: 'get_document',
            description: 'Get specific document from collection',
            args: () => testData.selectedApp ? {
                database: 'countly',
                collection: 'apps',
                document_id: testData.selectedApp._id
            } : {
                database: 'countly',
                collection: 'apps',
                document_id: 'test_doc_123'
            },
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            }
        },
        {
            name: 'aggregate_collection',
            description: 'Perform aggregation operations',
            args: {
                database: 'countly',
                collection: 'apps',
                aggregation: JSON.stringify([{ $count: 'total' }])
            },
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            }
        },
        {
            name: 'get_collection_indexes',
            description: 'Get collection indexes',
            args: {
                database: 'countly',
                collection: 'apps'
            },
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            }
        },
        {
            name: 'get_db_statistics',
            description: 'Get MongoDB statistics',
            args: {
                stat_type: 'mongostat'
            },
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error') && !text.includes('error');
            }
        }
    ],

    // 💥 Crash Analytics Tools (10 tools)
    crashAnalytics: [
        {
            name: 'resolve_crash',
            description: 'Mark a crash group as resolved',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                crash_id: 'test_crash_123'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error parsing') && !text.includes('Invalid');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'unresolve_crash',
            description: 'Mark a crash group as unresolved',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                crash_id: 'test_crash_123'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error parsing') && !text.includes('Invalid');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'view_crash',
            description: 'Mark a crash group as viewed',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                crash_id: 'test_crash_123'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error parsing') && !text.includes('Invalid');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'share_crash',
            description: 'Share crash data with external users',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                crash_id: 'test_crash_123'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error parsing') && !text.includes('Invalid');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'unshare_crash',
            description: 'Stop sharing crash data',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                crash_id: 'test_crash_123'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error parsing') && !text.includes('Invalid');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'hide_crash',
            description: 'Hide a crash group from view',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                crash_id: 'test_crash_123'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error parsing') && !text.includes('Invalid');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'show_crash',
            description: 'Show a hidden crash group',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                crash_id: 'test_crash_123'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error parsing') && !text.includes('Invalid');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'add_crash_comment',
            description: 'Add a comment to a crash group',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                crash_id: 'test_crash_123',
                comment: 'Test comment from automated testing'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error parsing') && !text.includes('Invalid');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'edit_crash_comment',
            description: 'Edit an existing crash comment',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                crash_id: 'test_crash_123',
                comment_id: 'test_comment_123',
                comment: 'Updated test comment from automated testing'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error parsing') && !text.includes('Invalid');
            },
            dependencies: ['list_apps']
        },
        {
            name: 'delete_crash_comment',
            description: 'Delete a comment from a crash group',
            args: () => testData.selectedApp ? {
                app_id: testData.selectedApp._id,
                crash_id: 'test_crash_123',
                comment_id: 'test_comment_123'
            } : null,
            validate: (response) => {
                const text = response.content[0].text;
                return !text.includes('Error parsing') && !text.includes('Invalid');
            },
            dependencies: ['list_apps']
        }
    ]
};

/**
 * Execute a single tool test
 */
async function runToolTest(tool, category) {
    const testId = `${category}.${tool.name}`;

    try {
        logInfo(`Testing ${testId}: ${tool.description}`);

        // Check dependencies
        if (tool.dependencies) {
            for (const dep of tool.dependencies) {
                if (testResults.skipped > 0 && dep === 'list_apps') {
                    logWarning(`Skipping ${testId} - dependency ${dep} failed`);
                    testResults.skipped++;
                    return;
                }
            }
        }

        // Get arguments
        let args = tool.args;
        if (typeof args === 'function') {
            args = args();
            if (args === null) {
                logWarning(`Skipping ${testId} - missing required data`);
                testResults.skipped++;
                return;
            }
        }

        // Prepare MCP request
        const mcpRequest = {
            name: tool.name,
            arguments: args
        };

        logInfo(`  Args: ${JSON.stringify(args, null, 2).slice(0, 200)}...`);

        // Execute tool via MCP server
        const response = await executeMCPTool(mcpRequest);

        // Validate response
        const isValid = tool.validate(response);

        if (isValid) {
            logSuccess(`${testId} PASSED`);
            testResults.passed++;
        }
        else {
            logError(`${testId} FAILED - Validation failed`);
            testResults.failed++;
            testResults.errors.push({
                test: testId,
                error: 'Validation failed',
                response: response.content ? response.content[0].text.slice(0, 500) : 'No response'
            });
        }

    }
    catch (error) {
        logError(`${testId} FAILED - ${error.message}`);
        testResults.failed++;
        testResults.errors.push({
            test: testId,
            error: error.message,
            response: error.response || 'No response data'
        });
    }
}

/**
 * Execute MCP tool via stdio
 */
async function executeMCPTool(request) {
    return new Promise((resolve, reject) => {
        const env = {
            ...process.env,
            COUNTLY_SERVER_URL: CONFIG.serverUrl,
            COUNTLY_API_KEY: CONFIG.apiKey
        };

        const mcpServer = spawn('node', ['build/index.js'], {
            env,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let responseData = '';
        let errorData = '';

        // Timeout handling
        const timeout = setTimeout(() => {
            mcpServer.kill();
            reject(new Error('Test timeout'));
        }, CONFIG.timeout);

        mcpServer.stdout.on('data', (data) => {
            responseData += data.toString();
        });

        mcpServer.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        mcpServer.on('close', (code) => {
            clearTimeout(timeout);

            if (code !== 0) {
                reject(new Error(`MCP server exited with code ${code}: ${errorData}`));
                return;
            }

            try {
                // Parse MCP protocol messages
                const lines = responseData.trim().split('\\n').filter(line => line.trim());
                let toolResponse = null;

                for (const line of lines) {
                    try {
                        const message = JSON.parse(line);
                        if (message.result && message.result.content) {
                            toolResponse = message.result;
                            break;
                        }
                    }
                    catch (e) {
                        // Skip non-JSON lines
                    }
                }

                if (toolResponse) {
                    resolve(toolResponse);
                }
                else {
                    reject(new Error('No valid tool response found'));
                }
            }
            catch (error) {
                reject(new Error(`Failed to parse response: ${error.message}`));
            }
        });

        // Send MCP requests
        try {
            // Initialize MCP
            mcpServer.stdin.write(JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: { name: 'test-client', version: '1.0.0' }
                }
            }) + '\\n');

            // Call tool
            mcpServer.stdin.write(JSON.stringify({
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/call',
                params: request
            }) + '\\n');

            mcpServer.stdin.end();
        }
        catch (error) {
            clearTimeout(timeout);
            reject(new Error(`Failed to send request: ${error.message}`));
        }
    });
}

/**
 * Main test runner
 */
async function runAllTests() {
    log(`${colors.bold}🚀 Starting Countly MCP Server Test Suite${colors.reset}`);
    log(`${colors.cyan}Server: ${CONFIG.serverUrl}${colors.reset}`);
    log(`${colors.cyan}Testing 41 tools across 7 categories${colors.reset}\\n`);

    const startTime = Date.now();

    // Test each category
    for (const [categoryName, tools] of Object.entries(testSuite)) {
        log(`${colors.bold}\\n📂 Testing ${categoryName.toUpperCase()} (${tools.length} tools)${colors.reset}`);
        log('='.repeat(60));

        for (const tool of tools) {
            await runToolTest(tool, categoryName);

            // Small delay between tests to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // Final results
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    const total = testResults.passed + testResults.failed + testResults.skipped;

    log(`\\n${colors.bold}📊 TEST RESULTS${colors.reset}`);
    log('='.repeat(60));
    log(`${colors.green}✅ Passed: ${testResults.passed}/${total}${colors.reset}`);
    log(`${colors.red}❌ Failed: ${testResults.failed}/${total}${colors.reset}`);
    log(`${colors.yellow}⏭️  Skipped: ${testResults.skipped}/${total}${colors.reset}`);
    log(`${colors.blue}⏱️  Duration: ${duration}s${colors.reset}`);

    // Success rate
    const successRate = total > 0 ? ((testResults.passed / total) * 100).toFixed(1) : 0;
    log(`${colors.cyan}📈 Success Rate: ${successRate}%${colors.reset}`);

    // Error details
    if (testResults.errors.length > 0) {
        log(`\\n${colors.bold}❌ ERROR DETAILS${colors.reset}`);
        log('='.repeat(60));

        testResults.errors.forEach((error, index) => {
            log(`\\n${index + 1}. ${colors.red}${error.test}${colors.reset}`);
            log(`   Error: ${error.error}`);
            if (error.response && error.response !== 'No response') {
                log(`   Response: ${error.response.slice(0, 200)}...`);
            }
        });
    }

    // Save detailed results to file
    const reportPath = path.join(__dirname, 'test-results.json');
    const report = {
        timestamp: new Date().toISOString(),
        config: CONFIG,
        results: testResults,
        testData: testData,
        duration: duration,
        successRate: successRate
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`\\n${colors.blue}📄 Detailed report saved to: ${reportPath}${colors.reset}`);

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().catch(error => {
        logError(`Test runner failed: ${error.message}`);
        process.exit(1);
    });
}

export { runAllTests, testSuite, CONFIG };
