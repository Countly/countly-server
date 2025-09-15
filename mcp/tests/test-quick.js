#!/usr/bin/env node

/**
 * Quick MCP Server Test
 * Tests a few key tools to validate MC  log(`${colors.bold}🚀 Quick MCP Server Test${colors.reset}`);
  log(`${colors.cyan}Server: ${process.env.COUNTLY_SERVER_URL || 'your-countly-server.com'}${colors.reset}\n`);functionality
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

async function testMCPTool(toolName, args = {}) {
    return new Promise((resolve, reject) => {
        const env = {
            ...process.env,
            COUNTLY_SERVER_URL: process.env.COUNTLY_SERVER_URL || 'https://your-countly-server.com',
            COUNTLY_API_KEY: process.env.COUNTLY_API_KEY || 'your_api_key_here'
        };

        const child = spawn('node', ['build/index.js'], {
            env, stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '', stderr = '';

        const timeout = setTimeout(() => {
            child.kill();
            reject(new Error('Timeout'));
        }, 15000);

        child.stdout.on('data', (data) => stdout += data);
        child.stderr.on('data', (data) => stderr += data);

        child.on('close', (code) => {
            clearTimeout(timeout);

            if (code !== 0) {
                reject(new Error(`Process failed (${code}): ${stderr}`));
                return;
            }

            try {
                const lines = stdout.split('\\n').filter(l => l.trim());
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
                        // Ignore JSON parse errors for non-JSON lines
                    }
                }

                resolve(response || { error: 'No response' });
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
            params: {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: { name: 'test', version: '1.0.0' }
            }
        }) + '\\n');

        child.stdin.write(JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: { name: toolName, arguments: args }
        }) + '\\n');

        child.stdin.end();
    });
}

async function runQuickTests() {
    log(`${colors.bold}🚀 Quick MCP Server Test${colors.reset}`);
    log(`${colors.cyan}Server: ${process.env.COUNTLY_SERVER_URL || 'your-countly-server.com'}${colors.reset}\\n`);

    const tests = [
        { name: 'list_apps', args: {}, desc: 'List applications' },
        { name: 'get_dashboard_data', args: { app_id: 'demo_app_id', period: '7days' }, desc: 'Get dashboard data' },
        { name: 'list_databases', args: {}, desc: 'List databases' },
        { name: 'get_db_statistics', args: { stat_type: 'mongostat' }, desc: 'Get DB stats' }
    ];

    let passed = 0, failed = 0;

    for (const test of tests) {
        try {
            log(`${colors.blue}Testing ${test.name}: ${test.desc}${colors.reset}`);

            const result = await testMCPTool(test.name, test.args);

            if (result.content && result.content[0] && result.content[0].text) {
                const text = result.content[0].text;
                if (!text.includes('Error') && !text.includes('error')) {
                    log(`${colors.green}✅ ${test.name} PASSED${colors.reset}`);
                    log(`   Preview: ${text.slice(0, 100)}...\\n`);
                    passed++;
                }
                else {
                    log(`${colors.red}❌ ${test.name} FAILED - ${text.slice(0, 200)}${colors.reset}\\n`);
                    failed++;
                }
            }
            else {
                log(`${colors.red}❌ ${test.name} FAILED - No valid response${colors.reset}\\n`);
                failed++;
            }

        }
        catch (error) {
            log(`${colors.red}❌ ${test.name} FAILED - ${error.message}${colors.reset}\\n`);
            failed++;
        }
    }

    log(`${colors.bold}📊 Results: ${passed} passed, ${failed} failed${colors.reset}`);
    log(`${colors.cyan}Success rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%${colors.reset}`);

    return failed === 0;
}

runQuickTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
        log(`${colors.red}Test failed: ${error.message}${colors.reset}`);
        process.exit(1);
    });
