import type { Request, Response, NextFunction } from 'express';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const log = require('../../utils/log.js')('v2:apps');

const HTTP_STATUS_CODES: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_ERROR',
};

/**
 * Middleware that intercepts responses from old helpers (common.returnMessage, common.returnOutput)
 * and transforms them to v2 format:
 *
 * Success (200): {result: data} or raw data -> {data: data}
 * Error (4xx/5xx): {result: "message"} -> {error: {code: "STATUS_CODE", message: "message"}}
 */
export function transformResponse(_req: Request, res: Response, next: NextFunction): void {
    const originalWriteHead = res.writeHead.bind(res);
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    let statusCode = 200;
    let body = '';

    res.writeHead = function(code: number, ..._args: any[]) {
        statusCode = code;
        return res;
    } as any;

    res.write = function(chunk: any) {
        body += typeof chunk === 'string' ? chunk : chunk.toString();
        return true;
    } as any;

    res.end = function(chunk?: any) {
        try {
            if (chunk) {
                body += typeof chunk === 'string' ? chunk : chunk.toString();
            }

            if (!body) {
                originalWriteHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
                originalEnd();
                return res;
            }

            let parsed: any;
            try {
                parsed = JSON.parse(body);
            }
            catch {
                // Not JSON - pass through as-is
                originalWriteHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
                originalWrite(body);
                originalEnd();
                return res;
            }

            let transformed: any;

            if (statusCode >= 400) {
                const message = parsed.result || parsed.message || 'Unknown error';
                const code = parsed.code || HTTP_STATUS_CODES[statusCode] || 'ERROR';
                transformed = { error: { code, message } };
            }
            else {
                const data = parsed.result !== undefined ? parsed.result : parsed;
                transformed = { data };
            }

            const output = JSON.stringify(transformed);
            originalWriteHead(statusCode, {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': Buffer.byteLength(output).toString(),
            });
            originalWrite(output);
            originalEnd();
        }
        catch (err) {
            log.e('transformResponse error:', err);
            // Fallback - send original body untransformed
            originalWriteHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
            if (body) {
                originalWrite(body);
            }
            originalEnd();
        }
        return res;
    } as any;

    next();
}