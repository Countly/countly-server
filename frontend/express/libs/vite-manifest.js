/**
 * Vite Manifest Helper
 *
 * Utility to read Vite's manifest.json and provide asset paths for use in templates.
 * This allows you to reference Vite-generated files with hashed names in your HTML templates.
 *
 * Usage in Express:
 *
 * const viteManifest = require('./libs/vite-manifest');
 *
 * app.locals.getViteAsset = viteManifest.getAssetPath;
 * app.locals.getViteAssets = viteManifest.getAssets;
 *
 * Then in your EJS/Handlebars templates:
 *
 * <link rel="stylesheet" href="<%= getViteAsset('entrypoint.js', 'css') %>">
 * <script src="<%= getViteAsset('entrypoint.js', 'js') %>"></script>
 */

const fs = require('fs');
const path = require('path');

// Cache for the manifests
let manifestCache = null;
let manifestPath = null;
let paceManifestCache = null;
let paceManifestPath = null;
let vendorManifestCache = null;
let vendorManifestPath = null;

/**
 * Initialize the manifest helper with the path to the manifest file
 * @param {string} customPath - Optional custom path to manifest.json
 */
function init(customPath) {
    if (customPath) {
        manifestPath = customPath;
    }
    else {
        manifestPath = path.join(__dirname, '../public/dist/.vite/manifest.json');
    }

    // Try alternate location if default doesn't exist
    if (!fs.existsSync(manifestPath)) {
        manifestPath = path.join(__dirname, '../public/dist/manifest.json');
    }

    // Initialize pace manifest path
    paceManifestPath = path.join(__dirname, '../public/dist/.vite/pace-manifest.json');
    if (!fs.existsSync(paceManifestPath)) {
        paceManifestPath = path.join(__dirname, '../public/dist/pace-manifest.json');
    }

    // Initialize vendor manifest path
    vendorManifestPath = path.join(__dirname, '../public/dist/.vite/vendor-manifest.json');
    if (!fs.existsSync(vendorManifestPath)) {
        vendorManifestPath = path.join(__dirname, '../public/dist/vendor-manifest.json');
    }
}

/**
 * Load and parse the manifest.json file
 * @param {boolean} forceReload - Force reload from disk (useful in development)
 * @returns {object} The parsed manifest object
 */
function loadManifest(forceReload = false) {
    // In development, always reload. In production, use cache.
    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (!forceReload && !isDevelopment && manifestCache) {
        return manifestCache;
    }

    if (!manifestPath) {
        init();
    }

    try {
        if (!fs.existsSync(manifestPath)) {
            console.warn(`[Vite Manifest] Manifest file not found at ${manifestPath}`);
            console.warn('[Vite Manifest] Run "npm run build:vite" to generate the manifest');
            return {};
        }

        const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
        manifestCache = JSON.parse(manifestContent);
        return manifestCache;
    }
    catch (error) {
        console.error('[Vite Manifest] Error loading manifest:', error);
        return {};
    }
}

/**
 * Load and parse the pace-manifest.json file
 * @param {boolean} forceReload - Force reload from disk (useful in development)
 * @returns {object} The parsed pace manifest object
 */
function loadPaceManifest(forceReload = false) {
    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (!forceReload && !isDevelopment && paceManifestCache) {
        return paceManifestCache;
    }

    if (!paceManifestPath) {
        init();
    }

    try {
        if (!fs.existsSync(paceManifestPath)) {
            console.warn(`[Vite Manifest] Pace manifest file not found at ${paceManifestPath}`);
            console.warn('[Vite Manifest] Run "npm run build:pace" to generate the pace manifest');
            return {};
        }

        const manifestContent = fs.readFileSync(paceManifestPath, 'utf-8');
        paceManifestCache = JSON.parse(manifestContent);
        return paceManifestCache;
    }
    catch (error) {
        console.error('[Vite Manifest] Error loading pace manifest:', error);
        return {};
    }
}

/**
 * Load and parse the vendor-manifest.json file
 * @param {boolean} forceReload - Force reload from disk (useful in development)
 * @returns {object} The parsed vendor manifest object
 */
function loadVendorManifest(forceReload = false) {
    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (!forceReload && !isDevelopment && vendorManifestCache) {
        return vendorManifestCache;
    }

    if (!vendorManifestPath) {
        init();
    }

    try {
        if (!fs.existsSync(vendorManifestPath)) {
            // Vendor manifest is optional — only exists for dev builds
            return null;
        }

        const manifestContent = fs.readFileSync(vendorManifestPath, 'utf-8');
        vendorManifestCache = JSON.parse(manifestContent);
        return vendorManifestCache;
    }
    catch (error) {
        console.error('[Vite Manifest] Error loading vendor manifest:', error);
        return null;
    }
}

/**
 * Get the path to a bundled asset
 * @param {string} entryName - The name of the entry point (e.g., 'entrypoint.js' or 'pace.js')
 * @param {string} type - The type of asset: 'js', 'css', or 'file'
 * @param {number} index - For multiple CSS files, which index to return (default: 0)
 * @returns {string} The path to the asset, or empty string if not found
 */
function getAssetPath(entryName = 'entrypoint.js', type = 'js', index = 0) {
    // Use pace manifest for pace.js entry
    const manifest = entryName === 'pace.js' ? loadPaceManifest() : entryName === 'vendor-entrypoint.js' ? loadVendorManifest() : loadManifest();

    if (!manifest || Object.keys(manifest).length === 0) {
        // Fallback to Grunt paths if Vite manifest doesn't exist
        console.warn('[Vite Manifest] Using Grunt fallback paths');
        return getFallbackPath(type);
    }

    const entry = manifest[entryName];
    const cssEntry = manifest['style.css'];

    if (!entry) {
        console.warn(`[Vite Manifest] Entry "${entryName}" not found in manifest`);
        return '';
    }

    switch (type) {
    case 'js':
        return entry.file ? `/dist/${entry.file}` : '';

    case 'css':
        // First check if CSS is in the entry's css array
        if (entry.css && entry.css.length > index) {
            return `/dist/${entry.css[index]}`;
        }
        // Fallback: Look for standalone CSS entry (e.g., 'style.css')
        // Vite with cssCodeSplit: false puts CSS in a separate manifest entry
        if (cssEntry && cssEntry.file) {
            return `/dist/${cssEntry.file}`;
        }
        return '';

    case 'file':
        return entry.file ? `/dist/${entry.file}` : '';

    default:
        console.warn(`[Vite Manifest] Unknown asset type: ${type}`);
        return '';
    }
}

/**
 * Get all assets for an entry point
 * @param {string} entryName - The name of the entry point (e.g., 'entrypoint.js' or 'pace.js')
 * @returns {object} Object with 'js' and 'css' arrays
 */
function getAssets(entryName = 'entrypoint.js') {
    const manifest = entryName === 'pace.js' ? loadPaceManifest() : entryName === 'vendor-entrypoint.js' ? loadVendorManifest() : loadManifest();

    if (!manifest || Object.keys(manifest).length === 0) {
        return {
            js: [getFallbackPath('js')],
            css: [getFallbackPath('css')]
        };
    }

    const entry = manifest[entryName];

    if (!entry) {
        console.warn(`[Vite Manifest] Entry "${entryName}" not found in manifest`);
        return { js: [], css: [] };
    }

    // Get CSS files - check entry's css array first, then fallback to style.css entry
    let cssFiles = [];
    if (entry.css && entry.css.length > 0) {
        cssFiles = entry.css.map(file => `/dist/${file}`);
    }
    else {
        // Fallback: Look for standalone CSS entry (e.g., 'style.css')
        const cssEntry = manifest['style.css'];
        if (cssEntry && cssEntry.file) {
            cssFiles = [`/dist/${cssEntry.file}`];
        }
    }

    return {
        js: entry.file ? [`/dist/${entry.file}`] : [],
        css: cssFiles
    };
}

/**
 * Get all CSS files for an entry point
 * @param {string} entryName - The name of the entry point (e.g., 'entrypoint.js' or 'pace.js')
 * @returns {string[]} Array of CSS file paths
 */
function getCssFiles(entryName = 'entrypoint.js') {
    const manifest = entryName === 'pace.js' ? loadPaceManifest() : entryName === 'vendor-entrypoint.js' ? loadVendorManifest() : loadManifest();

    if (!manifest || Object.keys(manifest).length === 0) {
        return [getFallbackPath('css')];
    }

    const entry = manifest[entryName];

    // Check entry's css array first
    if (entry && entry.css && entry.css.length > 0) {
        return entry.css.map(file => `/dist/${file}`);
    }

    // Fallback: Look for standalone CSS entry (e.g., 'style.css')
    // Vite with cssCodeSplit: false puts CSS in a separate manifest entry
    const cssEntry = manifest['style.css'];
    if (cssEntry && cssEntry.file) {
        return [`/dist/${cssEntry.file}`];
    }

    return [];
}

/**
 * Get the JavaScript file for an entry point
 * @param {string} entryName - The name of the entry point
 * @returns {string} The JS file path
 */
function getJsFile(entryName = 'entrypoint.js') {
    return getAssetPath(entryName, 'js');
}

/**
 * Fallback paths for when Vite hasn't been built yet
 * This allows gradual migration from Grunt to Vite
 * @param {string} type - The type of asset
 * @returns {string} Fallback path
 */
function getFallbackPath(type) {
    switch (type) {
    case 'js':
        return '/javascripts/min/countly.lib.js';
    case 'css':
        return '/stylesheets/main.min.css';
    default:
        return '';
    }
}

/**
 * Check if Vite build exists
 * @returns {boolean} True if manifest exists
 */
function hasViteBuild() {
    if (!manifestPath) {
        init();
    }
    return fs.existsSync(manifestPath);
}

/**
 * Get script tag HTML for an entry point
 * @param {string} entryName - The name of the entry point
 * @param {object} options - Options for script tag (async, defer, type)
 * @returns {string} HTML script tag
 */
function getScriptTag(entryName = 'entrypoint.js', options = {}) {
    const jsFile = getJsFile(entryName);

    if (!jsFile) {
        return '';
    }

    const attrs = [];
    if (options.async) {
        attrs.push('async');
    }
    if (options.defer) {
        attrs.push('defer');
    }
    if (options.type) {
        attrs.push(`type="${options.type}"`);
    }

    const attrString = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

    return `<script src="${jsFile}"${attrString}></script>`;
}

/**
 * Get link tag HTML for CSS files
 * @param {string} entryName - The name of the entry point
 * @returns {string} HTML link tags
 */
function getLinkTags(entryName = 'entrypoint.js') {
    const cssFiles = getCssFiles(entryName);

    return cssFiles
        .map(file => `<link rel="stylesheet" href="${file}">`)
        .join('\n');
}

/**
 * Clear the manifest cache
 * Useful in development when manifest changes
 */
function clearCache() {
    manifestCache = null;
    paceManifestCache = null;
    vendorManifestCache = null;
}

// Initialize on require
init();

module.exports = {
    init,
    loadManifest,
    loadPaceManifest,
    loadVendorManifest,
    getAssetPath,
    getAssets,
    getCssFiles,
    getJsFile,
    hasViteBuild,
    getScriptTag,
    getLinkTags,
    clearCache,

    // Aliases for convenience
    getJs: getJsFile,
    getCss: getCssFiles,
};