import { createRequire } from 'module';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type {
    LoginRequest,
    LoginResponse,
    RefreshTokenResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    ResetPasswordValidateResponse,
} from '../../../../web/src/shared/types/auth.js';
import type { ApiError } from '../../../../web/src/shared/types/api.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import argon2 from 'argon2';


const require = createRequire(import.meta.url);
const common = require('../../utils/common.js');
const preventBruteforce = require('../../../frontend/express/libs/preventBruteforce.js');
const mail = require('../../parts/mgmt/mail.js');
const membersUtility = require('../../../frontend/express/libs/members.js');
const plugins = require('../../../plugins/pluginManager.js');

const router = express.Router();

const PASSWORD_RESET_TTL_SECONDS = 600;
const REFRESH_COOKIE_NAME = 'cly_refresh_token';

function parseDaysToMs(duration: string): number {
    const days = Number.parseInt(duration, 10);

    if (Number.isNaN(days)) {
        return 7 * 24 * 60 * 60 * 1000;
    }

    return days * 24 * 60 * 60 * 1000;
}

function getRefreshCookieOptions() {
    return {
        httpOnly: true,
        secure: common.config.api.ssl?.enabled === true,
        sameSite: 'strict' as const,
        path: '/v2/auth',
        maxAge: parseDaysToMs(common.config.api.jwtRefreshTokenExpiry),
    };
}

interface JwtPayload {
    memberId: string;
    type: 'access' | 'refresh';
}

function findMemberByEmail(email: string): Promise<Record<string, unknown> | null> {
    return new Promise((resolve, reject) => {
        common.db.collection('members').findOne(
            { email },
            function(err: unknown, doc: Record<string, unknown> | null) {
                if (err) {
                    return reject(err);
                }
                resolve(doc);
            }
        );
    });
}

function findMemberById(id: unknown): Promise<Record<string, unknown> | null> {
    return new Promise((resolve, reject) => {
        common.db.collection('members').findOne(
            { _id: id },
            function(err: unknown, doc: Record<string, unknown> | null) {
                if (err) {
                    return reject(err);
                }
                resolve(doc);
            }
        );
    });
}

function findResetToken(prid: string): Promise<Record<string, unknown> | null> {
    return new Promise((resolve, reject) => {
        common.db.collection('password_reset').findOne(
            { prid },
            function(err: unknown, doc: Record<string, unknown> | null) {
                if (err) {
                    return reject(err);
                }
                resolve(doc);
            }
        );
    });
}

function generateTokens(member: any): { accessToken: string; refreshToken: string } {
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

function insertResetToken(prid: string, userId: unknown, timestamp: number): Promise<void> {
    return new Promise((resolve, reject) => {
        common.db.collection('password_reset').insert(
            { prid, user_id: userId, timestamp },
            { safe: true },
            function(err: unknown) {
                if (err) {
                    return reject(err);
                }
                resolve();
            }
        );
    });
}

function isArgon2Hash(hash: string): boolean {
    return Boolean(hash && hash.startsWith('$argon2'));
}

function isBruteforceBlocked(username: string): Promise<{ blocked: boolean; fails: number }> {
    return new Promise((resolve) => {
        preventBruteforce.isBlocked("login", username, function(blocked: boolean, fails: number) {
            resolve({ blocked, fails });
        });
    });
}

function isForgotBlocked(ip: string | undefined): Promise<{ blocked: boolean; fails: number }> {
    if (!ip) {
        return Promise.resolve({ blocked: false, fails: 0 });
    }

    return new Promise((resolve) => {
        preventBruteforce.isBlocked("forgot", ip, function(blocked: boolean, fails: number) {
            resolve({ blocked, fails });
        });
    });
}

function nowSec(): number {
    return Math.round(Date.now() / 1000);
}

function recordFailedLogin(username: string): void {
    preventBruteforce.fail("login", username);
}

function recordForgotFail(ip: string | undefined): void {
    preventBruteforce.fail("forgot", ip || 'Undefined IP');
}

function removeResetToken(prid: string): void {
    common.db.collection('password_reset').remove({ prid }, function() {});
}

function resetFailedLogins(username: string): void {
    preventBruteforce.reset("login", username);
}

function updateMemberPassword(id: unknown, hashedPassword: string): Promise<void> {
    return new Promise((resolve, reject) => {
        common.db.collection('members').updateOne(
            { _id: id },
            { $set: { password: hashedPassword, password_changed: nowSec() } },
            function(err: unknown) {
                if (err) {
                    return reject(err);
                }
                resolve();
            }
        );
    });
}

async function verifyCredentials(username: string, password: string): Promise<any | null> {
    const member = await new Promise<any>((resolve, reject) => {
        common.db.collection('members').findOne(
            { $or: [{ username }, { email: username }] },
            function(err: any, doc: any) {
                if (err) {
                    return reject(err);
                }
                resolve(doc);
            }
        );
    });

    if (!member) {
        return null;
    }

    if (member.locked) {
        const err: any = new Error('User account is locked');
        err.code = 'ACCOUNT_LOCKED';
        throw err;
    }

    if (isArgon2Hash(member.password)) {
        const match = await argon2.verify(member.password, password);
        if (!match) {
            return null;
        }
    }
    else {
        const sha1 = crypto.createHmac('sha1', '').update(password).digest('hex');
        const sha512 = crypto.createHmac('sha512', '').update(password).digest('hex');

        if (member.password !== sha1 && member.password !== sha512) {
            return null;
        }

        const argon2Hash = await argon2.hash(password);
        common.db.collection('members').updateOne(
            { _id: member._id },
            { $set: { password: argon2Hash } }
        );
    }

    return member;
}

router.post('/login', async function(req: Request, res: Response, next: NextFunction) {
    try {
        const { username, password } = req.body as LoginRequest;

        if (!username || !password) {
            const body: ApiError = { error: { code: 'VALIDATION_ERROR', message: 'Username and password are required' } };
            return res.status(400).json(body);
        }

        // Check brute force block before attempting login
        const { blocked } = await isBruteforceBlocked(username);

        if (blocked) {
            const body: ApiError = { error: { code: 'LOGIN_BLOCKED', message: 'Too many failed attempts. Please try again later.' } };
            return res.status(429).json(body);
        }

        const member = await verifyCredentials(username, password);

        if (!member) {
            recordFailedLogin(username);
            const body: ApiError = { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' } };
            return res.status(401).json(body);
        }

        // Login successful - reset failed attempts
        resetFailedLogins(username);

        const { accessToken, refreshToken } = generateTokens(member);

        common.db.collection('members').updateOne(
            { _id: member._id },
            { $set: { last_login: Math.floor(Date.now() / 1000) } }
        );

        res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

        const response: LoginResponse = {
            token: accessToken,
            member: {
                _id: member._id.toString(),
                full_name: member.full_name,
                username: member.username,
                email: member.email,
                global_admin: member.global_admin === true,
                lang: member.lang,
                api_key: member.api_key
            }
        };

        res.json({ data: response });
    }
    catch (err: any) {
        if (err.code === 'ACCOUNT_LOCKED') {
            const body: ApiError = { error: { code: 'ACCOUNT_LOCKED', message: err.message } };
            return res.status(401).json(body);
        }
        next(err);
    }
});

router.post('/refresh', async function(req: Request, res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
        const body: ApiError = { error: { code: 'VALIDATION_ERROR', message: 'Refresh token is required' } };
        return res.status(400).json(body);
    }

    const secret: string = common.config.api.jwtSecret;

    let decoded: JwtPayload;
    try {
        decoded = jwt.verify(refreshToken, secret) as JwtPayload;
    }
    catch (err: any) {
        res.clearCookie(REFRESH_COOKIE_NAME, { path: '/v2/auth' });
        const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED';
        const body: ApiError = { error: { code, message: 'Invalid or expired refresh token' } };
        return res.status(401).json(body);
    }

    if (decoded.type !== 'refresh') {
        const body: ApiError = { error: { code: 'UNAUTHORIZED', message: 'Invalid token type' } };
        return res.status(401).json(body);
    }

    common.db.collection('members').findOne(
        { _id: common.db.ObjectID(decoded.memberId) },
        { projection: { password: 0 } },
        function(err: any, member: any) {
            if (err || !member) {
                const body: ApiError = { error: { code: 'UNAUTHORIZED', message: 'User not found' } };
                return res.status(401).json(body);
            }

            if (member.locked) {
                const body: ApiError = { error: { code: 'ACCOUNT_LOCKED', message: 'User account is locked' } };
                return res.status(401).json(body);
            }

            const tokens = generateTokens(member);

            res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, getRefreshCookieOptions());

            const response: RefreshTokenResponse = {
                token: tokens.accessToken,
            };

            res.json({ data: response });
        }
    );
});

router.post('/logout', function(_req: Request, res: Response) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/v2/auth' });
    res.json({ data: { message: 'Logged out successfully' } });
});

router.post('/forgot', async function(req: Request, res: Response, next: NextFunction) {
    try {
        const { email } = req.body as ForgotPasswordRequest;

        if (!email || typeof email !== 'string' || !email.includes('@')) {
            const body: ApiError = { error: { code: 'VALIDATION_ERROR', message: 'A valid email address is required' } };
            return res.status(400).json(body);
        }

        const trimmedEmail = email.trim();
        const { blocked } = await isForgotBlocked(req.ip);

        if (blocked) {
            const body: ApiError = {
                error: { code: 'LOGIN_BLOCKED', message: 'Too many requests. Please try again later.' }
            };

            return res.status(429).json(body);
        }

        // Always record a fail to rate-limit regardless of email existence (anti-enumeration)
        recordForgotFail(req.ip);

        const member = await findMemberByEmail(trimmedEmail);

        if (member) {
            const prid = crypto.randomBytes(32).toString('hex');
            const timestamp = nowSec();

            await insertResetToken(prid, member._id, timestamp);

            mail.sendPasswordResetInfo(member, prid);
            plugins.callMethod("passwordRequest", { req, data: req.body });
        }

        // Always return the same response to prevent email enumeration
        const response: ForgotPasswordResponse = {
            message: 'If an account with that email exists, a reset link has been sent.',
        };

        res.json({ data: response });
    }
    catch (err: unknown) {
        next(err);
    }
});

router.get('/reset/:prid', async function(req: Request, res: Response, next: NextFunction) {
    try {
        const prid = String(req.params.prid);

        const resetDoc = await findResetToken(prid);

        if (!resetDoc) {
            const body: ApiError = { error: { code: 'RESET_TOKEN_NOT_FOUND', message: 'Reset link is invalid' } };
            return res.status(404).json(body);
        }

        if (nowSec() - (resetDoc.timestamp as number) > PASSWORD_RESET_TTL_SECONDS) {
            removeResetToken(prid);
            const body: ApiError = { error: { code: 'RESET_TOKEN_EXPIRED', message: 'Reset link has expired' } };
            return res.status(410).json(body);
        }

        const response: ResetPasswordValidateResponse = {
            valid: true,
            newInvite: !!resetDoc.newInvite,
        };

        res.json({ data: response });
    }
    catch (err: unknown) {
        next(err);
    }
});

router.post('/reset', async function(req: Request, res: Response, next: NextFunction) {
    try {
        const { prid, password } = req.body as ResetPasswordRequest;

        if (!prid || !password) {
            const body: ApiError = {
                error: { code: 'VALIDATION_ERROR', message: 'Reset token and new password are required' }
            };

            return res.status(400).json(body);
        }

        // Validate password strength via legacy security config
        const passwordError = membersUtility.validatePassword(password);
        if (passwordError !== false) {
            const body: ApiError = { error: { code: 'WEAK_PASSWORD', message: passwordError } };
            return res.status(400).json(body);
        }

        const resetDoc = await findResetToken(String(prid));

        if (!resetDoc) {
            const body: ApiError = { error: { code: 'RESET_TOKEN_NOT_FOUND', message: 'Reset link is invalid' } };
            return res.status(404).json(body);
        }

        if (nowSec() - (resetDoc.timestamp as number) > PASSWORD_RESET_TTL_SECONDS) {
            removeResetToken(String(prid));
            const body: ApiError = { error: { code: 'RESET_TOKEN_EXPIRED', message: 'Reset link has expired' } };
            return res.status(410).json(body);
        }

        const member = await findMemberById(resetDoc.user_id);

        if (!member) {
            removeResetToken(String(prid));
            const body: ApiError = {
                error: { code: 'RESET_TOKEN_INVALID', message: 'User associated with this reset link no longer exists' }
            };

            return res.status(400).json(body);
        }

        if (member.locked) {
            const body: ApiError = { error: { code: 'ACCOUNT_LOCKED', message: 'User account is locked' } };
            return res.status(401).json(body);
        }

        // Hash with the same secret the legacy system uses
        const secret = common.config.passwordSecret || "";
        const hashedPassword = await argon2.hash(password + secret);

        await updateMemberPassword(member._id, hashedPassword);

        // Clean up the consumed token
        removeResetToken(String(prid));

        // Kill other sessions for security (matches legacy behavior)
        membersUtility.killOtherSessionsForUser(
            (member._id as { toString(): string }).toString(),
            undefined,
            undefined,
            common.db
        );

        // Reset brute force counters for this user
        resetFailedLogins(member.username as string);
        resetFailedLogins(member.email as string);

        plugins.callMethod("passwordReset", { req, data: member });

        const response: ResetPasswordResponse = {
            message: 'Your password has been reset.',
        };

        res.json({ data: response });
    }
    catch (err: unknown) {
        next(err);
    }
});

export default router;
