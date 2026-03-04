var request = require('supertest');
var should = require('should');
var testUtils = require('../../test/testUtils');
request = request(testUtils.url);

var APP_KEY = '';
var API_KEY_ADMIN = '';
var APP_ID = '';
var DEVICE_ID = 'web-ua-client-hints';

function sendSession(deviceId, headers, done) {
    var req = request
        .get('/i?device_id=' + deviceId + '&app_key=' + APP_KEY + '&begin_session=1');

    Object.keys(headers).forEach(function(headerName) {
        req.set(headerName, headers[headerName]);
    });

    req.expect(200).end(function(err, res) {
        if (err) {
            return done(err);
        }
        var ob = JSON.parse(res.text);
        ob.should.have.property('result', 'Success');
        setTimeout(done, 300 * testUtils.testScalingFactor);
    });
}

function validateResponseHasMetaArray(ob, key) {
    ob.should.have.property('meta');
    ob.meta.should.have.property(key);
    Array.isArray(ob.meta[key]).should.equal(true);
}

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
                    validateResponseHasMetaArray(ob, 'browser');
                    ob.meta.browser.should.containEql('Chrome');
                    done();
                });
        });
    });

    describe('Client Hints parsing', function() {
        it('should prioritize client hints and detect Chrome Mobile', function(done) {
            sendSession(DEVICE_ID + '-ch', {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
                'Sec-CH-UA': '"Chromium";v="120", "Google Chrome";v="120", "Not=A?Brand";v="99"',
                'Sec-CH-UA-Mobile': '?1',
                'Sec-CH-UA-Platform': '"Android"',
                'Sec-CH-UA-Platform-Version': '"14.0.0"',
                'Sec-CH-UA-Full-Version': '"120.0.6099.230"',
                'Sec-CH-UA-Model': '"Pixel 8"'
            }, done);
        });

        it('should parse Sec-CH-UA-Full-Version-List using preferred brand version', function(done) {
            sendSession(DEVICE_ID + '-ch-full-version-list', {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
                'Sec-CH-UA': '"Chromium";v="120", "Google Chrome";v="120", "Not=A?Brand";v="99"',
                'Sec-CH-UA-Mobile': '?0',
                'Sec-CH-UA-Platform': '"Linux"',
                'Sec-CH-UA-Full-Version-List': '"Chromium";v="120.0.1111.1", "Google Chrome";v="120.0.2222.2", "Not=A?Brand";v="99.0.0.0"'
            }, done);
        });

        it('should store browser version from preferred brand in full version list', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=browser')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    validateResponseHasMetaArray(ob, 'browser_version');
                    ob.meta.browser_version.should.containEql('[chrome]_120.0.2222.2');
                    done();
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
                    validateResponseHasMetaArray(ob, 'browser');
                    ob.meta.browser.should.containEql('Chrome Mobile');
                    done();
                });
        });

        it('should have Android in os metrics', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=device_details')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    validateResponseHasMetaArray(ob, 'os');
                    ob.meta.os.should.containEql('Android');
                    done();
                });
        });

        it('should normalize Microsoft Edge and Windows 13 to Edge + Windows 11', function(done) {
            sendSession(DEVICE_ID + '-ch-edge-win11', {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
                'Sec-CH-UA': '"Chromium";v="120", "Microsoft Edge";v="120", "Not=A?Brand";v="99"',
                'Sec-CH-UA-Mobile': '?0',
                'Sec-CH-UA-Platform': '"Windows"',
                'Sec-CH-UA-Platform-Version': '"13.0.0"',
                'Sec-CH-UA-Full-Version': '"120.0.2210.91"'
            }, done);
        });

        it('should store normalized Edge/Windows values for the session user', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=device_details')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    validateResponseHasMetaArray(ob, 'os_versions');
                    ob.meta.os_versions.should.containEql('mw11');
                    done();
                });
        });

        it('should normalize Windows 6.1 to Windows 7', function(done) {
            sendSession(DEVICE_ID + '-ch-win7', {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
                'Sec-CH-UA': '"Chromium";v="120", "Not=A?Brand";v="99"',
                'Sec-CH-UA-Mobile': '?0',
                'Sec-CH-UA-Platform': '"Windows"',
                'Sec-CH-UA-Platform-Version': '"6.1.0"'
            }, done);
        });

        it('should store Windows 7 normalized platform version', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=device_details')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    validateResponseHasMetaArray(ob, 'os_versions');
                    ob.meta.os_versions.should.containEql('mw7');
                    done();
                });
        });

        it('should normalize macOS and Google Chrome names', function(done) {
            sendSession(DEVICE_ID + '-ch-mac-chrome', {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
                'Sec-CH-UA': '"Chromium";v="120", "Google Chrome";v="120", "Not=A?Brand";v="99"',
                'Sec-CH-UA-Mobile': '?0',
                'Sec-CH-UA-Platform': '"macOS"',
                'Sec-CH-UA-Platform-Version': '"14.2.0"',
                'Sec-CH-UA-Full-Version': '"120.0.6099.230"'
            }, done);
        });

        it('should store normalized Mac/Chrome values for the session user', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=device_details')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    validateResponseHasMetaArray(ob, 'os');
                    ob.meta.os.should.containEql('Mac');
                    done();
                });
        });

        it('should store normalized browser version prefixes', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=browser')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    validateResponseHasMetaArray(ob, 'browser_version');
                    ob.meta.browser_version.should.containEql('[edge]_120.0.2210.91');
                    ob.meta.browser_version.should.containEql('[chrome]_120.0.6099.230');
                    done();
                });
        });

        it('should infer desktop device type when Sec-CH-UA-Mobile is ?0', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=device_details')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    validateResponseHasMetaArray(ob, 'device_type');
                    ob.meta.device_type.should.containEql('desktop');
                    done();
                });
        });

        it('should not expose non-normalized browser names in browser metrics', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=browser')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    validateResponseHasMetaArray(ob, 'browser');
                    ob.meta.browser.should.not.containEql('Google Chrome');
                    ob.meta.browser.should.not.containEql('Microsoft Edge');
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
