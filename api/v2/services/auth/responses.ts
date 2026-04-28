import type { Response } from 'express';
import type { ApiError } from '../../../../web/src/shared/types/api.js';

/**
 * Sends a v2-shaped error response: { error: { code, message } }.
 * Returns the Response so call sites can chain `return apiError(...)` for early exit.
 */
export function apiError(res: Response, status: number, code: string, message: string) {
    const body: ApiError = { error: { code, message } };
    return res.status(status).json(body);
}
