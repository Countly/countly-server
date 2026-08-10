var request = require('supertest');
var should = require('should');
var testUtils = require('../../../test/testUtils');
request = request(testUtils.url);

const mockData = {qstring: {a: 1}, paths: ['localhost', 'o', 'hooks', 'sandbox-probe']};

/**
 * Build a hook config with a single CustomCodeEffect running the given code.
 * @param {string} code - custom code to run inside the sandbox
 * @param {string} appId - application ID
 * @returns {object} hook config
 */
function buildHookConfig(code, appId) {
    return {
        name: 'custom-code-sandbox',
        description: 'verify what the custom code sandbox exposes',
        apps: [appId],
        trigger: {
            type: 'APIEndPointTrigger',
            configuration: {
                path: `sandbox-probe-${Date.now()}`,
                method: 'get',
            },
        },
        effects: [{
            type: 'CustomCodeEffect',
            configuration: {code: code},
        }],
        enabled: true,
    };
}

/**
 * Build the /i/hook/test URL for the given code.
 * @param {string} code - custom code to run inside the sandbox
 * @returns {string} request URL
 */
function testHookURL(code) {
    var API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');
    var APP_ID = testUtils.get('APP_ID');
    var config = JSON.stringify(buildHookConfig(code, APP_ID));
    return '/i/hook/test?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID
        + '&hook_config=' + encodeURIComponent(config)
        + '&mock_data=' + encodeURIComponent(JSON.stringify(mockData));
}

describe('Custom code sandbox', () => {

    // The sandbox has no event loop and no host bindings, so there is nothing to
    // reach the network with. Asserting the globals are absent proves that
    // directly, rather than proving one particular request happened to fail.
    it('should expose no network, filesystem or process globals', async() => {
        const probes = ['fetch', 'require', 'process', 'XMLHttpRequest', 'httpRequest', 'Buffer', 'WebSocket'];
        const code = 'params.probe = {' + probes.map(function(name) {
            return name + ': typeof ' + name;
        }).join(', ') + '};';

        const res = await request.get(testHookURL(code)).expect(200);

        should(res.body).have.property('result');
        const effectStep = res.body.result[1];
        should.exist(effectStep);
        should.exist(effectStep.params);
        for (let name of probes) {
            should(effectStep.params.probe[name]).equal('undefined', name + ' should not exist in the sandbox');
        }
    });

    // JSON.stringify(undefined) returns undefined, which used to reach JSON.parse
    // and throw, failing the whole effect instead of clearing the result.
    it('should survive custom code calling setResult(undefined)', async() => {
        const res = await request.get(testHookURL('setResult(undefined);')).expect(200);

        should(res.body).have.property('result');
        const effectStep = res.body.result[1];
        should.exist(effectStep);
        should.exist(effectStep.params);
    });
});
