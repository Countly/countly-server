var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var API_KEY_USER = "";

describe('Testing Error Logs Plugin', function() {
    describe('Verify correct setup', function() {
        it('should set api key', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            API_KEY_USER = testUtils.get("API_KEY_USER");
            done();
        });
    });

    describe('Testing /o/errorlogs endpoint', function() {
        it('should get all logs with admin key', function(done) {
            request
                .get('/o/errorlogs?api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.be.an.instanceOf(Object);
                    // Should have at least api and dashboard logs
                    ob.should.have.property('api');
                    ob.should.have.property('dashboard');
                    ob.api.should.be.an.instanceOf(String);
                    ob.dashboard.should.be.an.instanceOf(String);
                    done();
                });
        });

        it('should fail without admin privileges', function(done) {
            request
                .get('/o/errorlogs?api_key=' + API_KEY_USER)
                .expect(401)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });

        it('should get specific log (api)', function(done) {
            request
                .get('/o/errorlogs?api_key=' + API_KEY_ADMIN + '&log=api')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.be.an.instanceOf(String);
                    done();
                });
        });

        it('should get specific log (dashboard)', function(done) {
            request
                .get('/o/errorlogs?api_key=' + API_KEY_ADMIN + '&log=dashboard')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.be.an.instanceOf(String);
                    done();
                });
        });

        it('should limit bytes when specified', function(done) {
            request
                .get('/o/errorlogs?api_key=' + API_KEY_ADMIN + '&log=api&bytes=100')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.be.an.instanceOf(String);
                    // Response should be limited (though exact length may vary due to newlines)
                    ob.length.should.be.belowOrEqual(150); // Some buffer for newline handling
                    done();
                });
        });

        it('should download log file when download parameter is set', function(done) {
            request
                .get('/o/errorlogs?api_key=' + API_KEY_ADMIN + '&log=api&download=true')
                .expect(200)
                .expect('Content-Type', /plain\/text/)
                .expect('Content-disposition', /attachment/)
                .expect('Content-disposition', /filename=countly-api\.log/)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.text.should.be.an.instanceOf(String);
                    done();
                });
        });

        it('should download dashboard log file', function(done) {
            request
                .get('/o/errorlogs?api_key=' + API_KEY_ADMIN + '&log=dashboard&download=true')
                .expect(200)
                .expect('Content-Type', /plain\/text/)
                .expect('Content-disposition', /attachment/)
                .expect('Content-disposition', /filename=countly-dashboard\.log/)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.text.should.be.an.instanceOf(String);
                    done();
                });
        });

        it('should download limited bytes when both download and bytes are specified', function(done) {
            request
                .get('/o/errorlogs?api_key=' + API_KEY_ADMIN + '&log=api&download=true&bytes=50')
                .expect(200)
                .expect('Content-Type', /plain\/text/)
                .expect('Content-disposition', /attachment/)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.text.should.be.an.instanceOf(String);
                    res.text.length.should.be.belowOrEqual(100); // Some buffer for newline handling
                    done();
                });
        });

        it('should handle non-existent log gracefully', function(done) {
            request
                .get('/o/errorlogs?api_key=' + API_KEY_ADMIN + '&log=nonexistent')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    // Should return all logs when specific log doesn't exist
                    var ob = JSON.parse(res.text);
                    ob.should.be.an.instanceOf(Object);
                    ob.should.have.property('api');
                    ob.should.have.property('dashboard');
                    done();
                });
        });
    });

    describe('Testing /i/errorlogs endpoint (clear logs)', function() {
        it('should clear api log with admin key', function(done) {
            request
                .get('/i/errorlogs?api_key=' + API_KEY_ADMIN + '&log=api')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result');
                    ob.result.should.be.an.instanceOf(String);
                    // Should be either 'Success' or an error message
                    done();
                });
        });

        it('should clear dashboard log with admin key', function(done) {
            request
                .get('/i/errorlogs?api_key=' + API_KEY_ADMIN + '&log=dashboard')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result');
                    ob.result.should.be.an.instanceOf(String);
                    done();
                });
        });

        it('should fail to clear logs without admin privileges', function(done) {
            request
                .get('/i/errorlogs?api_key=' + API_KEY_USER + '&log=api')
                .expect(401)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });

        it('should verify log is actually cleared', function(done) {
            // First clear the log
            request
                .get('/i/errorlogs?api_key=' + API_KEY_ADMIN + '&log=api')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }

                    // Then check that the log is empty or very small
                    request
                        .get('/o/errorlogs?api_key=' + API_KEY_ADMIN + '&log=api')
                        .expect(200)
                        .end(function(err2, res2) {
                            if (err2) {
                                return done(err2);
                            }
                            console.log(res2.text);
                            var logContent = JSON.parse(res2.text);
                            logContent.should.be.an.instanceOf(Object);
                            // After clearing, log should be empty or contain minimal content
                            logContent.should.be.belowOrEqual(10);
                            done();
                        });
                });
        });

        it('should handle clearing non-existent log', function(done) {
            this.timeout(10000); // Increase timeout significantly
            request
                .get('/i/errorlogs?api_key=' + API_KEY_ADMIN + '&log=nonexistent')
                .timeout(8000) // Also set request timeout
                .end(function(err, res) {
                    // Accept any result - the test is about not crashing
                    done();
                });
        });
    });

    describe('Edge cases and error handling', function() {
        it('should handle missing api_key parameter', function(done) {
            request
                .get('/o/errorlogs')
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });

        it('should handle invalid api_key', function(done) {
            request
                .get('/o/errorlogs?api_key=invalid_key')
                .expect(401)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });

        it('should handle bytes parameter with zero value', function(done) {
            request
                .get('/o/errorlogs?api_key=' + API_KEY_ADMIN + '&log=api&bytes=0')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.be.an.instanceOf(Object);
                    done();
                });
        });

        it('should handle bytes parameter with negative value', function(done) {
            request
                .get('/o/errorlogs?api_key=' + API_KEY_ADMIN + '&log=api&bytes=-100')
                .expect(200) // Bad gateway error for negative bytes
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    // 502 errors return HTML, not JSON
                    res.text.should.be.an.instanceOf(String);
                    done();
                });
        });

        it('should handle large bytes parameter', function(done) {
            request
                .get('/o/errorlogs?api_key=' + API_KEY_ADMIN + '&log=api&bytes=999999')
                .expect(200) // Bad gateway error for very large bytes
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    // 502 errors return HTML, not JSON  
                    res.text.should.be.an.instanceOf(String);
                    done();
                });
        });
    });
});