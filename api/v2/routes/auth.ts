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
    SetupRequest,
    SetupResponse,
    SetupStatusResponse,
} from '../../../../web/src/shared/types/auth.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import argon2 from 'argon2';
import {
    countMembers,
    findMemberByEmail,
    findMemberById,
    formatMember,
    insertMember,
    killOtherSessionsForUser,
    validatePassword,
} from '../services/members.ts';
import {
    PASSWORD_RESET_TTL_SECONDS,
    REFRESH_COOKIE_NAME,
    apiError,
    findResetToken,
    generateTokens,
    getRefreshCookieOptions,
    insertResetToken,
    invalidateUserTokens,
    isBruteforceBlocked,
    isForgotBlocked,
    nowSec,
    passwordMatchesHash,
    recordFailedLogin,
    recordForgotFail,
    removeResetToken,
    resetFailedLogins,
    stripPassword,
    updateMemberPassword,
    updateMemberPasswordWithHistory,
    verifyCredentials,
    type JwtPayload,
} from '../services/auth/index.ts';


const require = createRequire(import.meta.url);
const common = require('../../utils/common.js');
const mail = require('../../parts/mgmt/mail.js');
const plugins = require('../../../plugins/pluginManager.js');

const router = express.Router();

router.post('/forgot', async function(req: Request, res: Response, next: NextFunction) {
    try {
        const { email } = req.body as ForgotPasswordRequest;

        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return apiError(res, 400, 'VALIDATION_ERROR', 'A valid email address is required');
        }

        const trimmedEmail = email.trim();
        const { blocked } = await isForgotBlocked(req.ip);

        if (blocked) {
            return apiError(res, 429, 'LOGIN_BLOCKED', 'Too many requests. Please try again later.');
        }

        // Always record a fail to rate-limit regardless of email existence (anti-enumeration)
        recordForgotFail(req.ip);

        const member = await findMemberByEmail(trimmedEmail);

        if (member) {
            const prid = crypto.randomBytes(32).toString('hex');
            const timestamp = nowSec();

            await insertResetToken(prid, member._id, timestamp);
            member.lang = member.lang || req.body.lang || "en";
            mail.sendPasswordResetInfo(member, prid);
            plugins.callMethod("passwordRequest", { req, data: stripPassword(member) });
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

router.post('/login', async function(req: Request, res: Response, next: NextFunction) {
    try {
        const { username, password } = req.body as LoginRequest;

        if (!username || !password) {
            plugins.callMethod("loginFailed", { req, data: stripPassword(req.body), reason: 'VALIDATION_ERROR' });

            return apiError(res, 400, 'VALIDATION_ERROR', 'Username and password are required');
        }

        // Check brute force block before attempting login
        const { blocked } = await isBruteforceBlocked(username);

        if (blocked) {
            plugins.callMethod("loginFailed", { req, data: stripPassword(req.body), reason: 'LOGIN_BLOCKED' });

            return apiError(res, 429, 'LOGIN_BLOCKED', 'Too many failed attempts. Please try again later.');
        }

        const member = await verifyCredentials(username, password);

        if (!member) {
            recordFailedLogin(username);

            plugins.callMethod("loginFailed", { req, data: stripPassword(req.body), reason: 'INVALID_CREDENTIALS' });

            return apiError(res, 401, 'INVALID_CREDENTIALS', 'Invalid username or password');
        }

        // Login successful - reset failed attempts
        resetFailedLogins(username);

        const { accessToken, refreshToken } = generateTokens(member);

        const update: { last_login: number; password_changed?: number; lang?: string } = { last_login: nowSec() };

        if (member.password_changed === undefined) {
            update.password_changed = member.created_at || nowSec();
        }

        if (req.body.lang && req.body.lang !== member.lang) {
            update.lang = req.body.lang;
        }

        common.db.collection('members').updateOne({ _id: member._id }, { $set: update });

        plugins.callMethod("loginSuccessful", { req, data: stripPassword(member) });

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
            plugins.callMethod("loginFailed", { req, data: stripPassword(req.body), reason: 'ACCOUNT_LOCKED' });

            return apiError(res, 401, 'ACCOUNT_LOCKED', err.message);
        }

        next(err);
    }
});

router.post('/logout', async function(req: Request, res: Response, next: NextFunction) {
    try {
        const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
        let memberId: string | null = null;

        if (refreshToken) {
            try {
                const secret: string = common.config.api.jwtSecret;
                const decoded = jwt.verify(refreshToken, secret) as JwtPayload;

                if (decoded.type === 'refresh') {
                    memberId = decoded.memberId;
                }
            }
            catch {
                // Invalid/expired cookie — logout still succeeds below.
                // Intentionally swallowed: a stale cookie is not an error at logout time.
            }
        }

        let member: Record<string, unknown> | null = null;

        if (memberId) {
            try {
                member = await findMemberById(common.db.ObjectID(memberId));
            }
            catch {
                // DB blip — keep going. We'll still clear the cookie.
            }
        }

        if (member) {
            plugins.callMethod("userLogout", {
                req,
                data: {
                    uid: member._id,
                    email: member.email,
                    query: req.query
                }
            });

            await invalidateUserTokens(member._id);
            killOtherSessionsForUser({ userId: (member._id as { toString(): string }).toString() });
        }

        res.clearCookie(REFRESH_COOKIE_NAME, { path: '/v2/auth' });
        res.json({ data: { message: 'Logged out successfully' } });
    }
    catch (err: unknown) {
        next(err);
    }
});

router.post('/refresh', async function(req: Request, res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
        return apiError(res, 400, 'VALIDATION_ERROR', 'Refresh token is required');
    }

    const secret: string = common.config.api.jwtSecret;

    let decoded: JwtPayload;
    try {
        decoded = jwt.verify(refreshToken, secret) as JwtPayload;
    }
    catch (err: any) {
        res.clearCookie(REFRESH_COOKIE_NAME, { path: '/v2/auth' });
        const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED';
        return apiError(res, 401, code, 'Invalid or expired refresh token');
    }

    if (decoded.type !== 'refresh') {
        return apiError(res, 401, 'UNAUTHORIZED', 'Invalid token type');
    }

    common.db.collection('members').findOne(
        { _id: common.db.ObjectID(decoded.memberId) },
        { projection: { password: 0 } },
        function(err: any, member: any) {
            if (err || !member) {
                return apiError(res, 401, 'UNAUTHORIZED', 'User not found');
            }

            if (member.locked) {
                return apiError(res, 401, 'ACCOUNT_LOCKED', 'User account is locked');
            }

            if (member.token_invalid_before && decoded.iat && decoded.iat < member.token_invalid_before) {
                res.clearCookie(REFRESH_COOKIE_NAME, { path: '/v2/auth' });

                return apiError(res, 401, 'TOKEN_EXPIRED', 'Token has been invalidated');
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

router.post('/reset', async function(req: Request, res: Response, next: NextFunction) {
    try {
        const { prid, password } = req.body as ResetPasswordRequest;

        if (!prid || !password) {
            return apiError(res, 400, 'VALIDATION_ERROR', 'Reset token and new password are required');
        }

        // Validate password strength via legacy security config
        const passwordError = validatePassword(password);

        if (passwordError !== null) {
            return apiError(res, 400, 'WEAK_PASSWORD', passwordError);
        }

        const resetDoc = await findResetToken(String(prid));

        if (!resetDoc) {
            return apiError(res, 404, 'RESET_TOKEN_NOT_FOUND', 'Reset link is invalid');
        }

        if (nowSec() - (resetDoc.timestamp as number) > PASSWORD_RESET_TTL_SECONDS) {
            removeResetToken(String(prid));
            return apiError(res, 410, 'RESET_TOKEN_EXPIRED', 'Reset link has expired');
        }

        const member = await findMemberById(resetDoc.user_id);
        const rotationLimit = Number(plugins.getConfig('security').password_rotation || 0);

        if (!member) {
            removeResetToken(String(prid));
            return apiError(res, 400, 'RESET_TOKEN_INVALID', 'User associated with this reset link no longer exists');
        }

        if (rotationLimit > 0) {
            const candidates: string[] = [
                member.password as string,
                ...((member.password_history as string[]) || [])
            ];
            const matches = await Promise.all(
                candidates.map(h => passwordMatchesHash(password, h))
            );

            if (matches.some(Boolean)) {
                return apiError(res, 400, 'WEAK_PASSWORD', `You cannot reuse one of your last ${rotationLimit} passwords.`);
            }
        }

        // Hash with the same secret the legacy system uses
        const secret = common.config.passwordSecret || "";
        const hashedPassword = await argon2.hash(password + secret);

        if (rotationLimit > 0) {
            await updateMemberPasswordWithHistory(
                member._id,
                hashedPassword,
                member.password as string,
                rotationLimit
            );
        }
        else {
            await updateMemberPassword(member._id, hashedPassword);
        }

        // Clean up the consumed token
        removeResetToken(String(prid));

        await invalidateUserTokens(member._id);
        // Kill other sessions for security (matches legacy behavior)
        killOtherSessionsForUser({ userId: (member._id as { toString(): string }).toString() });

        // Reset brute force counters for this user
        resetFailedLogins(member.username as string);
        resetFailedLogins(member.email as string);

        plugins.callMethod("passwordReset", { req, data: stripPassword(member) });

        const response: ResetPasswordResponse = {
            message: 'Your password has been reset.',
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
            return apiError(res, 404, 'RESET_TOKEN_NOT_FOUND', 'Reset link is invalid');
        }

        if (nowSec() - (resetDoc.timestamp as number) > PASSWORD_RESET_TTL_SECONDS) {
            removeResetToken(prid);
            return apiError(res, 410, 'RESET_TOKEN_EXPIRED', 'Reset link has expired');
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

router.post('/setup', async function(req: Request, res: Response, next: NextFunction) {
    try {
        const memberCount = await countMembers();

        if (memberCount > 0) {
            return apiError(res, 409, 'SETUP_ALREADY_COMPLETE', 'Server is already set up');
        }

        const { full_name, username, email, password, lang } = req.body as SetupRequest;
        const trimmedEmail = typeof email === 'string' ? email.trim() : '';
        const trimmedUsername = typeof username === 'string' ? username.trim() : '';

        if (!full_name || typeof full_name !== 'string' || full_name.trim().length === 0) {
            return apiError(res, 400, 'VALIDATION_ERROR', 'Full name is required');
        }

        if (!trimmedUsername) {
            return apiError(res, 400, 'VALIDATION_ERROR', 'Username is required');
        }

        if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(trimmedUsername)) {
            return apiError(res, 400, 'VALIDATION_ERROR', 'Username must be 3-50 characters using letters, numbers, dot, underscore, or hyphen.');
        }

        if (!trimmedEmail || !trimmedEmail.includes('@')) {
            return apiError(res, 400, 'VALIDATION_ERROR', 'A valid email address is required');
        }

        if (!password || typeof password !== 'string') {
            return apiError(res, 400, 'VALIDATION_ERROR', 'Password is required');
        }

        const passwordError = validatePassword(password);

        if (passwordError !== null) {
            return apiError(res, 400, 'WEAK_PASSWORD', passwordError);
        }

        const secret = common.config.passwordSecret || "";
        const hashedPassword = await argon2.hash(password + secret);

        const apiKey = common.md5Hash(crypto.randomBytes(48).toString('hex') + Math.random());

        const now = nowSec();
        const doc: Record<string, unknown> = {
            full_name: (full_name + "").trim(),
            username: trimmedUsername,
            password: hashedPassword,
            email: trimmedEmail,
            global_admin: true,
            created_at: now,
            password_changed: now,
            // Empty permission matrix; global_admin: true bypasses per-feature permission checks.
            permission: { c: {}, r: {}, u: {}, d: {}, _: { a: [], u: [[]] } },
            api_key: apiKey,
        };

        if (lang && typeof lang === 'string') {
            doc.lang = lang;
        }

        let member: Record<string, unknown>;

        try {
            member = await insertMember(doc);
        }
        catch (insertErr: unknown) {
            // Guard against TOCTOU race: if a concurrent request already
            // inserted a member between our count check and this insert,
            // the duplicate key error (code 11000) surfaces here.
            const mongoErr = insertErr as { code?: number };

            if (mongoErr.code === 11000) {
                return apiError(res, 409, 'SETUP_ALREADY_COMPLETE', 'Server is already set up');
            }

            throw insertErr;
        }

        const { accessToken, refreshToken } = generateTokens(member);

        res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

        const response: SetupResponse = {
            token: accessToken,
            member: formatMember(member),
        };

        res.json({ data: response });
    }
    catch (err: unknown) {
        next(err);
    }
});

router.get('/setup-status', async function(_req: Request, res: Response) {
    try {
        const count = await countMembers();
        const response: SetupStatusResponse = { needsSetup: count === 0 };
        res.json({ data: response });
    }
    catch (_err: unknown) {
        apiError(res, 503, 'DB_NOT_READY', 'Database is not available yet. Please retry.');
    }
});

export default router;
