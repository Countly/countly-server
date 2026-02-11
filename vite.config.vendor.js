import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import vue from '@vitejs/plugin-vue2';
import * as babel from '@babel/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Plugin to clean old vendor bundle files from dist folder.
 */
function cleanVendorBundlePlugin() {
    const distDir = path.resolve(__dirname, 'frontend/express/public/dist');

    return {
        name: 'clean-vendor-bundle-plugin',
        buildStart() {
            const patternsToClean = [
                { dir: 'js', pattern: /^vendor\.bundle\..*\.js(\.map)?$/ },
                { dir: 'css', pattern: /^vendor\.bundle\..*\.css$/ },
                { dir: '.vite', pattern: /^vendor-manifest\.json$/ },
            ];

            for (const { dir, pattern } of patternsToClean) {
                const fullDir = path.join(distDir, dir);
                if (fs.existsSync(fullDir)) {
                    try {
                        const files = fs.readdirSync(fullDir);
                        for (const file of files) {
                            if (pattern.test(file)) {
                                fs.rmSync(path.join(fullDir, file), { recursive: true, force: true });
                            }
                        }
                    }
                    catch (err) {
                        console.warn(`[clean-vendor-bundle-plugin] Error cleaning ${fullDir}:`, err.message);
                    }
                }
            }
            console.log('[clean-vendor-bundle-plugin] Cleaned old vendor bundle files');
        },
    };
}

/**
 * Vue 2 JSX transformation plugin (same as main config).
 * Needed for element-ui packages that contain JSX.
 */
function vue2JsxPlugin() {
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
        enforce: 'pre',

        async transform(code, id) {
            if (id.endsWith('.vue') && shouldTransform(id)) {
                const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/);
                if (!scriptMatch) {
                    return null;
                }
                try {
                    const result = await babel.transformAsync(scriptMatch[1], {
                        filename: id,
                        presets: ['@vue/babel-preset-jsx'],
                        sourceType: 'module',
                        sourceMaps: true,
                    });
                    if (result && result.code) {
                        return {
                            code: code.replace(scriptMatch[1], result.code),
                            map: result.map,
                        };
                    }
                }
                catch (err) {
                    console.error(`[vue2-jsx-plugin] Error transforming ${id}:`, err.message);
                }
                return null;
            }

            if ((id.endsWith('.jsx') || id.endsWith('.js')) && shouldTransform(id)) {
                try {
                    const result = await babel.transformAsync(code, {
                        filename: id,
                        presets: ['@vue/babel-preset-jsx'],
                        sourceType: 'module',
                        sourceMaps: true,
                    });
                    if (result && result.code) {
                        return { code: result.code, map: result.map };
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

/**
 * Separate Vite configuration for building the vendor (npm dependencies) bundle.
 *
 * This bundles all npm packages into a single IIFE that sets window globals.
 * The main build then externalizes these packages for faster rebuilds.
 *
 * Build command: npm run build:vite:vendor
 * Only rebuild when npm dependencies change.
 */
export default defineConfig({
    root: path.resolve(__dirname, 'frontend/express/public'),
    base: '/dist/',

    plugins: [
        cleanVendorBundlePlugin(),
        vue2JsxPlugin(),
        vue(),
    ],

    build: {
        outDir: path.resolve(__dirname, 'frontend/express/public/dist'),
        emptyOutDir: false,
        sourcemap: true,
        manifest: 'vendor-manifest.json',

        rollupOptions: {
            input: {
                vendor: path.resolve(__dirname, 'frontend/express/public/vendor-entrypoint.js'),
            },
            output: {
                entryFileNames: 'js/vendor.bundle.[hash].js',
                chunkFileNames: 'js/vendor.chunk.[hash].js',
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name.endsWith('.css')) {
                        return 'css/vendor.bundle.[hash].css';
                    }
                    return 'assets/vendor.[name].[hash][extname]';
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
            'vue': 'vue/dist/vue.esm.js',
            'element-ui/lib': 'element-ui/packages',
        },
        extensions: ['.vue', '.js', '.json', '.css']
    },

    esbuild: {
        keepNames: true,
    },

    logLevel: 'info',
});
