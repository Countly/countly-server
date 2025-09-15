#!/usr/bin/env node

/**
 * OpenAI MCP Integration Test
 * Tests Countly MCP Server compatibility with OpenAI's MCP implementation
 */

import { spawn } from 'child_process';

console.log('🤖 OpenAI MCP Integration Test for Countly Server');
console.log('='.repeat(50));

// Test Configuration
const config = {
    serverPath: './build/index.js',
    env: {
        COUNTLY_API_KEY: process.env.COUNTLY_API_KEY || 'test_key',
        COUNTLY_SERVER_URL: process.env.COUNTLY_SERVER_URL || 'https://api.count.ly',
        COUNTLY_TIMEOUT: '30000'
    }
};

// Validate Environment
console.log('\n📋 Environment Validation:');
console.log(`✓ Server Path: ${config.serverPath}`);
console.log(`✓ API Key: ${config.env.COUNTLY_API_KEY ? '***' + config.env.COUNTLY_API_KEY.slice(-4) : 'NOT SET'}`);
console.log(`✓ Server URL: ${config.env.COUNTLY_SERVER_URL}`);
console.log(`✓ Timeout: ${config.env.COUNTLY_TIMEOUT}ms`);

// Test MCP Protocol Messages
const mcpMessages = [
    {
        name: 'initialize',
        message: {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2025-06-18',
                capabilities: {},
                clientInfo: {
                    name: 'openai-mcp-test',
                    version: '1.0.0'
                }
            }
        }
    },
    {
        name: 'list_tools',
        message: {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {}
        }
    },
    {
        name: 'call_list_apps',
        message: {
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
                name: 'list_apps',
                arguments: {}
            }
        }
    },
    {
        name: 'call_get_analytics',
        message: {
            jsonrpc: '2.0',
            id: 4,
            method: 'tools/call',
            params: {
                name: 'get_analytics_data',
                arguments: {
                    method: 'sessions',
                    period: '7days'
                }
            }
        }
    }
];

/**
 * Test MCP Server with OpenAI-compatible messages
 */
async function testMCPServer() {
    console.log('\n🚀 Starting MCP Server Test...');

    const server = spawn('node', [config.serverPath], {
        env: { ...process.env, ...config.env },
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let responseCount = 0;
    const responses = [];

    server.stdout.on('data', (data) => {
        try {
            const lines = data.toString().split('\n').filter(line => line.trim());

            for (const line of lines) {
                if (line.trim().startsWith('{')) {
                    const response = JSON.parse(line);
                    responses.push(response);
                    responseCount++;

                    console.log(`\n📨 Response ${responseCount}:`);
                    console.log(JSON.stringify(response, null, 2));
                }
            }
        }
        catch (error) {
            console.log('📄 Server Output:', data.toString());
        }
    });

    server.stderr.on('data', (data) => {
        console.log('⚠️  Server Error:', data.toString());
    });

    // Send test messages
    console.log('\n📤 Sending MCP Protocol Messages...');

    for (const test of mcpMessages) {
        console.log(`\n🔄 Testing: ${test.name}`);
        console.log('📋 Request:', JSON.stringify(test.message, null, 2));

        server.stdin.write(JSON.stringify(test.message) + '\n');

        // Wait a bit between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Wait for responses
    await new Promise(resolve => setTimeout(resolve, 3000));

    server.kill();

    console.log('\n📊 Test Summary:');
    console.log(`✓ Messages Sent: ${mcpMessages.length}`);
    console.log(`✓ Responses Received: ${responseCount}`);

    return responses;
}

/**
 * Validate OpenAI Compatibility
 */
function validateOpenAICompatibility(responses) {
    console.log('\n🔍 OpenAI Compatibility Validation:');

    const checks = [
        {
            name: 'Initialize Response',
            test: () => responses.some(r => r.result && r.result.serverInfo),
            description: 'Server provides proper initialization response'
        },
        {
            name: 'Tools List',
            test: () => responses.some(r => r.result && r.result.tools && Array.isArray(r.result.tools)),
            description: 'Server exposes tools list'
        },
        {
            name: 'Tool Execution',
            test: () => responses.some(r => r.result && r.result.content),
            description: 'Tools return content in MCP format'
        },
        {
            name: 'Error Handling',
            test: () => responses.some(r => r.error || r.result),
            description: 'Proper error/success response format'
        }
    ];

    checks.forEach(check => {
        const passed = check.test();
        console.log(`${passed ? '✅' : '❌'} ${check.name}: ${check.description}`);
    });

    const allPassed = checks.every(check => check.test());

    console.log(`\n🎯 Overall Compatibility: ${allPassed ? '✅ COMPATIBLE' : '❌ NEEDS FIXES'}`);

    return allPassed;
}

/**
 * Generate OpenAI Configuration
 */
function generateOpenAIConfig() {
    console.log('\n📝 Generating OpenAI MCP Configuration...');

    const config = {
        mcp_servers: {
            countly: {
                command: 'node',
                args: ['build/index.js'],
                env: {
                    COUNTLY_API_KEY: 'your_api_key_here',
                    COUNTLY_SERVER_URL: 'https://your-countly-server.com'
                },
                cwd: process.cwd()
            }
        }
    };

    console.log('\n📋 Add this to your OpenAI MCP configuration:');
    console.log(JSON.stringify(config, null, 2));

    return config;
}

/**
 * Main Test Function
 */
async function main() {
    try {
    // Run MCP Server Tests
        const responses = await testMCPServer();

        // Validate Compatibility
        const isCompatible = validateOpenAICompatibility(responses);

        // Generate Configuration
        generateOpenAIConfig();

        console.log('\n🎉 OpenAI MCP Integration Test Complete!');
        console.log(`Status: ${isCompatible ? 'Ready for OpenAI' : 'Needs Review'}`);

        process.exit(isCompatible ? 0 : 1);

    }
    catch (error) {
        console.error('\n❌ Test Failed:', error.message);
        process.exit(1);
    }
}

// Handle script arguments
if (process.argv.includes('--help')) {
    console.log(`
Usage: node test-openai-integration.js [options]

Options:
  --help              Show this help message
  
Environment Variables:
  COUNTLY_API_KEY     Your Countly API key (required)
  COUNTLY_SERVER_URL  Your Countly server URL (default: https://api.count.ly)
  
Examples:
  COUNTLY_API_KEY=abc123 node test-openai-integration.js
  `);
    process.exit(0);
}

// Run the test
main();
