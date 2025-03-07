const common = require('./common.js');
var plugins = require('../../plugins/pluginManager.js');
const request = require('countly-request')(plugins.getConfig("security"));
var log = require('./log.js')("core:api");

/**
 * Ignore possible devices
 * @param {object} params  - params object
 * @returns {boolean} - true if device_id is 00000000-0000-0000-0000-000000000000
 */
const ignorePossibleDevices = (params) => {
    //ignore possible opted out users for ios 10
    if (params.qstring.device_id === "00000000-0000-0000-0000-000000000000") {
        common.returnMessage(params, 200, 'Ignoring device_id');
        common.log("request").i('Request ignored: Ignoring zero IDFA device_id', params.req.url, params.req.body);
        params.cancelRequest = "Ignoring zero IDFA device_id";
        plugins.dispatch("/sdk/cancel", {params: params});
        return true;
    }
};

const validateRedirect = function(ob) {
    var params = ob.params,
        app = ob.app;
    if (!params.cancelRequest && app.redirect_url && app.redirect_url !== '') {
        var newPath = params.urlParts.path;

        //check if we have query part
        if (newPath.indexOf('?') === -1) {
            newPath += "?";
        }

        var opts = {
            uri: app.redirect_url + newPath + '&ip_address=' + params.ip_address,
            method: 'GET'
        };

        //should we send post request
        if (params.req.method.toLowerCase() === 'post') {
            opts.method = "POST";
            //check if we have body from post method
            if (params.req.body) {
                opts.json = true;
                opts.body = params.req.body;
            }
        }

        request(opts, function(error, response, body) {
            var code = 400;
            var message = "Redirect error. Tried to redirect to:" + app.redirect_url;

            if (response && response.statusCode) {
                code = response.statusCode;
            }


            if (response && response.body) {
                try {
                    var resp = JSON.parse(response.body);
                    message = resp.result || resp;
                }
                catch (e) {
                    if (response.result) {
                        message = response.result;
                    }
                    else {
                        message = response.body;
                    }
                }
            }
            if (error) { //error
                log.e("Redirect error", error, body, opts, app, params);
            }

            if (plugins.getConfig("api", params.app && params.app.plugins, true).safe || params.qstring?.safe_api_response) {
                common.returnMessage(params, code, message);
            }
        });
        params.cancelRequest = "Redirected: " + app.redirect_url;
        params.waitForResponse = false;
        if (plugins.getConfig("api", params.app && params.app.plugins, true).safe || params.qstring?.safe_api_response) {
            params.waitForResponse = true;
        }
        return false;
    }
    else {
        return true;
    }
};

/**
 * @param  {object} params - params object
 * @param  {String} type - source type
 * @param  {Function} done - done callback
 * @returns {Function} - done or boolean value
 */
const checksumSaltVerification = (params) => {
    params.app.checksum_salt = params.app.salt || params.app.checksum_salt;//checksum_salt - old UI, .salt    - new UI.
    if (params.app.checksum_salt && params.app.checksum_salt.length && !params.no_checksum) {
        const payloads = [];
        payloads.push(params.href.substr(params.fullPath.length + 1));

        if (params.req.method.toLowerCase() === 'post') {
            // Check if we have 'multipart/form-data'
            if (params.formDataUrl) {
                payloads.push(params.formDataUrl);
            }
            else {
                payloads.push(params.req.body);
            }
        }
        if (typeof params.qstring.checksum !== "undefined") {
            for (let i = 0; i < payloads.length; i++) {
                payloads[i] = (payloads[i] + "").replace("&checksum=" + params.qstring.checksum, "").replace("checksum=" + params.qstring.checksum, "");
                payloads[i] = common.crypto.createHash('sha1').update(payloads[i] + params.app.checksum_salt).digest('hex').toUpperCase();
            }
            if (payloads.indexOf((params.qstring.checksum + "").toUpperCase()) === -1) {
                common.returnMessage(params, 200, 'Request does not match checksum');
                console.log("Checksum did not match", params.href, params.req.body, payloads);
                params.cancelRequest = 'Request does not match checksum sha1';
                return false;
            }
        }
        else if (typeof params.qstring.checksum256 !== "undefined") {
            for (let i = 0; i < payloads.length; i++) {
                payloads[i] = (payloads[i] + "").replace("&checksum256=" + params.qstring.checksum256, "").replace("checksum256=" + params.qstring.checksum256, "");
                payloads[i] = common.crypto.createHash('sha256').update(payloads[i] + params.app.checksum_salt).digest('hex').toUpperCase();
            }
            if (payloads.indexOf((params.qstring.checksum256 + "").toUpperCase()) === -1) {
                common.returnMessage(params, 200, 'Request does not match checksum');
                console.log("Checksum did not match", params.href, params.req.body, payloads);
                params.cancelRequest = 'Request does not match checksum sha256';
                return false;
            }
        }
        else {
            common.returnMessage(params, 200, 'Request does not have checksum');
            console.log("Request does not have checksum", params.href, params.req.body);
            params.cancelRequest = "Request does not have checksum";
            return false;
        }
    }

    return true;
};

module.exports = {ignorePossibleDevices: ignorePossibleDevices, checksumSaltVerification: checksumSaltVerification, validateRedirect: validateRedirect};