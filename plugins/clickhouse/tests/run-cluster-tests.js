#!/usr/bin/env node

/**
 * ClickHouse Cluster Integration Test Runner
 *
 * Automated test runner that manages Docker lifecycle and runs Mocha tests
 * for all ClickHouse deployment modes.
 *
 * Usage:
 *   node run-cluster-tests.js                    # Run all modes sequentially
 *   node run-cluster-tests.js single             # Run single mode only
 *   node run-cluster-tests.js replicas shards    # Run multiple modes
 *   node run-cluster-tests.js --list             # List available modes
 *   node run-cluster-tests.js --skip-teardown    # Keep containers running after tests
 *
 * Must be run from the countly core directory.
 */

const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

// Paths
const SCRIPT_DIR = __dirname;
const PLUGIN_ROOT = path.resolve(SCRIPT_DIR, '..');
const DOCKER_DIR = path.join(SCRIPT_DIR, 'docker');
const INTEGRATION_DIR = path.join(SCRIPT_DIR, 'integration');
const CORE_DIR = process.cwd();

// Available modes
const MODES = ['single', 'replicas', 'shards', 'ha', 'cloud'];

// Mode to compose file mapping
const MODE_COMPOSE = {
    single: 'docker-compose.single.yml',
    replicas: 'docker-compose.replicas.yml',
    shards: 'docker-compose.shards.yml',
    ha: 'docker-compose.ha.yml',
    cloud: 'docker-compose.single.yml' // Cloud uses single for simulation
};

// Colors for output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

/**
 * Print colored message
 */
function log(color, ...args) {
    console.log(colors[color] || '', ...args, colors.reset);
}

/**
 * Print usage help
 */
function printHelp() {
    console.log(`
ClickHouse Cluster Integration Test Runner

Usage:
  node run-cluster-tests.js [options] [modes...]

Options:
  --help, -h              Show this help
  --list, -l              List available modes
  --skip-teardown         Keep Docker containers running after tests
  --verbose, -v           Show verbose output
  --cloud-url=URL         ClickHouse Cloud URL (required for cloud mode)
  --cloud-user=USER       ClickHouse Cloud username (default: default)
  --cloud-password=PASS   ClickHouse Cloud password

Modes:
  single              Single node, no clustering
  replicas            1 shard x 2 replicas (replication only)
  shards              2 shards x 1 replica (sharding only)
  ha                  2 shards x 2 replicas (full HA)
  cloud               Cloud mode (requires --cloud-url)

Examples:
  node run-cluster-tests.js                    # Run all modes (except cloud)
  node run-cluster-tests.js single replicas    # Run specific modes
  node run-cluster-tests.js --skip-teardown ha # Run HA and keep containers
  node run-cluster-tests.js cloud --cloud-url=https://xyz.clickhouse.cloud:8443 --cloud-password=secret

Note: Must be run from the countly core directory.
Note: Cloud mode is skipped unless --cloud-url is provided.
`);
}

/**
 * Verify we're in the correct directory
 */
function verifyWorkingDirectory() {
    // Check for plugins/clickhouse symlink
    const clickhousePath = path.join(CORE_DIR, 'plugins/clickhouse');
    if (!fs.existsSync(clickhousePath)) {
        log('red', 'ERROR: Must run from countly core directory');
        log('yellow', `Expected: plugins/clickhouse at ${clickhousePath}`);
        log('cyan', 'Usage: cd /path/to/countly/core && node plugins/clickhouse/tests/run-cluster-tests.js');
        process.exit(1);
    }
}

/**
 * Start Docker compose for a mode
 * @param {string} mode - Mode name
 * @returns {boolean} Success
 */
function startDocker(mode) {
    const composeFile = MODE_COMPOSE[mode];
    const composePath = path.join(DOCKER_DIR, composeFile);

    log('cyan', `\n[${mode}] Starting Docker compose...`);

    try {
        execSync(`docker compose -f ${composePath} up -d`, {
            cwd: DOCKER_DIR,
            stdio: 'inherit'
        });
        console.log(''); // Separator after Docker output
        return true;
    }
    catch (e) {
        log('red', `[${mode}] Failed to start Docker: ${e.message}`);
        return false;
    }
}

/**
 * Stop Docker compose for a mode
 * @param {string} mode - Mode name
 * @param {boolean} removeVolumes - Whether to remove volumes
 */
function stopDocker(mode, removeVolumes = true) {
    const composeFile = MODE_COMPOSE[mode];
    const composePath = path.join(DOCKER_DIR, composeFile);

    log('cyan', `\n[${mode}] Stopping Docker compose...`);

    try {
        const cmd = removeVolumes
            ? `docker compose -f ${composePath} down -v`
            : `docker compose -f ${composePath} down`;

        execSync(cmd, {
            cwd: DOCKER_DIR,
            stdio: 'inherit'
        });
        console.log(''); // Separator after Docker output
    }
    catch (e) {
        log('yellow', `[${mode}] Warning stopping Docker: ${e.message}`);
    }
}

/**
 * Wait for ClickHouse to be healthy
 * @param {number} port - HTTP port
 * @param {number} maxRetries - Max retries
 * @returns {Promise<boolean>}
 */
async function waitForHealthy(port, maxRetries = 60) {
    const http = require('http');

    for (let i = 0; i < maxRetries; i++) {
        try {
            await new Promise((resolve, reject) => {
                const req = http.get(`http://localhost:${port}/ping`, (res) => {
                    if (res.statusCode === 200) {
                        resolve(true);
                    }
                    else {
                        reject(new Error(`Status ${res.statusCode}`));
                    }
                });
                req.on('error', reject);
                req.setTimeout(2000, () => {
                    req.destroy();
                    reject(new Error('Timeout'));
                });
            });
            return true;
        }
        catch (e) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    return false;
}

/**
 * Wait for all nodes in a mode to be ready
 * @param {string} mode - Mode name
 * @returns {Promise<boolean>}
 */
async function waitForMode(mode) {
    const ports = {
        single: [8123],
        replicas: [8123, 8124],
        shards: [8123, 8124],
        ha: [8123, 8124, 8125, 8126],
        cloud: [8123]
    };

    log('cyan', `[${mode}] Waiting for ClickHouse nodes to be healthy...`);

    for (const port of ports[mode]) {
        process.stdout.write(`  Checking port ${port}... `);
        const healthy = await waitForHealthy(port);
        if (healthy) {
            console.log('OK');
        }
        else {
            console.log('FAILED');
            return false;
        }
    }

    return true;
}

/**
 * Run Mocha tests for a mode
 * @param {string} mode - Mode name
 * @param {boolean} verbose - Verbose output
 * @returns {Promise<{passed: boolean, output: string}>}
 */
function runTests(mode, verbose = false) {
    return new Promise((resolve) => {
        log('cyan', `\n[${mode}] Running Mocha tests...`);

        const testFile = path.join(INTEGRATION_DIR, 'cluster-modes.integration.js');
        // Map mode names to test describe patterns
        const modePatterns = {
            single: 'Single Mode',
            replicas: 'Replicas Mode',
            shards: 'Shards Mode',
            ha: 'HA Mode',
            cloud: 'Cloud Mode'
        };
        const grepPattern = modePatterns[mode] || (mode.charAt(0).toUpperCase() + mode.slice(1) + ' Mode');

        const args = [
            'npx', 'mocha',
            testFile,
            '--grep', grepPattern,
            '--timeout', '300000',
            '--reporter', 'spec' // Always use spec to preserve output between modes
        ];

        const env = {
            ...process.env,
            NODE_PATH: path.join(CORE_DIR, 'node_modules')
        };

        const proc = spawn(args[0], args.slice(1), {
            cwd: CORE_DIR,
            env,
            stdio: 'inherit'
        });

        proc.on('close', (code) => {
            resolve({
                passed: code === 0,
                mode
            });
        });

        proc.on('error', (err) => {
            log('red', `[${mode}] Failed to run tests: ${err.message}`);
            resolve({
                passed: false,
                mode,
                error: err.message
            });
        });
    });
}

/**
 * Run tests for a single mode (with Docker management)
 * @param {string} mode - Mode name
 * @param {Object} options - Options
 * @returns {Promise<Object>} Test result
 */
async function runModeTests(mode, options) {
    log('bright', `\n${'='.repeat(60)}`);
    log('bright', `  Testing ${mode.toUpperCase()} mode`);
    log('bright', `${'='.repeat(60)}`);
    console.log(''); // Ensure newline buffer to prevent output overwriting

    // Start Docker
    if (!startDocker(mode)) {
        return { mode, passed: false, error: 'Docker start failed' };
    }

    // Wait for healthy
    const healthy = await waitForMode(mode);
    if (!healthy) {
        if (!options.skipTeardown) {
            stopDocker(mode);
        }
        return { mode, passed: false, error: 'ClickHouse not healthy' };
    }

    // Give extra time for cluster formation
    await new Promise(r => setTimeout(r, 3000));

    // Run tests
    const result = await runTests(mode, options.verbose);

    // Teardown unless skipped
    if (!options.skipTeardown) {
        stopDocker(mode);
    }

    return result;
}

/**
 * Parse command line argument value
 * @param {Array} args - Command line arguments
 * @param {string} name - Argument name (e.g., '--cloud-url')
 * @returns {string|null} Argument value or null
 */
function getArgValue(args, name) {
    for (const arg of args) {
        if (arg.startsWith(`${name}=`)) {
            return arg.substring(name.length + 1);
        }
    }
    return null;
}

/**
 * Run cloud mode tests (no Docker, uses external ClickHouse Cloud)
 * @param {Object} options - Options including cloud config
 * @returns {Promise<Object>} Test result
 */
async function runCloudTests(options) {
    log('bright', `\n${'='.repeat(60)}`);
    log('bright', '  Testing CLOUD mode');
    log('bright', `${'='.repeat(60)}`);
    console.log(''); // Ensure newline buffer to prevent output overwriting

    log('cyan', `\nUsing ClickHouse Cloud: ${options.cloudUrl}`);

    // Set environment variables for the test
    const env = {
        ...process.env,
        NODE_PATH: path.join(CORE_DIR, 'node_modules'),
        CLICKHOUSE_CLOUD_URL: options.cloudUrl,
        CLICKHOUSE_CLOUD_USER: options.cloudUser || 'default',
        CLICKHOUSE_CLOUD_PASSWORD: options.cloudPassword || ''
    };

    return new Promise((resolve) => {
        log('cyan', '\n[cloud] Running Mocha tests...');

        const testFile = path.join(INTEGRATION_DIR, 'cluster-modes.integration.js');

        const args = [
            'npx', 'mocha',
            testFile,
            '--grep', 'Cloud Mode',
            '--timeout', '300000',
            '--reporter', options.verbose ? 'spec' : 'min'
        ];

        const proc = spawn(args[0], args.slice(1), {
            cwd: CORE_DIR,
            env,
            stdio: 'inherit'
        });

        proc.on('close', (code) => {
            resolve({
                passed: code === 0,
                mode: 'cloud'
            });
        });

        proc.on('error', (err) => {
            log('red', `[cloud] Failed to run tests: ${err.message}`);
            resolve({
                passed: false,
                mode: 'cloud',
                error: err.message
            });
        });
    });
}

/**
 * Main entry point
 */
async function main() {
    const args = process.argv.slice(2);

    // Parse options
    const options = {
        skipTeardown: args.includes('--skip-teardown'),
        verbose: args.includes('--verbose') || args.includes('-v'),
        cloudUrl: getArgValue(args, '--cloud-url'),
        cloudUser: getArgValue(args, '--cloud-user'),
        cloudPassword: getArgValue(args, '--cloud-password')
    };

    // Filter out options from modes
    const requestedModes = args.filter(a => !a.startsWith('-'));

    // Handle help
    if (args.includes('--help') || args.includes('-h')) {
        printHelp();
        process.exit(0);
    }

    // Handle list
    if (args.includes('--list') || args.includes('-l')) {
        log('bright', '\nAvailable modes:');
        for (const mode of MODES) {
            const note = mode === 'cloud' ? ' (requires --cloud-url)' : '';
            console.log(`  - ${mode}${note}`);
        }
        process.exit(0);
    }

    // Verify working directory
    verifyWorkingDirectory();

    // Determine which modes to run
    let modesToRun = requestedModes.length > 0
        ? requestedModes.filter(m => MODES.includes(m))
        : MODES.filter(m => m !== 'cloud'); // Exclude cloud from default run

    // Handle cloud mode specially
    const wantsCloud = requestedModes.includes('cloud');
    if (wantsCloud && !options.cloudUrl) {
        log('red', 'ERROR: Cloud mode requires --cloud-url parameter');
        log('yellow', 'Example: node run-cluster-tests.js cloud --cloud-url=https://xyz.clickhouse.cloud:8443');
        process.exit(1);
    }

    // Remove cloud from modesToRun if present (handled separately)
    modesToRun = modesToRun.filter(m => m !== 'cloud');

    if (modesToRun.length === 0 && !wantsCloud) {
        log('red', 'ERROR: No valid modes specified');
        printHelp();
        process.exit(1);
    }

    // Validate modes
    for (const mode of requestedModes) {
        if (!MODES.includes(mode)) {
            log('yellow', `Warning: Unknown mode '${mode}', skipping`);
        }
    }

    log('bright', '\n' + '='.repeat(60));
    log('bright', '  ClickHouse Cluster Integration Tests');
    log('bright', '='.repeat(60));
    const allModes = wantsCloud ? [...modesToRun, 'cloud'] : modesToRun;
    log('cyan', `\nModes to test: ${allModes.join(', ') || 'none'}`);
    log('cyan', `Skip teardown: ${options.skipTeardown}`);
    log('cyan', `Verbose: ${options.verbose}`);
    if (options.cloudUrl) {
        log('cyan', `Cloud URL: ${options.cloudUrl}`);
    }

    // Run tests for each Docker-based mode
    const results = [];
    for (const mode of modesToRun) {
        const result = await runModeTests(mode, options);
        results.push(result);
    }

    // Run cloud mode if requested
    if (wantsCloud && options.cloudUrl) {
        const result = await runCloudTests(options);
        results.push(result);
    }

    // Print summary
    log('bright', '\n' + '='.repeat(60));
    log('bright', '  TEST SUMMARY');
    log('bright', '='.repeat(60));

    let allPassed = true;
    for (const result of results) {
        const status = result.passed ? 'PASSED' : 'FAILED';
        const color = result.passed ? 'green' : 'red';
        log(color, `  ${result.mode.toUpperCase().padEnd(12)} ${status}`);
        if (result.error) {
            log('yellow', `    Error: ${result.error}`);
        }
        if (!result.passed) {
            allPassed = false;
        }
    }

    log('bright', '='.repeat(60));

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    if (allPassed) {
        log('green', `\nAll ${totalCount} mode(s) passed!`);
    }
    else {
        log('red', `\n${totalCount - passedCount} of ${totalCount} mode(s) failed`);
    }

    process.exit(allPassed ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
    main().catch(err => {
        log('red', `\nFatal error: ${err.message}`);
        console.error(err.stack);
        process.exit(1);
    });
}

module.exports = { runModeTests };
