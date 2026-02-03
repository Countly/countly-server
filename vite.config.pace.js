import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Separate Vite configuration for building the pace.js bundle.
 *
 * This bundle is loaded early in the page to show loading progress
 * while other assets are being fetched.
 *
 * Build command: npx vite build --config vite.config.pace.js
 */
export default defineConfig({
    root: path.resolve(__dirname, 'frontend/express/public'),
    base: '/dist/',

    build: {
        outDir: path.resolve(__dirname, 'frontend/express/public/dist'),
        emptyOutDir: false, // Don't empty the dir - main build already did that
        sourcemap: true,
        manifest: 'pace-manifest.json', // Separate manifest file for pace

        rollupOptions: {
            input: {
                pace: path.resolve(__dirname, 'frontend/express/public/pace.js'),
            },
            output: {
                entryFileNames: 'js/pace.bundle.[hash].js',
                chunkFileNames: 'js/pace.chunk.[hash].js',
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name.endsWith('.css')) {
                        return 'css/pace.bundle.[hash].css';
                    }
                    return 'assets/pace.[name].[hash][extname]';
                },
                format: 'iife',
                inlineDynamicImports: true,
            },
        },

        cssCodeSplit: false,
        chunkSizeWarningLimit: 500,
        modulePreload: false,
    },

    resolve: {
        extensions: ['.js', '.json', '.css']
    },

    esbuild: {
        keepNames: true,
    },

    logLevel: 'info',
});