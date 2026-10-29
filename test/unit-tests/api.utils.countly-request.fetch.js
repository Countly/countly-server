/**
 * Tests for the native-fetch based countly-request wrapper.
 *
 * These are self-contained: they spin up local HTTP(S) servers and exercise
 * the wrapper against them, so no network access or running Countly instance
 * is required. Run with `npm test` from api/utils/countly-request.
 */

const assert = require('assert');
const http = require('http');
const https = require('https');
const net = require('net');
const os = require('os');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const { execFileSync } = require('child_process');
const { Readable, PassThrough } = require('stream');
const FormData = require('form-data');

// The wrapper is a factory; no proxy config for the bulk of the tests.
const requestFactory = require('../../api/utils/countly-request/index.js');
const request = requestFactory({});

// A port nothing listens on, for the connection-failure cases: an ephemeral
// port bound and released in `before`, so a local service (a dev container on
// a fixed port) cannot answer it. NOT port 1: that is on fetch's
// forbidden-port list, so a request to it is rejected locally with `bad port`
// and never reaches the network — which would make these assertions pass
// without exercising the path they are named for.
let DEAD_URL = null;

/**
 * Collect the raw request body of an incoming http request.
 * @param {http.IncomingMessage} req - the request
 * @returns {Promise<Buffer>} the body
 */
function collectBody(req) {
    return new Promise(function(resolve) {
        const chunks = [];
        req.on('data', function(c) {
            chunks.push(c);
        });
        req.on('end', function() {
            resolve(Buffer.concat(chunks));
        });
    });
}

/**
 * Start an HTTP server with the given handler, listening on a random port.
 * @param {function} handler - (req, res) handler
 * @returns {Promise<{server: http.Server, url: string, port: number}>} server info
 */
function startServer(handler) {
    return new Promise(function(resolve) {
        const server = http.createServer(handler);
        server.listen(0, '127.0.0.1', function() {
            const port = server.address().port;
            resolve({ server: server, port: port, url: 'http://127.0.0.1:' + port });
        });
    });
}

describe('countly-request (native fetch)', function() {
    before(function(done) {
        const probe = net.createServer();
        probe.listen(0, '127.0.0.1', function() {
            DEAD_URL = 'http://127.0.0.1:' + probe.address().port + '/';
            probe.close(done);
        });
    });

    this.timeout(20000);

    describe('convertOptionsToGot (backwards-compatible export)', function() {
        it('maps request-style keys to got-style keys', function() {
            const out = request.convertOptionsToGot({
                qs: 'searchParams',
                strictSSL: true,
                gzip: true,
                jar: 'cookieJar',
                uri: 'url'
            });
            assert.deepStrictEqual(out, {
                searchParams: 'searchParams',
                https: { rejectUnauthorized: true },
                decompress: true,
                cookieJar: 'cookieJar',
                url: 'url'
            });
        });

        it('is also exported on the module factory', function() {
            assert.strictEqual(typeof requestFactory.convertOptionsToGot, 'function');
        });
    });

    describe('basic GET', function() {
        let srv;
        before(async function() {
            srv = await startServer(function(req, res) {
                res.writeHead(200, { 'Content-Type': 'text/plain', 'X-Method': req.method });
                res.end('pong');
            });
        });
        after(function() {
            srv.server.close();
        });

        it('GET by URL string returns a string body and statusCode', function(done) {
            request.get(srv.url + '/ping', function(err, response, body) {
                assert.ifError(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(typeof body, 'string');
                assert.strictEqual(body, 'pong');
                assert.strictEqual(body, response.body);
                assert.strictEqual(response.headers['x-method'], 'GET');
                done();
            });
        });

        it('bare request(url, cb) works and defaults to GET', function(done) {
            request(srv.url + '/ping', function(err, response) {
                assert.ifError(err);
                assert.strictEqual(response.headers['x-method'], 'GET');
                done();
            });
        });

        it('request(uri, options, cb) 3-arg form works', function(done) {
            request(srv.url + '/ping', { method: 'GET' }, function(err, response) {
                assert.ifError(err);
                assert.strictEqual(response.statusCode, 200);
                done();
            });
        });

        it('does not throw when no callback is supplied', function() {
            assert.doesNotThrow(function() {
                request.get(srv.url + '/ping');
            });
        });
    });

    describe('JSON body responses are strings', function() {
        let srv;
        before(async function() {
            srv = await startServer(function(req, res) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ hello: 'world' }));
            });
        });
        after(function() {
            srv.server.close();
        });

        it('leaves body as a JSON string for the caller to parse', function(done) {
            request.get(srv.url + '/', function(err, response, body) {
                assert.ifError(err);
                assert.strictEqual(typeof body, 'string');
                assert.deepStrictEqual(JSON.parse(body), { hello: 'world' });
                done();
            });
        });
    });

    describe('POST with json option', function() {
        let srv, received;
        before(async function() {
            srv = await startServer(async function(req, res) {
                const body = await collectBody(req);
                received = { method: req.method, contentType: req.headers['content-type'], body: body.toString() };
                res.writeHead(200);
                res.end('ok');
            });
        });
        after(function() {
            srv.server.close();
        });

        it('serialises a json object and sets content-type', function(done) {
            request.post(srv.url + '/', { json: { a: 1, b: 'two' } }, function(err, response) {
                assert.ifError(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(received.method, 'POST');
                assert.match(received.contentType, /application\/json/);
                assert.deepStrictEqual(JSON.parse(received.body), { a: 1, b: 'two' });
                done();
            });
        });

        it('bare request with method:POST and json body', function(done) {
            request({ uri: srv.url + '/', method: 'POST', json: { x: true } }, function(err) {
                assert.ifError(err);
                assert.strictEqual(received.method, 'POST');
                assert.deepStrictEqual(JSON.parse(received.body), { x: true });
                done();
            });
        });

        it('legacy {json:true, body:obj} serialises body as JSON', function(done) {
            request({ uri: srv.url + '/', method: 'POST', json: true, body: { legacy: 1 } }, function(err) {
                assert.ifError(err);
                assert.deepStrictEqual(JSON.parse(received.body), { legacy: 1 });
                done();
            });
        });
    });

    describe('POST with form (x-www-form-urlencoded)', function() {
        let srv, received;
        before(async function() {
            srv = await startServer(async function(req, res) {
                const body = await collectBody(req);
                received = { contentType: req.headers['content-type'], body: body.toString() };
                res.writeHead(200);
                res.end('ok');
            });
        });
        after(function() {
            srv.server.close();
        });

        it('encodes a plain object form and sets content-type', function(done) {
            request.post({ url: srv.url + '/', form: { grant_type: 'authorization_code', code: 'abc' } }, function(err) {
                assert.ifError(err);
                assert.match(received.contentType, /application\/x-www-form-urlencoded/);
                const parsed = new URLSearchParams(received.body);
                assert.strictEqual(parsed.get('grant_type'), 'authorization_code');
                assert.strictEqual(parsed.get('code'), 'abc');
                done();
            });
        });
    });

    describe('custom headers', function() {
        let srv, seenHeaders;
        before(async function() {
            srv = await startServer(function(req, res) {
                seenHeaders = req.headers;
                res.writeHead(200);
                res.end('ok');
            });
        });
        after(function() {
            srv.server.close();
        });

        it('forwards request headers', function(done) {
            request.get({ uri: srv.url + '/', headers: { authorization: 'Bearer tok', 'x-custom': 'yes' } }, function(err) {
                assert.ifError(err);
                assert.strictEqual(seenHeaders.authorization, 'Bearer tok');
                assert.strictEqual(seenHeaders['x-custom'], 'yes');
                done();
            });
        });
    });

    describe('HTTP error handling (throwHttpErrors)', function() {
        let srv;
        before(async function() {
            srv = await startServer(function(req, res) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('nope');
            });
        });
        after(function() {
            srv.server.close();
        });

        it('surfaces non-2xx as an error by default (like got)', function(done) {
            request.get(srv.url + '/missing', function(err, response) {
                assert.ok(err, 'expected an error for 404');
                assert.strictEqual(err.statusCode, 404);
                assert.strictEqual(err.response.statusCode, 404);
                assert.strictEqual(response, undefined);
                done();
            });
        });

        it('returns the response when throwHttpErrors is false', function(done) {
            request.get({ uri: srv.url + '/missing', throwHttpErrors: false }, function(err, response, body) {
                assert.ifError(err);
                assert.strictEqual(response.statusCode, 404);
                assert.strictEqual(body, 'nope');
                done();
            });
        });
    });

    describe('redirects', function() {
        let srv;
        let redirectStatus = 302;
        before(async function() {
            srv = await startServer(function(req, res) {
                if (req.url === '/redir') {
                    res.writeHead(redirectStatus, { Location: srv.url + '/target' });
                    res.end('go');
                }
                else if (req.url === '/gone') {
                    res.writeHead(404);
                    res.end('nope');
                }
                else {
                    res.writeHead(200);
                    res.end('arrived');
                }
            });
        });
        after(function() {
            srv.server.close();
        });

        it('follows redirects by default', function(done) {
            request.get(srv.url + '/redir', function(err, response, body) {
                assert.ifError(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(body, 'arrived');
                done();
            });
        });

        it('followRedirect:false surfaces the 3xx with a location header', function(done) {
            // A success, not an error: got widens isResponseOk to 399 when
            // redirects are disabled, because the 3xx is then the answer the
            // caller asked for. ssrf-protection injects followRedirect:false
            // into every webhook request, so getting an error here would file
            // a webhook pointing at a redirecting endpoint as a failed
            // delivery in plugins/hooks and journey_engine.
            request.get({ uri: srv.url + '/redir', followRedirect: false }, function(err, response) {
                assert.ifError(err);
                assert.strictEqual(response.statusCode, 302);
                assert.strictEqual(response.headers.location, srv.url + '/target');
                done();
            });
        });

        it('followRedirect:false treats every 3xx as a response', function(done) {
            // Sequential: the stub server has one shared status.
            const codes = [301, 303, 307, 308];
            (function next(i) {
                if (i === codes.length) {
                    redirectStatus = 302;
                    return done();
                }
                redirectStatus = codes[i];
                request.get({ uri: srv.url + '/redir', followRedirect: false, retry: 0 }, function(err, response) {
                    assert.ifError(err, 'status ' + codes[i] + ' should not be an error');
                    assert.strictEqual(response.statusCode, codes[i]);
                    next(i + 1);
                });
            })(0);
        });

        it('still treats 4xx/5xx as errors when redirects are disabled', function(done) {
            // The widened range stops at 399 — followRedirect:false must not
            // turn a real failure into a success.
            request.get({ uri: srv.url + '/gone', followRedirect: false, retry: 0 }, function(err) {
                assert.ok(err, 'expected 404 to still be an error');
                assert.strictEqual(err.statusCode, 404);
                done();
            });
        });

        it('followRedirect:false + throwHttpErrors:false returns the 3xx response', function(done) {
            request.get({ uri: srv.url + '/redir', followRedirect: false, throwHttpErrors: false }, function(err, response) {
                assert.ifError(err);
                assert.strictEqual(response.statusCode, 302);
                assert.strictEqual(response.headers.location, srv.url + '/target');
                done();
            });
        });
    });

    describe('redirects of a request with a body (as got 11)', function() {
        let srv;
        let other;
        const seen = [];
        before(async function() {
            const handler = function(base) {
                return async function(req, res) {
                    const body = (await collectBody(req)).toString();
                    seen.push({ method: req.method, url: req.url, body: body, auth: req.headers.authorization || null, type: req.headers['content-type'] || null, base: base });
                    const m = /^\/r(\d{3})$/.exec(req.url);
                    if (m) {
                        res.writeHead(Number(m[1]), { Location: '/target' });
                        return res.end();
                    }
                    if (req.url === '/cross') {
                        res.writeHead(302, { Location: other.url + '/target' });
                        return res.end();
                    }
                    if (req.url === '/loop') {
                        res.writeHead(302, { Location: '/loop' });
                        return res.end();
                    }
                    if (req.url === '/no-reason') {
                        // a status line with no reason phrase
                        res.socket.end('HTTP/1.1 404 \r\nContent-Length: 0\r\nConnection: close\r\n\r\n');
                        return;
                    }
                    res.writeHead(200);
                    res.end('arrived');
                };
            };
            srv = await startServer(handler('srv'));
            other = await startServer(handler('other'));
        });
        after(function() {
            srv.server.close();
            other.server.close();
        });
        beforeEach(function() {
            seen.length = 0;
        });

        [301, 302, 307, 308].forEach(function(status) {
            it('resends the POST and its body after a ' + status, function(done) {
                request({ uri: srv.url + '/r' + status, method: 'POST', json: { a: 1 } }, function(err, response, body) {
                    assert.ifError(err);
                    assert.strictEqual(body, 'arrived');
                    assert.deepStrictEqual(seen.map(s => s.method + ' ' + s.url + ' ' + s.body), [
                        'POST /r' + status + ' {"a":1}',
                        'POST /target {"a":1}'
                    ]);
                    assert.strictEqual(seen[1].type, 'application/json');
                    done();
                });
            });
        });

        it('turns a 303 into a GET without the body', function(done) {
            request({ uri: srv.url + '/r303', method: 'POST', form: { a: '1' } }, function(err, response, body) {
                assert.ifError(err);
                assert.strictEqual(body, 'arrived');
                assert.strictEqual(seen[1].method, 'GET');
                assert.strictEqual(seen[1].body, '');
                assert.strictEqual(seen[1].type, null);
                done();
            });
        });

        it('does not carry credentials to another origin', function(done) {
            request({ uri: srv.url + '/cross', method: 'POST', json: { a: 1 }, headers: { Authorization: 'Bearer secret' } }, function(err, response, body) {
                assert.ifError(err);
                assert.strictEqual(body, 'arrived');
                assert.strictEqual(seen[0].auth, 'Bearer secret');
                assert.strictEqual(seen[1].base, 'other');
                assert.strictEqual(seen[1].auth, null);
                assert.strictEqual(seen[1].body, '{"a":1}');
                done();
            });
        });

        it('gives up after maxRedirects, as got did', function(done) {
            request({ uri: srv.url + '/loop', method: 'POST', json: { a: 1 }, maxRedirects: 3 }, function(err) {
                assert.ok(err);
                assert.strictEqual(err.code, 'ERR_TOO_MANY_REDIRECTS');
                assert.strictEqual(seen.length, 4);
                done();
            });
        });

        it('still hands the 3xx back when followRedirect is false', function(done) {
            request({ uri: srv.url + '/r302', method: 'POST', json: { a: 1 }, followRedirect: false }, function(err, response) {
                assert.ifError(err);
                assert.strictEqual(response.statusCode, 302);
                assert.strictEqual(seen.length, 1);
                done();
            });
        });

        it('names the status in the error when the server sends no reason phrase', function(done) {
            request.get(srv.url + '/no-reason', function(err) {
                assert.ok(err);
                assert.strictEqual(err.message, 'Response code 404 (Not Found)');
                done();
            });
        });
    });

    describe('timeout', function() {
        let srv;
        before(async function() {
            srv = await startServer(function(req, res) {
                // Never respond within the timeout window.
                setTimeout(function() {
                    res.writeHead(200);
                    res.end('late');
                }, 2000);
            });
        });
        after(function() {
            srv.server.close();
        });

        it('aborts with ETIMEDOUT when the request exceeds timeout', function(done) {
            request.get({ uri: srv.url + '/', timeout: 200, retry: 0 }, function(err) {
                assert.ok(err, 'expected a timeout error');
                assert.strictEqual(err.code, 'ETIMEDOUT');
                done();
            });
        });
    });

    describe('retry (got-like defaults)', function() {
        it('retries idempotent GET on 503 and eventually succeeds', function(done) {
            let hits = 0;
            startServer(function(req, res) {
                hits++;
                if (hits < 2) {
                    res.writeHead(503);
                    res.end('busy');
                }
                else {
                    res.writeHead(200);
                    res.end('ok');
                }
            }).then(function(srv) {
                request.get({ uri: srv.url + '/', retry: { limit: 2 } }, function(err, response, body) {
                    srv.server.close();
                    assert.ifError(err);
                    assert.strictEqual(response.statusCode, 200);
                    assert.strictEqual(body, 'ok');
                    assert.strictEqual(hits, 2);
                    done();
                });
            });
        });

        it('does NOT retry non-idempotent POST on 503', function(done) {
            let hits = 0;
            startServer(function(req, res) {
                hits++;
                res.writeHead(503);
                res.end('busy');
            }).then(function(srv) {
                request.post({ uri: srv.url + '/', retry: { limit: 3 } }, function(err) {
                    srv.server.close();
                    assert.ok(err, 'expected 503 error');
                    assert.strictEqual(err.statusCode, 503);
                    assert.strictEqual(hits, 1);
                    done();
                });
            });
        });

        it('retry:0 disables retries for a GET', function(done) {
            let hits = 0;
            startServer(function(req, res) {
                hits++;
                res.writeHead(500);
                res.end('err');
            }).then(function(srv) {
                request.get({ uri: srv.url + '/', retry: 0 }, function(err) {
                    srv.server.close();
                    assert.ok(err);
                    assert.strictEqual(hits, 1);
                    done();
                });
            });
        });
    });

    describe('SSRF lookup pinning (connect-time DNS check)', function() {
        let srv;
        before(async function() {
            srv = await startServer(function(req, res) {
                res.writeHead(200);
                res.end('should-not-reach');
            });
        });
        after(function() {
            srv.server.close();
        });

        // A dns.lookup-compatible function that blocks loopback addresses,
        // mirroring api/utils/ssrf-protection.safeLookup.
        function blockingLookup(hostname, options, callback) {
            if (typeof options === 'function') {
                callback = options;
                options = {};
            }
            options = options || {};
            dns.lookup(hostname, options, function(e, address, family) {
                if (e) {
                    return callback(e);
                }
                const list = options.all ? (Array.isArray(address) ? address : [address]) : [{ address: address, family: family }];
                for (const a of list) {
                    if (String(a.address).startsWith('127.') || a.address === '::1') {
                        const blocked = new Error('Blocked SSRF target: ' + a.address);
                        blocked.code = 'ESSRFBLOCKED';
                        return callback(blocked);
                    }
                }
                return options.all ? callback(null, list) : callback(null, address, family);
            });
        }

        it('blocks a request whose hostname resolves to loopback', function(done) {
            // Use hostname "localhost" so the lookup runs (literal IPs skip lookup).
            request.get({ uri: 'http://localhost:' + srv.port + '/', lookup: blockingLookup, retry: 0 }, function(err) {
                assert.ok(err, 'expected the SSRF lookup to block the request');
                assert.strictEqual(err.code, 'ESSRFBLOCKED');
                done();
            });
        });

        it('refuses a configured proxy when the destination lookup cannot be enforced', function(done) {
            let connects = 0;
            const proxy = http.createServer(function(req, res) {
                res.writeHead(502);
                res.end();
            });
            proxy.on('connect', function(req, socket) {
                connects++;
                socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
            });
            proxy.listen(0, '127.0.0.1', function() {
                const configured = requestFactory({proxy_hostname: '127.0.0.1', proxy_port: proxy.address().port});
                configured.get({uri: 'http://localhost:' + srv.port + '/', lookup: blockingLookup, retry: 0}, function(err) {
                    proxy.close();
                    try {
                        assert.ok(err);
                        assert.strictEqual(err.code, 'ERR_UNSAFE_PROXY_LOOKUP');
                        assert.strictEqual(connects, 0, 'the proxy must not be contacted');
                        done();
                    }
                    catch (e) {
                        done(e);
                    }
                });
            });
        });
    });

    describe('strictSSL:false (self-signed TLS)', function() {
        let server, url, tmpDir, hasOpenssl = true;
        before(function(done) {
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cr-tls-'));
            try {
                execFileSync('openssl', [
                    'req', '-x509', '-newkey', 'rsa:2048',
                    '-keyout', path.join(tmpDir, 'key.pem'),
                    '-out', path.join(tmpDir, 'cert.pem'),
                    '-days', '1', '-nodes', '-subj', '/CN=localhost'
                ], { stdio: 'ignore' });
            }
            catch (e) {
                hasOpenssl = false;
                return done();
            }
            server = https.createServer({
                key: fs.readFileSync(path.join(tmpDir, 'key.pem')),
                cert: fs.readFileSync(path.join(tmpDir, 'cert.pem'))
            }, function(req, res) {
                res.writeHead(200);
                res.end('secure');
            });
            server.listen(0, '127.0.0.1', function() {
                url = 'https://127.0.0.1:' + server.address().port + '/';
                done();
            });
        });
        after(function() {
            if (server) {
                server.close();
            }
        });

        it('rejects a self-signed cert by default', function(done) {
            if (!hasOpenssl) {
                this.skip();
            }
            request.get({ uri: url, retry: 0 }, function(err) {
                assert.ok(err, 'expected a TLS validation error');
                done();
            });
        });

        it('accepts a self-signed cert with strictSSL:false', function(done) {
            if (!hasOpenssl) {
                this.skip();
            }
            request.get({ uri: url, strictSSL: false, retry: 0 }, function(err, response, body) {
                assert.ifError(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(body, 'secure');
                done();
            });
        });
    });

    describe('multipart form-data streaming body', function() {
        let srv, receivedLength, receivedType;
        before(async function() {
            srv = await startServer(async function(req, res) {
                const body = await collectBody(req);
                receivedLength = body.length;
                receivedType = req.headers['content-type'];
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ received: body.length }));
            });
        });
        after(function() {
            srv.server.close();
        });

        it('streams a form-data instance (piped stream) fully', function(done) {
            const form = new FormData();
            const payload = Buffer.from('symbol-file-bytes-'.repeat(1000)); // 18000 bytes
            const pass = new PassThrough();
            Readable.from(payload).pipe(pass);
            form.append('sym_file', pass, { filename: 'sym.txt', contentType: 'text/plain', knownLength: payload.length });
            form.append('error_file', JSON.stringify({ meta: 1 }), { filename: 'err.txt', contentType: 'text/plain' });

            request.post({ url: srv.url + '/upload', body: form }, function(err, response, body) {
                assert.ifError(err);
                assert.strictEqual(response.statusCode, 200);
                assert.match(receivedType, /multipart\/form-data; boundary=/);
                // The received body must include the full 18000-byte payload plus
                // multipart overhead — a truncated stream would be far smaller.
                assert.ok(receivedLength > 18000, 'expected full multipart body, got ' + receivedLength + ' bytes');
                assert.strictEqual(JSON.parse(body).received, receivedLength);
                done();
            });
        });

        it('streams a form whose parts are all buffers/strings', function(done) {
            // No stream part at all. This shape is easy to break while fixing
            // the error path: stream.pipeline never ends the destination for
            // it, so the upload hangs until the request times out.
            const form = new FormData();
            form.append('meta', JSON.stringify({ app: 'x' }));
            form.append('sym_file', Buffer.alloc(4096, 'z'), { filename: 'sym.zip' });

            request.post({ url: srv.url + '/upload', body: form }, function(err, response) {
                assert.ifError(err);
                assert.strictEqual(response.statusCode, 200);
                assert.ok(receivedLength > 4096, 'expected the full body, got ' + receivedLength + ' bytes');
                done();
            });
        });

        it('reports a failing source stream instead of crashing the process', function(done) {
            // got surfaced this as an UploadError on the request. pipe() does
            // not carry a source error to its destination, so before the fix
            // form-data's re-emitted 'error' had no listener and became an
            // uncaught exception — fatal to the API/jobserver process.
            const uncaught = [];
            const onUncaught = function(e) {
                uncaught.push(e);
            };
            process.once('uncaughtException', onUncaught);

            let chunks = 0;
            const flaky = new Readable({
                read: function() {
                    if (chunks++ < 2) {
                        this.push(Buffer.alloc(512, 'a'));
                    }
                    else {
                        this.destroy(new Error('EIO: simulated read failure'));
                    }
                }
            });
            const form = new FormData();
            form.append('sym_file', flaky, { filename: 'sym.zip', knownLength: 1024 * 64 });

            request.post({ url: srv.url + '/upload', body: form, retry: 0 }, function(err) {
                process.removeListener('uncaughtException', onUncaught);
                assert.ok(err, 'the upload failure never reached the callback');
                assert.match(err.message, /EIO: simulated read failure/);
                assert.strictEqual(uncaught.length, 0, 'the stream error escaped as an uncaught exception');
                done();
            });
        });
    });

    describe('retry on transient undici socket errors', function() {
        it('retries an idempotent GET when the socket closes mid-response (UND_ERR_SOCKET)', function(done) {
            let hits = 0;
            startServer(function(req, res) {
                hits++;
                if (hits < 2) {
                    // Abruptly close the connection before responding -> undici
                    // surfaces UND_ERR_SOCKET, not a Node ECONNRESET.
                    req.socket.destroy();
                }
                else {
                    res.writeHead(200);
                    res.end('recovered');
                }
            }).then(function(srv) {
                request.get({ uri: srv.url + '/', retry: { limit: 2 } }, function(err, response, body) {
                    srv.server.close();
                    assert.ifError(err);
                    assert.strictEqual(response.statusCode, 200);
                    assert.strictEqual(body, 'recovered');
                    assert.strictEqual(hits, 2);
                    done();
                });
            });
        });
    });

    describe('raw Node agent concurrency cap (maxSockets)', function() {
        it('caps concurrent connections at the shared agent maxSockets', function(done) {
            const http2 = require('http');
            let inFlight = 0;
            let maxInFlight = 0;
            const server = http2.createServer(function(req, res) {
                inFlight++;
                maxInFlight = Math.max(maxInFlight, inFlight);
                setTimeout(function() {
                    inFlight--;
                    res.writeHead(200);
                    res.end('ok');
                }, 120);
            });
            server.listen(0, '127.0.0.1', function() {
                const url = 'http://127.0.0.1:' + server.address().port + '/';
                // One shared agent, maxSockets 2, reused across all requests.
                const agent = new http2.Agent({ keepAlive: true, maxSockets: 2 });
                let done_count = 0;
                const total = 6;
                for (let i = 0; i < total; i++) {
                    request.get({ uri: url, agent: agent, retry: 0 }, function(err) {
                        assert.ifError(err);
                        done_count++;
                        if (done_count === total) {
                            server.close();
                            assert.ok(maxInFlight <= 2, 'expected <=2 concurrent, saw ' + maxInFlight);
                            done();
                        }
                    });
                }
            });
        });
    });

    describe('useEnvProxy (HTTP_PROXY from the environment)', function() {
        // The call sites migrated off axios read HTTP(S)_PROXY via
        // `proxy-from-env`; got never did, so the wrapper only honours the
        // environment when a caller asks for it.
        let origin;
        let proxy;
        let connects;
        let savedEnv;

        before(function(done) {
            connects = [];
            origin = http.createServer(function(req, res) {
                res.writeHead(200, { 'content-type': 'text/plain' });
                res.end('origin');
            });
            // undici's proxy support tunnels with CONNECT even for http://
            // targets, so the stand-in proxy has to answer CONNECT.
            proxy = http.createServer(function(req, res) {
                res.writeHead(501);
                res.end('use CONNECT');
            });
            proxy.on('connect', function(req, clientSocket, head) {
                connects.push(req.url);
                const upstream = net.connect(origin.address().port, '127.0.0.1', function() {
                    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
                    if (head && head.length) {
                        upstream.write(head);
                    }
                    upstream.pipe(clientSocket);
                    clientSocket.pipe(upstream);
                });
                upstream.on('error', function() {
                    clientSocket.destroy();
                });
                clientSocket.on('error', function() {
                    upstream.destroy();
                });
            });
            origin.listen(0, '127.0.0.1', function() {
                proxy.listen(0, '127.0.0.1', function() {
                    savedEnv = { http_proxy: process.env.http_proxy, HTTP_PROXY: process.env.HTTP_PROXY };
                    process.env.http_proxy = 'http://127.0.0.1:' + proxy.address().port;
                    delete process.env.HTTP_PROXY;
                    done();
                });
            });
        });

        after(function() {
            if (typeof savedEnv.http_proxy === 'undefined') {
                delete process.env.http_proxy;
            }
            else {
                process.env.http_proxy = savedEnv.http_proxy;
            }
            if (typeof savedEnv.HTTP_PROXY !== 'undefined') {
                process.env.HTTP_PROXY = savedEnv.HTTP_PROXY;
            }
            origin.close();
            proxy.close();
        });

        it('routes through the environment proxy when asked', function(done) {
            connects.length = 0;
            const url = 'http://127.0.0.1:' + origin.address().port + '/';
            request.get({ uri: url, useEnvProxy: true, retry: 0 }, function(err, response) {
                assert.ifError(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(connects.length, 1, 'expected the request to tunnel through the proxy');
                done();
            });
        });

        it('ignores the environment proxy by default', function(done) {
            connects.length = 0;
            const url = 'http://127.0.0.1:' + origin.address().port + '/';
            request.get({ uri: url, retry: 0 }, function(err, response) {
                assert.ifError(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(connects.length, 0, 'got ignored HTTP_PROXY, so the default must too');
                done();
            });
        });

        it('still honours the security config proxy over the environment', function(done) {
            connects.length = 0;
            // A configured proxy that is not listening: the request must fail
            // against THAT, rather than quietly succeeding via the env proxy.
            const configured = requestFactory({ proxy_hostname: '127.0.0.1', proxy_port: 1 });
            const url = 'http://127.0.0.1:' + origin.address().port + '/';
            configured.get({ uri: url, useEnvProxy: true, retry: 0 }, function(err) {
                assert.ok(err, 'expected the configured (dead) proxy to be used');
                assert.strictEqual(connects.length, 0, 'the env proxy must not be consulted');
                done();
            });
        });

        it('refuses an environment proxy when the destination lookup cannot be enforced', function(done) {
            connects.length = 0;
            const url = 'http://127.0.0.1:' + origin.address().port + '/';
            request.get({
                uri: url,
                useEnvProxy: true,
                retry: 0,
                lookup: function(hostname, opts, cb) {
                    return dns.lookup(hostname, opts, cb);
                }
            }, function(err) {
                try {
                    assert.ok(err);
                    assert.strictEqual(err.code, 'ERR_UNSAFE_PROXY_LOOKUP');
                    assert.strictEqual(connects.length, 0, 'the proxy must not be contacted');
                    done();
                }
                catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('useEnvProxy — proxy-from-env variable precedence', function() {
        // axios read the proxy environment through proxy-from-env, which falls
        // back to ALL_PROXY when the protocol variable is unset.
        //
        // These all take the per-request dispatcher branch (via a Node agent),
        // because the shared EnvHttpProxyAgent snapshots the environment when
        // it is first built — one process cannot exercise several environments
        // through the cached path.
        let origin;
        let proxyA;
        let proxyB;
        let hitsA;
        let hitsB;
        const ENV_KEYS = ['http_proxy', 'HTTP_PROXY', 'https_proxy', 'HTTPS_PROXY',
            'all_proxy', 'ALL_PROXY', 'no_proxy', 'NO_PROXY', 'npm_config_proxy'];
        let savedEnv;

        /**
         * A proxy that tunnels every CONNECT to the one origin server.
         * @param {Array} hits - array that records each CONNECT target
         * @returns {http.Server} the proxy server
         */
        function makeProxy(hits) {
            const p = http.createServer(function(req, res) {
                res.writeHead(501);
                res.end();
            });
            p.on('connect', function(req, clientSocket, head) {
                hits.push(req.url);
                const upstream = net.connect(origin.address().port, '127.0.0.1', function() {
                    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
                    if (head && head.length) {
                        upstream.write(head);
                    }
                    upstream.pipe(clientSocket);
                    clientSocket.pipe(upstream);
                });
                upstream.on('error', function() {
                    clientSocket.destroy();
                });
                clientSocket.on('error', function() {
                    upstream.destroy();
                });
            });
            return p;
        }

        before(function(done) {
            hitsA = [];
            hitsB = [];
            savedEnv = {};
            ENV_KEYS.forEach(function(k) {
                savedEnv[k] = process.env[k];
                delete process.env[k];
            });
            origin = http.createServer(function(req, res) {
                res.writeHead(200);
                res.end('origin');
            });
            origin.listen(0, '127.0.0.1', function() {
                proxyA = makeProxy(hitsA);
                proxyB = makeProxy(hitsB);
                proxyA.listen(0, '127.0.0.1', function() {
                    proxyB.listen(0, '127.0.0.1', done);
                });
            });
        });

        after(function() {
            ENV_KEYS.forEach(function(k) {
                if (typeof savedEnv[k] === 'undefined') {
                    delete process.env[k];
                }
                else {
                    process.env[k] = savedEnv[k];
                }
            });
            origin.close();
            proxyA.close();
            proxyB.close();
        });

        beforeEach(function() {
            hitsA.length = 0;
            hitsB.length = 0;
            ENV_KEYS.forEach(function(k) {
                delete process.env[k];
            });
        });

        /**
         * Issue a request on the per-request dispatcher branch.
         * @param {function} cb - node-style callback
         * @returns {void}
         */
        function get(cb) {
            request.get({
                uri: 'http://127.0.0.1:' + origin.address().port + '/token',
                useEnvProxy: true,
                retry: 0,
                agent: new http.Agent({maxSockets: 1})
            }, cb);
        }

        it('falls back to ALL_PROXY when HTTP_PROXY is unset', function(done) {
            process.env.ALL_PROXY = 'http://127.0.0.1:' + proxyA.address().port;
            get(function(err, response) {
                assert.ifError(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(hitsA.length, 1, 'ALL_PROXY was ignored');
                done();
            });
        });

        it('prefers the protocol variable over ALL_PROXY', function(done) {
            process.env.http_proxy = 'http://127.0.0.1:' + proxyA.address().port;
            process.env.ALL_PROXY = 'http://127.0.0.1:' + proxyB.address().port;
            get(function(err) {
                assert.ifError(err);
                assert.strictEqual(hitsA.length, 1, 'expected http_proxy to win');
                assert.strictEqual(hitsB.length, 0, 'ALL_PROXY should not have been used');
                done();
            });
        });

        it('still honours NO_PROXY against ALL_PROXY', function(done) {
            process.env.ALL_PROXY = 'http://127.0.0.1:' + proxyA.address().port;
            process.env.NO_PROXY = '127.0.0.1';
            get(function(err, response) {
                assert.ifError(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(hitsA.length, 0, 'NO_PROXY should have sent this direct');
                done();
            });
        });

        it('ignores npm_config_proxy, as proxy-from-env 2.x does', function(done) {
            // Measured: axios 1.20 + proxy-from-env 2.1.0 — the versions these
            // call sites shipped with — go direct for this variable too. The
            // npm_config_* lookups were dropped in proxy-from-env 2.0.
            process.env.npm_config_proxy = 'http://127.0.0.1:' + proxyA.address().port;
            get(function(err, response) {
                assert.ifError(err);
                assert.strictEqual(response.statusCode, 200);
                assert.strictEqual(hitsA.length, 0, 'npm_config_proxy must not be consulted');
                done();
            });
        });

        it('accepts a proxy variable with no scheme', function(done) {
            process.env.ALL_PROXY = '127.0.0.1:' + proxyA.address().port;
            get(function(err) {
                assert.ifError(err);
                assert.strictEqual(hitsA.length, 1, 'a schemeless proxy value was not usable');
                done();
            });
        });
    });

    describe('network errors', function() {
        it('reports connection refused as an error', function(done) {
            request.get({ uri: DEAD_URL, retry: 0 }, function(err) {
                assert.ok(err, 'expected a connection error');
                assert.strictEqual(err.code, 'ECONNREFUSED', 'expected to reach the network');
                done();
            });
        });
    });

    describe('forbidden ports (WHATWG bad-port list)', function() {
        // A deliberate difference from got, decided rather than inherited: see
        // the note in index.js. got sat on Node's http/https and had no list;
        // fetch implements the spec's `block bad port` step. Nothing Countly
        // operates needs those ports, so the block stays — this test exists so
        // that swapping in a transport without the list is a visible decision
        // rather than a silent one.
        it('rejects a forbidden port locally, without connecting', function(done) {
            request.get({ uri: 'http://127.0.0.1:6000/hook', retry: 0 }, function(err) {
                assert.ok(err, 'expected an error');
                assert.match(err.message, /bad port/i, 'expected the fetch bad-port rejection');
                done();
            });
        });

        it('reaches the network on a permitted port', function(done) {
            // DEAD_URL's port is not on the list, so this one gets as far as a
            // real connection attempt — proving the rejection above is the
            // port list and not something about the address.
            request.get({ uri: DEAD_URL + 'hook', retry: 0 }, function(err) {
                assert.ok(err, 'expected an error');
                assert.strictEqual(err.code, 'ECONNREFUSED');
                done();
            });
        });
    });

    describe('got-style timeout objects', function() {
        // plugins/crashes-jira and plugins/drill/.../license.comms.js pass
        // `{request: ms}`, not a bare number. Reading only numbers discarded
        // those budgets, letting a stalled upstream hold an interactive
        // dashboard request open for undici's much longer defaults.
        let server = null;
        let baseUrl = null;

        before(function(done) {
            server = http.createServer(function() { /* never responds */ });
            server.listen(0, '127.0.0.1', function() {
                baseUrl = 'http://127.0.0.1:' + server.address().port + '/';
                done();
            });
        });

        after(function(done) {
            server.closeAllConnections && server.closeAllConnections();
            server.close(done);
        });

        it('aborts on {request: ms} just as it does on a bare number', function(done) {
            const started = Date.now();
            request.get(baseUrl, { timeout: { request: 300 }, retry: 0 }, function(err) {
                assert.ok(err, 'a stalled request with {request:300} should have aborted');
                assert.ok(Date.now() - started < 3000, 'did not abort near the 300ms budget');
                done();
            });
        });

        it('falls back to the tightest phase budget when `request` is absent', function(done) {
            const started = Date.now();
            request.get(baseUrl, { timeout: { connect: 300, response: 900 }, retry: 0 }, function(err) {
                assert.ok(err, 'a stalled request with phase budgets should have aborted');
                assert.ok(Date.now() - started < 3000, 'did not abort near the tightest budget');
                done();
            });
        });
    });

    describe('Retry-After on throttled responses', function() {
        // A 429 whose Retry-After is longer than the first exponential backoff
        // used to burn the retry inside the throttle window: the server is
        // still throttling when we come back, so the request fails anyway.
        // Retry-After here is 2s against a 1s first backoff, and the server
        // keeps answering 429 until the interval has actually elapsed - so this
        // only passes if the advertised interval is honoured.
        const RETRY_AFTER_S = 2;
        let server = null;
        let baseUrl = null;
        let attempts = 0;
        let throttledUntil = 0;

        before(function(done) {
            server = http.createServer(function(req, res) {
                attempts++;
                if (attempts === 1) {
                    throttledUntil = Date.now() + (RETRY_AFTER_S * 1000);
                }
                if (Date.now() < throttledUntil) {
                    res.writeHead(429, { 'retry-after': String(RETRY_AFTER_S), 'content-type': 'text/plain' });
                    res.end('slow down');
                    return;
                }
                res.writeHead(200, { 'content-type': 'text/plain' });
                res.end('ok');
            });
            server.listen(0, '127.0.0.1', function() {
                baseUrl = 'http://127.0.0.1:' + server.address().port + '/';
                done();
            });
        });

        after(function(done) {
            server.close(done);
        });

        it('waits the advertised interval instead of the shorter backoff', function(done) {
            this.timeout(15000);
            const started = Date.now();
            request.get(baseUrl, { retry: 1 }, function(err, res, body) {
                const waited = Date.now() - started;
                assert.strictEqual(err, null, 'retry came back while still throttled');
                assert.strictEqual(body, 'ok');
                assert.strictEqual(attempts, 2, 'should have retried exactly once');
                assert.ok(waited >= RETRY_AFTER_S * 1000,
                    'retried after ' + waited + 'ms, inside the ' + (RETRY_AFTER_S * 1000) + 'ms Retry-After');
                done();
            });
        });
    });

    describe('retries with throwHttpErrors: false', function() {
        // The my-countly Flex routes forward the upstream status, so they set
        // throwHttpErrors:false. got still retried a transient status in that
        // mode; deciding retries only from a thrown error silently dropped them.
        let server = null;
        let baseUrl = null;
        let attempts = 0;

        before(function(done) {
            server = http.createServer(function(req, res) {
                attempts++;
                if (attempts === 1) {
                    res.writeHead(503, { 'content-type': 'text/plain' });
                    res.end('unavailable');
                    return;
                }
                res.writeHead(200, { 'content-type': 'text/plain' });
                res.end('ok');
            });
            server.listen(0, '127.0.0.1', function() {
                baseUrl = 'http://127.0.0.1:' + server.address().port + '/';
                done();
            });
        });

        after(function(done) {
            server.close(done);
        });

        it('retries a 503 and reports the final status without throwing', function(done) {
            this.timeout(10000);
            request({ uri: baseUrl, method: 'PUT', throwHttpErrors: false, retry: 1 }, function(err, res, body) {
                assert.strictEqual(err, null, 'throwHttpErrors:false must not surface an error');
                assert.strictEqual(attempts, 2, 'the transient 503 was not retried');
                assert.strictEqual(res.statusCode, 200);
                assert.strictEqual(body, 'ok');
                done();
            });
        });
    });

    describe('awaitable completion', function() {
        // plugins/hooks/api/parts/effects/http.js does `await request.get(...)`
        // and records the outcome in the callback. If request/get/post do not
        // hand the worker's promise back, the await resumes on the next
        // microtask - before the response has landed - and the hook reports a
        // result it never received. main fixed exactly that on the got
        // implementation in 7aaf8b4e11; these cases keep it fixed here.
        let server = null;
        let baseUrl = null;

        before(function(done) {
            server = http.createServer(function(req, res) {
                setTimeout(function() {
                    res.writeHead(200, { 'content-type': 'text/plain' });
                    res.end('done');
                }, 50);
            });
            server.listen(0, '127.0.0.1', function() {
                baseUrl = 'http://127.0.0.1:' + server.address().port + '/';
                done();
            });
        });

        after(function(done) {
            server.close(done);
        });

        it('request() resolves only after the callback has run', async function() {
            let called = false;
            await request(baseUrl, {}, function(err, res, body) {
                assert.strictEqual(err, null);
                assert.strictEqual(body, 'done');
                called = true;
            });
            assert.strictEqual(called, true, 'callback had not run when the await resumed');
        });

        it('request.get() resolves only after the callback has run', async function() {
            let called = false;
            await request.get(baseUrl, {}, function(err, res, body) {
                assert.strictEqual(err, null);
                assert.strictEqual(body, 'done');
                called = true;
            });
            assert.strictEqual(called, true, 'callback had not run when the await resumed');
        });

        it('request.post() resolves only after the callback has run', async function() {
            let called = false;
            await request.post(baseUrl, {}, function(err, res, body) {
                assert.strictEqual(err, null);
                assert.strictEqual(body, 'done');
                called = true;
            });
            assert.strictEqual(called, true, 'callback had not run when the await resumed');
        });

        it('resolves rather than rejecting when the request fails, as got did', async function() {
            let seen = null;
            // Nothing is listening there; the transport error must reach the
            // callback and the returned promise must still settle cleanly.
            await request.get(DEAD_URL, { retry: 0 }, function(err) {
                seen = err;
            });
            assert.ok(seen, 'the transport error never reached the callback');
        });
    });

    describe('consumer callback containment', function() {
        // The request worker is started without anyone awaiting it, so anything
        // the consumer callback does that escapes reaches the process as an
        // unhandled rejection. The jobserver exits(1) on those.
        let server = null;
        let baseUrl = null;
        let rejections = [];

        /**
         * Record unhandled rejections raised while a case runs.
         * @param {*} reason - rejection reason
         * @returns {void}
         */
        function onRejection(reason) {
            rejections.push(reason);
        }

        before(function(done) {
            server = http.createServer(function(req, res) {
                res.writeHead(200, { 'content-type': 'text/plain' });
                res.end('ok');
            });
            server.listen(0, '127.0.0.1', function() {
                baseUrl = 'http://127.0.0.1:' + server.address().port + '/';
                done();
            });
        });

        after(function(done) {
            server.close(done);
        });

        beforeEach(function() {
            rejections = [];
            process.on('unhandledRejection', onRejection);
        });

        afterEach(function() {
            process.removeListener('unhandledRejection', onRejection);
        });

        it('settles once even when the callback throws on success', function(done) {
            // Delivering the result inside the fetch try/catch made a throwing
            // callback look like a transport failure: it was fed to shouldRetry
            // and then reported back to the same callback as an error of our
            // own making.
            const calls = [];
            request({ url: baseUrl, retry: 0 }, function(err) {
                calls.push(err ? 'error' : 'success');
                throw new Error('consumer blew up');
            });

            setTimeout(function() {
                assert.deepStrictEqual(calls, ['success'], 'callback must be invoked exactly once');
                assert.strictEqual(rejections.length, 0, 'no unhandled rejection');
                done();
            }, 300);
        });

        it('contains a callback that rejects asynchronously', function(done) {
            // An async callback returns its rejection rather than throwing, so a
            // try/catch around the invocation cannot see it.
            request({ url: baseUrl, retry: 0 }, async function() {
                throw new Error('async consumer blew up');
            });

            setTimeout(function() {
                assert.strictEqual(rejections.length, 0, 'no unhandled rejection');
                done();
            }, 300);
        });

        it('tolerates a missing callback', function(done) {
            request({ url: baseUrl, retry: 0 });

            setTimeout(function() {
                assert.strictEqual(rejections.length, 0, 'no unhandled rejection');
                done();
            }, 300);
        });

        it('contains a callback that throws on the error path', function(done) {
            request.get({ uri: DEAD_URL, retry: 0 }, function(err) {
                assert.ok(err, 'expected a connection error');
                throw new Error('consumer blew up handling the error');
            });

            setTimeout(function() {
                assert.strictEqual(rejections.length, 0, 'no unhandled rejection');
                done();
            }, 300);
        });
    });
});
