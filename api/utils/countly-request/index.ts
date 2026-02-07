/**
 * Countly request wrapper module using got library
 * @module api/utils/countly-request
 */

import type { Response as GotResponse, Options as GotOptions, Agents } from 'got';
import type { Readable } from 'stream';

import { createRequire } from 'module';
// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

const got = require('got');
const FormData = require('form-data');
const { HttpsProxyAgent, HttpProxyAgent } = require('hpagent');

/**
 * Proxy configuration from Countly config
 */
export interface CountlyProxyConfig {
    /** Proxy hostname (with or without protocol) */
    proxy_hostname?: string;
    /** Proxy port */
    proxy_port?: string | number;
    /** Proxy username for authentication */
    proxy_username?: string;
    /** Proxy password for authentication */
    proxy_password?: string;
}

/**
 * Request options compatible with both request and got libraries
 */
export interface RequestOptions {
    /** Request URL */
    url?: string;
    /** Request URI (alias for url) */
    uri?: string;
    /** Query string parameters (request library style) */
    qs?: Record<string, unknown>;
    /** Search params (got library style) */
    searchParams?: Record<string, unknown>;
    /** Request body */
    body?: unknown;
    /** JSON body or flag */
    json?: boolean | Record<string, unknown>;
    /** HTTP method */
    method?: string;
    /** Request headers */
    headers?: Record<string, string>;
    /** Enable strict SSL verification (request library style) */
    strictSSL?: boolean;
    /** Enable gzip decompression (request library style) */
    gzip?: boolean;
    /** Cookie jar (request library style) */
    jar?: unknown;
    /** Cookie jar (got library style) */
    cookieJar?: unknown;
    /** Base URL (request library style) */
    baseUrl?: string;
    /** Prefix URL (got library style) */
    prefixUrl?: string;
    /** Enable response decompression */
    decompress?: boolean;
    /** HTTPS options */
    https?: {
        rejectUnauthorized?: boolean;
    };
    /** HTTP agent configuration */
    agent?: Agents;
    /** Form data for file uploads */
    form?: FileData;
    /** Request timeout */
    timeout?: number | { request?: number };
    /** Retry options */
    retry?: number | { limit?: number };
    [key: string]: unknown;
}

/**
 * Got-compatible request options
 */
export interface GotRequestOptions extends GotOptions {
    /** Request URL */
    url?: string;
    /** Request URI */
    uri?: string;
    /** Form data */
    form?: FileData;
    [key: string]: unknown;
}

/**
 * File data for form uploads
 */
export interface FileData {
    /** Field name for the file */
    fileField: string;
    /** File stream to upload */
    fileStream: Readable;
}

/**
 * Request callback function signature
 */
export type RequestCallback = (
    error: Error | null,
    response?: GotResponse | string,
    body?: string
) => void;

/**
 * Initialized request parameters
 */
export interface RequestParams {
    /** Request URI */
    uri?: string;
    /** Got-compatible options */
    options?: GotRequestOptions;
    /** Callback function */
    callback?: RequestCallback;
}

/**
 * Key mapping from request library to got library
 */
interface KeyMap {
    [key: string]: string;
}

/**
 * Agent options for proxy configuration
 */
interface AgentOptions {
    keepAlive: boolean;
    keepAliveMsecs: number;
    maxSockets: number;
    maxFreeSockets: number;
    scheduling: string;
    proxy: string;
}

/**
 * Request function interface with HTTP method helpers
 */
export interface CountlyRequestFunction {
    (uri: string | RequestOptions, options?: RequestOptions | RequestCallback, callback?: RequestCallback, config?: CountlyProxyConfig): void;
    /** POST request method */
    post: (uri: string | RequestOptions, options?: RequestOptions | RequestCallback, callback?: RequestCallback, config?: CountlyProxyConfig) => void;
    /** GET request method */
    get: (uri: string | RequestOptions, options?: RequestOptions | RequestCallback, callback?: RequestCallback, config?: CountlyProxyConfig) => void;
    /** Convert request options to got options */
    convertOptionsToGot: typeof convertOptionsToGot;
}

/**
 * Assigns a value to a nested object property
 * @param obj - The object to assign the value to
 * @param keyPath - The path to the property to assign the value to
 * @param value - The value to assign
 */
function assignDeep(obj: Record<string, unknown>, keyPath: string, value: unknown): void {
    const keys = keyPath.split('.');
    const lastKey = keys.pop();
    let nestedObj: Record<string, unknown> = obj;

    keys.forEach(function(key) {
        if (!nestedObj[key] || typeof nestedObj[key] !== 'object') {
            nestedObj[key] = {};
        }
        nestedObj = nestedObj[key] as Record<string, unknown>;
    });

    if (lastKey) {
        nestedObj[lastKey] = value;
    }
}

/**
 * Convert request library options to got library options
 * @param options - Request options to convert
 * @returns Got-compatible options or null if invalid
 */
function convertOptionsToGot(options: RequestOptions | string | null | undefined): GotRequestOptions | null {
    if (options === null || typeof options !== 'object') {
        return null;
    }

    const requestOptions: GotRequestOptions = {};

    // Define for got and request differences
    const keyMap: KeyMap = {
        'qs': 'searchParams',
        'strictSSL': 'https.rejectUnauthorized',
        'gzip': 'decompress',
        'jar': 'cookieJar',
        'baseUrl': 'prefixUrl',
        'uri': 'url'
    };

    for (const key in options) {
        if (!Object.prototype.hasOwnProperty.call(requestOptions, key) && keyMap[key]) {
            const mappedKey = keyMap[key];
            if (mappedKey.includes('.')) {
                assignDeep(requestOptions as Record<string, unknown>, mappedKey, (options as Record<string, unknown>)[key]);
            }
            else {
                (requestOptions as Record<string, unknown>)[mappedKey] = (options as Record<string, unknown>)[key];
            }
        }
        else {
            (requestOptions as Record<string, unknown>)[key] = (options as Record<string, unknown>)[key];
        }
    }

    // Backward compatibility: in got, json is not a boolean, it is an object.
    // Request body and json are mutually exclusive.
    // If request.json and body exist, one of them must be deleted.
    if (requestOptions.json && typeof requestOptions.json === 'boolean' && requestOptions.body) {
        requestOptions.json = requestOptions.body as Record<string, unknown>;
        delete requestOptions.json;
    }

    if (requestOptions.prefixUrl && options.uri && requestOptions.url) {
        requestOptions.uri = options.uri;
        delete requestOptions.url;
    }

    return requestOptions;
}

/**
 * Initialize request parameters with proxy configuration
 * @param uri - Request URI or options object
 * @param options - Request options or callback
 * @param callback - Callback function
 * @param countlyConfig - Countly proxy configuration
 * @returns Initialized request parameters
 */
function initParams(
    uri: string | RequestOptions,
    options: RequestOptions | RequestCallback | undefined,
    callback: RequestCallback | undefined,
    countlyConfig?: CountlyProxyConfig
): RequestParams {
    if (typeof options === 'function') {
        callback = options;
    }

    const params: RequestParams = {};

    if (options !== null && typeof options === 'object') {
        // Convert options to a URL
        const url = options.url || options.uri;
        const requestOptions = convertOptionsToGot(options);
        Object.assign(params, { options: requestOptions }, { uri: url });
    }
    else if (typeof uri === 'string') {
        Object.assign(params, { uri: uri });
    }
    else {
        // options are sent at first argument
        const requestOptions = convertOptionsToGot(uri);
        // to do add uri here
        const url = uri.url || uri.uri;
        Object.assign(params, { options: requestOptions }, { uri: url });
    }

    params.callback = callback || params.callback;

    const config = countlyConfig;

    if (config && config.proxy_hostname) {
        if (!params.options) {
            params.options = {}; // Create options object if it's undefined
        }

        let proxyUrl: string;
        const hasCredentials = config.proxy_username && config.proxy_password;
        const protocol = config.proxy_hostname.startsWith('https://') ? 'https://' : 'http://';
        const credentials = hasCredentials ? `${config.proxy_username}:${config.proxy_password}@` : '';

        const proxyHostName = config.proxy_hostname.replace(protocol, '');

        if (hasCredentials) {
            proxyUrl = `${protocol}${credentials}${proxyHostName}:${config.proxy_port}`;
        }
        else {
            proxyUrl = `${protocol}${proxyHostName}:${config.proxy_port}`;
        }

        // Determine the target URL from the available options
        const targetUrl = params.uri || params.options.url || params.options.uri;

        // Check if the target URL uses HTTPS
        const isHttps = targetUrl?.startsWith('https');

        // Define common agent options
        const agentOptions: AgentOptions = {
            keepAlive: true,
            keepAliveMsecs: 1000,
            maxSockets: 256,
            maxFreeSockets: 256,
            scheduling: 'lifo',
            proxy: proxyUrl
        };

        params.options.agent = isHttps
            ? { https: new HttpsProxyAgent(agentOptions) }
            : { https: new HttpProxyAgent(agentOptions) };
    }

    return params;
}

/**
 * Uploads a file to the server
 * @param url - URL to upload file to
 * @param fileData - File data object
 * @param callback - Callback function
 */
async function uploadFormFile(url: string, fileData: FileData, callback: RequestCallback): Promise<void> {
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
        callback(error as Error);
    }
}

/**
 * Factory function to create a request function initialized with config
 * @param countlyConfig - Countly proxy configuration
 * @returns Request function with HTTP method helpers
 */
function createCountlyRequest(countlyConfig?: CountlyProxyConfig): CountlyRequestFunction {
    /**
     * Main request function
     */
    function requestFunction(
        uri: string | RequestOptions,
        options?: RequestOptions | RequestCallback,
        callback?: RequestCallback,
        config: CountlyProxyConfig | undefined = countlyConfig
    ): void {
        if (uri === undefined) {
            throw new TypeError('undefined is not a valid uri or options object.');
        }

        // Initialize params with the provided config
        const params = initParams(uri, options, callback, config);

        // Request logic follows
        if (params.options && (params.options.url || params.options.uri)) {
            got(params.options)
                .then((response: GotResponse) => {
                    params.callback?.(null, response, response.body as string);
                })
                .catch((error: Error) => {
                    params.callback?.(error);
                });
        }
        else {
            got(params.uri, params.options)
                .then((response: GotResponse) => {
                    params.callback?.(null, response, response.body as string);
                })
                .catch((error: Error) => {
                    params.callback?.(error);
                });
        }
    }

    /**
     * POST request method
     */
    function post(
        uri: string | RequestOptions,
        options?: RequestOptions | RequestCallback,
        callback?: RequestCallback,
        config: CountlyProxyConfig | undefined = countlyConfig
    ): void {
        const params = initParams(uri, options, callback, config);

        if (params.options && (params.options.url || params.options.uri)) {
            if (params.options.form && params.options.form.fileStream && params.options.form.fileField) {
                // If options include a form, use uploadFormFile
                const { url, form } = params.options;
                uploadFormFile(url || params.options.uri || '', form, params.callback!);
            }
            else {
                // Make the request using got
                got.post(params.options)
                    .then((response: GotResponse) => {
                        params.callback?.(null, response, response.body as string);
                    })
                    .catch((error: Error) => {
                        params.callback?.(error);
                    });
            }
        }
        else {
            // Make the request using got
            got.post(params.uri, params.options)
                .then((response: GotResponse) => {
                    params.callback?.(null, response, response.body as string);
                })
                .catch((error: Error) => {
                    params.callback?.(error);
                });
        }
    }

    /**
     * GET request method
     */
    function get(
        uri: string | RequestOptions,
        options?: RequestOptions | RequestCallback,
        callback?: RequestCallback,
        config: CountlyProxyConfig | undefined = countlyConfig
    ): void {
        requestFunction(uri, options, callback, config);
    }

    // Attach methods to request function
    const typedRequestFunction = requestFunction as CountlyRequestFunction;
    typedRequestFunction.post = post;
    typedRequestFunction.get = get;
    typedRequestFunction.convertOptionsToGot = convertOptionsToGot;

    return typedRequestFunction;
}

export default createCountlyRequest;
export { createCountlyRequest, convertOptionsToGot };
