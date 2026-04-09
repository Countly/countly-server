import { createRequire } from 'module';
import type { Request, Response, NextFunction } from 'express';
import type { ApiError } from '../../../../web/src/shared/types/api.js';

const require = createRequire(import.meta.url);
const plugins = require('../../../plugins/pluginManager.ts');

/**
 * Middleware that checks if a plugin is enabled at runtime.
 * If disabled, returns 404.
 */
export function pluginGuard(pluginName: string) {
    return function(_req: Request, res: Response, next: NextFunction) {
        if (!plugins.isPluginEnabled(pluginName)) {
            const body: ApiError = { error: { code: 'NOT_FOUND', message: 'Plugin is not enabled' } };
            return res.status(404).json(body);
        }
        next();
    };
}