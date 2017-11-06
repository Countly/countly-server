var traverse = require('traverse');
var configExtender = require('../../api/configextender');

describe('Reading config with ENV extensions', function(){
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
        ignoreProxies:[ ] // empty array
    };

    var testCases = [
        {
            name: 'change already existing var',
            env: 'COUNTLY_MONGODB_HOST',
            val: 'prod',
            path: ['mongodb', 'host'],
            expected: 'prod'
        },
        {
            name: 'set non-existing var',
            env: 'COUNTLY_MONGODB_USERNAME',
            val: 'cihangir',
            path: ['mongodb', 'username'],
            expected: 'cihangir'
        },
        {
            name: 'set integer var as integer',
            env: 'COUNTLY_API_PORT',
            val: '1234',
            path: ['api', 'port'],
            expected: 1234
        },
        {
            name: 'set index in array',
            env: 'COUNTLY_LOGGING_INFO_0',
            val: 'savas',
            path: ['logging', 'info', 0],
            expected: 'savas'
        },
        {
            name: 'set/override array',
            env: 'COUNTLY_IGNOREPROXIES',
            val: '["127", "192"]',
            path: ['ignoreProxies'],
            expected: ['127', '192']
        },
        {
            name: 'set new object',
            env: 'COUNTLY_LOGGING_MAHMUT',
            val: 'tumham',
            path: ['logging', 'mahmut'],
            expected: 'tumham'
        }
    ];
    it('should extend properly', function(done){
        for (var index = 0; index < testCases.length; index++) {
            var testCase = testCases[index];
            process.env[testCase.env] = testCase.val;
            // copy config
            var tc = JSON.parse(JSON.stringify(testConfig));
            configExtender(tc);
            var got = JSON.stringify(traverse(tc).get(testCase.path));
            var expected = JSON.stringify(testCase.expected);
            if (got !== expected) {
                throw new Error('expected ' + expected + ' got ' + got + ' for ' + testCase.name);
            }
        }
        done();
    });
});
