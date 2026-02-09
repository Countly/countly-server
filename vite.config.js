import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { globSync } from 'fs';
import vue from '@vitejs/plugin-vue2';
import * as babel from '@babel/core';

/**
 * Plugin to selectively clean only main bundle files from dist folder.
 * This preserves pace bundle files when rebuilding the main bundle.
 */
function cleanMainBundlePlugin() {
    const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'frontend/express/public/dist');

    return {
        name: 'clean-main-bundle-plugin',
        buildStart() {
            // Only clean files that belong to the main bundle, not pace bundle
            const patternsToClean = [
                // JS files (but not pace.bundle.*)
                { dir: 'js', pattern: /^countly\.(bundle|chunk)\..*\.js(\.map)?$/ },
                // CSS files (but not pace.bundle.*)
                { dir: 'css', pattern: /^countly\.bundle\..*\.css$/ },
                // Also clean plugin CSS files (main.*, etc.) but not pace.*
                { dir: 'css', pattern: /^(?!pace\.).*\.css$/ },
                // Assets folder
                { dir: 'assets', pattern: /.*/ },
                // Main manifest
                { dir: '.vite', pattern: /^manifest\.json$/ },
            ];

            for (const { dir, pattern } of patternsToClean) {
                const fullDir = path.join(distDir, dir);
                if (fs.existsSync(fullDir)) {
                    try {
                        const files = fs.readdirSync(fullDir);
                        for (const file of files) {
                            if (pattern.test(file)) {
                                const filePath = path.join(fullDir, file);
                                fs.rmSync(filePath, { recursive: true, force: true });
                            }
                        }
                    }
                    catch (err) {
                        console.warn(`[clean-main-bundle-plugin] Error cleaning ${fullDir}:`, err.message);
                    }
                }
            }

            console.log('[clean-main-bundle-plugin] Cleaned main bundle files from dist');
        },
    };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TODO: a separate build for prelogin files

const REFACTORED_PLUGINS = [
    "alerts",
    "browser",
    "star-rating",
];

// List of legacy scripts in exact order from dashboard.html
// These will be concatenated into a single scope
// COMMIT HASH BEFORE REMOVALS: d1167224987671af19c576fbd4c6d7ab56515dde
const legacyScripts = [
    // === HEAD SECTION (from dashboard.html lines 111-169) ===
    'javascripts/dom/gridstack/gridstack-h5.js', // install this into dashboard plugin (there's also a gridstack.css in entrypoint)
    // 'javascripts/utils/backbone-min.js',
    // 'javascripts/utils/jquery.i18n.properties.js',
    // 'javascripts/utils/store+json2.min.js',                                   - storejs IS INSTALLED. CHECK IF json2 IS NEEDED.
    // 'javascripts/utils/jquery.idle-timer.js',
    // 'javascripts/utils/initialAvatar.js',

    // 'javascripts/countly/countly.auth.js',
    // 'javascripts/countly/countly.common.js',
    // 'javascripts/countly/countly.config.js',
    // 'javascripts/countly/countly.helpers.js',
    // 'javascripts/countly/countly.event.js',
    // 'javascripts/countly/countly.session.js',
    // 'javascripts/countly/countly.location.js',
    // 'javascripts/countly/countly.device.list.js',
    // 'javascripts/countly/countly.device.osmapping.js',
    // 'javascripts/countly/countly.device.js',
    // 'javascripts/countly/countly.device.detail.js',
    // 'javascripts/countly/countly.app.version.js',
    // 'javascripts/countly/countly.carrier.js',
    // 'javascripts/countly/countly.total.users.js',
    // 'javascripts/countly/countly.app.users.js',
    // 'javascripts/countly/countly.token.manager.js',
    // 'javascripts/countly/countly.version.history.js',
    // 'javascripts/countly/countly.view.js',
    // 'javascripts/countly/vue/core.js',
    // 'javascripts/countly/vue/container.js',
    // 'javascripts/countly/countly.template.js',
    // 'javascripts/countly/vue/data/vuex.js',
    // 'javascripts/countly/countly.task.manager.js',
    // 'javascripts/countly/vue/components/nav.js',
    // 'javascripts/countly/vue/components/layout.js',
    // 'javascripts/countly/vue/components/form.js',
    // 'javascripts/countly/vue/components/date.js',
    // 'javascripts/countly/vue/components/dropdown.js',
    // 'javascripts/countly/vue/components/input.js',
    // 'javascripts/countly/vue/components/content.js',
    // 'javascripts/countly/vue/components/datatable.js',
    // 'javascripts/countly/vue/components/dialog.js',
    // 'javascripts/countly/vue/components/drawer.js',
    'core/notes/javascripts/countly.models.js', // TO-DO: will be moved to notes plugin, but for now it has to stay here because it's used in multiple places and too complicated for now
    'core/notes/javascripts/countly.common.notes.js', // TO-DO: same
    // 'javascripts/countly/vue/components/vis.js',
    // 'javascripts/countly/vue/components/helpers.js',
    // 'javascripts/countly/vue/components/progress.js',
    // 'javascripts/countly/vue/directives/scroll-shadow.js', // ESM - imported in entrypoint.js
    // 'javascripts/countly/countly.views.js',
    // 'javascripts/countly/countly.cms.js', // ESM - imported in entrypoint.js, exposed as window.countlyCMS
    'core/device-and-type/javascripts/countly.models.js',
    'core/device-and-type/javascripts/countly.views.js',
    // 'core/app-resolution/javascripts/countly.views.js',
    // 'core/app-version/javascripts/countly.views.js',
    // 'core/jobs/javascripts/countly.views.js',
    // 'core/logs/javascripts/countly.views.js',
    // 'core/token-manager/javascripts/countly.views.js',
    // 'core/report-manager/javascripts/countly.views.js',
    // 'core/platform/javascripts/countly.views.js',
    // 'core/carrier/javascripts/countly.models.js',
    // 'core/carrier/javascripts/countly.views.js',
    // 'core/user-activity/javascripts/countly.models.js',
    // 'core/user-activity/javascripts/countly.views.js',
    // 'core/session-overview/javascripts/countly.models.js',
    // 'core/session-overview/javascripts/countly.views.js',
    // 'core/session-durations/javascripts/countly.models.js',
    // 'core/session-durations/javascripts/countly.views.js',
    // 'core/session-frequency/javascripts/countly.models.js',
    // 'core/session-frequency/javascripts/countly.views.js',
    'core/events/javascripts/countly.details.models.js',
    'core/events/javascripts/countly.details.views.js',
    'core/events/javascripts/countly.overview.models.js',
    'core/events/javascripts/countly.overview.views.js',
    // 'core/geo-countries/javascripts/countly.cities.models.js',
    // 'core/geo-countries/javascripts/countly.models.js',
    // 'core/user-analytics-overview/javascripts/countly.views.js',
    // 'core/geo-countries/javascripts/countly.views.js',
    // 'core/geo-countries/javascripts/countly.widgets.geo.js',
    'core/app-management/javascripts/countly.models.js',
    'core/app-management/javascripts/countly.views.js',
    'core/user-management/javascripts/countly.models.js',
    'core/user-management/javascripts/countly.views.js',
    // 'core/home/javascripts/countly.models.js',
    // 'core/home/javascripts/countly.views.js',
    'core/notes/javascripts/countly.views.js',
    // 'core/version-history/javascripts/countly.views.js',
    // 'core/onboarding/javascripts/countly.models.js',
    // 'core/onboarding/javascripts/countly.views.js',
    // 'core/date-presets/javascripts/countly.views.js',
    // 'core/date-presets/javascripts/countly.models.js',
    // 'core/health-manager/javascripts/countly.models.js',
    // 'core/health-manager/javascripts/countly.views.js',

    // Only include if drill plugin exists (EE only)
    ...(fs.existsSync('./plugins/drill/frontend/public/javascripts/countly.query.builder.core.js')
        ? [
            "../../../plugins/drill/frontend/public/javascripts/countly.query.builder.core.js",
            "../../../plugins/drill/frontend/public/javascripts/countly.query.builder.views.js",
        ]
        : []),

    // nodejs doesn't pick up glob patterns when * is used for both directories and symlinks
    // ...globSync("./plugins/*/frontend/public/javascripts/*.js").map(f => "../../../" + f),
    ...globSync("./plugins/*")
        .filter(
            pluginPath => !REFACTORED_PLUGINS
                .map(plugin => `plugins/${plugin}`)
                .includes(pluginPath)
        )
        .map(pluginPath => globSync("./" + pluginPath + "/frontend/public/javascripts/*.js"))
        .flat()
        .map(f => "../../../" + f),

    // === SIDEBAR (loaded last after dynamic javascripts) ===
    'javascripts/countly/vue/components/sidebar.js',
];

/**
 * Vite plugin that concatenates legacy scripts into a single shared scope.
 * This mimics Grunt's concat behavior where all scripts share the same global scope.
 */
function legacyConcatPlugin() {
    const virtualModuleId = 'virtual:legacy-concat';
    const resolvedVirtualModuleId = '\0' + virtualModuleId;
    const publicDir = path.resolve(__dirname, 'frontend/express/public');

    return {
        name: 'legacy-concat-plugin',

        resolveId(id) {
            if (id === virtualModuleId) {
                return resolvedVirtualModuleId;
            }
        },

        load(id) {
            if (id === resolvedVirtualModuleId) {
                const addLogs = false;
                const separator = '\n;\n';
                const contents = [];
                const loadedFiles = [];
                const missingFiles = [];

                for (const scriptPath of legacyScripts) {
                    const fullPath = path.join(publicDir, scriptPath);
                    try {
                        if (fs.existsSync(fullPath)) {
                            const content = fs.readFileSync(fullPath, 'utf-8');
                            // Add a console.log before each file for debugging
                            contents.push(`
/* ============================================================ */
/* FILE: ${scriptPath} */
/* ============================================================ */
${addLogs ? `console.log('[LegacyBundle] Loading: ${scriptPath}');` : ''}
${content}`);
                            loadedFiles.push(scriptPath);
                        }
                        else {
                            missingFiles.push(scriptPath);
                            console.warn(`[legacy-concat-plugin] File not found: ${scriptPath}`);
                        }
                    }
                    catch (err) {
                        missingFiles.push(scriptPath);
                        console.error(`[legacy-concat-plugin] Error reading: ${scriptPath}`, err.message);
                    }
                }

                // Log summary during build
                console.log(`[legacy-concat-plugin] Loaded ${loadedFiles.length} files`);
                if (missingFiles.length > 0) {
                    console.warn(`[legacy-concat-plugin] Missing ${missingFiles.length} files:`, missingFiles);
                }

                const concatenated = contents.join(separator);

                // Wrap in an IIFE to create a single scope for all scripts
                return `// Legacy scripts concatenated into a single bundle
// Total files: ${loadedFiles.length}
// Missing files: ${missingFiles.length}
${addLogs ? `console.log('[LegacyBundle] Starting legacy bundle load...');
console.log('[LegacyBundle] Total files to load: ${loadedFiles.length}');` : ''}

${missingFiles.length > 0 ? `console.warn('[LegacyBundle] Missing files:', ${JSON.stringify(missingFiles)});` : ''}

(function() {
${concatenated}
})();

window.logLoadedLegacyFiles && console.log('[LegacyBundle] Finished loading legacy bundle');
export default {};
`;
            }
        },
    };
}

/**
 * Custom Vite plugin to handle Vue 2 JSX transformation using Babel.
 * This replaces @vitejs/plugin-vue2-jsx which doesn't support Vite 7.
 */
function vue2JsxPlugin() {
    // Patterns for files that contain JSX and need transformation
    const jsxPatterns = [
        /\.jsx$/,
        /node_modules\/element-ui\/packages\/.*\.js$/,
        /node_modules\/element-ui\/packages\/.*\.vue$/,
    ];

    const shouldTransform = (id) => {
        return jsxPatterns.some(pattern => pattern.test(id));
    };

    return {
        name: 'vue2-jsx-plugin',
        enforce: 'pre', // Run before vue plugin

        async transform(code, id) {
            // Handle .vue files - extract and transform script block
            if (id.endsWith('.vue') && shouldTransform(id)) {
                // Extract script content
                const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/);
                if (!scriptMatch) {
                    return null;
                }

                const scriptContent = scriptMatch[1];

                try {
                    const result = await babel.transformAsync(scriptContent, {
                        filename: id,
                        presets: ['@vue/babel-preset-jsx'],
                        sourceType: 'module',
                        sourceMaps: true,
                    });

                    if (result && result.code) {
                        const newCode = code.replace(scriptMatch[1], result.code);
                        return {
                            code: newCode,
                            map: result.map,
                        };
                    }
                }
                catch (err) {
                    console.error(`[vue2-jsx-plugin] Error transforming ${id}:`, err.message);
                }

                return null;
            }

            // Handle .jsx and .js files with JSX
            if ((id.endsWith('.jsx') || id.endsWith('.js')) && shouldTransform(id)) {
                try {
                    const result = await babel.transformAsync(code, {
                        filename: id,
                        presets: ['@vue/babel-preset-jsx'],
                        sourceType: 'module',
                        sourceMaps: true,
                    });

                    if (result && result.code) {
                        return {
                            code: result.code,
                            map: result.map,
                        };
                    }
                }
                catch (err) {
                    console.error(`[vue2-jsx-plugin] Error transforming ${id}:`, err.message);
                }
            }

            return null;
        },
    };
}

export default defineConfig({
    root: path.resolve(__dirname, 'frontend/express/public'),
    base: '/dist/',

    plugins: [
        cleanMainBundlePlugin(),
        vue2JsxPlugin(),
        vue(),
        legacyConcatPlugin(),
    ],

    build: {
        outDir: path.resolve(__dirname, 'frontend/express/public/dist'),
        emptyOutDir: false,
        sourcemap: true,
        manifest: true,
        // minify: false,

        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'frontend/express/public/entrypoint.js'),
            },
            output: {
                entryFileNames: 'js/countly.bundle.[hash].js',
                chunkFileNames: 'js/countly.chunk.[hash].js',
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name.endsWith('.css')) {
                        return 'css/countly.bundle.[hash].css';
                    }
                    return 'assets/[name].[hash][extname]';
                },
                format: 'iife',
                inlineDynamicImports: true,
            },
            treeshake: false,
        },

        cssCodeSplit: false,
        chunkSizeWarningLimit: 10000,
        modulePreload: false,
    },

    resolve: {
        preserveSymlinks: true,
        alias: {
            // TODO: REMOVE THIS AFTER SWITCHING TO SINGLE FILE COMPONENTS (.vue)
            'vue': 'vue/dist/vue.esm.js',
            // Redirect element-ui/lib/* to element-ui/packages/* for element-tiptap compatibility
            // (we use a custom version of element-ui that doesn't have the lib folder)
            // TODO: REMOVE THIS AFTER SWITCHING TO VUE3
            'element-ui/lib': 'element-ui/packages',
        },
        extensions: ['.vue', '.js', '.json', '.css']
    },

    esbuild: {
        keepNames: true,
    },

    logLevel: 'info',
});
