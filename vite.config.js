import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { globSync } from 'fs';
import vue from '@vitejs/plugin-vue2';

const __filename = fileURLToPath(import.meta.url); // eslint-disable-line
const __dirname = path.dirname(__filename);

// TODO: a separate build for prelogin files

// List of legacy scripts in exact order from dashboard.html
// These will be concatenated into a single scope
const legacyScripts = [
    // === HEAD SECTION (from dashboard.html lines 111-169) ===
    // 'javascripts/dom/jquery/jquery.js',                                       - DELETE. IMPORTED IN imports.js AS ES MODULE.
    // 'javascripts/utils/polyfills.js',                                         - DELETE. NOT NEEDED ANYMORE.
    // 'javascripts/utils/underscore-min.js',                                    - DELETE. IMPORTED IN imports.js AS ES MODULE.
    // 'javascripts/utils/lodash.merge.js',                                      - DELETE. IMPORTED IN imports.js AS ES MODULE.
    // 'javascripts/utils/lodash.mergeWith.js',                                  - DELETE. IMPORTED IN imports.js AS ES MODULE.
    // 'javascripts/utils/prefixfree.min.js',                                    - SEEMS LIKE IT'S NOT BEING USED ANYWHERE. BUT DO NOT DELETE FOR NOW.
    'javascripts/dom/gridstack/gridstack-h5.js', // install this into dashboard plugin (there's also a gridstack.css in entrypoint)
    // 'javascripts/utils/moment/moment-with-locales.min.js',                    - DELETE. IMPORTED IN imports.js AS ES MODULE.
    // 'javascripts/utils/backbone-min.js',
    // 'javascripts/utils/jquery.i18n.properties.js',
    // 'javascripts/utils/store+json2.min.js',                                   - storejs IS IMPORTED. CHECK IF json2 IS NEEDED.
    // 'javascripts/utils/jquery.idle-timer.js',
    'javascripts/utils/initialAvatar.js',
    'javascripts/utils/highlight/highlight.pack.js',
    // 'javascripts/utils/jquery.xss.js',
    'javascripts/utils/webfont.js',
    'javascripts/utils/leaflet.js',
    'javascripts/utils/js-deep-equals.unsorted.min.js',
    // 'javascripts/utils/polyfill/es6-promise.auto.min.js',                     - DELETE. NOT NEEDED ANYMORE.
    'javascripts/utils/polyfill/intersection-observer.js', // might not be needed anymore: https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver
    // 'javascripts/utils/vue/vue.min.js',                                       - DELETE. IMPORTED IN imports.js AS ES MODULE.
    // 'javascripts/utils/vue/composition-api.min.js',                           - DELETE. NOT NEEDED ANYMORE.
    // 'javascripts/utils/vue/vuex.min.js',                                      - DELETE.
    // 'javascripts/utils/echarts.5.min.js',                                     - DELETE.
    // 'javascripts/utils/vue/vue-echarts.umd.min.js',                           - DELETE.
    'javascripts/utils/vue/vue-color.min.js',
    'javascripts/utils/vue/v-tooltip.min.js',
    'javascripts/utils/vue/vee-validate.full.min.js',
    'javascripts/utils/vue/vue-clipboard.min.js',
    'javascripts/utils/vue/vue2Dropzone.min.js',
    'javascripts/utils/vue/element-ui.js',
    'javascripts/utils/vue/vue2-leaflet.min.js',
    'javascripts/utils/vue/inViewportMixin.js', // looks like its compatible with both vue2 and 3: https://github.com/BKWLD/vue-in-viewport-mixin. Requires intersection-observer
    'javascripts/utils/vue/vuescroll.min.js',
    // 'javascripts/utils/vue/vue-json-pretty.min.js',
    'javascripts/dom/pace/pace.min.js',
    'javascripts/utils/Sortable.min.js',
    'javascripts/utils/vue/vuedraggable.umd.min.js',
    // 'javascripts/countly/countly.auth.js',
    'javascripts/utils/element-tiptap.umd.min.js',
    'javascripts/utils/cronstrue.min.js',

    // === BODY SECTION (from dashboard.html lines 187-274) ===
    // 'javascripts/countly/countly.analytics.js',                               - DELETE. NOT BEING USED ANYWHERE.
    // 'javascripts/countly/countly.common.js',
    // 'javascripts/countly/countly.config.js',
    // 'javascripts/countly/countly.helpers.js',
    // 'javascripts/countly/countly.event.js',
    // 'javascripts/countly/countly.session.js',
    // 'javascripts/countly/countly.city.js',                                    - SEEMS LIKE IT'S NOT BEING USED ANYWHERE. BUT DO NOT DELETE FOR NOW.
    // 'javascripts/countly/countly.location.js',
    // 'javascripts/countly/countly.map.helper.js',                              - DELETE. NOT BEING USED ANYWHERE.
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
    'javascripts/countly/vue/helpers.js',
    'javascripts/countly/vue/data/vuex.js',
    'javascripts/countly/countly.task.manager.js',
    'javascripts/countly/vue/imports.js',
    // 'javascripts/countly/vue/components/nav.js', // DELETE.
    // 'javascripts/countly/vue/components/layout.js', // Migrated to SFC
    // 'javascripts/countly/vue/components/form.js', // DELETE.
    // 'javascripts/countly/vue/components/date.js', // Migrated to SFC DELETE
    // 'javascripts/countly/vue/components/dropdown.js', // DELETE.
    // 'javascripts/countly/vue/components/input.js', // DELETE
    // 'javascripts/countly/vue/components/content.js', // Migrated to SFC
    'javascripts/countly/vue/components/datatable.js',
    // 'javascripts/countly/vue/components/dialog.js', // Migrated to SFC
    // 'javascripts/countly/vue/components/drawer.js', // DELETE.
    'core/notes/javascripts/countly.models.js',
    'core/notes/javascripts/countly.common.notes.js',
    'javascripts/countly/vue/components/vis.js',
    // 'javascripts/countly/vue/components/helpers.js', // Migrated to SFC
    // 'javascripts/countly/vue/components/progress.js',
    'javascripts/countly/vue/directives/scroll-shadow.js',
    'javascripts/countly/vue/legacy.js',
    'javascripts/countly/countly.views.js',
    // 'javascripts/countly/countly.cms.js', // ESM - imported in entrypoint.js, exposed as window.countlyCMS
    'core/device-and-type/javascripts/countly.models.js',
    'core/device-and-type/javascripts/countly.views.js',
    'core/app-resolution/javascripts/countly.views.js',
    'core/app-version/javascripts/countly.views.js',
    'core/jobs/javascripts/countly.views.js',
    'core/logs/javascripts/countly.views.js',
    'core/token-manager/javascripts/countly.views.js',
    'core/report-manager/javascripts/countly.views.js',
    'core/platform/javascripts/countly.views.js',
    'core/carrier/javascripts/countly.models.js',
    'core/carrier/javascripts/countly.views.js',
    'core/user-activity/javascripts/countly.models.js',
    'core/user-activity/javascripts/countly.views.js',
    'core/session-overview/javascripts/countly.models.js',
    'core/session-overview/javascripts/countly.views.js',
    'core/session-durations/javascripts/countly.models.js',
    'core/session-durations/javascripts/countly.views.js',
    'core/session-frequency/javascripts/countly.models.js',
    'core/session-frequency/javascripts/countly.views.js',
    'core/events/javascripts/countly.details.models.js',
    'core/events/javascripts/countly.details.views.js',
    'core/events/javascripts/countly.overview.models.js',
    'core/events/javascripts/countly.overview.views.js',
    'core/geo-countries/javascripts/countly.cities.models.js',
    'core/geo-countries/javascripts/countly.models.js',
    'core/user-analytics-overview/javascripts/countly.views.js',
    'core/geo-countries/javascripts/countly.views.js',
    'core/geo-countries/javascripts/countly.widgets.geo.js',
    'core/app-management/javascripts/countly.models.js',
    'core/app-management/javascripts/countly.views.js',
    'core/user-management/javascripts/countly.models.js',
    'core/user-management/javascripts/countly.views.js',
    'core/home/javascripts/countly.models.js',
    'core/home/javascripts/countly.views.js',
    'core/notes/javascripts/countly.views.js',
    'core/version-history/javascripts/countly.views.js',
    'core/onboarding/javascripts/countly.models.js',
    'core/onboarding/javascripts/countly.views.js',
    'core/date-presets/javascripts/countly.views.js',
    'core/date-presets/javascripts/countly.models.js',
    'core/health-manager/javascripts/countly.models.js',
    'core/health-manager/javascripts/countly.views.js',

    // ...[
    //     "web",
    //     "mobile",
    //     "desktop",
    //     "browser",
    //     "guides",
    //     "dashboards",
    //     "data-manager",
    //     "data_migration",
    //     "dbviewer",
    //     "density",
    //     "empty",
    //     "hooks",
    //     "locale",
    //     "logger",
    //     "onboarding",
    //     "plugins",
    //     "populator",
    //     "push",
    //     "recaptcha",
    //     "reports",
    //     "remote-config",
    //     "sdk",
    //     "server-stats",
    //     "slipping-away-users",
    //     "sources",
    //     "start-rating",
    //     "system-utility",
    //     "systemlogs",
    //     "times-of-day",
    //     "two-factor-auth",
    //     "views",
    //     "vue-example",
    //     "groups"
    // ].map(platform => globSync(`plugins/${platform}/frontend/public/javascripts/*.js`)).flat().map(f => "../../../" + f),

    "../../../plugins/drill/frontend/public/javascripts/countly.query.builder.core.js",
    // nodejs doesn't pick up glob patterns when * is used for both directories and symlinks
    // ...globSync("./plugins/*/frontend/public/javascripts/*.js").map(f => "../../../" + f),
    ...globSync("./plugins/*")
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

export default defineConfig({
    root: path.resolve(__dirname, 'frontend/express/public'),
    base: '/dist/',

    plugins: [
        vue(),
        legacyConcatPlugin(),
    ],

    build: {
        outDir: path.resolve(__dirname, 'frontend/express/public/dist'),
        emptyOutDir: true,
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
        alias: {
            '@': path.resolve(__dirname, 'frontend/express/public'),
            '@javascripts': path.resolve(__dirname, 'frontend/express/public/javascripts'),
            '@core': path.resolve(__dirname, 'frontend/express/public/core'),
            // Use the full build of Vue 2.7 that includes the runtime compiler
            // Required for components that use the `template` option at runtime
            // REMOVE THIS AFTER SWITCHING TO SINGLE FILE COMPONENTS (.vue)
            'vue': 'vue/dist/vue.esm.js',
        },
        extensions: ['.js', '.json', '.css']
    },

    esbuild: {
        keepNames: true,
    },

    logLevel: 'info',
});
