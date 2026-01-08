/**
 * Mocha config for single plugin tests
 * Usage: npm run test:plugin -- <plugin-name>
 */

const fs = require('fs');
const path = require('path');

// Get plugin name from command line args (after --)
// process.argv: ['node', 'mocha.js', '--config', 'single-plugin.js', 'pluginName']
const pluginName = process.argv[process.argv.length - 1];
if (!pluginName || pluginName.startsWith('-') || pluginName.endsWith('.js')) {
    console.error('[test-config] Error: Plugin name is required');
    console.error('Usage: npm run test:plugin -- <plugin-name>');
    process.exit(1);
}

// Setup NODE_PATH for symlinked plugins to find core modules
const corePath = path.resolve(__dirname, '../../..');
const nodeModulesPath = path.resolve(corePath, 'node_modules');
process.env.NODE_PATH = [nodeModulesPath, corePath, process.env.NODE_PATH].filter(Boolean).join(':');
require('module').Module._initPaths();

const pluginsDir = path.resolve(corePath, 'plugins');

// Source files (plugins repo is 4 levels up from core/test/configs/mocha)
const eePluginsPath = path.resolve(__dirname, '../../../../plugins/plugins.ee.json');
const defaultPluginsPath = path.resolve(pluginsDir, 'plugins.default.json');

// Destination files
const pluginsPath = path.resolve(pluginsDir, 'plugins.json');
const pluginsBackupPath = path.resolve(pluginsDir, 'plugins.json.test-backup');

// Use plugins.ee.json (contains ALL plugins) so any plugin will be enabled
if (fs.existsSync(eePluginsPath)) {
    if (fs.existsSync(pluginsPath)) {
        fs.copyFileSync(pluginsPath, pluginsBackupPath);
    }
    fs.copyFileSync(eePluginsPath, pluginsPath);
    console.log('[test-config] Using plugins.ee.json (all plugins enabled)');
}
else if (fs.existsSync(defaultPluginsPath)) {
    // Fallback to CE plugins if EE not available
    if (fs.existsSync(pluginsPath)) {
        fs.copyFileSync(pluginsPath, pluginsBackupPath);
    }
    fs.copyFileSync(defaultPluginsPath, pluginsPath);
    console.log('[test-config] Using plugins.default.json (CE plugins)');
}
else {
    console.warn('[test-config] No plugin list found, using existing plugins.json');
}

// Verify plugin exists
const pluginPath = path.resolve(corePath, 'plugins', pluginName);
if (!fs.existsSync(pluginPath)) {
    console.error(`[test-config] Error: Plugin '${pluginName}' not found at ${pluginPath}`);
    process.exit(1);
}

// Check for test files
const testsFile = path.join(pluginPath, 'tests.js');
const testsDir = path.join(pluginPath, 'tests');
const hasTestsFile = fs.existsSync(testsFile);
const hasTestsDir = fs.existsSync(testsDir);

if (!hasTestsFile && !hasTestsDir) {
    console.error(`[test-config] Error: No tests found for plugin '${pluginName}'`);
    console.error(`  Expected: ${testsFile} or ${testsDir}/`);
    process.exit(1);
}

console.log(`[test-config] Running tests for plugin: ${pluginName}`);

// Build spec array
const specs = ['test/1.frontend/0.load.db.js'];
if (hasTestsFile) {
    specs.push(`plugins/${pluginName}/tests.js`);
}
if (hasTestsDir) {
    specs.push(`plugins/${pluginName}/tests/**/*.js`);
}
specs.push('test/5.cleanup/100.close.db.js');

// Set plugin test credentials
process.env.COUNTLY_TEST_APP_ID = '58bf06bd6cba850047ac9f19';
process.env.COUNTLY_TEST_APP_KEY = 'b41e02136be60a58b9b7459ad89030537a58e099';
process.env.COUNTLY_TEST_API_KEY_ADMIN = 'e6bfab40a224d55a2f5d40c83abc7ed4';

module.exports = {
    bail: false,
    spec: specs,
    ignore: [
        '**/*.unit.js',
        '**/3.debug.js',
        '**/tests/data.js' // cohorts/tests/data.js is disabled (uses realtime_cohorts:false, legacy test)
    ],
    require: ['test/configs/mocha/integration-hooks.js'],
    reporter: 'spec',
    timeout: 180000
};
