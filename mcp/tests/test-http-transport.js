#!/usr/bin/env node

/**
 * Test HTTP Transport functionality for Countly MCP Server
 * This script tests both stdio and HTTP transports
 */

import { CountlyMCPServer } from './build/index.js';
import http from 'http';

async function testHttpTransport() {
    console.log('🧪 Testing Countly MCP Server HTTP Transport...\n');

    // Test 1: Server instantiation
    console.log('1. Testing server instantiation...');
    try {
        const server = new CountlyMCPServer();
        console.log('✅ Server instantiated successfully');
        console.log(`   Server class: ${server.constructor.name}`);
    }
    catch (error) {
        console.log('❌ Server instantiation failed:', error.message);
        return;
    }

    // Test 2: HTTP server startup (we'll start and immediately stop)
    console.log('\n2. Testing HTTP server startup...');

    const server = new CountlyMCPServer();

    // Start server in background
    const serverPromise = server.run('http', { port: 3999, hostname: 'localhost' });
    console.log('   Server started, promise:', typeof serverPromise);

    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 3: Health endpoint
    console.log('\n3. Testing health endpoint...');

    try {
        const response = await new Promise((resolve, reject) => {
            const req = http.get('http://localhost:3999/mcp/ping', (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: JSON.parse(data)
                        });
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', reject);
            req.setTimeout(5000, () => reject(new Error('Timeout')));
        });

        if (response.statusCode === 200) {
            console.log('✅ Health endpoint working');
            console.log('   Response:', response.data);
        }
        else {
            console.log('❌ Health endpoint returned status:', response.statusCode);
        }

    }
    catch (error) {
        console.log('❌ Health endpoint failed:', error.message);
    }

    // Test 4: CORS headers
    console.log('\n4. Testing CORS headers...');

    try {
        const response = await new Promise((resolve, reject) => {
            const req = http.request({
                hostname: 'localhost',
                port: 3999,
                path: '/mcp/ping',
                method: 'OPTIONS'
            }, (res) => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers
                });
            });

            req.on('error', reject);
            req.setTimeout(5000, () => reject(new Error('Timeout')));
            req.end();
        });

        const corsHeaders = [
            'access-control-allow-origin',
            'access-control-allow-methods',
            'access-control-allow-headers'
        ];

        const hasCors = corsHeaders.every(header => response.headers[header]);

        if (hasCors) {
            console.log('✅ CORS headers present');
            corsHeaders.forEach(header => {
                console.log(`   ${header}: ${response.headers[header]}`);
            });
        }
        else {
            console.log('❌ Missing CORS headers');
        }

    }
    catch (error) {
        console.log('❌ CORS test failed:', error.message);
    }

    // Test 5: MCP endpoint exists
    console.log('\n5. Testing MCP endpoint...');

    try {
        const response = await new Promise((resolve, reject) => {
            const req = http.get('http://localhost:3999/mcp', (res) => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers
                });
            });

            req.on('error', reject);
            req.setTimeout(5000, () => reject(new Error('Timeout')));
        });

        // MCP endpoint should respond (even if it's SSE, it should at least connect)
        if (response.statusCode === 200 || response.headers['content-type']?.includes('text/event-stream')) {
            console.log('✅ MCP endpoint accessible');
            console.log('   Status:', response.statusCode);
            if (response.headers['content-type']) {
                console.log('   Content-Type:', response.headers['content-type']);
            }
        }
        else {
            console.log('❌ MCP endpoint issue, status:', response.statusCode);
        }

    }
    catch (error) {
        console.log('❌ MCP endpoint failed:', error.message);
    }

    console.log('\n🏁 HTTP Transport tests completed!');
    console.log('\nℹ️  To manually test the server:');
    console.log('   Ping check: curl http://localhost:3999/mcp/ping');
    console.log('   Start server:  ./start-server.sh --http --port 3999');

    // Clean shutdown
    process.exit(0);
}

// Set required environment variables for testing
if (!process.env.COUNTLY_API_KEY) {
    process.env.COUNTLY_API_KEY = 'test_api_key';
}

if (!process.env.COUNTLY_SERVER_URL) {
    process.env.COUNTLY_SERVER_URL = 'https://test-server.countly.com';
}

// Run the test
testHttpTransport().catch(console.error);
