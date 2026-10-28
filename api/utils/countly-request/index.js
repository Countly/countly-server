/***
 * @module api/utils/countly-request
 * @description Thin HTTP wrapper that presents the (deprecated) `request`
 * package's callback signature — `fn(uri, options, callback)` with
 * `callback(error, response, body)` — while running on undici's `fetch`
 * underneath.
 *
 * It intentionally reproduces the subset of `request`/`got` behaviour that the
 * ~24 call sites across the codebase actually rely on:
 *  - callback signature `(error, response, body)`; on error only `error` is
 *    passed. `response.body` is always the response text as a STRING (no
 *    call site relies on auto-parsed JSON — they all `JSON.parse` manually).
 *  - `response.statusCode`, `response.statusMessage`, `response.headers`
 *    (plain object, lower-cased keys), `response.body`, `response.url`.
 *  - `throwHttpErrors` (default true, like got): an unsuccessful response
 *    surfaces as an error, matching got's `isResponseOk` — 2xx or 304 while
 *    following redirects, and up to 399 when `followRedirect: false` means the
 *    3xx is what the caller asked for. Set `throwHttpErrors: false` to receive
 *    the response regardless.
 *  - `followRedirect: false` -> `redirect: 'manual'` (the caller gets the 3xx
 *    itself, with its `location` header); default follows redirects like got.
 *  - `lookup` (a `dns.lookup`-compatible fn, used by ssrf-protection for
 *    connect-time DNS-rebinding checks) — honoured via an undici Agent's
 *    `connect.lookup`. A proxied request with `lookup` is refused because the
 *    proxy resolves the destination and bypasses that callback.
 *  - `strictSSL: false` -> `connect.rejectUnauthorized: false`.
 *  - `timeout` (ms), `retry` (got-like defaults for idempotent methods).
 *  - request body from `json` (object -> JSON), `form` (plain object ->
 *    x-www-form-urlencoded), `body` (string/Buffer/stream), or a `form-data`
 *    instance passed as `body` (multipart streaming upload).
 *  - proxy configuration via the security config (`proxy_hostname` etc.),
 *    honoured through an undici ProxyAgent.
 *  - `useEnvProxy: true` — additionally fall back to the standard proxy
 *    environment (HTTP_PROXY/HTTPS_PROXY, then ALL_PROXY, with NO_PROXY
 *    honoured) when the security config names no proxy. Opt-in, because got
 *    ignored those variables; it exists for the call sites migrated off axios,
 *    which read them via `proxy-from-env`.
 *
 * Deliberate behaviour change from got: `fetch` enforces the WHATWG
 * forbidden-port list (82 ports — 21, 25, 110, 143, 389, 636, 993, 6000, 6667,
 * 10080, ...), so a URL on one of them is rejected locally with `bad port`
 * before any connection is attempted. got sat on Node's http/https, which are
 * not Fetch implementations and have no such list, so a user-configured webhook
 * on one of those ports worked before this wrapper and does not now.
 *
 * We keep the block. `undici.request()` would bypass it, but that is a second
 * transport with its own parity surface (redirects, body handling, error
 * shapes), and an audit found nothing Countly operates that needs it: every
 * service we speak HTTP to is off the list (ClickHouse 8123, Kafka Connect
 * 8083, OTLP 4317/4318, our own 3001/3010/3020/6001/8080), and every fixed
 * outbound URL here is 443. The only forbidden ports anywhere in the
 * deployment are LDAP's 389/636, which go through `ldapjs` over raw TCP, and
 * SMTP's 25/465/587, which nodemailer speaks directly — neither touches fetch.
 * The list is a browser mitigation against cross-protocol scripting rather than
 * an SSRF control, and `api/utils/ssrf-protection.js` is what actually does
 * that job here; this is an incidental extra barrier we are not giving up.
 * See the `forbidden ports` test, which pins the behaviour.
 */

const FormData = require('form-data');
const { Readable, PassThrough } = require('stream');
// fetch comes from the same undici package as the dispatchers below. Node's global
// fetch is the undici bundled with that Node release (6.x on Node 22, 7.x on 24,
// 8.x on 26), and handing it dispatchers from a different undici major ties this
// wrapper's behaviour to whichever Node it runs on.
const { fetch, Agent, ProxyAgent, EnvHttpProxyAgent } = require('undici');

// Methods got retries by default (idempotent). Non-idempotent methods (POST,
// PATCH) are never retried so we don't accidentally re-send a mutation.
const RETRYABLE_METHODS = new Set(['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE']);

// Status codes and network error codes got retries by default.
const RETRYABLE_STATUS = new Set([408, 413, 429, 500, 502, 503, 504, 521, 522, 524]);
const RETRYABLE_ERROR_CODES = new Set([
    'ETIMEDOUT', 'ECONNRESET', 'EADDRINUSE', 'ECONNREFUSED',
    'EPIPE', 'ENOTFOUND', 'ENETUNREACH', 'EAI_AGAIN',
    // undici surfaces transient socket/timeout failures under its own codes
    // rather than the Node net codes got used to see.
    'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT'
]);

const DEFAULT_RETRY_LIMIT = 2;

// Ceiling on a server-supplied Retry-After, so a bad header cannot pin a
// request open for minutes.
const MAX_RETRY_AFTER_MS = 30000;

// Cache of ProxyAgent instances keyed by the resolved proxy URL so repeated
// requests under a proxy configuration reuse a pooled dispatcher.
const proxyAgents = new Map();

// One undici Agent per raw Node http(s).Agent instance, so a caller that
// shares a single keepAlive/maxSockets agent across many concurrent requests
// keeps its global connection cap instead of getting a fresh pool per call.
const nodeAgentDispatchers = new WeakMap();

// Shared Node agent -> (proxy url + TLS flavour) -> one ProxyAgent, so a capped
// agent keeps its cap when a proxy is configured too.
const proxyAgentsByNodeAgent = new WeakMap();

// One EnvHttpProxyAgent for the `useEnvProxy` callers that need no connect-level
// options. It snapshots the proxy environment when constructed, which is fine:
// these variables are set before the process starts, not changed under it.
let envProxyAgent = null;

/**
 * A response with a status code got considers "ok". Everything else is treated
 * as an HTTP error when throwHttpErrors is enabled.
 *
 * got's own predicate widens the accepted range to 399 when redirects are
 * disabled: a caller that asked not to follow them wants the 3xx itself, so it
 * is an answer rather than a failure. That is the whole point of the
 * `followRedirect: false` that `ssrf-protection` injects into every webhook
 * request — treating the 3xx as a transport error would file a webhook
 * pointing at a redirecting endpoint as a failed delivery.
 * @param {number} status - HTTP status code
 * @param {boolean} followsRedirects - whether this request follows redirects
 * @returns {boolean} true if the response is considered successful
 */
function isResponseOk(status, followsRedirects) {
    const limit = followsRedirects ? 299 : 399;
    return (status >= 200 && status <= limit) || status === 304;
}

/**
 * Normalise a fetch Headers object into a plain object with lower-cased keys,
 * matching the shape got/node give (`response.headers.location`, etc.).
 * @param {Headers} headers - fetch Headers instance
 * @returns {object} plain headers object
 */
function headersToObject(headers) {
    const out = {};
    if (headers && typeof headers.forEach === 'function') {
        headers.forEach(function(value, key) {
            out[key.toLowerCase()] = value;
        });
    }
    return out;
}

/**
 * Build the response object handed to callbacks. Mirrors the fields the
 * (deprecated) request/got responses exposed that call sites read.
 * @param {Response} res - the fetch Response
 * @param {string} body - response body decoded as text
 * @returns {object} response-like object
 */
function makeResponse(res, body) {
    return {
        statusCode: res.status,
        statusMessage: res.statusText,
        status: res.status,
        headers: headersToObject(res.headers),
        body: body,
        url: res.url,
        ok: res.ok,
    };
}

/**
 * Build a got-style HTTPError for a non-successful response.
 * @param {object} response - the response-like object
 * @returns {Error} error with `.response`, `.statusCode` and a `.code`
 */
function makeHTTPError(response) {
    const err = new Error('Response code ' + response.statusCode + ' (' + (response.statusMessage || '') + ')');
    err.code = 'ERR_NON_2XX_3XX_RESPONSE';
    err.name = 'HTTPError';
    err.statusCode = response.statusCode;
    err.response = response;
    err.isHTTPError = true;
    return err;
}

/**
 * Convert an error thrown by fetch/undici into something callers can log.
 * fetch wraps network failures as `TypeError: fetch failed` with the real
 * cause on `.cause`; we surface the cause so `err.message`/`err.code` are
 * meaningful (e.g. the SSRF "Blocked SSRF target" message, ECONNREFUSED, …).
 * @param {Error} err - error thrown by the fetch attempt
 * @returns {Error} a normalised error
 */
function normalizeError(err) {
    if (err && err.isHTTPError) {
        return err;
    }
    // Abort due to our timeout signal.
    if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
        const timeoutErr = new Error('Timeout awaiting request');
        timeoutErr.code = 'ETIMEDOUT';
        timeoutErr.cause = err;
        return timeoutErr;
    }
    if (err && err.cause instanceof Error) {
        return err.cause;
    }
    return err;
}

/**
 * Extract a retry-relevant error code from a thrown error (looking through the
 * fetch `cause`).
 * @param {Error} err - the error
 * @returns {string|undefined} the error code, if any
 */
function errorCode(err) {
    if (!err) {
        return undefined;
    }
    if (err.code) {
        return err.code;
    }
    if (err.cause && err.cause.code) {
        return err.cause.code;
    }
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        return 'ETIMEDOUT';
    }
    return undefined;
}

/**
 * got accepted `timeout` as either a number of milliseconds or an object of
 * per-phase budgets. Callers in this repo use the object form - see
 * plugins/crashes-jira/api/v2/jira.client.ts and
 * plugins/drill/api/parts/data/license.comms.js, where the licence screen
 * relies on a 2500ms ceiling - so discarding it let those requests run on to
 * undici's much longer defaults.
 *
 * `request` is got's overall budget and maps straight onto one abort signal.
 * Without it, the tightest phase budget is the closest safe approximation.
 * @param {number|object} timeout - got-style timeout value
 * @returns {number|null} milliseconds, or null when unset
 */
function resolveTimeout(timeout) {
    if (typeof timeout === 'number' && isFinite(timeout) && timeout > 0) {
        return timeout;
    }
    if (timeout && typeof timeout === 'object') {
        if (typeof timeout.request === 'number' && isFinite(timeout.request) && timeout.request > 0) {
            return timeout.request;
        }
        const phases = [timeout.response, timeout.send, timeout.connect, timeout.secureConnect, timeout.lookup]
            .filter(function(v) {
                return typeof v === 'number' && isFinite(v) && v > 0;
            });
        if (phases.length) {
            return Math.min.apply(null, phases);
        }
    }
    return null;
}

/**
 * How long to wait before the next attempt.
 *
 * An upstream that answers 429 or 503 with `Retry-After` is telling us when the
 * throttle lifts. The plain exponential backoff tops out at 6s, so against a
 * longer interval every attempt was spent inside the throttle window and the
 * request failed anyway - an Okta 429 during sign-in is the case that matters.
 *
 * Both RFC 7231 forms are accepted: delta-seconds, or an HTTP-date. The value
 * is capped so a hostile or mistaken header cannot pin a request open.
 * @param {object} err - the error under consideration, may carry a response
 * @param {number} attempt - zero-based attempt number
 * @returns {number} milliseconds to wait
 */
function retryDelay(err, attempt) {
    const backoff = Math.min(1000 * Math.pow(2, attempt), 6000);
    const header = err && err.response && err.response.headers
        && (err.response.headers['retry-after'] || err.response.headers['Retry-After']);
    if (!header) {
        return backoff;
    }
    let ms = null;
    const seconds = Number(header);
    if (isFinite(seconds) && seconds >= 0) {
        ms = seconds * 1000;
    }
    else {
        const when = Date.parse(header);
        if (!isNaN(when)) {
            ms = when - Date.now();
        }
    }
    if (ms === null || !isFinite(ms) || ms < 0) {
        return backoff;
    }
    return Math.min(Math.max(ms, backoff), MAX_RETRY_AFTER_MS);
}

/**
 * Resolve the effective retry limit from a request-style `retry` option.
 * Accepts a number, `false`/`0` to disable, or a `{limit}` object (got shape).
 * @param {*} retry - the retry option
 * @returns {number} the retry limit (0 disables retries)
 */
function resolveRetryLimit(retry) {
    if (retry === false || retry === 0) {
        return 0;
    }
    if (typeof retry === 'number') {
        return retry;
    }
    if (retry && typeof retry === 'object' && typeof retry.limit === 'number') {
        return retry.limit;
    }
    return DEFAULT_RETRY_LIMIT;
}

/**
 * Sleep helper for retry backoff.
 * @param {number} ms - milliseconds to wait
 * @returns {Promise} resolves after ms
 */
function delay(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}

/**
 * Resolve a proxy URL from the security config, if a proxy is configured.
 * @param {object} config - the (security) config object
 * @returns {string|null} the proxy URL, or null if no proxy is configured
 */
function resolveProxyUrl(config) {
    if (!config || !config.proxy_hostname) {
        return null;
    }
    const hasCredentials = config.proxy_username && config.proxy_password;
    const protocol = config.proxy_hostname.startsWith('https://') ? 'https://' : 'http://';
    const credentials = hasCredentials ? config.proxy_username + ':' + config.proxy_password + '@' : '';
    const host = config.proxy_hostname.replace(protocol, '');
    return protocol + credentials + host + ':' + config.proxy_port;
}

/**
 * Turn a `form-data` instance into a stream undici can use as a request body.
 *
 * form-data emits string chunks; a PassThrough yields the Buffers undici
 * requires and preserves streaming backpressure.
 *
 * A source failure mid-upload (a symbolication file that disappears, an I/O
 * read error) is re-emitted by combined-stream as `error` on the form, and
 * `pipe()` does not carry that to its destination. With no listener the event
 * became an uncaught exception and took the API or jobserver process down.
 * Forwarding it by destroying the body surfaces the failure on fetch's request
 * body, so it reaches the caller's callback — which is what got did, as an
 * `UploadError` on the request.
 *
 * NOT `stream.pipeline`: form-data is a legacy (combined-stream) readable, and
 * pipeline's end-of-stream tracking never ends the destination for a form whose
 * parts are all buffers or strings, so such an upload hangs forever. `pipe`
 * handles it correctly; only the error path needs adding.
 * @param {object} form - a form-data instance
 * @returns {PassThrough} the request body stream
 */
function formDataBody(form) {
    const body = new PassThrough();
    // Claim 'error' on both ends before anything can flow. On `body` it would
    // otherwise be unhandled in the window before fetch starts reading; undici
    // still sees the destroyed stream and fails the request.
    body.on('error', function() { /* surfaced through fetch */ });
    form.on('error', function(err) {
        body.destroy(err);
    });
    form.pipe(body);
    return body;
}

/**
 * Read a proxy environment variable the way `proxy-from-env` does: lower case
 * first, then upper.
 * @param {string} name - variable name, lower case
 * @returns {string} the value, or '' when unset
 */
function proxyEnv(name) {
    return process.env[name.toLowerCase()] || process.env[name.toUpperCase()] || '';
}

/**
 * Resolve the per-protocol proxy from the environment for `useEnvProxy`.
 *
 * `EnvHttpProxyAgent` reads only HTTP(S)_PROXY, but axios — via
 * `proxy-from-env`, which is what these call sites used to go through — falls
 * back to ALL_PROXY when the protocol-specific variable is unset. Resolving
 * the values here and handing them over keeps that, and leaves the agent's own
 * NO_PROXY matching in place (it reads the environment when `noProxy` is not
 * passed).
 *
 * proxy-from-env 2.x, the version these call sites actually shipped with, reads
 * `<proto>_proxy` and `all_proxy` only — the `npm_config_*` variables were
 * dropped in 2.0, so they are deliberately not consulted here.
 * @returns {object} `{httpProxy?, httpsProxy?}`, empty when nothing is set
 */
function envProxyOptions() {
    const all = proxyEnv('all_proxy');
    // undici 8 stopped tunnelling (CONNECT) plain-http targets by default and
    // sends them to the proxy as absolute-URL requests instead; keep tunnelling,
    // as undici 7 did, for CONNECT-only proxies. Same for the ProxyAgents below.
    const opts = { proxyTunnel: true };
    const forHttp = proxyEnv('http_proxy') || all;
    const forHttps = proxyEnv('https_proxy') || all;
    if (forHttp) {
        opts.httpProxy = withProxyScheme(forHttp);
    }
    if (forHttps) {
        opts.httpsProxy = withProxyScheme(forHttps);
    }
    return opts;
}

/**
 * A proxy variable may be given without a scheme (`proxy.internal:3128`), which
 * undici cannot parse. proxy-from-env fills in the REQUEST's scheme; a proxy
 * hop is almost always plain HTTP even for an https target, so http is the
 * safer default and the only divergence here.
 * @param {string} value - raw proxy variable value
 * @returns {string} a parseable proxy URL
 */
function withProxyScheme(value) {
    return value.indexOf('://') === -1 ? 'http://' + value : value;
}

/**
 * Detect a `form-data` package instance (multipart streaming body).
 * @param {*} value - candidate value
 * @returns {boolean} true if it looks like a form-data instance
 */
function isFormDataInstance(value) {
    return !!value
        && typeof value === 'object'
        && typeof value.getHeaders === 'function'
        && typeof value.pipe === 'function';
}

/**
 * Append query parameters (`qs`/`searchParams`) onto a URL.
 * @param {string} url - the base URL
 * @param {string|object} qs - query string or object of params
 * @returns {string} the URL with query appended
 */
function appendQuery(url, qs) {
    if (!qs) {
        return url;
    }
    let queryString;
    if (typeof qs === 'string') {
        queryString = qs;
    }
    else {
        queryString = new URLSearchParams(qs).toString();
    }
    if (!queryString) {
        return url;
    }
    return url + (url.indexOf('?') === -1 ? '?' : '&') + queryString;
}

/**
 * Translate request-style options into a native fetch request description.
 *
 * @param {string} url - target URL (already resolved from uri/url)
 * @param {object} options - request-style options
 * @param {object} config - security config (for proxy resolution)
 * @param {string} forcedMethod - method to force (used by `.post`), or null
 * @returns {object} `{ url, init, timeout, retryLimit, throwHttpErrors, dispatcher, ephemeralDispatcher }`
 */
function buildFetchRequest(url, options, config, forcedMethod) {
    options = options || {};

    let targetUrl = url || options.url || options.uri;
    if (typeof targetUrl !== 'string') {
        throw new Error('undefined is not a valid uri or options object.');
    }
    targetUrl = appendQuery(targetUrl, options.qs || options.searchParams);

    const method = (forcedMethod || options.method || 'GET').toUpperCase();
    const headers = Object.assign({}, options.headers);

    const init = { method: method };

    // ---- Body handling ------------------------------------------------------
    let duplexNeeded = false;
    if (isFormDataInstance(options.body)) {
        // Multipart streaming upload (e.g. crash symbolication).
        const form = options.body;
        Object.assign(headers, lowerCaseHeaderKeysMissing(headers, form.getHeaders()));
        init.body = formDataBody(form);
        duplexNeeded = true;
    }
    else if (options.form && options.form.fileStream && options.form.fileField) {
        // Legacy single-file multipart upload shape ({fileField, fileStream}).
        const form = new FormData();
        form.append(options.form.fileField, options.form.fileStream);
        Object.assign(headers, lowerCaseHeaderKeysMissing(headers, form.getHeaders()));
        init.body = formDataBody(form);
        duplexNeeded = true;
    }
    else if (options.form && typeof options.form === 'object') {
        // x-www-form-urlencoded body (got `form` option).
        init.body = new URLSearchParams(options.form).toString();
        setHeaderIfMissing(headers, 'content-type', 'application/x-www-form-urlencoded');
    }
    else if (typeof options.json !== 'undefined' && options.json !== false && typeof options.json === 'object') {
        // JSON request body (got `json` option as object). Response stays text.
        init.body = JSON.stringify(options.json);
        setHeaderIfMissing(headers, 'content-type', 'application/json');
    }
    else if (options.json === true && typeof options.body !== 'undefined') {
        // Legacy `{json: true, body: <object>}` shape: serialise body as JSON.
        init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        setHeaderIfMissing(headers, 'content-type', 'application/json');
    }
    else if (typeof options.body !== 'undefined' && options.body !== null) {
        if (options.body instanceof Readable) {
            init.body = options.body;
            duplexNeeded = true;
        }
        else {
            init.body = options.body;
        }
    }

    if (duplexNeeded) {
        init.duplex = 'half';
    }

    // ---- Redirects ----------------------------------------------------------
    // got's default follows redirects. When a caller disables them (SSRF
    // protection), surface the raw 3xx so it can inspect status/location.
    init.redirect = (options.followRedirect === false) ? 'manual' : 'follow';

    init.headers = headers;

    // ---- Connect-level options that need an undici dispatcher ---------------
    const connect = {};
    let needsConnectDispatcher = false;
    if (typeof options.lookup === 'function') {
        connect.lookup = options.lookup;
        needsConnectDispatcher = true;
    }
    let insecureTLS = false;
    if (options.strictSSL === false || options.rejectUnauthorized === false) {
        insecureTLS = true;
        connect.rejectUnauthorized = false;
        needsConnectDispatcher = true;
    }

    // A raw Node http(s).Agent passed by a caller (e.g. the translation sync's
    // keepAlive/maxSockets agent). We can't hand a Node agent to fetch, but we
    // can carry its concurrency cap over to undici's `connections`.
    const nodeAgent = (options.agent && typeof options.agent.maxSockets === 'number'
        && isFinite(options.agent.maxSockets) && options.agent.maxSockets > 0) ? options.agent : null;

    // ---- Proxy --------------------------------------------------------------
    const proxyUrl = resolveProxyUrl(config);

    let dispatcher = null;
    let ephemeralDispatcher = false;
    if (proxyUrl) {
        if (typeof options.lookup === 'function') {
            const error = new Error('Cannot enforce destination lookup through a proxy');
            error.code = 'ERR_UNSAFE_PROXY_LOOKUP';
            throw error;
        }
        if (needsConnectDispatcher || nodeAgent) {
            const proxyOpts = { uri: proxyUrl, proxyTunnel: true };
            if (insecureTLS) {
                // ProxyAgent reads the tunnelled DESTINATION's TLS options from
                // `requestTls`; `connect` only configures the hop to the proxy,
                // so strictSSL:false must go through requestTls to take effect.
                proxyOpts.requestTls = { rejectUnauthorized: false };
            }
            if (nodeAgent) {
                proxyOpts.connections = nodeAgent.maxSockets;
            }

            // A shared Node agent must map onto ONE ProxyAgent, for the same
            // reason as the no-proxy branch below: a fresh pool per request
            // holds a single connection each, so `connections` caps nothing and
            // the translation sync could still open hundreds of proxy sockets.
            const cacheable = nodeAgent;
            if (cacheable) {
                const key = proxyUrl + '|' + (insecureTLS ? 'insecure' : 'strict');
                let perAgent = proxyAgentsByNodeAgent.get(nodeAgent);
                if (!perAgent) {
                    perAgent = new Map();
                    proxyAgentsByNodeAgent.set(nodeAgent, perAgent);
                }
                dispatcher = perAgent.get(key);
                if (!dispatcher) {
                    dispatcher = new ProxyAgent(proxyOpts);
                    perAgent.set(key, dispatcher);
                }
                // Shared and long-lived - must NOT be closed after the request.
            }
            else {
                dispatcher = new ProxyAgent(proxyOpts);
                ephemeralDispatcher = true;
            }
        }
        else {
            // Reuse a pooled ProxyAgent for plain proxied requests.
            dispatcher = proxyAgents.get(proxyUrl);
            if (!dispatcher) {
                dispatcher = new ProxyAgent({ uri: proxyUrl, proxyTunnel: true });
                proxyAgents.set(proxyUrl, dispatcher);
            }
        }
    }
    else if (options.useEnvProxy) {
        // No proxy in the security config, but this caller previously ran on
        // axios, which read the proxy environment through `proxy-from-env`. got
        // never did, so this stays opt-in rather than becoming the default for
        // every consumer of this wrapper. `envProxyOptions` reproduces
        // proxy-from-env's variable precedence (including ALL_PROXY, which
        // EnvHttpProxyAgent does not read by itself); the agent still does the
        // NO_PROXY matching, and with nothing set it dispatches directly, so
        // this is a no-op then.
        if (needsConnectDispatcher || nodeAgent) {
            const envOpts = envProxyOptions();
            const envProxy = new URL(targetUrl).protocol === 'https:' ? envOpts.httpsProxy : envOpts.httpProxy;
            if (envProxy && typeof options.lookup === 'function') {
                const error = new Error('Cannot enforce destination lookup through a proxy');
                error.code = 'ERR_UNSAFE_PROXY_LOOKUP';
                throw error;
            }
            if (needsConnectDispatcher) {
                envOpts.connect = connect;
            }
            if (nodeAgent) {
                envOpts.connections = nodeAgent.maxSockets;
            }
            dispatcher = new EnvHttpProxyAgent(envOpts);
            ephemeralDispatcher = true;
        }
        else {
            if (!envProxyAgent) {
                envProxyAgent = new EnvHttpProxyAgent(envProxyOptions());
            }
            dispatcher = envProxyAgent;
            // Shared and long-lived — must NOT be closed after the request.
        }
    }
    else if (nodeAgent) {
        // Reuse ONE undici Agent per Node agent instance so a shared agent keeps
        // its global connection cap across concurrent requests (a per-request
        // pool of N would not bound total concurrency at all).
        dispatcher = nodeAgentDispatchers.get(nodeAgent);
        if (!dispatcher) {
            const agentOpts = { connections: nodeAgent.maxSockets };
            if (needsConnectDispatcher) {
                agentOpts.connect = connect;
            }
            dispatcher = new Agent(agentOpts);
            nodeAgentDispatchers.set(nodeAgent, dispatcher);
        }
        // Shared and long-lived — must NOT be closed after the request.
    }
    else if (needsConnectDispatcher) {
        dispatcher = new Agent({ connect: connect });
        ephemeralDispatcher = true;
    }

    return {
        url: targetUrl,
        init: init,
        timeout: resolveTimeout(options.timeout),
        retryLimit: resolveRetryLimit(options.retry),
        throwHttpErrors: options.throwHttpErrors !== false,
        dispatcher: dispatcher,
        ephemeralDispatcher: ephemeralDispatcher,
    };
}

/**
 * Set a header only if no case-insensitive equivalent already exists.
 * @param {object} headers - headers object (mutated)
 * @param {string} name - header name (lower-case)
 * @param {string} value - header value
 * @returns {void}
 */
function setHeaderIfMissing(headers, name, value) {
    for (const key in headers) {
        if (key.toLowerCase() === name) {
            return;
        }
    }
    headers[name] = value;
}

/**
 * Return the subset of `incoming` headers that are not already present
 * (case-insensitively) in `existing` — used so a user-supplied Content-Type
 * wins over form-data's generated one.
 * @param {object} existing - already-set headers
 * @param {object} incoming - candidate headers to add
 * @returns {object} headers to merge in
 */
function lowerCaseHeaderKeysMissing(existing, incoming) {
    const existingLower = {};
    for (const key in existing) {
        existingLower[key.toLowerCase()] = true;
    }
    const out = {};
    for (const key in incoming) {
        if (!existingLower[key.toLowerCase()]) {
            out[key] = incoming[key];
        }
    }
    return out;
}

/**
 * Decide whether a failed attempt should be retried, matching got's defaults:
 * only idempotent methods, only for transient network errors or retryable
 * status codes, and only while attempts remain.
 * @param {Error} err - the error (may be an HTTPError with `.response`)
 * @param {string} method - the HTTP method
 * @param {number} attempt - zero-based attempt index just completed
 * @param {number} retryLimit - maximum retries allowed
 * @returns {boolean} true if another attempt should be made
 */
function shouldRetry(err, method, attempt, retryLimit) {
    if (attempt >= retryLimit) {
        return false;
    }
    if (!RETRYABLE_METHODS.has(method)) {
        return false;
    }
    if (err && err.isHTTPError) {
        return RETRYABLE_STATUS.has(err.statusCode);
    }
    const code = errorCode(err);
    return !!code && RETRYABLE_ERROR_CODES.has(code);
}

/**
 * Wrap a consumer callback so that a request can never be settled twice, and so
 * that nothing the consumer does can escape into the request worker.
 *
 * Three things are contained here, each of which otherwise ends the process:
 * the callback being absent; the callback throwing; and the callback being
 * `async` and rejecting, which a try/catch cannot see because the rejection is
 * returned rather than thrown. The jobserver exits(1) on unhandledRejection, so
 * any of them takes the process down.
 *
 * @param {Function} callback - consumer callback, may be absent
 * @param {string} context - label used when reporting a failing callback
 * @returns {Function} callback that settles at most once and never throws
 */
function safeCallback(callback, context) {
    const fn = typeof callback === 'function' ? callback : null;
    let settled = false;

    return function() {
        // One logical request settles once, whatever the worker does afterwards.
        if (settled) {
            return;
        }
        settled = true;

        if (!fn) {
            return;
        }

        let result;
        try {
            result = fn.apply(null, arguments);
        }
        catch (error) {
            console.error('countly-request: ' + context + ' callback threw', (error && error.stack) || error);
            return;
        }

        if (result && typeof result.then === 'function') {
            result.then(null, function(error) {
                console.error('countly-request: ' + context + ' callback rejected', (error && error.stack) || error);
            });
        }
    };
}

/**
 * Execute a request-style call on native fetch, invoking the node-style
 * callback with `(error, response, body)`.
 *
 * @param {string} url - target URL (from uri/url), may be null if in options
 * @param {object} options - request-style options
 * @param {object} config - security config (proxy)
 * @param {Function} callback - `(error, response, body)` callback
 * @param {string} forcedMethod - method to force (`.post` -> POST), or null
 * @returns {Promise<void>} settles once the callback has been delivered
 */
function execute(url, options, config, callback, forcedMethod) {
    const cb = safeCallback(callback, forcedMethod === 'POST' ? 'post' : 'request');

    let req;
    try {
        req = buildFetchRequest(url, options, config, forcedMethod);
    }
    catch (e) {
        cb(e);
        return Promise.resolve();
    }

    const method = req.init.method;

    return (async function run() {
        try {
            for (let attempt = 0; ; attempt++) {
                const init = Object.assign({}, req.init);
                if (req.timeout) {
                    // AbortSignal.timeout is native (Node), not the Bluebird .timeout().
                    // eslint-disable-next-line no-restricted-syntax
                    init.signal = AbortSignal.timeout(req.timeout);
                }
                if (req.dispatcher) {
                    init.dispatcher = req.dispatcher;
                }

                let outcome;
                try {
                    const res = await fetch(req.url, init);
                    const bodyText = await res.text();
                    const response = makeResponse(res, bodyText);
                    if (!isResponseOk(res.status, req.init.redirect !== 'manual')) {
                        const httpError = makeHTTPError(response);
                        // got retried a retryable status whether or not
                        // throwHttpErrors was set: that option decides how the
                        // FINAL result is reported, not whether a transient 429
                        // or 503 is worth another attempt. Deciding this only
                        // inside the catch below meant throwHttpErrors:false
                        // callers - the my-countly Flex routes - silently lost
                        // every retry.
                        if (shouldRetry(httpError, method, attempt, req.retryLimit)) {
                            await delay(retryDelay(httpError, attempt));
                            continue;
                        }
                        if (req.throwHttpErrors) {
                            throw httpError;
                        }
                    }
                    outcome = { response: response };
                }
                catch (err) {
                    if (shouldRetry(err, method, attempt, req.retryLimit)) {
                        await delay(retryDelay(err, attempt));
                        continue;
                    }
                    outcome = { error: normalizeError(err) };
                }

                // Settled outside the try above on purpose. Delivering the result
                // inside it made a throwing consumer callback look like a transport
                // failure: it was fed to shouldRetry, and then reported back to the
                // same callback a second time as an error of our own making.
                if (outcome.error) {
                    return cb(outcome.error);
                }
                return cb(null, outcome.response, outcome.response.body);
            }
        }
        finally {
            if (req.ephemeralDispatcher && req.dispatcher) {
                req.dispatcher.close().catch(function() { /* ignore */ });
            }
        }
    })().catch(function(error) {
        // Nothing above is expected to reject. Most callers ignore the returned
        // promise, so an unhandled rejection here would exit the jobserver; the
        // catch also keeps the promise resolving rather than rejecting, matching
        // the got implementation, where a failure reached the callback and the
        // returned chain still settled cleanly.
        console.error('countly-request: unexpected failure in request worker', (error && error.stack) || error);
        cb(normalizeError(error));
    });
}

/**
 * Normalise the (uri, options, callback) argument shapes the request package
 * accepted into a single `{uri, options, callback}` object.
 * @param {string|object} uri - URL string, or options object
 * @param {object|Function} options - options object, or callback
 * @param {Function} callback - callback
 * @returns {object} `{uri, options, callback}`
 */
function initParams(uri, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = undefined;
    }

    if (options !== null && typeof options === 'object') {
        return { uri: (typeof uri === 'string' ? uri : (options.url || options.uri)), options: options, callback: callback };
    }
    if (typeof uri === 'string') {
        return { uri: uri, options: {}, callback: callback };
    }
    // uri is actually the options object.
    return { uri: (uri && (uri.url || uri.uri)) || null, options: uri || {}, callback: callback };
}

// Factory function to initialize with (security) config.
module.exports = function(countlyConfig) {

    /**
     * Issue an HTTP request. Method comes from `options.method` (default GET).
     * @param {string|object} uri - URL string or options object
     * @param {object|Function} options - options object or callback
     * @param {Function} callback - `(error, response, body)`
     * @param {object} config - optional per-call config override
     * @returns {Promise<void>} settles once the callback has been delivered
     */
    function requestFunction(uri, options, callback, config = countlyConfig) {
        if (typeof uri === 'undefined') {
            throw new Error('undefined is not a valid uri or options object.');
        }
        const params = initParams(uri, options, callback);
        return execute(params.uri, params.options, config, params.callback, null);
    }

    /**
     * Issue a GET request (method still honours options.method if set).
     * @param {string|object} uri - URL string or options object
     * @param {object|Function} options - options object or callback
     * @param {Function} callback - `(error, response, body)`
     * @param {object} config - optional per-call config override
     * @returns {Promise<void>} settles once the callback has been delivered
     */
    function get(uri, options, callback, config = countlyConfig) {
        return requestFunction(uri, options, callback, config);
    }

    /**
     * Issue a POST request (method forced to POST, like got.post).
     * @param {string|object} uri - URL string or options object
     * @param {object|Function} options - options object or callback
     * @param {Function} callback - `(error, response, body)`
     * @param {object} config - optional per-call config override
     * @returns {Promise<void>} settles once the callback has been delivered
     */
    function post(uri, options, callback, config = countlyConfig) {
        if (typeof uri === 'undefined') {
            throw new Error('undefined is not a valid uri or options object.');
        }
        const params = initParams(uri, options, callback);
        return execute(params.uri, params.options, config, params.callback, 'POST');
    }

    requestFunction.get = get;
    requestFunction.post = post;
    requestFunction.convertOptionsToGot = convertOptionsToGot;

    return requestFunction;
};

/**
 * Backwards-compatible option key translator.
 *
 * Retained as a public export because it was part of this module's API (and is
 * still exercised by the existing unit test). The live request path no longer
 * routes through got, so this is a pure, standalone helper mapping the
 * request-style option keys to the got-style names.
 *
 * @param {object} options - request-style options
 * @returns {object|null} options with keys remapped to got equivalents
 */
function convertOptionsToGot(options) {
    if (options === null || typeof options !== 'object') {
        return null;
    }

    const requestOptions = {};

    const keyMap = {
        "qs": "searchParams",
        "strictSSL": "https.rejectUnauthorized",
        "gzip": "decompress",
        "jar": "cookieJar",
        "baseUrl": "prefixUrl",
        "uri": "url"
    };

    /**
     * Assigns a value to a nested object property
     * @param {object} obj - The object to assign the value to
     * @param {string} keyPath - The path to the property to assign the value to
     * @param {*} value - The value to assign
     */
    function assignDeep(obj, keyPath, value) {
        const keys = keyPath.split('.');
        const lastKey = keys.pop();
        let nestedObj = obj;

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
            const mappedKey = keyMap[key];
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

    if (requestOptions.json && typeof requestOptions.json === 'boolean' && requestOptions.body) {
        requestOptions.json = requestOptions.body;
        delete requestOptions.json;
    }

    if (requestOptions.prefixUrl && options.uri && requestOptions.url) {
        requestOptions.uri = options.uri;
        delete requestOptions.url;
    }

    return requestOptions;
}

module.exports.convertOptionsToGot = convertOptionsToGot;
module.exports.safeCallback = safeCallback;
// Exported so a caller that cannot use this wrapper still resolves the proxy
// the same way. openid-client v5 sits on Node's `https`, not fetch, so it
// needs an https.Agent rather than an undici dispatcher — but it must agree
// with this module about which proxy the security settings name.
module.exports.resolveProxyUrl = resolveProxyUrl;
