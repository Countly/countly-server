import { createRequire } from 'module';
import express from 'express';
import cookieParser from 'cookie-parser';
import type { Request, Response, NextFunction } from 'express';
import authRouter from './routes/auth.ts';
import usersRouter from './routes/users.ts';
import appsRouter from './routes/apps.ts';
import healthRouter from './routes/health.ts';
import securityRouter from './routes/security.ts';
import { pluginGuard } from './middleware/plugin-guard.ts';
import { v2ErrorHandler } from './middleware/error-handler.ts';
import { transformResponse } from './middleware/response-wrapper.ts';
import { paramsAdapter } from './middleware/params-adapter.ts';
import './types/index.d.ts';

const require = createRequire(import.meta.url);
const plugins = require('../../plugins/pluginManager.ts');
const common = require('../utils/common.js');
const preventBruteforce = require('../../frontend/express/libs/preventBruteforce.js');

const app = express();

// Match legacy: honor X-Forwarded-* so req.ip reflects the real client IP
// behind the load balancer. Required for /forgot rate limiting to key on the
// actual client rather than the LB's internal IP.
app.set('trust proxy', true);

app.use(function(_req: Request, _res: Response, next: NextFunction) {
    if (!preventBruteforce.db && common.db) {
        preventBruteforce.db = common.db;
    }
    next();
});

// --- Body parsing ---
app.use(express.json());
app.use(cookieParser());

// --- Security headers & CORS ---
app.use(function(_req: Request, res: Response, next: NextFunction) {
    const add_headers = (plugins.getConfig("security").api_additional_headers || "").replace(/\r\n|\r|\n/g, "\n").split("\n");
    let parts;
    for (let i = 0; i < add_headers.length; i++) {
        if (add_headers[i] && add_headers[i].length > 0) {
            parts = add_headers[i].split(/:(.+)?/);
            if (parts.length === 3) {
                // Skip any configured Access-Control-Allow-Origin — we handle it dynamically below
                if (parts[0].trim().toLowerCase() !== 'access-control-allow-origin') {
                    res.setHeader(parts[0], parts[1]);
                }
            }
        }
    }

    // Reflect the request Origin for credentialed requests (cookies)
    const origin = _req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (_req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.sendStatus(200);
    }

    next();
});

// --- Core routes ---
app.use('/v2/auth', authRouter);
app.use('/v2/users', paramsAdapter, transformResponse, usersRouter);
app.use('/v2/apps', paramsAdapter, transformResponse, appsRouter);
app.use('/v2/health', paramsAdapter, transformResponse, healthRouter);
app.use('/v2/security', paramsAdapter, transformResponse, securityRouter);

// --- Plugin v2 routes (auto-discovered) ---
// Scans plugins/<name>/api/v2/index.ts and registers as /v2/<name>
// Called after server startup since CJS entry point can't use top-level await
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function loadPluginRoutes() {
    const pluginSearchPaths = [
        path.resolve(__dirname, '../../plugins'), // get plugins
    ];

    const enabledPlugins: string[] = plugins.getPlugins();

    for (const searchPath of pluginSearchPaths) {
        if (!fs.existsSync(searchPath)) {
            continue;
        }

        for (const name of enabledPlugins) {
            const routeFile = path.join(searchPath, name, 'api', 'v2', 'index.ts');
            if (!fs.existsSync(routeFile)) {
                continue;
            }

            try {
                const { default: router } = await import(routeFile);
                app.use(`/v2/${name}`, pluginGuard(name), paramsAdapter, transformResponse, router);
            }
            catch (err) {
                console.error(`[v2] Failed to load plugin route: ${name}`, err);
            }
        }
    }

    // Re-register error handler after plugin routes so it catches plugin errors too
    app.use(v2ErrorHandler);
}

// --- Error handler ---
app.use(v2ErrorHandler);

export default app;
