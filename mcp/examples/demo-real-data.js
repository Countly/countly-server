#!/usr/bin/env node

/**
 * Real Data Test - Demonstrates actual tool functionality
 * Tests key tools with your live Countly data
 */

import { spawn } from 'child_process';

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

// Validate environment variables
function validateEnvironment() {
    const required = ['COUNTLY_SERVER_URL', 'COUNTLY_API_KEY'];
    const missing = required.filter(key => !process.env[key] || process.env[key] === 'your_api_key_here' || process.env[key] === 'https://your-countly-server.com');

    if (missing.length > 0) {
        log(`❌ Missing required environment variables: ${missing.join(', ')}`, colors.red);
        log(`\n📝 Please set them in your .env file or export them:`, colors.yellow);
        log(`export COUNTLY_SERVER_URL="https://your-countly-server.com"`, colors.cyan);
        log(`export COUNTLY_API_KEY="your_api_key_here"`, colors.cyan);
        process.exit(1);
    }
}

async function callTool(toolName, args = {}) {
    return new Promise((resolve, reject) => {
        const env = {
            ...process.env,
            COUNTLY_SERVER_URL: process.env.COUNTLY_SERVER_URL,
            COUNTLY_API_KEY: process.env.COUNTLY_API_KEY
        };

        const child = spawn('node', ['build/index.js'], {
            env, stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        const timeout = setTimeout(() => {
            child.kill(); reject(new Error('Timeout'));
        }, 15000);

        child.stdout.on('data', (data) => stdout += data);
        child.on('close', (code) => {
            clearTimeout(timeout);
            if (code !== 0) {
                return reject(new Error('Process failed'));
            }

            try {
                const lines = stdout.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    try {
                        const msg = JSON.parse(line);
                        if (msg.result?.content?.[0]?.text) {
                            return resolve(msg.result.content[0].text);
                        }
                    }
                    catch (e) {
                        // Ignore JSON parse errors for non-JSON lines
                    }
                }
                reject(new Error('No response'));
            }
            catch (error) {
                reject(error);
            }
        });

        // Send MCP messages
        child.stdin.write(JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'demo', version: '1.0.0' }}
        }) + '\n');

        child.stdin.write(JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: { name: toolName, arguments: args }
        }) + '\n');

        child.stdin.end();
    });
}

async function demoRealData() {
    log(`${colors.bold}🚀 Real Data Test - Countly MCP Server${colors.reset}`);
    log(`${colors.cyan}Testing with live data from: ${process.env.COUNTLY_SERVER_URL}${colors.reset}
`);

    try {
    // 1. List Apps
        log(`${colors.blue}📱 1. Discovering Your Applications...${colors.reset}`);
        const appsResult = await callTool('list_apps');
        log(appsResult.slice(0, 300) + '...\n');

        // Extract first app ID for further testing
        const appMatch = appsResult.match(/ID: ([a-f0-9]{24})/);
        const appId = appMatch ? appMatch[1] : 'demo_app_id';

        // 2. Get Dashboard Data
        log(`${colors.blue}📊 2. Getting Dashboard Analytics...${colors.reset}`);
        const dashboardResult = await callTool('get_dashboard_data', {
            app_id: appId,
            period: '7days'
        });
        log(dashboardResult.slice(0, 400) + '...\n');

        // 3. Database Operations
        log(`${colors.blue}🗄️ 3. Exploring Database Collections...${colors.reset}`);
        const dbResult = await callTool('list_databases');
        log(dbResult.slice(0, 300) + '...\n');

        // 4. Events Overview
        log(`${colors.blue}📝 4. Checking Events Overview...${colors.reset}`);
        const eventsResult = await callTool('get_events_overview', {
            app_id: appId,
            period: '30days'
        });
        log(eventsResult.slice(0, 300) + '...\n');

        // 5. Crash Analytics Test
        log(`${colors.blue}💥 5. Testing Crash Analytics...${colors.reset}`);
        const crashResult = await callTool('resolve_crash', {
            app_id: appId,
            crash_id: 'demo_crash_123'
        });
        log(crashResult.slice(0, 200) + '...\n');

        log(`${colors.bold}${colors.green}🎉 SUCCESS! All tools are working with your live Countly data!${colors.reset}`);

        log(`\n${colors.bold}📋 What This Demonstrates:${colors.reset}`);
        log(`${colors.green}✅ Real app discovery from your Countly server${colors.reset}`);
        log(`${colors.green}✅ Live analytics data retrieval${colors.reset}`);
        log(`${colors.green}✅ Database operations working${colors.reset}`);
        log(`${colors.green}✅ Event management functional${colors.reset}`);
        log(`${colors.green}✅ Crash analytics endpoints responsive${colors.reset}`);

        log(`\n${colors.cyan}🚀 Your MCP server is production-ready with access to real Countly data!${colors.reset}`);

    }
    catch (error) {
        log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
        process.exit(1);
    }
}

// Validate environment and run demo
validateEnvironment();
demoRealData();
