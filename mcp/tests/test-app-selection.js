#!/usr/bin/env node

// Test script to verify app selection behavior
import { spawn } from 'child_process';

console.log('🧪 Testing app selection behavior...\n');

// Set dummy environment variables for testing
process.env.COUNTLY_SERVER_URL = 'https://test.countly.com';
process.env.COUNTLY_API_KEY = 'test-key';

const testRequests = [
    {
        name: 'Dashboard Data without app',
        request: '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_dashboard_data", "arguments": {}}}'
    },
    {
        name: 'Session Data without app',
        request: '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "get_session_data", "arguments": {"period": "30days"}}}'
    }
];

async function runTest(testCase) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log(`Request: ${testCase.request}\n`);

    return new Promise((resolve) => {
        const process = spawn('node', ['build/index.js'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let errorOutput = '';

        process.stdout.on('data', (data) => {
            output += data.toString();
        });

        process.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        process.on('close', (code) => {
            console.log('Response:', output || errorOutput);
            console.log(`Process exited with code: ${code}`);
            console.log('---');
            resolve();
        });

        // Send the test request
        process.stdin.write(testCase.request + '\n');
        process.stdin.end();

        // Kill process after 5 seconds if it doesn't respond
        setTimeout(() => {
            process.kill();
            resolve();
        }, 5000);
    });
}

async function runAllTests() {
    for (const testCase of testRequests) {
        await runTest(testCase);
    }
    console.log('\n✅ All tests completed!');
}

runAllTests().catch(console.error);
