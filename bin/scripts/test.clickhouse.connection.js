#!/usr/bin/env node

/**
 * Test ClickHouse connection for CI/CD environments
 */

const http = require('http');
const config = require('../../api/config');

function checkClickHouseConnection(url, timeout) {
    return new Promise(function(resolve) {
        timeout = timeout || 10000;

        const parsedUrl = new URL(url || 'http://localhost:8123');

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 8123,
            path: '/ping',
            method: 'GET',
            timeout: timeout
        };

        const req = http.request(options, (res) => {
            if (res.statusCode === 200) {
                resolve(true);
            }
            else {
                console.log('ClickHouse ping returned status:', res.statusCode);
                resolve(false);
            }
        });

        req.on('error', (error) => {
            console.log('ClickHouse connection error:', error.message);
            resolve(false);
        });

        req.on('timeout', () => {
            console.log('ClickHouse connection timeout');
            req.destroy();
            resolve(false);
        });

        req.end();
    });
}

async function queryClickHouse(url, query) {
    return new Promise(function(resolve) {
        const parsedUrl = new URL(url || 'http://localhost:8123');

        const postData = query;

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 8123,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('ClickHouse query successful:', data.trim());
                    resolve(true);
                }
                else {
                    console.log('ClickHouse query failed with status:', res.statusCode);
                    console.log('Response:', data);
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.log('ClickHouse query error:', error.message);
            resolve(false);
        });

        req.write(postData);
        req.end();
    });
}

async function sleep(seconds) {
    return new Promise(function(resolve) {
        setTimeout(resolve, seconds * 1000);
    });
}

async function testClickHouseConnection() {
    const clickhouseUrl = process.env.COUNTLY_CONFIG__CLICKHOUSE_URL ||
                          config.clickhouse?.url ||
                          'http://localhost:8123';

    console.log('Testing ClickHouse connection to:', clickhouseUrl);

    let connected = false;
    let attempts = 0;
    const maxAttempts = 30;

    // First, check if ClickHouse is reachable
    while (!connected && attempts < maxAttempts) {
        attempts++;
        connected = await checkClickHouseConnection(clickhouseUrl);
        console.log(`Connection attempt ${attempts}/${maxAttempts}:`, connected ? 'Success' : 'Failed');

        if (!connected) {
            await sleep(1);
        }
    }

    if (!connected) {
        console.log('ERROR: Could not connect to ClickHouse after', maxAttempts, 'attempts');
        process.exit(1);
    }

    // Test database creation
    const databaseName = process.env.COUNTLY_CONFIG__CLICKHOUSE_DATABASE ||
                        config.clickhouse?.database ||
                        'countly_drill';
    console.log(`\nCreating ${databaseName} database if not exists...`);
    const dbCreated = await queryClickHouse(clickhouseUrl, `CREATE DATABASE IF NOT EXISTS ${databaseName}`);
    if (!dbCreated) {
        console.log(`WARNING: Could not create/verify ${databaseName} database`);
    }

    // Test a simple query
    console.log('\nTesting simple query...');
    const querySuccess = await queryClickHouse(clickhouseUrl, 'SELECT 1');
    if (!querySuccess) {
        console.log('ERROR: Simple query test failed');
        process.exit(1);
    }

    // Show databases
    console.log('\nListing databases...');
    await queryClickHouse(clickhouseUrl, 'SHOW DATABASES');

    console.log('\n✓ ClickHouse connection test successful!');
    console.log('Configuration used:');
    console.log('- URL:', clickhouseUrl);
    console.log('- Database adapter enabled:',
        process.env.COUNTLY_CONFIG__DATABASE_ADAPTERS_CLICKHOUSE_ENABLED ||
        config.database?.adapters?.clickhouse?.enabled ||
        'not configured');
}

// Run the test
testClickHouseConnection().catch(error => {
    console.error('Unexpected error during ClickHouse connection test:', error);
    process.exit(1);
});