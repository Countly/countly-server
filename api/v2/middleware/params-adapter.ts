import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware that creates a countlyParams
 * Attaches it to req.countlyParams so all v2 route handlers can access it.
 */
export function paramsAdapter(req: Request, res: Response, next: NextFunction): void {
    (req as any).countlyParams = {
        qstring: {
            ...req.query,
            ...req.body,
        },
        req,
        res,
        fullPath: req.originalUrl,
        v2: true,
    };

    // app_id from route params takes priority
    if (req.params.app_id) {
        (req as any).countlyParams.qstring.app_id = req.params.app_id;
    }

    next();
}
