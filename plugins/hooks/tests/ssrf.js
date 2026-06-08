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

    describe('CustomCodeEffect HTTP surface', () => {
        // v8-sandbox enables its built-in httpRequest() by default, which would
        // let custom hook code make server-side requests to internal targets,
        // bypassing the SSRF validation that protects the HTTPEffect path. The
        // sandbox is created with httpEnabled:false; in v8-sandbox httpRequest
        // remains defined but any call fails ("httpRequest is disabled"), so a
        // successful httpRequest() must never be observable from custom code.
        it('should not allow httpRequest() to succeed inside custom code', async() => {
            var APP_ID = testUtils.get('APP_ID');
            // Attempt an httpRequest and record the outcome. With http disabled
            // the call fails: either it throws (caught here -> "blocked") or it
            // aborts the script (setResult is never reached, so no step reports
            // "allowed"). Either way "allowed" must not appear in any step.
            var code = "try { httpRequest({url:'http://127.0.0.1:1/'}); params.httpResult = 'allowed'; }"
                + " catch (e) { params.httpResult = 'blocked'; }";
            var hookConfig = {
                name: 'custom-code-no-http',
                description: 'verify httpRequest cannot succeed in the sandbox',
                apps: [APP_ID],
                trigger: {
                    type: 'APIEndPointTrigger',
                    configuration: {
                        path: `cc-nohttp-${Date.now()}`,
                        method: 'get',
                    },
                },
                effects: [{
                    type: 'CustomCodeEffect',
                    configuration: {
                        code: code,
                    },
                }],
                enabled: true,
            };

            const res = await request.post(getRequestURL('/i/hook/test'))
                .send({hook_config: JSON.stringify(hookConfig), mock_data: JSON.stringify({})})
                .expect(200);

            // /i/hook/test returns an array of per-step results. Assert on the
            // parsed structure: no step's params may report the call as allowed.
            should(res.body).be.an.Array();
            var allowed = res.body.some(function(step) {
                return step && step.params && step.params.httpResult === 'allowed';
            });
            should(allowed).equal(false);
        });
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
