var configExtender = require('../../api/configextender'),
    should = require('should');

describe('Reading config with ENV extensions', function() {
    var testConfig = {
        mongodb: {
            host: 'localhost',
            db: 'countly',
            port: 27017,
            max_pool_size: 500,
        },
        api: {
            port: 3001,
            host: 'localhost',
            max_sockets: 1024
        },
        path: '',
        logging: {
            info: ['jobs', 'push'],
            default: 'warn'
        },
        ignoreProxies: [ ] // empty array
    };

    it('should override host', () => {
        let VALUE = 'mongo.host.name',
            config = configExtender('API', JSON.parse(JSON.stringify(testConfig)), {COUNTLY_CONFIG_API_MONGODB_HOST: VALUE});
        should.exist(config.mongodb);
        should.exist(config.mongodb.host);
        config.mongodb.host.should.equal(VALUE);
    });

    it('should not override api host in frontend mode', () => {
        let VALUE = 'mongo.host.name',
            config = configExtender('API', JSON.parse(JSON.stringify(testConfig)), {COUNTLY_CONFIG_FRONTEND_MONGODB_HOST: VALUE});
        should.exist(config.mongodb);
        should.exist(config.mongodb.host);
        config.mongodb.host.should.equal(testConfig.mongodb.host);
    });

    it('should override host with max_pool_size', () => {
        let VALUE = 'mongo.host.name',
            VALUE2 = '100',
            config = configExtender('API', JSON.parse(JSON.stringify(testConfig)), {COUNTLY_CONFIG_API_MONGODB_HOST: VALUE, COUNTLY_CONFIG_API_MONGODB_MAX_POOL_SIZE: VALUE2});
        should.exist(config.mongodb);
        should.exist(config.mongodb.host);
        should.exist(config.mongodb.max_pool_size);
        config.mongodb.host.should.equal(VALUE);
        config.mongodb.max_pool_size.should.equal(parseInt(VALUE2));
    });

    it('should override max_sockets', () => {
        let VALUE = '100',
            config = configExtender('API', JSON.parse(JSON.stringify(testConfig)), {COUNTLY_CONFIG_API_API_MAX_SOCKETS: VALUE});
        should.exist(config.api.max_sockets);
        config.api.max_sockets.should.equal(parseInt(100));
    });

    it('should override mongodb with url', () => {
        let VALUE = 'mongodb://mongo.host.name/db',
            config = configExtender('API', JSON.parse(JSON.stringify(testConfig)), {COUNTLY_CONFIG_API_MONGODB: VALUE});
        should.exist(config.mongodb);
        should.not.exist(config.mongodb.host);
        config.mongodb.should.equal(VALUE);
    });

    it('should support camel case with JSON object', () => {
        let VALUE = '{"ssl": false}',
            config = configExtender('API', JSON.parse(JSON.stringify(testConfig)), {COUNTLY_CONFIG_API_MONGODB_SERVEROPTIONS: VALUE});
        should.exist(config.mongodb);
        should.exist(config.mongodb.serverOptions);
        should.exist(config.mongodb.serverOptions.ssl);
        config.mongodb.serverOptions.ssl.should.equal(false);
    });

    it('should support create intermediary object in camelCase', () => {
        let VALUE = 'something',
            config = configExtender('API', JSON.parse(JSON.stringify(testConfig)), {COUNTLY_CONFIG_API_MONGODB_DBOPTIONS_DEEP_KEY: VALUE});
        should.exist(config.mongodb);
        should.exist(config.mongodb.dbOptions);
        should.exist(config.mongodb.dbOptions.deep);
        should.exist(config.mongodb.dbOptions.deep.key);
        config.mongodb.dbOptions.deep.key.should.equal(VALUE);
    });

    it('should support create intermediary object without overrides', () => {
        let VALUE = 'something',
            config = configExtender('API', JSON.parse(JSON.stringify(testConfig)), {COUNTLY_CONFIG_API_SOME_DEEP_KEY: VALUE});
        should.exist(config);
        should.exist(config.some);
        should.exist(config.some.deep);
        should.exist(config.some.deep.key);
        config.some.deep.key.should.equal(VALUE);
    });

    it('should support ignoreProxies', () => {
        let VALUE = true,
            config = configExtender('API', JSON.parse(JSON.stringify(testConfig)), {COUNTLY_CONFIG_API_IGNOREPROXIES: VALUE});
        should.exist(config.ignoreProxies);
        config.ignoreProxies.should.equal(VALUE);
    });

    it('should support ignoreProxies as array', () => {
        let VALUE = '["aaa.com"]',
            config = configExtender('API', JSON.parse(JSON.stringify(testConfig)), {COUNTLY_CONFIG_API_IGNOREPROXIES: VALUE});
        should.exist(config.ignoreProxies);
        should.exist(config.ignoreProxies[0]);
        config.ignoreProxies[0].should.equal('aaa.com');
    });

    it('should support logging debug array', () => {
        let VALUE = ['alerts', 'assistant'],
            config = configExtender('API', JSON.parse(JSON.stringify(testConfig)), {COUNTLY_CONFIG_API_LOGGING_DEBUG: JSON.stringify(VALUE)});
        should.exist(config.logging);
        should.exist(config.logging.info);
        should.exist(config.logging.debug);
        config.logging.debug[0].should.equal('alerts');
        config.logging.debug[1].should.equal('assistant');
    });

    it('should support logging default value', () => {
        let VALUE = 'wtf',
            config = configExtender('API', JSON.parse(JSON.stringify(testConfig)), {COUNTLY_CONFIG_API_LOGGING_DEFAULT: VALUE});
        should.exist(config.logging);
        should.exist(config.logging.info);
        should.exist(config.logging.default);
        config.logging.default.should.equal(VALUE);
    });
});