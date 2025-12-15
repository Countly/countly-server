var should = require('should');

describe('Log utility tests', function() {
    var originalEnv;

    before(function() {
        // Save original environment
        originalEnv = Object.assign({}, process.env);
    });

    afterEach(function() {
        // Clean up test environment variables
        Object.keys(process.env).forEach(function(key) {
            if (key.startsWith('COUNTLY_SETTINGS__LOGS__')) {
                delete process.env[key];
            }
        });

        // Clear require cache for log module and config to get fresh instances
        delete require.cache[require.resolve('../../api/utils/log.js')];
        delete require.cache[require.resolve('../../api/config.js')];
    });

    after(function() {
        // Restore original environment
        process.env = originalEnv;
    });

    describe('Default log levels', function() {
        it('should return warn as default level', function() {
            var log = require('../../api/utils/log.js');
            log.getLevel().should.equal('warn');
        });

        it('should return warn for mail module initially', function() {
            var log = require('../../api/utils/log.js');
            log.getLevel('mail').should.equal('warn');
        });
    });

    describe('Environment variable configuration', function() {
        it('should override default log level with environment variable', function() {
            process.env.COUNTLY_SETTINGS__LOGS__DEFAULT = 'debug';
            var log = require('../../api/utils/log.js');

            log.getLevel().should.equal('debug');
        });

        it('should set debug modules from comma-separated environment variable', function() {
            process.env.COUNTLY_SETTINGS__LOGS__DEBUG = 'api,db,push';
            process.env.COUNTLY_SETTINGS__LOGS__DEFAULT = 'warn';
            var log = require('../../api/utils/log.js');

            log.getLevel('api').should.equal('debug');
            log.getLevel('db').should.equal('debug');
            log.getLevel('push').should.equal('debug');
            log.getLevel('other').should.equal('warn');
        });

        it('should set debug modules from JSON array environment variable', function() {
            process.env.COUNTLY_SETTINGS__LOGS__DEBUG = '["api","db","push"]';
            process.env.COUNTLY_SETTINGS__LOGS__DEFAULT = 'warn';
            var log = require('../../api/utils/log.js');

            log.getLevel('api').should.equal('debug');
            log.getLevel('db').should.equal('debug');
            log.getLevel('push').should.equal('debug');
        });

        it('should set info modules from environment variable', function() {
            process.env.COUNTLY_SETTINGS__LOGS__INFO = 'api,mail';
            process.env.COUNTLY_SETTINGS__LOGS__DEFAULT = 'error';
            var log = require('../../api/utils/log.js');

            log.getLevel('api').should.equal('info');
            log.getLevel('mail').should.equal('info');
            log.getLevel('other').should.equal('error');
        });

        it('should set warn modules from environment variable', function() {
            process.env.COUNTLY_SETTINGS__LOGS__WARN = 'jobs,tasks';
            process.env.COUNTLY_SETTINGS__LOGS__DEFAULT = 'error';
            var log = require('../../api/utils/log.js');

            log.getLevel('jobs').should.equal('warn');
            log.getLevel('tasks').should.equal('warn');
        });

        it('should set error modules from environment variable', function() {
            process.env.COUNTLY_SETTINGS__LOGS__ERROR = 'critical';
            process.env.COUNTLY_SETTINGS__LOGS__DEFAULT = 'warn';
            var log = require('../../api/utils/log.js');

            log.getLevel('critical').should.equal('error');
            log.getLevel('other').should.equal('warn');
        });

        it('should handle multiple log levels from environment variables', function() {
            process.env.COUNTLY_SETTINGS__LOGS__DEBUG = 'api';
            process.env.COUNTLY_SETTINGS__LOGS__INFO = 'db';
            process.env.COUNTLY_SETTINGS__LOGS__WARN = 'jobs';
            process.env.COUNTLY_SETTINGS__LOGS__DEFAULT = 'error';
            var log = require('../../api/utils/log.js');

            log.getLevel('api').should.equal('debug');
            log.getLevel('db').should.equal('info');
            log.getLevel('jobs').should.equal('warn');
            log.getLevel('other').should.equal('error');
        });

        it('should handle empty string environment variable', function() {
            process.env.COUNTLY_SETTINGS__LOGS__DEBUG = '';
            process.env.COUNTLY_SETTINGS__LOGS__DEFAULT = 'warn';
            var log = require('../../api/utils/log.js');

            log.getLevel('api').should.equal('warn');
        });

        it('should handle whitespace in comma-separated values', function() {
            process.env.COUNTLY_SETTINGS__LOGS__DEBUG = ' api , db , push ';
            process.env.COUNTLY_SETTINGS__LOGS__DEFAULT = 'warn';
            var log = require('../../api/utils/log.js');

            log.getLevel('api').should.equal('debug');
            log.getLevel('db').should.equal('debug');
            log.getLevel('push').should.equal('debug');
        });

        it('should prioritize environment variables over config.js', function() {
            // Even if config.js has default 'warn', env var should override
            process.env.COUNTLY_SETTINGS__LOGS__DEFAULT = 'info';
            var log = require('../../api/utils/log.js');

            log.getLevel().should.equal('info');
        });
    });

    describe('Update log configuration', function() {
        it('should update default level to error', function() {
            var log = require('../../api/utils/log.js');

            var msg = {
                cmd: 'log',
                config: {
                    debug: 'mail',
                    default: 'error',
                    error: '',
                    info: '',
                    warn: ''
                }
            };
            log.updateConfig(msg);

            log.getLevel().should.equal('error');
        });

        it('should update mail module level to debug', function() {
            var log = require('../../api/utils/log.js');

            var msg = {
                cmd: 'log',
                config: {
                    debug: 'mail',
                    default: 'error',
                    error: '',
                    info: '',
                    warn: ''
                }
            };
            log.updateConfig(msg);

            log.getLevel('mail').should.equal('debug');
        });

        it('should work after environment variable initialization', function() {
            process.env.COUNTLY_SETTINGS__LOGS__DEFAULT = 'warn';
            process.env.COUNTLY_SETTINGS__LOGS__DEBUG = 'api';
            var log = require('../../api/utils/log.js');

            // Initial state from env vars
            log.getLevel('api').should.equal('debug');
            log.getLevel().should.equal('warn');

            // Update via updateConfig
            var msg = {
                cmd: 'log',
                config: {
                    info: 'api,db',
                    default: 'error',
                    debug: '',
                    error: '',
                    warn: ''
                }
            };
            log.updateConfig(msg);

            // Should be updated
            log.getLevel('api').should.equal('info');
            log.getLevel('db').should.equal('info');
            log.getLevel().should.equal('error');
        });

        it('should update cache for modules queried before updateConfig', function() {
            var log = require('../../api/utils/log.js');

            // Query a module before updateConfig - this creates cache entry
            log.getLevel('cache-test').should.equal('warn'); // default level

            // Create a logger instance which also populates cache
            var logger = log('cached-module');
            log.getLevel('cached-module').should.equal('warn');

            // Update configuration
            var msg = {
                cmd: 'log',
                config: {
                    debug: 'cache-test,cached-module',
                    default: 'error',
                    info: '',
                    warn: '',
                    error: ''
                }
            };
            log.updateConfig(msg);

            // Both modules should now return debug level from updated cache
            log.getLevel('cache-test').should.equal('debug');
            log.getLevel('cached-module').should.equal('debug');

            // New module queries should use the updated prefs
            log.getLevel('new-module').should.equal('error'); // default
            log.getLevel('cache-test').should.equal('debug'); // explicit debug
        });

        it('should handle modules not in cache after updateConfig', function() {
            var log = require('../../api/utils/log.js');

            // Update configuration without querying any modules first
            var msg = {
                cmd: 'log',
                config: {
                    info: 'uncached-module',
                    default: 'error',
                    debug: '',
                    warn: '',
                    error: ''
                }
            };
            log.updateConfig(msg);

            // Module should be computed from prefs since it's not in cache
            log.getLevel('uncached-module').should.equal('info');
            log.getLevel('other-uncached').should.equal('error'); // default
        });
    });
});
