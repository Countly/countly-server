/**
 * JWT authentication routes.
 * Migrated from the legacy switch/case in requestProcessor.js.
 * All endpoints are public — auth is handled internally by jwt_tokens module.
 * @module api/routes/jwt
 */

const express = require('express');
const router = express.Router();
const jwtTokens = require('../parts/mgmt/jwt_tokens.js');

// POST /o/jwt/token - Login with username/password, receive JWT tokens
router.post('/o/jwt/token', (req, res) => {
    jwtTokens.login(req.countlyParams);
});

// POST /o/jwt/refresh - Exchange refresh token for new token pair
router.post('/o/jwt/refresh', (req, res) => {
    jwtTokens.refresh(req.countlyParams);
});

// POST /i/jwt/revoke - Revoke a refresh token (logout)
router.post('/i/jwt/revoke', (req, res) => {
    jwtTokens.revoke(req.countlyParams);
});

module.exports = router;
