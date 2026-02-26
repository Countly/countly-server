/**
 * Module for JWT token management operations
 * @module api/parts/mgmt/jwt_tokens
 */

const common = require('../../utils/common.js');
const jwtUtils = require('../../utils/jwt.js');
const log = require('../../utils/log.js')('core:jwt_tokens');

// Import membersUtility for password verification
let membersUtility = null;

/**
 * Lazily load membersUtility to avoid circular dependency issues
 * @returns {object} membersUtility module
 */
function getMembersUtility() {
    if (!membersUtility) {
        membersUtility = require('../../../frontend/express/libs/members.js');
        membersUtility.db = common.db;
    }
    return membersUtility;
}

/**
 * Login endpoint - authenticates user and returns access/refresh tokens
 * @param {object} params - Request params object
 * @param {function} done - Callback function
 */
function login(params, done) {
    // Check if JWT is properly configured
    if (!jwtUtils.isConfigured()) {
        common.returnMessage(params, 500, 'JWT authentication is not configured. Set COUNTLY_JWT_SECRET environment variable (minimum 32 characters).');
        if (done) {
            done();
        }
        return;
    }

    const username = params.qstring.username;
    const password = params.qstring.password;

    if (!username || !password) {
        common.returnMessage(params, 400, 'Missing required parameters: username and password');
        if (done) {
            done();
        }
        return;
    }

    // Use membersUtility.verifyCredentials for password verification
    const mu = getMembersUtility();
    mu.verifyCredentials(username, password, function(member) {
        if (!member) {
            common.returnMessage(params, 401, 'Invalid username or password');
            if (done) {
                done();
            }
            return;
        }

        // Check if user is locked
        if (member.locked) {
            common.returnMessage(params, 401, 'User account is locked');
            if (done) {
                done();
            }
            return;
        }

        // Generate access token
        const accessResult = jwtUtils.signAccessToken(member);
        if (!accessResult.success) {
            log.e('Failed to sign access token:', accessResult.error);
            common.returnMessage(params, 500, 'Failed to generate access token');
            if (done) {
                done();
            }
            return;
        }

        // Generate refresh token
        const refreshResult = jwtUtils.signRefreshToken(member._id);
        if (!refreshResult.success) {
            log.e('Failed to sign refresh token:', refreshResult.error);
            common.returnMessage(params, 500, 'Failed to generate refresh token');
            if (done) {
                done();
            }
            return;
        }

        // Return tokens
        common.returnOutput(params, {
            access_token: accessResult.token,
            token_type: 'Bearer',
            expires_in: accessResult.expiresIn,
            refresh_token: refreshResult.token,
            refresh_expires_in: refreshResult.expiresIn
        });

        if (done) {
            done();
        }
    });
}

/**
 * Refresh endpoint - exchanges refresh token for new access token
 * @param {object} params - Request params object
 * @param {function} done - Callback function
 */
function refresh(params, done) {
    // Check if JWT is properly configured
    if (!jwtUtils.isConfigured()) {
        common.returnMessage(params, 500, 'JWT authentication is not configured');
        if (done) {
            done();
        }
        return;
    }

    const refreshToken = params.qstring.refresh_token;

    if (!refreshToken) {
        common.returnMessage(params, 400, 'Missing required parameter: refresh_token');
        if (done) {
            done();
        }
        return;
    }

    // Verify the refresh token
    const verifyResult = jwtUtils.verifyToken(refreshToken, 'refresh');
    if (!verifyResult.valid) {
        let statusCode = 401;
        let message = 'Invalid refresh token';

        if (verifyResult.error === 'TOKEN_EXPIRED') {
            message = 'Refresh token has expired. Please login again.';
        }
        else if (verifyResult.error === 'INVALID_TOKEN_TYPE') {
            message = 'Invalid token type. Expected refresh token.';
        }

        common.returnMessage(params, statusCode, message);
        if (done) {
            done();
        }
        return;
    }

    const decoded = verifyResult.decoded;
    const memberId = decoded.sub;
    const jti = decoded.jti;

    // Check if token is blacklisted
    jwtUtils.isTokenBlacklisted(jti, function(err, isBlacklisted) {
        if (err) {
            common.returnMessage(params, 500, 'Error checking token status');
            if (done) {
                done();
            }
            return;
        }

        if (isBlacklisted) {
            common.returnMessage(params, 401, 'Refresh token has been revoked');
            if (done) {
                done();
            }
            return;
        }

        // Fetch the member to ensure they still exist and aren't locked
        common.db.collection('members').findOne(
            { _id: common.db.ObjectID(memberId) },
            function(findErr, member) {
                if (findErr || !member) {
                    common.returnMessage(params, 401, 'User not found');
                    if (done) {
                        done();
                    }
                    return;
                }

                if (member.locked) {
                    common.returnMessage(params, 401, 'User account is locked');
                    if (done) {
                        done();
                    }
                    return;
                }

                // Blacklist the old refresh token (refresh token rotation)
                const expiresAt = new Date(decoded.exp * 1000);
                jwtUtils.blacklistToken(jti, memberId, expiresAt, function(blacklistErr) {
                    if (blacklistErr) {
                        log.e('Failed to blacklist old refresh token:', blacklistErr);
                        // Continue anyway - token rotation is a security enhancement, not critical
                    }

                    // Generate new access token
                    const accessResult = jwtUtils.signAccessToken(member);
                    if (!accessResult.success) {
                        common.returnMessage(params, 500, 'Failed to generate access token');
                        if (done) {
                            done();
                        }
                        return;
                    }

                    // Generate new refresh token
                    const refreshResult = jwtUtils.signRefreshToken(memberId);
                    if (!refreshResult.success) {
                        common.returnMessage(params, 500, 'Failed to generate refresh token');
                        if (done) {
                            done();
                        }
                        return;
                    }

                    // Return new tokens
                    common.returnOutput(params, {
                        access_token: accessResult.token,
                        token_type: 'Bearer',
                        expires_in: accessResult.expiresIn,
                        refresh_token: refreshResult.token,
                        refresh_expires_in: refreshResult.expiresIn
                    });

                    if (done) {
                        done();
                    }
                });
            }
        );
    });
}

/**
 * Revoke endpoint - invalidates a refresh token (logout)
 * @param {object} params - Request params object
 * @param {function} done - Callback function
 */
function revoke(params, done) {
    // Check if JWT is properly configured
    if (!jwtUtils.isConfigured()) {
        common.returnMessage(params, 500, 'JWT authentication is not configured');
        if (done) {
            done();
        }
        return;
    }

    const refreshToken = params.qstring.refresh_token;

    if (!refreshToken) {
        common.returnMessage(params, 400, 'Missing required parameter: refresh_token');
        if (done) {
            done();
        }
        return;
    }

    // Verify the refresh token (we need to decode it to get the jti)
    const verifyResult = jwtUtils.verifyToken(refreshToken, 'refresh');

    // Even if expired, we should try to blacklist it
    let decoded;
    if (verifyResult.valid) {
        decoded = verifyResult.decoded;
    }
    else if (verifyResult.error === 'TOKEN_EXPIRED') {
        // For expired tokens, try to decode without verification
        try {
            decoded = require('jsonwebtoken').decode(refreshToken);
            if (!decoded || decoded.type !== 'refresh') {
                common.returnMessage(params, 400, 'Invalid refresh token format');
                if (done) {
                    done();
                }
                return;
            }
        }
        catch (e) {
            common.returnMessage(params, 400, 'Invalid refresh token');
            if (done) {
                done();
            }
            return;
        }
    }
    else {
        common.returnMessage(params, 400, 'Invalid refresh token');
        if (done) {
            done();
        }
        return;
    }

    const jti = decoded.jti;
    const memberId = decoded.sub;
    const expiresAt = new Date(decoded.exp * 1000);

    // Add to blacklist
    jwtUtils.blacklistToken(jti, memberId, expiresAt, function(err) {
        if (err) {
            log.e('Failed to revoke token:', err);
            common.returnMessage(params, 500, 'Failed to revoke token');
            if (done) {
                done();
            }
            return;
        }

        common.returnOutput(params, { success: true, message: 'Token revoked successfully' });
        if (done) {
            done();
        }
    });
}

module.exports = {
    login,
    refresh,
    revoke
};
