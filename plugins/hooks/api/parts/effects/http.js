const plugins = require("../../../../pluginManager.js");
const request = require("countly-request")(plugins.getConfig("security"));
const utils = require("../../utils");
const common = require('../../../../../api/utils/common.js');
const ssrfProtection = require('../../ssrf-protection');
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
        const {method, url, requestData, headers} = effect.configuration;
        try {
            const parsedURL = utils.parseStringTemplate(url, params);
            const parsedRequestData = utils.parseStringTemplate(requestData, params, method);
            log.d("[hook http effect ]", parsedURL, parsedRequestData, method);

            // Revalidate URL after template expansion.
            // The URL was validated at save time, but template variables
            // (e.g. {{path}}) may have been replaced with malicious values
            // that redirect to internal/private addresses.
            const urlCheck = await ssrfProtection.isUrlSafe(parsedURL);
            if (!urlCheck.safe) {
                const ssrfError = new Error('SSRF protection: blocked HTTP effect — ' + urlCheck.error);
                logs.push(`Error: ${ssrfError.message}`);
                utils.addErrorRecord(rule._id, ssrfError, params, effectStep, _originalInput);
                log.e("[hook http effect ] SSRF blocked:", urlCheck.error);
                return {...options, logs};
            }

            const requestHeaders = headers || {};
            const methodOption = method && method.toLowerCase() || "get";
            switch (methodOption) {
            case 'get': {
                // For GET, also validate the full URL with query string
                const fullGetUrl = parsedURL + "?" + parsedRequestData;
                const getUrlCheck = await ssrfProtection.isUrlSafe(fullGetUrl);
                if (!getUrlCheck.safe) {
                    const ssrfError = new Error('SSRF protection: blocked GET URL — ' + getUrlCheck.error);
                    logs.push(`Error: ${ssrfError.message}`);
                    utils.addErrorRecord(rule._id, ssrfError, params, effectStep, _originalInput);
                    log.e("[hook http effect ] SSRF blocked:", getUrlCheck.error);
                    return {...options, logs};
                }

                await request.get(ssrfProtection.getSsrfSafeOptions({
                    uri: fullGetUrl,
                    timeout: this._timeout,
                    headers: requestHeaders,
                }), function(e, r, body) {
                    log.d("[http get effect]", e, body);
                    if (e) {
                        logs.push(`Error: ${e.message}`);
                        utils.addErrorRecord(rule._id, e, params, effectStep, _originalInput);
                        log.e("[hook http effect ]", e);
                    }
                });
                break;
            }
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
                    await request(ssrfProtection.getSsrfSafeOptions({
                        method: 'POST',
                        uri: parsedURL,
                        json: parsedJSON,
                        timeout: this._timeout,
                        headers: requestHeaders,
                    }),
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
