#!/usr/bin/env node

/**
 * OpenAI MCP Integration Example
 * Demonstrates how to use the Countly MCP Server with OpenAI-style interactions
 */

import { spawn } from 'child_process';

console.log('🤖 OpenAI MCP Integration Example - Countly Analytics');
console.log('='.repeat(55));

// Example OpenAI-style conversation flow
const conversation = [
    {
        role: 'user',
        content: 'I need to analyze my mobile app performance. Can you help me?'
    },
    {
        role: 'assistant',
        content: 'I can help you analyze your mobile app using Countly analytics. Let me start by showing you available apps.',
        tool_calls: [
            {
                name: 'list_apps',
                arguments: {}
            }
        ]
    },
    {
        role: 'user',
        content: 'Great! Now show me the session analytics for the "Mobile App" over the last 30 days.'
    },
    {
        role: 'assistant',
        content: 'I\'ll get the session analytics for your Mobile App.',
        tool_calls: [
            {
                name: 'get_analytics_data',
                arguments: {
                    app_name: 'Mobile App',
                    method: 'sessions',
                    period: '30days'
                }
            }
        ]
    },
    {
        role: 'user',
        content: 'Can you also check which users might be at risk of churning?'
    },
    {
        role: 'assistant',
        content: 'I\'ll analyze users who might be at risk of churning.',
        tool_calls: [
            {
                name: 'get_slipping_away_users',
                arguments: {
                    app_name: 'Mobile App'
                }
            }
        ]
    }
];

/**
 * Simulate OpenAI conversation with MCP tools
 */
async function simulateOpenAIConversation() {
    console.log('\n💬 Simulated OpenAI Conversation:');
    console.log('-'.repeat(40));

    for (let i = 0; i < conversation.length; i++) {
        const message = conversation[i];

        console.log(`\n${message.role.toUpperCase()}: ${message.content}`);

        if (message.tool_calls) {
            console.log('\n🔧 Tool Calls:');

            for (const tool_call of message.tool_calls) {
                console.log(`\n  📋 ${tool_call.name}:`);
                console.log(`     Arguments: ${JSON.stringify(tool_call.arguments, null, 6)}`);

                // Simulate tool execution
                const result = await executeTool(tool_call.name, tool_call.arguments);

                console.log(`\n  📊 Result:`);
                if (result.success) {
                    console.log(`     ✅ ${result.summary}`);
                }
                else {
                    console.log(`     ❌ ${result.error}`);
                }
            }
        }

        // Pause for readability
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

/**
 * Execute a tool via MCP server
 */
async function executeTool(toolName, args) {
    return new Promise((resolve) => {
        const server = spawn('node', ['build/index.js'], {
            env: {
                ...process.env,
                COUNTLY_API_KEY: process.env.COUNTLY_API_KEY || 'your_api_key_here',
                COUNTLY_SERVER_URL: process.env.COUNTLY_SERVER_URL || 'https://your-countly-server.com'
            },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let responses = [];

        server.stdout.on('data', (data) => {
            output += data.toString();

            // Try to parse JSON responses
            const lines = output.split('\n');
            for (const line of lines) {
                if (line.trim().startsWith('{')) {
                    try {
                        const response = JSON.parse(line.trim());
                        responses.push(response);
                    }
                    catch (e) {
                        // Ignore parse errors
                    }
                }
            }
        });

        server.stderr.on('data', () => {
            // Ignore stderr for demo
        });

        // Send initialization
        const initMessage = {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2025-06-18',
                capabilities: {},
                clientInfo: { name: 'openai-demo', version: '1.0.0' }
            }
        };

        server.stdin.write(JSON.stringify(initMessage) + '\n');

        // Wait a bit then send tool call
        setTimeout(() => {
            const toolMessage = {
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: args
                }
            };

            server.stdin.write(JSON.stringify(toolMessage) + '\n');
        }, 500);

        // Wait for response then kill server
        setTimeout(() => {
            server.kill();

            // Analyze responses
            const toolResponse = responses.find(r => r.id === 2);

            if (toolResponse) {
                if (toolResponse.result) {
                    resolve({
                        success: true,
                        summary: summarizeResult(toolName, toolResponse.result),
                        data: toolResponse.result
                    });
                }
                else if (toolResponse.error) {
                    resolve({
                        success: false,
                        error: `Tool error: ${toolResponse.error.message}`,
                        data: toolResponse.error
                    });
                }
            }
            else {
                resolve({
                    success: false,
                    error: 'No response received from server'
                });
            }
        }, 2000);
    });
}

/**
 * Create human-readable summaries of tool results
 */
function summarizeResult(toolName, result) {
    switch (toolName) {
    case 'list_apps':
        if (result.content && result.content[0]) {
            const text = result.content[0].text;
            const appCount = (text.match(/\{/g) || []).length;
            return `Found ${appCount} applications in your Countly instance`;
        }
        return 'Retrieved application list';

    case 'get_analytics_data':
        return 'Retrieved session analytics data for the last 30 days';

    case 'get_slipping_away_users':
        return 'Analyzed user engagement to identify at-risk users';

    default:
        return `Executed ${toolName} successfully`;
    }
}

/**
 * Show OpenAI configuration
 */
function showOpenAIConfig() {
    console.log('\n⚙️  OpenAI MCP Configuration:');
    console.log('-'.repeat(35));

    const config = {
        mcp_servers: {
            countly: {
                command: 'node',
                args: ['build/index.js'],
                env: {
                    COUNTLY_API_KEY: 'your_api_key_here',
                    COUNTLY_SERVER_URL: 'https://your-countly-server.com'
                }
            }
        }
    };

    console.log(JSON.stringify(config, null, 2));
}

/**
 * Show available tools summary
 */
function showToolsSummary() {
    console.log('\n🛠️  Available Tools for OpenAI:');
    console.log('-'.repeat(32));

    const categories = [
        { name: 'App Management', count: 7, desc: 'Create, update, delete applications' },
        { name: 'Analytics', count: 9, desc: 'Sessions, users, events analytics' },
        { name: 'User Management', count: 5, desc: 'User operations and insights' },
        { name: 'Events', count: 4, desc: 'Custom event tracking' },
        { name: 'Alerts', count: 5, desc: 'Monitoring and notifications' },
        { name: 'Database', count: 6, desc: 'Direct MongoDB access' },
        { name: 'Crash Analytics', count: 10, desc: 'Crash management and analysis' }
    ];

    categories.forEach(cat => {
        console.log(`📊 ${cat.name}: ${cat.count} tools - ${cat.desc}`);
    });

    console.log(`\n✨ Total: 46 comprehensive tools for Countly analytics`);
}

/**
 * Main function
 */
async function main() {
    try {
    // Show configuration
        showOpenAIConfig();

        // Show tools summary
        showToolsSummary();

        // Run conversation simulation
        await simulateOpenAIConversation();

        console.log('\n🎉 OpenAI MCP Integration Demo Complete!');
        console.log('\n📝 Next Steps:');
        console.log('   1. Set your COUNTLY_API_KEY environment variable');
        console.log('   2. Configure your COUNTLY_SERVER_URL');
        console.log('   3. Add the MCP configuration to your OpenAI setup');
        console.log('   4. Start using Countly analytics with AI assistance!');

    }
    catch (error) {
        console.error('\n❌ Demo failed:', error.message);
    }
}

// Handle help flag
if (process.argv.includes('--help')) {
    console.log(`
OpenAI MCP Integration Example

This script demonstrates how the Countly MCP Server integrates with OpenAI.

Usage:
  node openai-integration-example.js

Environment Variables:
  COUNTLY_API_KEY     Your Countly API key
  COUNTLY_SERVER_URL  Your Countly server URL

The demo shows:
- OpenAI-style conversation flow
- Tool discovery and execution
- Result summarization
- Configuration examples
  `);
    process.exit(0);
}

// Run the demo
main();
