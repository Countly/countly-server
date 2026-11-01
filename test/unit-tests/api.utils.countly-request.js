var should = require('should');
var http = require('http');
var countlyRequestFactory = require('../../api/utils/countly-request/index.js');

// Regression test: the exported request()/.get()/.post() never returned the
// got(...).then(cb).catch(cb) chain they build internally, so `await
// request(...)` / `await request.get(...)` (e.g. HTTPEffect.run in
// plugins/hooks/api/parts/effects/http.js) resumed on the very next microtask —
// before the real network call, and the callback that records its outcome, had
// run.
//
// Checked every current caller of this module (plugins/attribution,
// plugins/reports, plugins/journey_engine, plugins/alerts,
// api/utils/requestProcessorCommon.ts, plugins/hooks): none used the return
// value (it was always undefined), so making these return the real promise is
// safe for all of them.
//
// Uses a bare Node http server on loopback rather than a live Countly service:
// this module has no SSRF gate of its own (that only exists inside
// HTTPEffect), so exercising it directly here needs nothing else running.
describe('Testing countly-request return value', function() {
    var server;
    var baseUrl;
    var request;

    before(function(done) {
        server = http.createServer(function(req, res) {
            if (req.url.indexOf('/fail') === 0) {
                res.writeHead(500);
                res.end('boom');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('{"ok":true}');
        });
        server.listen(0, '127.0.0.1', function() {
            baseUrl = 'http://127.0.0.1:' + server.address().port;
            done();
        });
    });

    after(function(done) {
        server.close(done);
    });

    beforeEach(function() {
        request = countlyRequestFactory({});
    });

    it('request.get(uri, cb) returns a promise that resolves only after cb ran', async function() {
        var callbackRan = false;
        var returned = request.get(baseUrl + '/ok', function() {
            callbackRan = true;
        });

        should(returned).be.ok();
        should(typeof returned.then).equal('function');
        // The real network call has only just been fired at this point, so the
        // callback cannot have run yet -- this is what the missing `return`
        // used to let `await` skip past.
        callbackRan.should.equal(false);

        await returned;

        callbackRan.should.equal(true);
    });

    it('request(uri, cb) (bare string uri) has the same ordering', async function() {
        var callbackRan = false;
        var returned = request(baseUrl + '/ok', function() {
            callbackRan = true;
        });

        should(typeof returned.then).equal('function');
        callbackRan.should.equal(false);

        await returned;

        callbackRan.should.equal(true);
    });

    it('the error path is awaited too: cb sees the error before the promise settles', async function() {
        var callbackError = null;
        var returned = request.get(baseUrl + '/fail', function(err) {
            callbackError = err;
        });

        await returned;

        should.exist(callbackError);
    });

    it('request.post({uri, json}, cb) returns a promise that resolves only after cb ran', async function() {
        var callbackRan = false;
        var returned = request.post({ uri: baseUrl + '/ok', json: { a: 1 } }, function() {
            callbackRan = true;
        });

        should(typeof returned.then).equal('function');
        callbackRan.should.equal(false);

        await returned;

        callbackRan.should.equal(true);
    });
});
