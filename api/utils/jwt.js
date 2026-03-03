/**
 * Module for JWT authentication utilities
 * @module api/utils/jwt
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const common = require('./common.js');
const log = require('./log.js')('core:jwt');

/**
 * Get JWT configuration with defaults
 * @returns {object} JWT configuration object
 */
function getConfig() {
    const config = common.config.jwt || {};
    return {
        secret: process.env.COUNTLY_JWT_SECRET || config.secret || '',
        accessTokenExpiry: config.accessTokenExpiry || 900, // 15 minutes
        refreshTokenExpiry: config.refreshTokenExpiry || 604800, // 7 days
        issuer: config.issuer || 'countly',
        algorithm: config.algorithm || 'HS256'
    };
}

/**
 * Check if JWT authentication is properly configured
 * @returns {boolean} true if JWT secret is configured
 */
function isConfigured() {
    const config = getConfig();
    return config.secret && config.secret.length >= 32;
}

/**
 * Generate a unique token identifier (jti)
 * @returns {string} unique identifier
 */
function generateJti() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Sign an access token for a member
 * @param {object} member - The member object from the database
 * @returns {object} Object containing the token and expiration info, or error
 */
function signAccessToken(member) {
    const config = getConfig();

    if (!isConfigured()) {
        return {
            success: false,
            error: 'JWT_NOT_CONFIGURED',
            message: 'JWT secret is not configured or is too short (minimum 32 characters)'
        };
    }

    const payload = {
        sub: member._id.toString(),
        type: 'access',
        global_admin: member.global_admin || false
    };

    // Include permissions for non-global admins
    if (!member.global_admin && member.permission) {
        payload.permission = member.permission;
    }

    try {
        const token = jwt.sign(payload, config.secret, {
            algorithm: config.algorithm,
            expiresIn: config.accessTokenExpiry,
            issuer: config.issuer
        });

        return {
            success: true,
            token: token,
            expiresIn: config.accessTokenExpiry
        };
    }
    catch (err) {
        log.e('Error signing access token:', err);
        return {
            success: false,
            error: 'SIGNING_ERROR',
            message: err.message
        };
    }
}

/**
 * Sign a refresh token for a member
 * @param {string} memberId - The member's _id as a string
 * @returns {object} Object containing the token, jti, and expiration info, or error
 */
function signRefreshToken(memberId) {
    const config = getConfig();

    if (!isConfigured()) {
        return {
            success: false,
            error: 'JWT_NOT_CONFIGURED',
            message: 'JWT secret is not configured or is too short (minimum 32 characters)'
        };
    }

    const jti = generateJti();
    const payload = {
        sub: memberId.toString(),
        type: 'refresh',
        jti: jti
    };

    try {
        const token = jwt.sign(payload, config.secret, {
            algorithm: config.algorithm,
            expiresIn: config.refreshTokenExpiry,
            issuer: config.issuer
        });

        return {
            success: true,
            token: token,
            jti: jti,
            expiresIn: config.refreshTokenExpiry
        };
    }
    catch (err) {
        log.e('Error signing refresh token:', err);
        return {
            success: false,
            error: 'SIGNING_ERROR',
            message: err.message
        };
    }
}

/**
 * Verify and decode a JWT token
 * @param {string} token - The JWT token to verify
 * @param {string} expectedType - Expected token type ('access' or 'refresh')
 * @returns {object} Object with valid flag, decoded payload or error info
 */
function verifyToken(token, expectedType) {
    const config = getConfig();

    if (!isConfigured()) {
        return {
            valid: false,
            error: 'JWT_NOT_CONFIGURED',
            message: 'JWT secret is not configured'
        };
    }

    if (!token) {
        return {
            valid: false,
            error: 'NO_TOKEN',
            message: 'No token provided'
        };
    }

    try {
        const decoded = jwt.verify(token, config.secret, {
            algorithms: [config.algorithm],
            issuer: config.issuer
        });

        // Validate token type
        if (expectedType && decoded.type !== expectedType) {
            return {
                valid: false,
                error: 'INVALID_TOKEN_TYPE',
                message: `Expected ${expectedType} token but got ${decoded.type}`
            };
        }

        return {
            valid: true,
            decoded: decoded
        };
    }
    catch (err) {
        if (err.name === 'TokenExpiredError') {
            return {
                valid: false,
                error: 'TOKEN_EXPIRED',
                message: 'Token has expired',
                expiredAt: err.expiredAt
            };
        }
        else if (err.name === 'JsonWebTokenError') {
            return {
                valid: false,
                error: 'INVALID_TOKEN',
                message: err.message
            };
        }
        else if (err.name === 'NotBeforeError') {
            return {
                valid: false,
                error: 'TOKEN_NOT_ACTIVE',
                message: 'Token is not yet active'
            };
        }
        else {
            log.e('Unexpected error verifying token:', err);
            return {
                valid: false,
                error: 'VERIFICATION_ERROR',
                message: err.message
            };
        }
    }
}

/**
 * Extract Bearer token from request Authorization header
 * @param {object} req - The request object
 * @returns {string|null} The token if found, null otherwise
 */
function extractBearerToken(req) {
    if (!req || !req.headers) {
        return null;
    }

    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader) {
        return null;
    }

    // Check for Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return null;
    }

    return parts[1];
}

/**
 * Check if a refresh token JTI is blacklisted
 * @param {string} jti - The token's unique identifier
 * @param {function} callback - Callback function(err, isBlacklisted)
 */
function isTokenBlacklisted(jti, callback) {
    common.db.collection('jwt_blacklist').findOne({ _id: jti }, function(err, doc) {
        if (err) {
            log.e('Error checking token blacklist:', err);
            callback(err, false);
        }
        else {
            callback(null, !!doc);
        }
    });
}

/**
 * Add a refresh token JTI to the blacklist
 * @param {string} jti - The token's unique identifier
 * @param {string} memberId - The member ID who owned the token
 * @param {Date} expiresAt - When the original token would have expired
 * @param {function} callback - Callback function(err)
 */
function blacklistToken(jti, memberId, expiresAt, callback) {
    const doc = {
        _id: jti,
        member_id: memberId,
        revoked_at: new Date(),
        expires_at: expiresAt
    };

    common.db.collection('jwt_blacklist').insertOne(doc, function(err) {
        if (err) {
            // Ignore duplicate key errors (token already blacklisted)
            if (err.code === 11000) {
                callback(null);
            }
            else {
                log.e('Error blacklisting token:', err);
                callback(err);
            }
        }
        else {
            callback(null);
        }
    });
}

/**
 * Ensure the jwt_blacklist collection has a TTL index for automatic cleanup
 * @param {function} callback - Callback function(err)
 */
function ensureIndexes(callback) {
    common.db.collection('jwt_blacklist').createIndex(
        { expires_at: 1 },
        { expireAfterSeconds: 0 },
        function(err) {
            if (err) {
                log.e('Error creating TTL index on jwt_blacklist:', err);
            }
            if (callback) {
                callback(err);
            }
        }
    );
}

module.exports = {
    getConfig,
    isConfigured,
    signAccessToken,
    signRefreshToken,
    verifyToken,
    extractBearerToken,
    isTokenBlacklisted,
    blacklistToken,
    ensureIndexes
};
