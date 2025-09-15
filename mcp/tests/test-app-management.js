#!/usr/bin/env node
import fs from 'fs';

// Test creating an app
const testCreateApp = {
    method: 'tools/call',
    params: {
        name: 'create_app',
        arguments: {
            name: 'Test App',
            country: 'US',
            timezone: 'America/New_York',
            category: 'mobile'
        }
    }
};

// Test updating an app  
const testUpdateApp = {
    method: 'tools/call',
    params: {
        name: 'update_app',
        arguments: {
            app_name: 'Test App',
            name: 'Updated Test App',
            country: 'CA'
        }
    }
};

// Test updating app plugins
const testUpdatePlugins = {
    method: 'tools/call',
    params: {
        name: 'update_app_plugins',
        arguments: {
            app_name: 'Test App',
            plugins: {
                push: true,
                drill: true,
                crashes: false
            }
        }
    }
};

console.log('🧪 App Management Tools Test Cases');
console.log('==================================\n');

console.log('1. Create App Test:');
console.log(JSON.stringify(testCreateApp, null, 2));

console.log('\n2. Update App Test:');
console.log(JSON.stringify(testUpdateApp, null, 2));

console.log('\n3. Update App Plugins Test:');
console.log(JSON.stringify(testUpdatePlugins, null, 2));

console.log('\n📝 To test with actual Countly server:');
console.log('1. Set COUNTLY_API_KEY and COUNTLY_SERVER_URL environment variables');
console.log('2. Use the MCP test framework with these JSON requests');
console.log('3. Or use node build/test.js to run interactive tests');

// Save test cases to file for reference
const testCases = {
    create_app: testCreateApp,
    update_app: testUpdateApp,
    update_app_plugins: testUpdatePlugins
};

fs.writeFileSync('./app-management-test-cases.json', JSON.stringify(testCases, null, 2));
console.log('\n✅ Test cases saved to app-management-test-cases.json');
