const spt = require('supertest');
const should = require('should');
const testUtils = require('../../../test/testUtils');

const request = spt(testUtils.url);
// change these in local testing directly or set env vars (also COUNTLY_CONFIG_HOSTNAME should be set with port)
let API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
let APP_KEY = testUtils.get('APP_KEY');
let APP_ID = testUtils.get("APP_ID");

describe('CSV/Array and JSON validation', function() {
    function unescapeHtml(str) {
        if (typeof str !== 'string') {
            return str;
        }
        return str.replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'");
    }
    before(function(done) {
        const enforcement = {
            eb: true,
            upb: true,
            sb: true,
            esb: true,
            jte: true
        };

        request
            .post('/i/sdk-config/update-enforcement')
            .query({ api_key: API_KEY_ADMIN, app_id: APP_ID, enforcement: JSON.stringify(enforcement) })
            .expect(200)
            .end(function(err, res) {
                should.not.exist(err);
                res.body.should.have.property('result', 'Success');
                done();
            });
    });

    it('1. should save arrays for eb/upb/sb and objects for esb when provided as proper types', function(done) {
        const parameter = {
            eb: ['a', 'b, c', '  d  '],
            upb: ['user_prop_1', 'user,prop,2'],
            sb: ['seg1', 'seg2'],
            esb: { 'event1': ['a', 'b'] }
        };

        request
            .post('/i/sdk-config/update-parameter')
            .send({ api_key: API_KEY_ADMIN, app_id: APP_ID, parameter: JSON.stringify(parameter) })
            .expect(200)
            .end(function(err, res) {
                should.not.exist(err);
                res.body.should.have.property('result', 'Success');

                request
                    .get('/o/sdk')
                    .query({ method: 'sc', app_key: APP_KEY, device_id: 'test' })
                    .expect(200)
                    .end(function(err, res) {
                        should.not.exist(err);
                        res.body.should.have.property('c');
                        const c = res.body.c;
                        c.should.have.property('eb');
                        c.eb.should.be.an.Array();
                        c.eb.should.have.length(3);
                        c.eb.should.containEql('b, c');
                        c.eb.should.containEql('  d  ');
                        c.eb.should.containEql('a');

                        c.should.have.property('upb');
                        c.upb.should.be.an.Array();
                        c.upb.should.containEql('user,prop,2');
                        c.upb.should.containEql('user_prop_1');
                        c.upb.should.have.length(2);

                        c.should.have.property('sb');
                        c.sb.should.be.an.Array();
                        c.sb.should.have.length(2);
                        c.sb.should.containEql('seg1');
                        c.sb.should.containEql('seg2');

                        c.should.have.property('esb');
                        c.esb.should.be.an.Object();
                        c.esb.should.have.property('event1');
                        c.esb.event1.should.be.an.Array();
                        c.esb.event1.should.have.length(2);
                        c.esb.event1.should.containEql('a');
                        c.esb.event1.should.containEql('b');
                        done();
                    });
            });
    });

    // TODO: in future we may want to auto-parse CSV strings to arrays when uploaded, but for now front-end does this
    it('2. currently stores CSV strings as strings (server does not auto-parse CSV) and esb string stays string', function(done) {
        const parameter = {
            eb: 'one, "two, too", three',
            esb: 'this is not json'
        };

        request
            .post('/i/sdk-config/update-parameter')
            .send({ api_key: API_KEY_ADMIN, app_id: APP_ID, parameter: JSON.stringify(parameter) })
            .expect(200)
            .end(function(err, res) {
                should.not.exist(err);
                res.body.should.have.property('result', 'Success');

                request
                    .get('/o/sdk')
                    .query({ method: 'sc', app_key: APP_KEY, device_id: 'test' })
                    .expect(200)
                    .end(function(err, res) {
                        should.not.exist(err);
                        res.body.should.have.property('c');
                        const c = res.body.c;
                        c.should.have.property('eb');
                        c.eb.should.be.a.String();
                        unescapeHtml(c.eb).should.be.exactly('one, "two, too", three');

                        c.should.have.property('esb');
                        c.esb.should.be.a.String();
                        c.esb.should.be.exactly('this is not json');
                        done();
                    });
            });
    });

    it('3. should reject invalid top-level parameter JSON (string) with 400', function(done) {
        request
            .post('/i/sdk-config/update-parameter')
            .send({ api_key: API_KEY_ADMIN, app_id: APP_ID, parameter: 'invalid json' })
            .expect(400)
            .end(function(err, res) {
                should.not.exist(err);
                res.body.should.have.property('result', 'Error parsing parameter');
                done();
            });
    });

    it('4. should save arrays for jte when provided as array', function(done) {
        const parameter = {
            jte: ['event1', 'event,2']
        };

        request
            .post('/i/sdk-config/update-parameter')
            .send({ api_key: API_KEY_ADMIN, app_id: APP_ID, parameter: JSON.stringify(parameter) })
            .expect(200)
            .end(function(err, res) {
                should.not.exist(err);
                res.body.should.have.property('result', 'Success');

                request
                    .get('/o/sdk')
                    .query({ method: 'sc', app_key: APP_KEY, device_id: 'test' })
                    .expect(200)
                    .end(function(err, res) {
                        should.not.exist(err);
                        res.body.should.have.property('c');
                        const c = res.body.c;
                        c.should.have.property('jte');
                        c.jte.should.be.an.Array();
                        c.jte.should.have.length(2);
                        c.jte.should.containEql('event1');
                        c.jte.should.containEql('event,2');
                        done();
                    });
            });
    });
});

// CSV unit tests
describe('CSV parse/serialize edge cases', function() {
    // copy pasta methods
    function csvToArray(str) {
        if (typeof str !== 'string') {
            return [];
        }
        return Array.from(str.matchAll(/(?:\s*("(?:[^"]|"")*"|[^,]*?)\s*)(?:,|$)/g)).map(function(m) {
            var val = m[1];
            if (!val) {
                return null;
            }
            if (val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') {
                val = val.slice(1, -1).replace(/""/g, '"');
            }
            else {
                val = val.trim();
            }
            return val.length ? val : null;
        }).filter(function(v) {
            return v !== null;
        });
    }

    function arrayToCsv(arr) {
        if (!Array.isArray(arr)) {
            return '';
        }
        return arr.filter(function(e) {
            return e != null;
        }).map(function(e) {
            e = String(e);
            // quote if contains comma, quote, newline or carriage return, or starts/ends with whitespace
            if (/[,"\n\r]/.test(e) || /^\s|\s$/.test(e)) {
                return '"' + e.replace(/"/g, '""') + '"';
            }
            return e;
        }).join(',');
    }

    it('handles commas inside quoted fields', function() {
        const s = 'one,"two, too",three';
        csvToArray(s).should.eql(['one', 'two, too', 'three']);
        arrayToCsv(['one', 'two, too', 'three']).should.eql(s);
    });

    it('handles escaped quotes inside quoted fields', function() {
        const s = 'a,"b""c",d';
        csvToArray(s).should.eql(['a', 'b"c', 'd']);
        arrayToCsv(['a', 'b"c', 'd']).should.eql(s);
    });

    it('handles newlines inside quoted fields', function() {
        const s = '"line1\nline2",simple';
        csvToArray(s).should.eql(['line1\nline2', 'simple']);
        arrayToCsv(['line1\nline2', 'simple']).should.eql(s);
    });

    it('drops empty fields', function() {
        const s = 'a,,b,,';
        csvToArray(s).should.eql(['a', 'b']);
        arrayToCsv(['a', 'b']).should.eql('a,b');
    });

    it('arrayToCsv quotes fields when necessary and roundtrips correctly', function() {
        const arr = ['simple', 'has,comma', ' hasspace ', 'quotes"inside', 'multi\nline'];
        const csv = arrayToCsv(arr);
        csv.should.be.a.String();
        csv.should.eql('simple,"has,comma"," hasspace ","quotes""inside","multi\nline"');
        csvToArray(csv).should.eql(['simple', 'has,comma', ' hasspace ', 'quotes"inside', 'multi\nline']);
    });

    it('arrayToCsv produces empty entries for null/undefined which arrayToCsv will drop', function() {
        const arr = ['a', null, undefined, 'b'];
        const csv = arrayToCsv(arr);
        csv.should.be.a.String();
        csv.should.eql('a,b');
        csvToArray(csv).should.eql(['a', 'b']);
    });

    it('handles unicode characters correctly', function() {
        const arr = ['emoji 😊', 'accenté', '中文,文本'];
        const csv = arrayToCsv(arr);
        csv.should.be.a.String();
        csv.should.eql('emoji 😊,accenté,"中文,文本"');
        csvToArray(csv).should.eql(['emoji 😊', 'accenté', '中文,文本']);
    });

    it('handles extremely long fields', function() {
        const long = 'x'.repeat(100000); // 100k chars
        const arr = ['start', long, 'end'];
        const csv = arrayToCsv(arr);
        csvToArray(csv).should.eql(['start', long, 'end']);
    }).timeout(5000);

    it('handles carriage returns inside quoted fields (CR)', function() {
        const s = '"line1\rline2",after';
        csvToArray(s).should.eql(['line1\rline2', 'after']);
        arrayToCsv(['line1\rline2', 'after']).should.eql(s);
    });

    it('handles CRLF inside quoted fields (CRLF)', function() {
        const s = '"a\r\nb",c';
        csvToArray(s).should.eql(['a\r\nb', 'c']);
        arrayToCsv(['a\r\nb', 'c']).should.eql(s);
    });
});
