var should = require('should');

describe('Log utility tests', function() {
    var originalEnv;

    before(function() {
        // Save original environment
        originalEnv = Object.assign({}, process.env);
    });

    afterEach(function() {
        // Clear all environment variables and restore original
        Object.keys(process.env).forEach(function(key) {
            delete process.env[key];
        });
        Object.assign(process.env, originalEnv);

        // Clear require cache for log module and config to get fresh instances
        delete require.cache[require.resolve('../../api/utils/log.js')];
        delete require.cache[require.resolve('../../api/config.js')];
    });

    after(function() {
        // Final cleanup - restore original environment
        Object.keys(process.env).forEach(function(key) {
            delete process.env[key];
        });
        Object.assign(process.env, originalEnv);
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

    describe('Logger factory function', function() {
        it('should be a function', function() {
            var log = require('../../api/utils/log.js');
            (typeof log).should.equal('function');
        });

        it('should create a logger instance', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('test-module');
            should.exist(logger);
            (typeof logger).should.equal('object');
        });

        it('should create logger with correct module name', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('my-module');
            logger.id().should.equal('my-module');
        });
    });

    describe('Logger instance methods', function() {
        it('should have id() method', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('test-logger');
            (typeof logger.id).should.equal('function');
            logger.id().should.equal('test-logger');
        });

        it('should have d() method for debug logging', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('test-logger');
            (typeof logger.d).should.equal('function');
        });

        it('should have i() method for info logging', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('test-logger');
            (typeof logger.i).should.equal('function');
        });

        it('should have w() method for warning logging', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('test-logger');
            (typeof logger.w).should.equal('function');
        });

        it('should have e() method for error logging', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('test-logger');
            (typeof logger.e).should.equal('function');
        });

        it('should have f() method for conditional logging', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('test-logger');
            (typeof logger.f).should.equal('function');
        });

        it('should have callback() method', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('test-logger');
            (typeof logger.callback).should.equal('function');
        });

        it('should have logdb() method', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('test-logger');
            (typeof logger.logdb).should.equal('function');
        });

        it('should have sub() method', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('test-logger');
            (typeof logger.sub).should.equal('function');
        });
    });

    describe('Logger.callback() method', function() {
        it('should return a function', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('callback-test');
            var cb = logger.callback();
            (typeof cb).should.equal('function');
        });

        it('should call next function on success (no error)', function(done) {
            var log = require('../../api/utils/log.js');
            var logger = log('callback-test');
            var cb = logger.callback(function(result) {
                result.should.equal('success-data');
                done();
            });
            cb(null, 'success-data');
        });

        it('should pass multiple arguments to next function', function(done) {
            var log = require('../../api/utils/log.js');
            var logger = log('callback-test');
            var cb = logger.callback(function(arg1, arg2, arg3) {
                arg1.should.equal('first');
                arg2.should.equal('second');
                arg3.should.equal('third');
                done();
            });
            cb(null, 'first', 'second', 'third');
        });

        it('should not call next function on error', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('callback-test');
            var nextCalled = false;
            var cb = logger.callback(function() {
                nextCalled = true;
            });
            cb(new Error('test error'));
            nextCalled.should.equal(false);
        });

        it('should work without next function', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('callback-test');
            var cb = logger.callback();
            // Should not throw
            cb(null, 'data');
            cb(new Error('error'));
        });
    });

    describe('Logger.logdb() method', function() {
        it('should return a function', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('logdb-test');
            var cb = logger.logdb('operation');
            (typeof cb).should.equal('function');
        });

        it('should call next function on success', function(done) {
            var log = require('../../api/utils/log.js');
            var logger = log('logdb-test');
            var cb = logger.logdb('insertOne', function(result) {
                result.should.eql({ _id: '123' });
                done();
            });
            cb(null, { _id: '123' });
        });

        it('should call nextError function on error', function(done) {
            var log = require('../../api/utils/log.js');
            var logger = log('logdb-test');
            var cb = logger.logdb('insertOne', null, function(err) {
                err.message.should.equal('connection failed');
                done();
            });
            cb(new Error('connection failed'));
        });

        it('should not call next function on error', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('logdb-test');
            var nextCalled = false;
            var cb = logger.logdb('insertOne', function() {
                nextCalled = true;
            });
            cb(new Error('error'));
            nextCalled.should.equal(false);
        });

        it('should work without callbacks', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('logdb-test');
            var cb = logger.logdb('operation');
            // Should not throw
            cb(null, 'data');
            cb(new Error('error'));
        });
    });

    describe('SubLogger creation and methods', function() {
        it('should create sub-logger with correct name', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('parent-module');
            var subLogger = logger.sub('child');
            subLogger.id().should.equal('parent-module:child');
        });

        it('should have d() method', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('parent-module');
            var subLogger = logger.sub('child');
            (typeof subLogger.d).should.equal('function');
        });

        it('should have i() method', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('parent-module');
            var subLogger = logger.sub('child');
            (typeof subLogger.i).should.equal('function');
        });

        it('should have w() method', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('parent-module');
            var subLogger = logger.sub('child');
            (typeof subLogger.w).should.equal('function');
        });

        it('should have e() method', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('parent-module');
            var subLogger = logger.sub('child');
            (typeof subLogger.e).should.equal('function');
        });

        it('should have f() method', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('parent-module');
            var subLogger = logger.sub('child');
            (typeof subLogger.f).should.equal('function');
        });

        it('should have sub() method for nested sub-loggers', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('parent-module');
            var subLogger = logger.sub('child');
            (typeof subLogger.sub).should.equal('function');
        });

        it('should NOT have callback() method', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('parent-module');
            var subLogger = logger.sub('child');
            should.not.exist(subLogger.callback);
        });

        it('should NOT have logdb() method', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('parent-module');
            var subLogger = logger.sub('child');
            should.not.exist(subLogger.logdb);
        });

        it('should create nested sub-loggers with correct name', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('parent-module');
            var subLogger = logger.sub('child');
            var nestedSub = subLogger.sub('grandchild');
            nestedSub.id().should.equal('parent-module:child:grandchild');
        });
    });

    describe('Static methods', function() {
        it('should have setLevel() method', function() {
            var log = require('../../api/utils/log.js');
            (typeof log.setLevel).should.equal('function');
        });

        it('should have setDefault() method', function() {
            var log = require('../../api/utils/log.js');
            (typeof log.setDefault).should.equal('function');
        });

        it('should have getLevel() method', function() {
            var log = require('../../api/utils/log.js');
            (typeof log.getLevel).should.equal('function');
        });

        it('should have setPrettyPrint() method', function() {
            var log = require('../../api/utils/log.js');
            (typeof log.setPrettyPrint).should.equal('function');
        });

        it('should have updateConfig() method', function() {
            var log = require('../../api/utils/log.js');
            (typeof log.updateConfig).should.equal('function');
        });

        it('should have hasOpenTelemetry property', function() {
            var log = require('../../api/utils/log.js');
            (typeof log.hasOpenTelemetry).should.equal('boolean');
        });
    });

    describe('setLevel() and getLevel()', function() {
        it('should set and get level for a module', function() {
            var log = require('../../api/utils/log.js');
            log.setLevel('test-module', 'debug');
            log.getLevel('test-module').should.equal('debug');
        });

        it('should return default level when module not set', function() {
            var log = require('../../api/utils/log.js');
            log.setDefault('error');
            log.getLevel('unknown-module').should.equal('error');
        });

        it('should return default level when called without module', function() {
            var log = require('../../api/utils/log.js');
            log.setDefault('info');
            log.getLevel().should.equal('info');
        });
    });

    describe('setDefault()', function() {
        it('should change the default log level', function() {
            var log = require('../../api/utils/log.js');
            log.setDefault('debug');
            log.getLevel().should.equal('debug');
        });

        it('should affect new modules', function() {
            var log = require('../../api/utils/log.js');
            log.setDefault('info');
            log.getLevel('new-module').should.equal('info');
        });
    });

    describe('Conditional logging f() method', function() {
        it('should execute function when level is enabled', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('f-test');
            log.setLevel('f-test', 'debug');
            var executed = false;
            logger.f('d', function() {
                executed = true;
            });
            executed.should.equal(true);
        });

        it('should return true when function is executed', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('f-test');
            log.setLevel('f-test', 'debug');
            var result = logger.f('d', function() {});
            result.should.equal(true);
        });

        it('should not execute function when level is disabled', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('f-test');
            log.setLevel('f-test', 'error');
            var executed = false;
            logger.f('d', function() {
                executed = true;
            });
            executed.should.equal(false);
        });

        it('should call fallback level when primary level is disabled', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('f-test');
            log.setLevel('f-test', 'warn');
            var fallbackCalled = false;

            // Spy on the warn method
            var originalW = logger.w;
            logger.w = function() {
                fallbackCalled = true;
            };

            logger.f('d', function() {}, 'w', 'fallback message');
            fallbackCalled.should.equal(true);

            // Restore
            logger.w = originalW;
        });
    });

    describe('Logger level filtering', function() {
        it('should use level set after logger creation', function() {
            var log = require('../../api/utils/log.js');
            var logger = log('post-set-module');
            // Logger is created with default level
            log.getLevel('post-set-module').should.equal('warn');
            // Setting level after creation should update it
            log.setLevel('post-set-module', 'info');
            log.getLevel('post-set-module').should.equal('info');
        });

        it('should use config level when creating logger', function() {
            process.env.COUNTLY_SETTINGS__LOGS__DEBUG = 'configured-module';
            process.env.COUNTLY_SETTINGS__LOGS__DEFAULT = 'error';
            var log = require('../../api/utils/log.js');

            // Before creating logger, getLevel uses config
            log.getLevel('configured-module').should.equal('debug');

            // Creating logger should also use config level
            var logger = log('configured-module');
            log.getLevel('configured-module').should.equal('debug');
        });
    });

    describe('Multiple logger instances', function() {
        it('should create independent logger instances', function() {
            var log = require('../../api/utils/log.js');
            var logger1 = log('module-1');
            var logger2 = log('module-2');

            logger1.id().should.equal('module-1');
            logger2.id().should.equal('module-2');
        });

        it('should share level configuration via setLevel', function() {
            var log = require('../../api/utils/log.js');
            var logger1 = log('shared-module');
            var logger2 = log('another-module');

            // Set level for one module
            log.setLevel('shared-module', 'debug');
            log.getLevel('shared-module').should.equal('debug');

            // Other module should still have its own level
            log.getLevel('another-module').should.equal('warn');

            // Set level for second module
            log.setLevel('another-module', 'info');
            log.getLevel('another-module').should.equal('info');

            // First module should still have debug
            log.getLevel('shared-module').should.equal('debug');
        });
    });

    describe('Prefix matching for log levels', function() {
        it('should match module prefixes', function() {
            process.env.COUNTLY_SETTINGS__LOGS__DEBUG = 'api';
            process.env.COUNTLY_SETTINGS__LOGS__DEFAULT = 'error';
            var log = require('../../api/utils/log.js');

            // 'api' prefix should match 'api:users', 'api:sessions', etc.
            log.getLevel('api').should.equal('debug');
            log.getLevel('api:users').should.equal('debug');
            log.getLevel('api:sessions').should.equal('debug');
            log.getLevel('other').should.equal('error');
        });
    });

    describe('updateConfig edge cases', function() {
        it('should ignore messages without cmd=log', function() {
            var log = require('../../api/utils/log.js');
            log.setDefault('warn');
            log.updateConfig({ cmd: 'other', config: { default: 'debug' } });
            log.getLevel().should.equal('warn');
        });

        it('should ignore messages without config', function() {
            var log = require('../../api/utils/log.js');
            log.setDefault('warn');
            log.updateConfig({ cmd: 'log' });
            log.getLevel().should.equal('warn');
        });

        it('should ignore null messages', function() {
            var log = require('../../api/utils/log.js');
            log.setDefault('warn');
            log.updateConfig(null);
            log.getLevel().should.equal('warn');
        });

        it('should ignore undefined messages', function() {
            var log = require('../../api/utils/log.js');
            log.setDefault('warn');
            log.updateConfig(undefined);
            log.getLevel().should.equal('warn');
        });
    });

    describe('CI environment behavior', function() {
        it('should set default to silent when CI=true and no explicit default', function() {
            process.env.CI = 'true';
            var log = require('../../api/utils/log.js');

            log.getLevel().should.equal('silent');
        });

        it('should respect explicit default even when CI=true', function() {
            process.env.CI = 'true';
            process.env.COUNTLY_SETTINGS__LOGS__DEFAULT = 'debug';
            var log = require('../../api/utils/log.js');

            log.getLevel().should.equal('debug');
        });

        it('should suppress all logs when level is silent', function() {
            process.env.CI = 'true';
            var log = require('../../api/utils/log.js');
            var logger = log('ci-test');

            // All log methods should exist but not output anything
            // (since 'silent' is not in any ACCEPTABLE array)
            (typeof logger.d).should.equal('function');
            (typeof logger.i).should.equal('function');
            (typeof logger.w).should.equal('function');
            (typeof logger.e).should.equal('function');

            // Level should be silent
            log.getLevel('ci-test').should.equal('silent');
        });
    });
});
