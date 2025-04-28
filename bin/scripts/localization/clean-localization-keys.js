/**
 * Script to clean unused localization keys from Countly plugin properties files
 * 
 * This script:
 * 1. Reads all keys from a plugin's localization properties file
 * 2. Scans the entire project to find localization key usage
 * 3. Identifies unused keys and creates a new properties file without them
 * 
 * Usage: node clean-localization-keys.js <plugin-name> [<properties-file>]
 * Example: node clean-localization-keys.js alerts
 *          node clean-localization-keys.js surveys surveys
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const readdir = util.promisify(fs.readdir);
const access = util.promisify(fs.access);

// Get plugin name from command line arguments
const pluginName = process.argv[2];
// Get properties file name (defaults to plugin name if not provided)
const propertiesFileName = process.argv[3] || pluginName;

// Check if plugin name was provided
if (!pluginName) {
    console.error('Error: No plugin name provided');
    console.error('Usage: node clean-localization-keys.js <plugin-name> [<properties-file>]');
    console.error('Example: node clean-localization-keys.js alerts');
    console.error('         node clean-localization-keys.js surveys surveys');
    process.exit(1);
}

// Define paths - fixed to correctly reference the root directory
const scriptDir = __dirname;
const countlyRoot = path.resolve(scriptDir, '../../..'); // Go up three levels from bin/scripts/localization
const pluginPath = path.join(countlyRoot, 'plugins', pluginName);
const localizationPath = path.join(pluginPath, 'frontend', 'public', 'localization', `${propertiesFileName}.properties`);

// Check if plugin directory exists
(async function() {
    try {
        await access(pluginPath, fs.constants.F_OK);
    }
    catch (err) {
        console.error(`Error: Plugin '${pluginName}' not found at ${pluginPath}`);
        process.exit(1);
    }

    // Check if properties file exists
    try {
        await access(localizationPath, fs.constants.F_OK);
    }
    catch (err) {
        console.error(`Error: Properties file not found at ${localizationPath}`);
        console.error(`Make sure the plugin has a localization file at: frontend/public/localization/${propertiesFileName}.properties`);
        process.exit(1);
    }

    await cleanUnusedKeys();
})();

/**
 * Recursively get all JavaScript and HTML files in a directory and its subdirectories
 * @param {string} dir - Directory path
 * @param {Array} extensions - Array of file extensions to include (e.g., ['.js', '.html'])
 * @param {Array} excludeDirs - Array of directory names to exclude
 * @returns {Promise<string[]>} - Array of file paths
 */
async function getFilesWithExtensions(dir, extensions, excludeDirs = ['node_modules', '.git']) {
    try {
        const entries = await readdir(dir, { withFileTypes: true });
        const files = await Promise.all(entries.map(async(entry) => {
            const fullPath = path.resolve(dir, entry.name);

            try {
                if (entry.isDirectory()) {
                    if (excludeDirs.includes(entry.name)) {
                        return [];
                    }
                    return getFilesWithExtensions(fullPath, extensions, excludeDirs);
                }

                if (extensions.some(ext => entry.name.endsWith(ext))) {
                    return [fullPath];
                }
                return [];
            }
            catch (err) {
                console.warn(`Warning: Could not process ${fullPath}: ${err.message}`);
                return [];
            }
        }));
        return files.flat();
    }
    catch (err) {
        console.warn(`Warning: Could not read directory ${dir}: ${err.message}`);
        return [];
    }
}

/**
 * Extract keys from properties file
 * @param {string} filePath - Path to properties file
 * @returns {Promise<Object>} - Map of key to value and line number
 */
async function extractKeysFromProperties(filePath) {
    const content = await readFile(filePath, 'utf8');
    const lines = content.split('\n');

    const keys = {};
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '' || line.trim().startsWith('#')) {
            continue; // Skip empty lines and comments
        }

        const equalPos = line.indexOf('=');
        if (equalPos > 0) {
            const key = line.substring(0, equalPos).trim();
            const value = line.substring(equalPos + 1).trim();
            keys[key] = { value, lineNumber: i };
        }
    }

    return keys;
}

/**
 * Check if a key is used anywhere in the project
 * @param {string} key - The localization key
 * @param {string[]} files - List of files to check
 * @returns {Promise<boolean>} - Whether the key is used
 */
async function isKeyUsed(key, files) {
    // Different patterns for how keys might be used in the code
    const patterns = [
        `["${key}"]`, // jQuery.i18n.map["key"]
        `['${key}']`, // jQuery.i18n.map['key']
        `"${key}"`, // In various contexts
        `'${key}'`, // In various contexts
        `\`${key}\``, // Template literals
        `data-localize="${key}"`, // HTML data-localize attribute
        `data-localize='${key}'` // HTML data-localize attribute with single quotes
    ];

    for (const file of files) {
        try {
            const content = await readFile(file, 'utf8');

            for (const pattern of patterns) {
                if (content.includes(pattern)) {
                    // Found usage, return true immediately
                    return true;
                }
            }
        }
        catch (err) {
            console.warn(`Warning: Could not read file ${file}: ${err.message}`);
        }
    }

    return false;
}

/**
 * Create a new properties file without unused keys
 * @param {Object} keys - Map of all keys
 * @param {string[]} unusedKeys - List of unused keys
 * @param {string} filePath - Path to original properties file
 */
async function createCleanedProperties(keys, unusedKeys, filePath) {
    const content = await readFile(filePath, 'utf8');
    const lines = content.split('\n');

    // Mark lines that contain unused keys for removal
    const linesToRemove = new Set();
    for (const key of unusedKeys) {
        if (keys[key]) {
            linesToRemove.add(keys[key].lineNumber);
        }
    }

    // Create new content without the unused keys
    const newLines = lines.filter((_, i) => !linesToRemove.has(i));

    // Write the new content back to the file
    const newPath = path.join(path.dirname(filePath), `${path.basename(filePath)}.clean`);
    await writeFile(newPath, newLines.join('\n'));
    return newPath;
}

/**
 * Main function that runs the cleanup
 */
async function cleanUnusedKeys() {
    try {
        console.log(`Scanning files for unused localization keys in plugin: ${pluginName}...`);

        // Get relevant files across the entire project (JS, HTML files)
        const projectFiles = await getFilesWithExtensions(countlyRoot, ['.js', '.html', '.hbs', '.ejs', '.vue'], ['node_modules', '.git', 'dump', 'log']);
        console.log(`Found ${projectFiles.length} relevant files to scan across the project.`);

        // Extract keys from properties file
        const keys = await extractKeysFromProperties(localizationPath);
        console.log(`Found ${Object.keys(keys).length} localization keys in ${propertiesFileName}.properties.`);

        // Find unused keys
        const unusedKeys = [];
        let checkedCount = 0;

        for (const key of Object.keys(keys)) {
            const isUsed = await isKeyUsed(key, projectFiles);
            if (!isUsed) {
                unusedKeys.push(key);
            }

            // Show progress
            checkedCount++;
            if (checkedCount % 10 === 0 || checkedCount === Object.keys(keys).length) {
                process.stdout.write(`\rChecked ${checkedCount}/${Object.keys(keys).length} keys...`);
            }
        }
        console.log(); // New line after progress

        console.log(`Found ${unusedKeys.length} unused keys.`);

        if (unusedKeys.length > 0) {
            console.log('Unused keys:');
            unusedKeys.forEach(key => {
                console.log(`- ${key}`);
            });

            // Create a new properties file without the unused keys
            const newPath = await createCleanedProperties(keys, unusedKeys, localizationPath);
            console.log(`\nCleaned properties file created at: ${newPath}`);
        }
        else {
            console.log('No unused keys found. Great job!');
        }

    }
    catch (err) {
        console.error('Error:', err);
    }
}