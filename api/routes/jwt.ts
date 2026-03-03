/**
 * JWT authentication routes.
 * Migrated from the legacy switch/case in requestProcessor.js.
 * All endpoints are public — auth is handled internally by jwt_tokens module.
 * @module api/routes/jwt
 */

import { createRequire } from 'module';
import type { Params } from '../../types/requestProcessor';
import express from "express";

// @ts-expect-error TS1470 - import.meta is valid at runtime
const require = createRequire(import.meta.url);
const router = express.Router();
const jwtTokens = require('../parts/mgmt/jwt_tokens.js') as {
    login(params: Params): void;
    refresh(params: Params): void;
    revoke(params: Params): void;
};

// POST /o/jwt/token - Login with username/password, receive JWT tokens
router.post('/o/jwt/token', (req) => {
    jwtTokens.login(req.countlyParams);
});

// POST /o/jwt/refresh - Exchange refresh token for new token pair
router.post('/o/jwt/refresh', (req) => {
    jwtTokens.refresh(req.countlyParams);
});

// POST /i/jwt/revoke - Revoke a refresh token (logout)
router.post('/i/jwt/revoke', (req) => {
    jwtTokens.revoke(req.countlyParams);
});

export default router;
