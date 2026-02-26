var should = require("should");
var jwt = require("jsonwebtoken");

// Mock the common module before requiring jwt module
var mockConfig = {
    jwt: {
        secret: 'test-secret-key-with-at-least-32-characters-for-testing',
        accessTokenExpiry: 900,
        refreshTokenExpiry: 604800,
        issuer: 'countly-test',
        algorithm: 'HS256'
    }
};

var mockDb = {
    collection: function() {
        return {
            findOne: function(query, callback) {
                callback(null, null);
            },
            insertOne: function(doc, callback) {
                callback(null, { insertedId: doc._id });
            },
            createIndex: function(keys, options, callback) {
                if (callback) {
                    callback(null);
                }
            }
        };
    },
    ObjectID: function(id) {
        return id;
    }
};

// Mock common module
require.cache[require.resolve("../../api/utils/common.js")] = {
    id: require.resolve("../../api/utils/common.js"),
    filename: require.resolve("../../api/utils/common.js"),
    loaded: true,
    exports: {
        config: mockConfig,
        db: mockDb
    }
};

// Mock log module
require.cache[require.resolve("../../api/utils/log.js")] = {
    id: require.resolve("../../api/utils/log.js"),
    filename: require.resolve("../../api/utils/log.js"),
    loaded: true,
    exports: function() {
        return {
            d: function() {},
            i: function() {},
            w: function() {},
            e: function() {}
        };
    }
};

// Now require the jwt module
var jwtUtils = require("../../api/utils/jwt.js");

describe("JWT Utility Functions", function() {
    describe("getConfig", function() {
        it("should return configuration with defaults", function() {
            var config = jwtUtils.getConfig();
            config.should.have.property('secret');
            config.should.have.property('accessTokenExpiry', 900);
            config.should.have.property('refreshTokenExpiry', 604800);
            config.should.have.property('issuer', 'countly-test');
            config.should.have.property('algorithm', 'HS256');
        });
    });

    describe("isConfigured", function() {
        it("should return true when secret is properly configured", function() {
            jwtUtils.isConfigured().should.be.true();
        });
    });

    describe("signAccessToken", function() {
        var mockMember = {
            _id: '507f1f77bcf86cd799439011',
            global_admin: true,
            permission: null
        };

        it("should sign an access token successfully", function() {
            var result = jwtUtils.signAccessToken(mockMember);
            result.should.have.property('success', true);
            result.should.have.property('token');
            result.should.have.property('expiresIn', 900);

            // Verify the token is valid
            var decoded = jwt.verify(result.token, mockConfig.jwt.secret);
            decoded.should.have.property('sub', '507f1f77bcf86cd799439011');
            decoded.should.have.property('type', 'access');
            decoded.should.have.property('global_admin', true);
        });

        it("should include permissions for non-global admins", function() {
            var nonAdminMember = {
                _id: '507f1f77bcf86cd799439012',
                global_admin: false,
                permission: {
                    c: { 'app1': { all: true } },
                    r: { 'app1': { all: true } },
                    u: { 'app1': { all: true } },
                    d: { 'app1': { all: true } },
                    _: { a: ['app1'], u: [[]] }
                }
            };

            var result = jwtUtils.signAccessToken(nonAdminMember);
            result.should.have.property('success', true);

            var decoded = jwt.verify(result.token, mockConfig.jwt.secret);
            decoded.should.have.property('permission');
            decoded.permission.should.have.property('c');
        });
    });

    describe("signRefreshToken", function() {
        it("should sign a refresh token with JTI", function() {
            var result = jwtUtils.signRefreshToken('507f1f77bcf86cd799439011');
            result.should.have.property('success', true);
            result.should.have.property('token');
            result.should.have.property('jti');
            result.should.have.property('expiresIn', 604800);

            // Verify the token
            var decoded = jwt.verify(result.token, mockConfig.jwt.secret);
            decoded.should.have.property('sub', '507f1f77bcf86cd799439011');
            decoded.should.have.property('type', 'refresh');
            decoded.should.have.property('jti', result.jti);
        });

        it("should generate unique JTIs for each token", function() {
            var result1 = jwtUtils.signRefreshToken('507f1f77bcf86cd799439011');
            var result2 = jwtUtils.signRefreshToken('507f1f77bcf86cd799439011');

            result1.jti.should.not.equal(result2.jti);
        });
    });

    describe("verifyToken", function() {
        it("should verify a valid access token", function() {
            var mockMember = {
                _id: '507f1f77bcf86cd799439011',
                global_admin: true
            };
            var signResult = jwtUtils.signAccessToken(mockMember);
            var verifyResult = jwtUtils.verifyToken(signResult.token, 'access');

            verifyResult.should.have.property('valid', true);
            verifyResult.should.have.property('decoded');
            verifyResult.decoded.should.have.property('sub', '507f1f77bcf86cd799439011');
            verifyResult.decoded.should.have.property('type', 'access');
        });

        it("should verify a valid refresh token", function() {
            var signResult = jwtUtils.signRefreshToken('507f1f77bcf86cd799439011');
            var verifyResult = jwtUtils.verifyToken(signResult.token, 'refresh');

            verifyResult.should.have.property('valid', true);
            verifyResult.decoded.should.have.property('type', 'refresh');
            verifyResult.decoded.should.have.property('jti');
        });

        it("should reject token with wrong type", function() {
            var signResult = jwtUtils.signRefreshToken('507f1f77bcf86cd799439011');
            var verifyResult = jwtUtils.verifyToken(signResult.token, 'access');

            verifyResult.should.have.property('valid', false);
            verifyResult.should.have.property('error', 'INVALID_TOKEN_TYPE');
        });

        it("should reject expired tokens", function() {
            // Create a token that's already expired
            var expiredToken = jwt.sign(
                { sub: '507f1f77bcf86cd799439011', type: 'access' },
                mockConfig.jwt.secret,
                { expiresIn: -10, issuer: mockConfig.jwt.issuer }
            );

            var verifyResult = jwtUtils.verifyToken(expiredToken, 'access');
            verifyResult.should.have.property('valid', false);
            verifyResult.should.have.property('error', 'TOKEN_EXPIRED');
        });

        it("should reject invalid tokens", function() {
            var verifyResult = jwtUtils.verifyToken('invalid.token.here', 'access');
            verifyResult.should.have.property('valid', false);
            verifyResult.should.have.property('error', 'INVALID_TOKEN');
        });

        it("should reject tokens with wrong secret", function() {
            var token = jwt.sign(
                { sub: '507f1f77bcf86cd799439011', type: 'access' },
                'wrong-secret',
                { expiresIn: 900, issuer: mockConfig.jwt.issuer }
            );

            var verifyResult = jwtUtils.verifyToken(token, 'access');
            verifyResult.should.have.property('valid', false);
            verifyResult.should.have.property('error', 'INVALID_TOKEN');
        });

        it("should return error for missing token", function() {
            var verifyResult = jwtUtils.verifyToken(null, 'access');
            verifyResult.should.have.property('valid', false);
            verifyResult.should.have.property('error', 'NO_TOKEN');
        });
    });

    describe("extractBearerToken", function() {
        it("should extract Bearer token from Authorization header", function() {
            var req = {
                headers: {
                    authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
                }
            };
            var token = jwtUtils.extractBearerToken(req);
            token.should.equal('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
        });

        it("should extract Bearer token with capitalized header", function() {
            var req = {
                headers: {
                    Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
                }
            };
            var token = jwtUtils.extractBearerToken(req);
            token.should.equal('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
        });

        it("should return null for missing header", function() {
            var req = { headers: {} };
            should(jwtUtils.extractBearerToken(req)).be.null();
        });

        it("should return null for non-Bearer auth", function() {
            var req = {
                headers: {
                    authorization: 'Basic dXNlcm5hbWU6cGFzc3dvcmQ='
                }
            };
            should(jwtUtils.extractBearerToken(req)).be.null();
        });

        it("should return null for malformed Bearer header", function() {
            var req = {
                headers: {
                    authorization: 'Bearer'
                }
            };
            should(jwtUtils.extractBearerToken(req)).be.null();
        });

        it("should return null for missing request", function() {
            should(jwtUtils.extractBearerToken(null)).be.null();
        });

        it("should handle case-insensitive Bearer", function() {
            var req = {
                headers: {
                    authorization: 'BEARER token123'
                }
            };
            jwtUtils.extractBearerToken(req).should.equal('token123');
        });
    });

    describe("isTokenBlacklisted", function() {
        it("should check blacklist status via callback", function(done) {
            jwtUtils.isTokenBlacklisted('test-jti', function(err, isBlacklisted) {
                should(err).be.null();
                isBlacklisted.should.be.false();
                done();
            });
        });
    });

    describe("blacklistToken", function() {
        it("should add token to blacklist via callback", function(done) {
            var expiresAt = new Date(Date.now() + 86400000);
            jwtUtils.blacklistToken('test-jti', 'member-id', expiresAt, function(err) {
                should(err).be.null();
                done();
            });
        });
    });
});
