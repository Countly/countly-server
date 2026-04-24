import { createRequire } from 'module';
import jwt from 'jsonwebtoken';
import { nowSec } from './helpers.ts';

const require = createRequire(import.meta.url);
const common = require('../../../utils/common.js');

export const REFRESH_COOKIE_NAME = 'cly_refresh_token';

export interface JwtPayload {
    iat?: number;
    memberId: string;
    type: 'access' | 'refresh';
}

export function generateTokens(member: any): { accessToken: string; refreshToken: string } {
    const secret: string = common.config.api.jwtSecret;
    const accessToken = jwt.sign(
        { memberId: member._id.toString(), type: 'access' } satisfies JwtPayload,
        secret,
        { expiresIn: common.config.api.jwtAccessTokenExpiry }
    );
    const refreshToken = jwt.sign(
        { memberId: member._id.toString(), type: 'refresh' } satisfies JwtPayload,
        secret,
        { expiresIn: common.config.api.jwtRefreshTokenExpiry }
    );
    return { accessToken, refreshToken };
}

export function getRefreshCookieOptions() {
    return {
        httpOnly: true,
        secure: common.config.api.ssl?.enabled === true,
        sameSite: 'strict' as const,
        path: '/v2/auth',
        maxAge: parseDaysToMs(common.config.api.jwtRefreshTokenExpiry),
    };
}

export function parseDaysToMs(duration: string): number {
    const days = Number.parseInt(duration, 10);

    if (Number.isNaN(days)) {
        return 7 * 24 * 60 * 60 * 1000;
    }

    return days * 24 * 60 * 60 * 1000;
}

export function invalidateUserTokens(memberId: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
        common.db.collection('members').updateOne(
            { _id: memberId },
            { $set: { token_invalid_before: nowSec() } },
            function(err: unknown) {
                if (err) {
                    console.error('Error invalidating user tokens:', err);
                    return reject(err);
                }
                resolve();
            }
        );
    });
}
