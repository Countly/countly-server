import type { Request, Response, NextFunction } from 'express';
import type { ApiError } from '../../../../web/src/shared/types/api.js';

interface V2Error extends Error {
    status?: number;
    code?: string;
}

export function v2ErrorHandler(err: V2Error, _req: Request, res: Response, _next: NextFunction): void {
    const status = err.status || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const message = err.message || 'Internal server error';

    const body: ApiError = {
        error: { code, message }
    };

    res.status(status).json(body);
}