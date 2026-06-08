var request = require('supertest');
var should = require('should');
var http = require('http');
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
        // sandbox is created with httpEnabled:false, so custom code must not be
        // able to reach any HTTP server via httpRequest().
        //
        // We run a real local server and assert the sandbox never reaches it.
        // This is independent of how /i/hook/test reports the (failed) effect:
        // if httpRequest were enabled the server would be hit; with it disabled
        // the call fails and the hit counter stays at 0.
        var probe, probeHits = 0, probePort;

        before('start local probe server', function(done) {
            probe = http.createServer(function(req, res) {
                probeHits++;
                res.end('PROBE');
            });
            probe.listen(0, '127.0.0.1', function() {
                probePort = probe.address().port;
                done();
            });
        });

        after('stop local probe server', function(done) {
            if (probe) {
                probe.close(function() {
                    done();
                });
            }
            else {
                done();
            }
        });

        it('should not let httpRequest() reach a server from custom code', async() => {
            var APP_ID = testUtils.get('APP_ID');
            // Try (and tolerate failure of) an httpRequest to our local probe.
            var code = "try { httpRequest({url:'http://127.0.0.1:" + probePort + "/poke'}); }"
                + " catch (e) { /* httpRequest disabled -> call fails, expected */ }";
            var hookConfig = {
                name: 'custom-code-no-http',
                description: 'verify httpRequest cannot reach a server from the sandbox',
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

            // Status is irrelevant (a disabled httpRequest makes the effect
            // error, which the endpoint may report as non-200). The security
            // assertion is purely that our probe server was never contacted.
            await request.post(getRequestURL('/i/hook/test'))
                .send({hook_config: JSON.stringify(hookConfig), mock_data: JSON.stringify({})});

            should(probeHits).equal(0);
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
