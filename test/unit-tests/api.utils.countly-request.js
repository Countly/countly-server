
var pluginManager = require('../../plugins/pluginManager');
var request = require('countly-request')(pluginManager.getConfig("security"));
var should = require('should');
const testUtils = require("../testUtils");

describe('Countly Request', () => {

    it('Make sure options converted correctly', () => {
        const optionsWithoutBaseURL = {
            "qs": "searchParams",
            "strictSSL": true,
            "gzip": true,
            "jar": "cookieJar",
            //"baseUrl": "prefixUrl",
            "uri": "url"
        };

        const expectedOptionsWithoutBaseURL = {
            "searchParams": "searchParams",
            "https": {
                "rejectUnauthorized": true
            },
            "decompress": true,
            "cookieJar": "cookieJar",
            //"prefixUrl": "prefixUrl",
            "url": "url"
        };

        const optionsWithBaseURL = {
            "qs": "searchParams",
            "strictSSL": true,
            "gzip": true,
            "jar": "cookieJar",
            "baseUrl": "prefixUrl",
            "uri": "url"
        };

        const expetedOptionsWithBaseURL = {
            "searchParams": "searchParams",
            "https": {
                "rejectUnauthorized": true
            },
            "decompress": true,
            "cookieJar": "cookieJar",
            "prefixUrl": "prefixUrl",
            "uri": "url"
        };


        request.convertOptionsToGot(optionsWithoutBaseURL).should.be.eql(expectedOptionsWithoutBaseURL);
        request.convertOptionsToGot(optionsWithBaseURL).should.be.eql(expetedOptionsWithBaseURL);
    });


    it('Make get request', () => {
        request.get('https://count.ly', {strictSSL: true}, function(err, res/*, body*/) {
            should.not.exist(err);
            should.exist(res);

        });

    });

    it('Makes get request', (done) => {
        request.get(`${testUtils.url}/o/ping`, (err, res) => {
            should.not.exist(err);
            should.exist(res);

            done();
        });
    });

    it('Make post request', () => {
        request.post('https://countly', function(err, res/*, body*/) {
            should.not.exist(err);
            should.exist(res);

        });
    });

    it('Makes post request', (done) => {
        request.post({
            url: `${testUtils.url}/i/configs`,
            json: {
                api_key: testUtils.get('API_KEY_ADMIN'),
                app_key: testUtils.get('APP_KEY'),
                configs: JSON.stringify({ frontend: { test: true } }),
            },
        }, (err, res) => {
            should.not.exist(err);
            should.exist(res);

            done();
        });
    });

});
