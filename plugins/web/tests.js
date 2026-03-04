var request = require('supertest');
var should = require('should');
var testUtils = require('../../test/testUtils');
request = request(testUtils.url);

var APP_KEY = '';
var API_KEY_ADMIN = '';
var APP_ID = '';
var DEVICE_ID = 'web-ua-client-hints';

describe('Testing Web UA and Client Hints parsing', function() {
    describe('Init', function() {
        it('should load app credentials', function(done) {
            API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');
            APP_ID = testUtils.get('APP_ID');
            APP_KEY = testUtils.get('APP_KEY');
            done();
        });
    });

    describe('Reset app before tests', function() {
        it('should reset data', function(done) {
            var params = {app_id: APP_ID, period: 'reset'};
            request
                .get('/i/apps/reset?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, testUtils.testWaitTimeForResetApp * testUtils.testScalingFactor);
                });
        });
    });

    describe('UA parsing', function() {
        it('should parse Chrome from user-agent', function(done) {
            request
                .get('/i?device_id=' + DEVICE_ID + '-ua&app_key=' + APP_KEY + '&begin_session=1')
                .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 300 * testUtils.testScalingFactor);
                });
        });

        it('should have Chrome in browser metrics', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=browser')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('meta');
                    ob.meta.should.have.property('browser');
                    ob.meta.browser.should.containEql('Chrome');
                    done();
                });
        });
    });

    describe('Client Hints parsing', function() {
        it('should prioritize client hints and detect Chrome Mobile', function(done) {
            request
                .get('/i?device_id=' + DEVICE_ID + '-ch&app_key=' + APP_KEY + '&begin_session=1')
                .set('User-Agent', 'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0')
                .set('Sec-CH-UA', '"Chromium";v="120", "Google Chrome";v="120", "Not=A?Brand";v="99"')
                .set('Sec-CH-UA-Mobile', '?1')
                .set('Sec-CH-UA-Platform', '"Android"')
                .set('Sec-CH-UA-Platform-Version', '"14.0.0"')
                .set('Sec-CH-UA-Full-Version', '"120.0.6099.230"')
                .set('Sec-CH-UA-Model', '"Pixel 8"')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 300 * testUtils.testScalingFactor);
                });
        });

        it('should have Chrome Mobile in browser metrics', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=browser')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('meta');
                    ob.meta.should.have.property('browser');
                    ob.meta.browser.should.containEql('Chrome Mobile');
                    done();
                });
        });

        it('should have Android in os metrics', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=os')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('meta');
                    ob.meta.should.have.property('os');
                    ob.meta.os.should.containEql('Android');
                    done();
                });
        });
    });

    describe('Reset app after tests', function() {
        it('should reset data', function(done) {
            var params = {app_id: APP_ID, period: 'reset'};
            request
                .get('/i/apps/reset?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, testUtils.testWaitTimeForResetApp * testUtils.testScalingFactor);
                });
        });
    });
});
