var request = require('../index.js');
var should = require('should');

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

    it('Make post request', () => {
        request.post('https://countly', function(err, res/*, body*/) {
            should.not.exist(err);
            should.exist(res);

        });
    });

});
