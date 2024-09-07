const glob = require('glob');
const path = require('path');
const { spawn } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
let includePlugins = [];
let excludePlugins = [];

args.forEach(arg => {
    if (arg.startsWith('--include=')) {
        includePlugins = arg.replace('--include=', '').split(',');
    }
    else if (arg.startsWith('--exclude=')) {
        excludePlugins = arg.replace('--exclude=', '').split(',');
    }
});

// Find all plugin names
const pluginNames = glob.sync('plugins/*').map(plugin => path.basename(plugin));

// Function to get test file path for a plugin
function getTestPath(pluginName) {
    const possiblePaths = [
        path.resolve(`plugins/${pluginName}/tests`),
        path.resolve(`plugins/${pluginName}/tests.js`)
    ];

    for (const testPath of possiblePaths) {
        try {
            require.resolve(testPath);
            return testPath;
        }
        catch (err) {
            // ignore
        }
    }
    return null;
}

// Filter plugins based on include/exclude lists and existing tests
let pluginsWithTests = pluginNames.filter(plugin => getTestPath(plugin) !== null);

if (includePlugins.length > 0) {
    pluginsWithTests = pluginsWithTests.filter(plugin => includePlugins.includes(plugin));
}
else if (excludePlugins.length > 0) {
    pluginsWithTests = pluginsWithTests.filter(plugin => !excludePlugins.includes(plugin));
}

// Set the maximum number of processes (default to number of CPU cores)
const MAX_PROCESSES = process.env.MAX_PROCESSES || require('os').cpus().length;

// Setup and teardown file paths
const SETUP_FILE = 'test/4.plugins/separation/1.setup.js';
const TEARDOWN_FILE = 'test/4.plugins/separation/2.teardown.js';

// Function to run Mocha for multiple plugins
function runMochaForPlugins(plugins) {
    return new Promise((resolve) => {
        console.log(`Running tests for plugins: ${plugins.join(', ')}`);

        const mochaArgs = [
            'mocha',
            '--reporter', 'min',
            '--timeout', '50000',
            '--colors',
            // '--debug',
            // '--trace-warnings',
            // '--trace-deprecation'
        ];

        // Add symlink-related arguments only if COUNTLY_CONFIG__SYMLINKED is true
        if (process.env.COUNTLY_CONFIG__SYMLINKED === 'true') {
            mochaArgs.push('--preserve-symlinks', '--preserve-symlinks-main');
        }

        // Add setup file, test paths, and teardown file to the arguments
        mochaArgs.push(
            SETUP_FILE,
            ...plugins.map(getTestPath).filter(Boolean),
            TEARDOWN_FILE
        );

        console.log(mochaArgs);
        // process.exit(0);

        const mochaProcess = spawn('npx', mochaArgs, {
            stdio: ['inherit', 'pipe', 'pipe'],
            env: { ...process.env }
        });

        let output = '';
        mochaProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        mochaProcess.stderr.on('data', (data) => {
            output += data.toString();
        });

        mochaProcess.on('close', (code) => {
            resolve({
                plugins,
                success: code === 0,
                output
            });
        });
    });
}

// Divide plugins among processes
function chunkArray(array, chunks) {
    const result = [];
    const chunkSize = Math.ceil(array.length / chunks);
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize));
    }
    return result;
}

// Run tests in batches
async function runTestsInBatches() {
    const pluginChunks = chunkArray(pluginsWithTests, MAX_PROCESSES);
    const results = await Promise.all(pluginChunks.map(runMochaForPlugins));

    let allPassed = true;
    const failedPlugins = [];

    console.log('\n=== Test Results ===\n');

    results.forEach(result => {
        if (result.success) {
            console.log(`✅ Plugins passed: ${result.plugins.join(', ')}`);
        }
        else {
            console.log(`❌ Plugins failed: ${result.plugins.join(', ')}`);
            failedPlugins.push(...result.plugins);
            allPassed = false;
        }
    });

    if (!allPassed) {
        console.log('\n=== Detailed Output for Failed Tests ===\n');

        results.forEach(result => {
            if (!result.success) {
                console.log(`--- Output for failed plugins: ${result.plugins.join(', ')} ---`);
                console.log(result.output);
                console.log('---\n');
            }
        });

        console.error(`Tests failed for the following plugins: ${failedPlugins.join(', ')}`);
        process.exit(1);
    }
    else {
        console.log('\nAll test batches completed successfully');
        process.exit(0);
    }
}

console.log(`Found ${pluginsWithTests.length} plugins with tests`);
console.log(`Running tests with a maximum of ${MAX_PROCESSES} processes`);
console.log(`Symlink preservation is ${process.env.COUNTLY_CONFIG__SYMLINKED === 'true' ? 'enabled' : 'disabled'}`);
runTestsInBatches();