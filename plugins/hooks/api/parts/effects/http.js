const request = require("countly-request");
const utils = require("../../utils");
const common = require('../../../../../api/utils/common.js');
const log = common.log("hooks:api:api_endpoint_trigger");

/**
 * 
 * @param {string} str - string to escape
 * @returns {string} escaped string
 */
function jsonEscape(str) {
    return (str + "").replace(/\n/g, "\\\\n").replace(/\r/g, "\\\\r").replace(/\t/g, "\\\\t");
}

/**
 * 
 * @param {string} str - string to unescape
 * @returns {string} unescaped string
 */
function jsonUnEscape(str) {
    return (str + "").replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t");
}

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
                        logs.push(`Error: ${e.message}`);
                        utils.addErrorRecord(rule._id, e, params, effectStep, _originalInput);
                        log.e("[hook http effect ]", e);
                    }
                });
                break;
            case 'post': {
                //support post formData
                let parsedJSON = {};
                try {
                    var ret = common.getJSON(parsedRequestData);
                    if (!ret.valid) {
                        parsedJSON = JSON.parse(jsonEscape(parsedRequestData));
                        for (var key in parsedJSON) {
                            parsedJSON[key] = jsonUnEscape(parsedJSON[key]);
                        }
                    }
                    else {
                        parsedJSON = ret.data;

                    }

                }
                catch (e) {
                    log.e('http efffect parse post data err:', e, parsedRequestData);
                    logs.push(`Error: ${e.message} \n with data: ${parsedRequestData}`);

                    utils.addErrorRecord(rule._id, e, params, effectStep, _originalInput);
                }
                if (Object.keys(parsedJSON).length) {
                    await request({
                        method: 'POST',
                        uri: parsedURL,
                        json: parsedJSON,
                        timeout: this._timeout,
                    },
                    function(e, r, body) {
                        log.d("[httpeffects]", e, body, rule);
                        if (e) {
                            logs.push(`Error: ${e.message}`);
                            utils.addErrorRecord(rule._id, e, params, effectStep, _originalInput);
                            log.e("[hook http effect ]", e);
                        }

                    });
                }
                break;
            }
            }
        }
        catch (e) {
            logs.push(`Error: ${e.message}`);
            utils.addErrorRecord(rule._id, e, params, effectStep, _originalInput);
            log.e("[hook http effect ]", e);
        }
        return {...options, logs};
    }
}
module.exports = HTTPEffect;
