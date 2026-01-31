/**
 * Request processor common utilities
 * @module api/utils/requestProcessorCommon
 */
import { createRequire } from 'module';

// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

const common = require('./common.js');
const plugins = require('../../plugins/pluginManager.ts');
const request = require('countly-request')(plugins.getConfig("security"));
const log = require('./log.js')("core:api");

interface Params {
    qstring: {
        device_id?: string;
        checksum?: string;
        checksum256?: string;
        safe_api_response?: boolean;
        [key: string]: unknown;
    };
    req: {
        url: string;
        body?: string;
        method: string;
    };
    cancelRequest?: string;
    waitForResponse?: boolean;
    urlParts: {
        path: string;
    };
    ip_address: string;
    href: string;
    fullPath: string;
    formDataUrl?: string;
    no_checksum?: boolean;
    app?: {
        redirect_url?: string;
        checksum_salt?: string;
        salt?: string;
        plugins?: Record<string, unknown>;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

interface App {
    redirect_url?: string;
    checksum_salt?: string;
    salt?: string;
    plugins?: Record<string, unknown>;
    [key: string]: unknown;
}

/**
 * Ignore possible devices
 * @param params - params object
 * @returns true if device_id is 00000000-0000-0000-0000-000000000000
 */
const ignorePossibleDevices = (params: Params): boolean => {
    // Ignore possible opted out users for ios 10
    if (params.qstring.device_id === "00000000-0000-0000-0000-000000000000") {
        common.returnMessage(params, 200, 'Ignoring device_id');
        common.log("request").i('Request ignored: Ignoring zero IDFA device_id', params.req.url, params.req.body);
        params.cancelRequest = "Ignoring zero IDFA device_id";
        plugins.dispatch("/sdk/cancel", {params: params});
        return true;
    }
    return false;
};

const validateRedirect = function(ob: { params: Params; app: App }): boolean {
    const params = ob.params;
    const app = ob.app;
    if (!params.cancelRequest && app.redirect_url && app.redirect_url !== '') {
        let newPath = params.urlParts.path;

        // Check if we have query part
        if (!newPath.includes('?')) {
            newPath += "?";
        }

        const opts: {
            uri: string;
            method: string;
            json?: boolean;
            body?: string;
        } = {
            uri: app.redirect_url + newPath + '&ip_address=' + params.ip_address,
            method: 'GET'
        };

        // Should we send post request
        if (params.req.method.toLowerCase() === 'post') {
            opts.method = "POST";
            // Check if we have body from post method
            if (params.req.body) {
                opts.json = true;
                opts.body = params.req.body;
            }
        }
        request(opts, function(error: Error | null, response: { statusCode?: number; body?: string; result?: string }, body: unknown) {
            let code = 400;
            let message: string = "Redirect error. Tried to redirect to:" + app.redirect_url;

            if (response && response.statusCode) {
                code = response.statusCode;
            }

            if (response && response.body) {
                try {
                    const resp = JSON.parse(response.body) as { result?: string };
                    message = resp.result || response.body;
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
            if (error) {
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
 * Checksum salt verification
 * @param params - params object
 * @returns true if checksum verification passed
 */
const checksumSaltVerification = (params: Params): boolean => {
    params.app!.checksum_salt = params.app!.salt || params.app!.checksum_salt;
    if (params.app!.checksum_salt && params.app!.checksum_salt.length > 0 && !params.no_checksum) {
        const payloads: string[] = [];
        payloads.push(params.href.substr(params.fullPath.length + 1));

        if (params.req.method.toLowerCase() === 'post') {
            // Check if we have 'multipart/form-data'
            if (params.formDataUrl) {
                payloads.push(params.formDataUrl);
            }
            else {
                payloads.push(params.req.body || '');
            }
        }
        if (params.qstring.checksum !== undefined) {
            for (let i = 0; i < payloads.length; i++) {
                payloads[i] = (payloads[i] + "").replace("&checksum=" + params.qstring.checksum, "").replace("checksum=" + params.qstring.checksum, "");
                payloads[i] = common.crypto.createHash('sha1').update(payloads[i] + params.app!.checksum_salt).digest('hex').toUpperCase();
            }
            if (!payloads.includes((params.qstring.checksum + "").toUpperCase())) {
                common.returnMessage(params, 200, 'Request does not match checksum');
                console.log("Checksum did not match", params.href, params.req.body, payloads);
                params.cancelRequest = 'Request does not match checksum sha1';
                return false;
            }
        }
        else if (params.qstring.checksum256 !== undefined) {
            for (let i = 0; i < payloads.length; i++) {
                payloads[i] = (payloads[i] + "").replace("&checksum256=" + params.qstring.checksum256, "").replace("checksum256=" + params.qstring.checksum256, "");
                payloads[i] = common.crypto.createHash('sha256').update(payloads[i] + params.app!.checksum_salt).digest('hex').toUpperCase();
            }
            if (!payloads.includes((params.qstring.checksum256 + "").toUpperCase())) {
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

export { ignorePossibleDevices, checksumSaltVerification, validateRedirect };
export type { Params, App };
