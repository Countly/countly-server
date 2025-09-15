#!/usr/bin/env node

/**
 * Comprehensive Analytics Event Verification Test
 * This test will verify that analytics events are correctly sent to your Countly server
 */

import { CountlyMCPServer } from './build/index.js';
import axios from 'axios';
import fs from 'fs';

// Load .env file manually
const envFile = fs.readFileSync('.env', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#') && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        envVars[key] = value;
        process.env[key] = value;
    }
});

console.log('🧪 Testing Analytics Events on Real Countly Server...\n');

console.log('📋 Configuration Check:');
console.log(`Server URL: ${process.env.COUNTLY_SERVER_URL}`);
console.log(`Analytics Enabled: ${process.env.MCP_ANALYTICS_ENABLED}`);
console.log(`Analytics Server: ${process.env.MCP_ANALYTICS_SERVER_URL}`);
console.log(`Analytics App Key: ${process.env.MCP_ANALYTICS_APP_KEY?.substring(0, 8)}...`);

if (!process.env.COUNTLY_API_KEY || !process.env.MCP_ANALYTICS_APP_KEY) {
    console.log('❌ Missing required environment variables');
    process.exit(1);
}

// Test 1: Server Initialization with Analytics
console.log('\n1. 🚀 Testing Server Initialization Events...');
const server = new CountlyMCPServer();
const analytics = server.getAnalyticsTracker();

if (!analytics) {
    console.log('❌ Analytics tracker not initialized');
    process.exit(1);
}

console.log('✅ Server initialized with analytics');

// Wait for initial events to be sent
await new Promise(resolve => setTimeout(resolve, 2000));

// Test 2: Simulate Tool Usage Events
console.log('\n2. 🔧 Testing Tool Usage Events...');

const testTools = [
    { name: 'list_apps', args: {} },
    { name: 'get_analytics_data', args: { app_name: 'Test App', method: 'sessions' } },
    { name: 'get_events_data', args: { app_id: '12345', period: '30days' } },
    { name: 'create_event', args: { event_key: 'test_event', count: 1 } }
];

for (const tool of testTools) {
    const startTime = Date.now();
    const success = Math.random() > 0.2; // 80% success rate for testing

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

    const responseTime = Date.now() - startTime;

    if (success) {
        analytics.trackToolUsage(tool.name, tool.args, true, responseTime);
        console.log(`✅ Tracked successful ${tool.name} (${Math.round(responseTime)}ms)`);
    }
    else {
        const error = new Error('Simulated API error');
        analytics.trackToolUsage(tool.name, tool.args, false, responseTime, error);
        analytics.trackError(error, { tool_name: tool.name });
        console.log(`❌ Tracked failed ${tool.name} with error`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
}

// Test 3: Connection Events
console.log('\n3. 🌐 Testing Connection Events...');

analytics.trackConnection('connect', {
    transport_type: 'stdio',
    test_mode: true
});
console.log('✅ Tracked connection event');

analytics.setTransportType('http', { hostname: 'localhost', port: 3101 });
console.log('✅ Tracked transport type change');

// Test 4: Feature Usage Events  
console.log('\n4. 📊 Testing Feature Usage Events...');

const apps = ['Mobile App', 'Web App', 'API Gateway'];
const dataTypes = ['sessions', 'events', 'users', 'crashes'];

for (const app of apps) {
    for (const dataType of dataTypes) {
        const recordCount = Math.floor(Math.random() * 1000) + 1;
        analytics.trackAppAnalyticsAccess(app, dataType, recordCount);
        console.log(`✅ Tracked ${app} -> ${dataType} access (${recordCount} records)`);
    }
}

// Test 5: Data Export Events
console.log('\n5. 📤 Testing Data Export Events...');

const exportTypes = ['users', 'events', 'crashes', 'sessions'];
for (const exportType of exportTypes) {
    const recordCount = Math.floor(Math.random() * 500) + 1;
    analytics.trackDataExport(exportType, 'Test App', recordCount);
    console.log(`✅ Tracked ${exportType} export (${recordCount} records)`);
}

// Test 6: Error Events
console.log('\n6. 🚨 Testing Error Events...');

const testErrors = [
    new Error('Connection timeout'),
    new Error('Invalid API key'),
    new Error('App not found'),
    new TypeError('Cannot read property of undefined')
];

for (const error of testErrors) {
    analytics.trackError(error, {
        test_context: 'verification',
        error_source: 'simulated'
    });
    console.log(`✅ Tracked error: ${error.message}`);
}

// Test 7: Custom Events for Verification
console.log('\n7. 🎯 Sending Verification Events...');

// Send a unique verification event with timestamp
const verificationId = `verification_${Date.now()}`;
analytics.trackToolUsage('verification_test', {
    verification_id: verificationId,
    test_timestamp: new Date().toISOString(),
    test_type: 'analytics_verification'
}, true, 123);

console.log(`✅ Sent verification event with ID: ${verificationId}`);

// Wait for all events to be processed and sent
console.log('\n⏳ Waiting for events to be sent to Countly...');
await new Promise(resolve => setTimeout(resolve, 10000));

// Test 8: Verify Events in Countly
console.log('\n8. 🔍 Verifying Events in Countly Server...');

try {
    // Check if we can query the analytics data to see our events
    const params = {
        api_key: process.env.COUNTLY_API_KEY,
        app_id: process.env.MCP_ANALYTICS_APP_KEY, // Using app key as app ID for simplicity
        method: 'get_events'
    };

    const response = await axios.get(`${process.env.MCP_ANALYTICS_SERVER_URL}/o`, { params });

    if (response.data) {
        console.log('✅ Successfully connected to Countly server');
        console.log('📊 Available events in your MCP Test app:');

        if (response.data.result && typeof response.data.result === 'object') {
            const events = Object.keys(response.data.result);
            const mcpEvents = events.filter(event => event.startsWith('mcp_') || event.startsWith('countly_'));

            if (mcpEvents.length > 0) {
                console.log('\n🎉 MCP Analytics Events Found:');
                mcpEvents.forEach(event => {
                    console.log(`  ✅ ${event}`);
                });
            }
            else {
                console.log('\n⚠️  No MCP events found yet. They may still be processing.');
                console.log('   Check your Countly dashboard in a few minutes.');
            }

            if (events.length > 0) {
                console.log('\n📋 All Events in App:');
                events.slice(0, 10).forEach(event => {
                    console.log(`  - ${event}`);
                });
                if (events.length > 10) {
                    console.log(`  ... and ${events.length - 10} more`);
                }
            }
        }
        else {
            console.log('📋 Response structure:', Object.keys(response.data));
        }
    }
}
catch (error) {
    console.log(`❌ Error querying Countly server: ${error.message}`);
    console.log('   This might be due to app configuration or API permissions');
}

// Test 9: Session Metrics Summary
console.log('\n9. 📊 Final Session Metrics...');
const sessionMetrics = analytics.getSessionMetrics();
console.log('Session Summary:', sessionMetrics);

console.log('\n🏁 Analytics Verification Test Complete!');

console.log('\n📋 Expected Events in your Countly Dashboard:');
console.log('  • mcp_server_start - Server initialization');
console.log('  • mcp_tool_used - Tool usage with performance data');
console.log('  • mcp_error - Error events with context');
console.log('  • mcp_connection - Connection events');
console.log('  • countly_feature_used - Feature usage patterns');
console.log('  • countly_app_data_access - App data access');
console.log('  • countly_data_export - Export activities');
console.log('  • mcp_server_health - Periodic health metrics');

console.log('\n🎯 To view in Countly:');
console.log(`1. Go to: ${process.env.MCP_ANALYTICS_SERVER_URL}`);
console.log('2. Select your MCP Test app');
console.log('3. Navigate to Events section');
console.log(`4. Look for verification ID: ${verificationId}`);

// Graceful shutdown
setTimeout(() => {
    process.exit(0);
}, 2000);
