const request = require("request");
const utils = require("../../utils");
const common = require('../../../../../api/utils/common.js');
const log = common.log("hooks:api:api_endpoint_trigger");

/**
 * Http effect
 */
class HTTPEffect {
    /**
     * Init function
     */
    constructor() {
        this._timeout = 15000;
    }

    /**
     * main function to run effect
     * @param {object} options - options for required variable
     * @return {object} - return processed options object.
     */
    async run(options) {
        const logs = [];
        const {effect, params, rule, effectStep, _originalInput} = options;
        const {method, url, requestData} = effect.configuration;
        try {
            const parsedURL = utils.parseStringTemplate(url, params);
            const parsedRequestData = utils.parseStringTemplate(requestData, params, method);
            log.d("[hook http effect ]", parsedURL, parsedRequestData, method);

            // todo: assemble params for request;
            // const params = {}

            const methodOption = method && method.toLowerCase() || "get";
            switch (methodOption) {
            case 'get':
                await request.get({uri: parsedURL + "?" + parsedRequestData, timeout: this._timeout}, function(e, r, body) {
                    log.d("[http get effect]", e, body);
                    if (e) {
                        logs.push(`message:${e.message} \n stack: ${JSON.stringify(e.stack)}`);
                        utils.addErrorRecord(rule._id, e, params, effectStep, _originalInput);
                    }
                });
                break;
            case 'post': {
                //support post formData
                let parsedJSON = {};
                try {
                    parsedJSON = JSON.parse(parsedRequestData);
                }
                catch (e) {
                    log.e('http efffect parse post data err:', e);
                    logs.push(`message:${e.message} \n stack: ${JSON.stringify(e.stack)}`);

                    utils.addErrorRecord(rule._id, e, params, effectStep, _originalInput);
                }
                await request({
                    method: 'POST',
                    uri: parsedURL,
                    json: parsedJSON,
                    timeout: this._timeout,
                },
                function(e, r, body) {
                    log.e("[httpeffects]", e, body, rule);
                    if (e) {
                        logs.push(`message:${e.message} \n stack: ${JSON.stringify(e.stack)}`);
                        utils.addErrorRecord(rule._id, e, params, effectStep, _originalInput);
                    }

                });
                break;
            }
            }
        }
        catch (e) {
            logs.push(`message:${e.message} \n stack: ${JSON.stringify(e.stack)}`);
            utils.addErrorRecord(rule._id, e, params, effectStep, _originalInput);
        }
        return {...options, logs};
    }
}
module.exports = HTTPEffect;
