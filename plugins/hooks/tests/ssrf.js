var request = require('supertest');
var should = require('should');
var testUtils = require('../../../test/testUtils');
request = request(testUtils.url);

/**
 * Build a hook config with a single HTTPEffect targeting the given URL.
 * @param {string} url - target URL for the HTTP effect
 * @param {string} appId - application ID
 * @returns {object} hook config
 */
function buildHookConfig(url, appId) {
    return {
        name: 'ssrf-test',
        description: 'SSRF validation test',
        apps: [appId],
        trigger: {
            type: 'APIEndPointTrigger',
            configuration: {
                path: `ssrf-test-${Date.now()}`,
                method: 'get',
            },
        },
        effects: [{
            type: 'HTTPEffect',
            configuration: {
                url: url,
                method: 'get',
                requestData: '',
            },
        }],
        enabled: true,
    };
}

function getRequestURL(path) {
    var API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');
    var APP_ID = testUtils.get('APP_ID');
    return `${path}?api_key=${API_KEY_ADMIN}&app_id=${APP_ID}`;
}

const createdHookIds = [];

describe('SSRF Protection', () => {
    after('Clean up created hooks', async() => {
        if (createdHookIds.length === 0) {
            return;
        }

        for (let hookID of createdHookIds) {
            await request.post(getRequestURL('/i/hook/delete'))
                .send({ hookID })
                .expect(200);
        }
    });

    describe('Blocked URLs', () => {
        var blockedCases = [
            {url: 'http://localhost/test', label: 'localhost'},
            {url: 'http://127.0.0.1/test', label: 'IPv4 loopback (127.0.0.1)'},
            {url: 'http://[::1]/test', label: 'IPv6 loopback (::1)'},
            {url: 'http://169.254.169.254/latest/meta-data/', label: 'AWS IMDS (169.254.169.254)'},
            {url: 'http://metadata.google.internal/', label: 'GCP metadata'},
            {url: 'http://10.0.0.1/', label: 'Private (10.x)'},
            {url: 'http://172.16.0.1/', label: 'Private (172.16.x)'},
            {url: 'http://192.168.1.1/', label: 'Private (192.168.x)'},
            {url: 'http://127.0.0.2/', label: 'Alternative loopback (127.0.0.2)'},
            {url: 'http://0x7f.0.0.1/', label: 'Hex-encoded loopback'},
            {url: 'http://0177.0.0.1/', label: 'Octal-encoded loopback'},
            {url: 'http://0.0.0.0/', label: 'All interfaces (0.0.0.0)'},
            {url: 'http://localtest.me/', label: 'localtest.me (resolves to 127.0.0.1)'},
        ];

        for (let tc of blockedCases) {
            it(`should block ${tc.label} (${tc.url})`, async() => {
                var APP_ID = testUtils.get('APP_ID');
                var hookConfig = buildHookConfig(tc.url, APP_ID);

                const res = await request.post(getRequestURL('/i/hook/save'))
                    .send({hook_config: JSON.stringify(hookConfig)})
                    .expect(400);

                should(res.body).have.property('result');
                should(res.body.result).be.a.String();
                should(res.body.result).match(/Unsafe URL|blocked|private|reserved|loopback/i);
            });
        }
    });

    describe('Allowed URLs', () => {
        var allowedCases = [
            {url: 'https://example.com/', label: 'example.com (external domain)'},
            {url: 'https://google.com/', label: 'google.com (external domain)'},
            {url: 'http://93.184.216.34/', label: 'Public IPv4 (93.184.216.34)'},
        ];

        for (let tc of allowedCases) {
            it('should allow ' + tc.label + ' (' + tc.url + ')', async() => {
                var APP_ID = testUtils.get('APP_ID');
                var hookConfig = buildHookConfig(tc.url, APP_ID);

                const res = await request.post(getRequestURL('/i/hook/save'))
                    .send({hook_config: JSON.stringify(hookConfig)})
                    .expect(200);

                should(res.body).be.a.String();
                should(res.body).match(/^[a-f0-9]{24}$/);
                createdHookIds.push(res.body);
            });
        }
    });
});
