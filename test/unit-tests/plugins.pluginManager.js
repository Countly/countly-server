var should = require('should');

describe('PluginManager setConfigs with environment variables', function() {
    var pluginManager;
    var originalEnv;

    before(function() {
        // Save original environment
        originalEnv = Object.assign({}, process.env);
    });

    beforeEach(function() {
        // Clear any test environment variables
        for (var key in process.env) {
            if (key.startsWith('COUNTLY_SETTINGS__TEST')) {
                delete process.env[key];
            }
        }

        // Get pluginManager singleton instance
        pluginManager = require('../../plugins/pluginManager.js');
    });

    after(function() {
        // Restore original environment
        Object.keys(process.env).forEach(function(key) {
            if (key.startsWith('COUNTLY_SETTINGS__')) {
                delete process.env[key];
            }
        });
        Object.assign(process.env, originalEnv);
    });

    describe('Basic configuration without environment variables', function() {
        it('should set basic string configuration', function() {
            pluginManager.setConfigs('test', {
                stringValue: 'hello',
                numberValue: 42
            });

            var config = pluginManager.getConfig('test');
            config.stringValue.should.equal('hello');
            config.numberValue.should.equal(42);
        });

        it('should set configuration with nested object', function() {
            pluginManager.setConfigs('test', {
                nested: {
                    key: 'value',
                    count: 10
                }
            });

            var config = pluginManager.getConfig('test');
            config.nested.should.be.an.Object();
            config.nested.key.should.equal('value');
            config.nested.count.should.equal(10);
        });
    });

    describe('Configuration with environment variable overrides', function() {
        it('should override string value with environment variable', function() {
            process.env.COUNTLY_SETTINGS__TEST__STRINGVALUE = 'overridden';

            pluginManager.setConfigs('test', {
                stringValue: 'original'
            });

            var config = pluginManager.getConfig('test');
            config.stringValue.should.equal('overridden');
        });

        it('should override number value with environment variable', function() {
            process.env.COUNTLY_SETTINGS__TEST__NUMBERVALUE = '123';

            pluginManager.setConfigs('test', {
                numberValue: 42
            });

            var config = pluginManager.getConfig('test');
            config.numberValue.should.equal(123);
        });

        it('should parse boolean from environment variable', function() {
            process.env.COUNTLY_SETTINGS__TEST__BOOLVALUE = 'true';

            pluginManager.setConfigs('test', {
                boolValue: false
            });

            var config = pluginManager.getConfig('test');
            config.boolValue.should.equal(true);
        });

        it('should parse object from JSON environment variable', function() {
            process.env.COUNTLY_SETTINGS__TEST__OBJECTVALUE = '{"key":"value","num":100}';

            pluginManager.setConfigs('test', {
                objectValue: {
                    key: 'original',
                    num: 0
                }
            });

            var config = pluginManager.getConfig('test');
            config.objectValue.should.be.an.Object();
            config.objectValue.key.should.equal('value');
            config.objectValue.num.should.equal(100);
        });

        it('should parse array from JSON environment variable', function() {
            process.env.COUNTLY_SETTINGS__TEST__ARRAYVALUE = '["one","two","three"]';

            pluginManager.setConfigs('test', {
                arrayValue: []
            });

            var config = pluginManager.getConfig('test');
            config.arrayValue.should.be.an.Array();
            config.arrayValue.length.should.equal(3);
            config.arrayValue[0].should.equal('one');
        });

        it('should use string value when JSON parse fails', function() {
            process.env.COUNTLY_SETTINGS__TEST__INVALIDJSON = '{not valid json}';

            pluginManager.setConfigs('test', {
                invalidJson: 'original'
            });

            var config = pluginManager.getConfig('test');
            config.invalidJson.should.equal('{not valid json}');
        });

        it('should handle uppercase namespace and key conversion', function() {
            // Note: Environment variable uses uppercase conversion
            // The implementation converts 'my-plugin' to 'MY-PLUGIN' in uppercase
            process.env['COUNTLY_SETTINGS__MY-PLUGIN__MY_CONFIG'] = 'test_value';

            pluginManager.setConfigs('my-plugin', {
                my_config: 'original'
            });

            var config = pluginManager.getConfig('my-plugin');
            config.my_config.should.equal('test_value');
        });

        it('should not override when environment variable is not set', function() {
            pluginManager.setConfigs('test', {
                value1: 'original1',
                value2: 'original2'
            });

            var config = pluginManager.getConfig('test');
            config.value1.should.equal('original1');
            config.value2.should.equal('original2');
        });

        it('should override only specified values', function() {
            process.env.COUNTLY_SETTINGS__TEST__VALUE1 = 'overridden';

            pluginManager.setConfigs('test', {
                value1: 'original1',
                value2: 'original2'
            });

            var config = pluginManager.getConfig('test');
            config.value1.should.equal('overridden');
            config.value2.should.equal('original2');
        });
    });

    describe('Multiple setConfigs calls', function() {
        it('should merge configurations from multiple calls', function() {
            pluginManager.setConfigs('test', {
                value1: 'first'
            });

            pluginManager.setConfigs('test', {
                value2: 'second'
            });

            var config = pluginManager.getConfig('test');
            config.value1.should.equal('first');
            config.value2.should.equal('second');
        });

        it('should apply environment variables to merged configurations', function() {
            process.env.COUNTLY_SETTINGS__TEST__VALUE2 = 'env_override';

            pluginManager.setConfigs('test', {
                value1: 'first'
            });

            pluginManager.setConfigs('test', {
                value2: 'second'
            });

            var config = pluginManager.getConfig('test');
            config.value1.should.equal('first');
            config.value2.should.equal('env_override');
        });
    });

    describe('Configuration with exclude flag', function() {
        it('should exclude configuration from UI when flag is set', function() {
            pluginManager.setConfigs('test', {
                value: 'test'
            }, true);

            var allConfigs = pluginManager.getAllConfigs();
            should.not.exist(allConfigs.test);
        });
    });

    describe('Configuration with onChange callback', function() {
        it('should register onChange callback', function(done) {
            var callbackCalled = false;

            pluginManager.setConfigs('test', {
                value: 'test'
            }, false, function() {
                callbackCalled = true;
            });

            // Note: The callback would be triggered by config changes in loadConfigs
            // This test just verifies registration doesn't throw errors
            done();
        });
    });

    describe('Edge cases', function() {
        it('should handle empty configuration object', function() {
            // Use a unique namespace to avoid pollution from previous tests
            pluginManager.setConfigs('test-empty', {});

            var config = pluginManager.getConfig('test-empty');
            config.should.be.an.Object();
            Object.keys(config).length.should.equal(0);
        });

        it('should handle null values', function() {
            pluginManager.setConfigs('test', {
                nullValue: null
            });

            var config = pluginManager.getConfig('test');
            should.equal(config.nullValue, null);
        });

        it('should handle undefined environment variable value', function() {
            // Explicitly set to undefined (though this shouldn't happen in practice)
            delete process.env.COUNTLY_SETTINGS__TEST__VALUE;

            pluginManager.setConfigs('test', {
                value: 'original'
            });

            var config = pluginManager.getConfig('test');
            config.value.should.equal('original');
        });

        it('should not include inherited properties from prototype chain', function() {
            var proto = {inheritedProp: 'inherited'};
            var conf = Object.create(proto);
            conf.ownProp = 'own';

            pluginManager.setConfigs('test', conf);

            var config = pluginManager.getConfig('test');
            config.ownProp.should.equal('own');
            should.not.exist(config.inheritedProp);
        });
    });
});
