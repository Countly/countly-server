/* eslint-disable require-jsdoc */
/***
 * @module api/utils/countly-request
 */

const got = require('got');
const FormData = require('form-data');
const {HttpsProxyAgent, HttpProxyAgent} = require('hpagent');

var initParams = function(uri, options, callback, countlyConfig) {

    if (typeof options === 'function') {
        callback = options;
    }

    var params = {};
    if (options !== null && typeof options === 'object') {
        // Convert options to a URL
        const url = options.url || options.uri;
        const requestOptions = convertOptionsToGot(options);
        Object.assign(params, { options: requestOptions }, { uri: url });
    }
    else if (typeof uri === 'string') {
        Object.assign(params, { uri: uri });
    }
    else { //options are setn at first argument
        var requestOptions = convertOptionsToGot(uri);
        //to do add uri here
        var url = uri.url || uri.uri;
        Object.assign(params, { options: requestOptions }, { uri: url });
    }

    params.callback = callback || params.callback;

    var config = countlyConfig;

    if (config && config.proxy_hostname) {
        if (!params.options) {
            params.options = {}; // Create options object if it's undefined
        }

        let proxyUrl;
        const hasCredentials = config.proxy_username && config.proxy_password;
        const protocol = config.proxy_hostname.startsWith("https://") ? "https://" : "http://";
        const credentials = hasCredentials ? `${config.proxy_username}:${config.proxy_password}@` : "";

        let proxyHostName = config.proxy_hostname.replace(protocol, "");

        if (hasCredentials) {
            proxyUrl = `${protocol}${credentials}${proxyHostName}:${config.proxy_port}`;
        }
        else {
            proxyUrl = `${protocol}${proxyHostName}:${config.proxy_port}`;
        }

        // Determine the target URL from the available options
        const targetUrl = params.uri || params.options.url || params.options.uri;

        // Check if the target URL uses HTTPS
        const isHttps = targetUrl.startsWith('https');

        // Define common agent options
        const agentOptions = {
            keepAlive: true,
            keepAliveMsecs: 1000,
            maxSockets: 256,
            maxFreeSockets: 256,
            scheduling: 'lifo',
            proxy: proxyUrl, // Set the proxy URL
        };

        params.options.agent = isHttps ?
            { https: new HttpsProxyAgent(agentOptions) } :
            { https: new HttpProxyAgent(agentOptions) };

    }

    return params;
};



var convertOptionsToGot = function(options) {
    if (options === null || typeof options !== 'object') {
        return null;
    }

    var requestOptions = {};

    // Define for got and request differences
    var keyMap = {
        "qs": "searchParams",
        "strictSSL": "https.rejectUnauthorized",
        "gzip": "decompress",
        "jar": "cookieJar",
        "baseUrl": "prefixUrl",
        "uri": "url"
    };

    /***
     * Assigns a value to a nested object property
     * @param {object} obj - The object to assign the value to
     * @param {string} keyPath - The path to the property to assign the value to
     * @param {*} value - The value to assign
     */
    function assignDeep(obj, keyPath, value) {
        var keys = keyPath.split('.');
        var lastKey = keys.pop();
        var nestedObj = obj;

        keys.forEach(function(key) {
            if (!nestedObj[key] || typeof nestedObj[key] !== 'object') {
                nestedObj[key] = {};
            }
            nestedObj = nestedObj[key];
        });

        nestedObj[lastKey] = value;
    }

    for (let key in options) {
        if (!Object.prototype.hasOwnProperty.call(requestOptions, key) && keyMap[key]) {
            var mappedKey = keyMap[key];
            if (mappedKey.includes('.')) {
                assignDeep(requestOptions, mappedKey, options[key]);
            }
            else {
                requestOptions[mappedKey] = options[key];
            }
        }
        else {
            requestOptions[key] = options[key];
        }
    }

    // Backward compatibility: in got, json is not a boolean, it is an object.
    // Request body and json are mutually exclusive.
    // If request.json and body exist, one of them must be deleted.
    if (requestOptions.json && typeof requestOptions.json === 'boolean' && requestOptions.body) {
        requestOptions.json = requestOptions.body;
        delete requestOptions.json;
    }

    if (requestOptions.prefixUrl && options.uri && requestOptions.url) {
        requestOptions.uri = options.uri;
        delete requestOptions.url;
    }

    return requestOptions;
};


// Factory function to initialize with config
module.exports = function(countlyConfig) {
    // Return the request function
    // eslint-disable-next-line require-jsdoc
    function requestFunction(uri, options, callback) {
        if (typeof uri === 'undefined') {
            throw new Error('undefined is not a valid uri or options object.');
        }

        // Initialize params with the provided config
        const params = initParams(uri, options, callback, countlyConfig);

        // Request logic follows, unchanged from your provided code
        if (params.options && (params.options.url || params.options.uri)) {
            got(params.options)
                .then(response => {
                    params.callback(null, response, response.body);
                })
                .catch(error => {
                    params.callback(error);
                });
        }
        else {
            got(params.uri, params.options)
                .then(response => {
                    params.callback(null, response, response.body);
                })
                .catch(error => {
                    params.callback(error);
                });
        }
    }

    // eslint-disable-next-line require-jsdoc
    function post(uri, options, callback, config) {
        var params = initParams(uri, options, callback, config);
        if (params.options && (params.options.url || params.options.uri)) {
            if (params.options.form && params.options.form.fileStream && params.options.form.fileField) {
                // If options include a form, use uploadFormFile
                const { url, form } = params.options;
                uploadFormFile(url || params.options.uri, form, params.callback);
            }
            else {
                // Make the request using got
                got.post(params.options)
                    .then(response => {
                        // Call the callback with the response data
                        params.callback(null, response, response.body);
                    })
                    .catch(error => {
                        // Call the callback with the error
                        params.callback(error);
                    });
            }
        }
        else {
            // Make the request using got
            got.post(params.uri, params.options)
                .then(response => {
                    params.callback(null, response, response.body);
                })
                .catch(error => {
                    // Call the callback with the error
                    params.callback(error);
                });
        }
    }


    function get(uri, options, callback, config) {
        module.exports(uri, options, callback, config);
    }

    return {
        request: requestFunction,
        post: post,
        get: get
    };

};

/**
 * Uploads a file to the server
 * @param {string} url - url to upload file to
 * @param {object} fileData - file data object
 * @param {string} fileData.fileField - name of the field to upload file as
 * @param {string} fileData.fileStream - file stream to upload
 * @param {function} callback - callback function
 */
async function uploadFormFile(url, fileData, callback) {
    const { fileField, fileStream } = fileData;

    const form = new FormData();
    form.append(fileField, fileStream);

    try {
        const response = await got.post(url, {
            body: form
        });
        callback(null, response.body);
    }
    catch (error) {
        callback(error);
    }
}




module.exports.convertOptionsToGot = convertOptionsToGot;