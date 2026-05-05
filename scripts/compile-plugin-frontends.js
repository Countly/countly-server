/**
 * Compile plugin frontend TypeScript to JavaScript.
 * Scans plugins/ for frontend/tsconfig.json and runs tsc -p for each.
 * Run from core directory: node scripts/compile-plugin-frontends.js
 * Watch one plugin: node scripts/compile-plugin-frontends.js --watch <pluginName>
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const coreDir = path.resolve(__dirname, '..');
const pluginsDir = path.join(coreDir, 'plugins');

function getPluginsWithFrontendTs() {
    if (!fs.existsSync(pluginsDir)) {
        return [];
    }
    const entries = fs.readdirSync(pluginsDir);
    const plugins = entries.filter((name) => {
        const full = path.join(pluginsDir, name);
        return fs.statSync(full).isDirectory() || fs.lstatSync(full).isSymbolicLink();
    });
    return plugins.filter((name) => {
        const tsconfigPath = path.join(pluginsDir, name, 'frontend', 'tsconfig.json');
        return fs.existsSync(tsconfigPath);
    });
}

function runTsc(pluginName, watch, callback) {
    const frontendDir = path.join(pluginsDir, pluginName, 'frontend');
    const args = ['-p', frontendDir];
    if (watch) {
        args.push('-w');
    }
    const child = spawn('npx', ['tsc', ...args], {
        cwd: coreDir,
        stdio: 'inherit'
    });
    child.on('close', (code) => {
        if (callback) {
            callback(code);
        }
    });
    return child;
}

const args = process.argv.slice(2);
const watchIndex = args.indexOf('--watch');
const watch = watchIndex !== -1;
const pluginArg = watch ? args[watchIndex + 1] : null;

if (watch && pluginArg) {
    const plugins = getPluginsWithFrontendTs();
    if (!plugins.includes(pluginArg)) {
        console.error('Plugin "' + pluginArg + '" has no frontend/tsconfig.json. Plugins with frontend TS: ' + plugins.join(', ') || 'none');
        process.exit(1);
    }
    console.log('Watching plugin frontend TS: ' + pluginArg);
    runTsc(pluginArg, true);
}
else if (watch && !pluginArg) {
    console.error('Usage: node scripts/compile-plugin-frontends.js --watch <pluginName>');
    process.exit(1);
}
else {
    const plugins = getPluginsWithFrontendTs();
    if (plugins.length === 0) {
        console.log('No plugins with frontend/tsconfig.json found.');
        process.exit(0);
    }
    console.log('Compiling plugin frontends: ' + plugins.join(', '));
    let index = 0;
    const runNext = () => {
        if (index >= plugins.length) {
            console.log('Done compiling plugin frontends.');
            process.exit(0);
            return;
        }
        const plugin = plugins[index++];
        console.log('Compiling ' + plugin + '...');
        runTsc(plugin, false, (code) => {
            if (code !== 0) {
                console.error('tsc failed for plugin ' + plugin + ' (exit ' + code + ')');
                process.exit(code);
            }
            runNext();
        });
    };
    runNext();
}
