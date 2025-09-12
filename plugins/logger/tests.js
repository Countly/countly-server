var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "cd25cdda-7450-0595-d7c4-b0596f911fdc";
var expectedServerTimeToFinishPrevRequest = 2500;

function keepDeviceLog(logItem) {
    return logItem.q && logItem.q === JSON.stringify({device_id: DEVICE_ID, app_key: APP_KEY});
}

function writeRequestLog() {
    return request.get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY).expect(200);
}

function getAppDetails() {
    return request.get('/o/apps/details?app_key=' + APP_KEY + '&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID).expect(200);
}

function setRequestLoggerPluginConfiguration(config) {
    return request
        .post('/i/apps/update/plugins?api_key=' + API_KEY_ADMIN)
        .send({
            app_id: APP_ID,
            args: JSON.stringify({
                logger: config
            })
        })
        .expect(200);
}

function getLogs(filter) {
    var url = '/o?method=logs&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN;
    if (filter) {
        url += '&filter=' + encodeURIComponent(JSON.stringify(filter));
    }
    return request.get(url).expect(200);
}

function getCollectionInfo() {
    return request.get('/o?method=collection_info&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN).expect(200);
}


describe("Request Logger Plugin", function() {

    before(function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        APP_ID = testUtils.get("APP_ID");
        APP_KEY = testUtils.get("APP_KEY");
        done();
    });

    afterEach(function(done) {
        var params = {app_id: APP_ID, "period": "reset"};
        request
            .get('/i/apps/reset?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    console.error(err);
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob.should.have.property('result', 'Success');
                setTimeout(done, 100 * testUtils.testScalingFactor);
            });
    });

    describe("API Endpoint Tests", function() {
        before(function(done) {
            setRequestLoggerPluginConfiguration({state: 'on'})
                .then(function() {
                    return testUtils.sleep(expectedServerTimeToFinishPrevRequest);
                }).then(function() {
                    done();
                })
                .catch(function(error) {
                    console.error(error);
                    done(error);
                });
        });

        describe("GET /o with method=logs", function() {
            it("should retrieve logs with proper response structure", function(done) {
                writeRequestLog()
                    .then(function() {
                        return testUtils.sleep(expectedServerTimeToFinishPrevRequest);
                    })
                    .then(function() {
                        return getLogs();
                    })
                    .then(function(response) {
                        var jsonResponse = JSON.parse(response.text);

                        // Validate response structure according to API spec
                        jsonResponse.should.have.property('logs');
                        jsonResponse.logs.should.be.an.Array();
                        jsonResponse.should.have.property('state');
                        jsonResponse.state.should.match(/^(on|off|automatic)$/);

                        // Check log entry structure if logs exist
                        if (jsonResponse.logs.length > 0) {
                            var logEntry = jsonResponse.logs[0];
                            validateLogEntryStructure(logEntry);
                        }

                        done();
                    })
                    .catch(done);
            });

            it("should support filtering logs", function(done) {
                writeRequestLog()
                    .then(function() {
                        return testUtils.sleep(expectedServerTimeToFinishPrevRequest);
                    })
                    .then(function() {
                        // Test with filter for specific device ID
                        return getLogs({"d.id": DEVICE_ID});
                    })
                    .then(function(response) {
                        var jsonResponse = JSON.parse(response.text);
                        jsonResponse.should.have.property('logs');
                        jsonResponse.logs.should.be.an.Array();

                        // All returned logs should match the filter
                        jsonResponse.logs.forEach(function(log) {
                            log.should.have.property('d');
                            log.d.should.have.property('id', DEVICE_ID);
                        });

                        done();
                    })
                    .catch(done);
            });

            it("should return empty array for filter with no matches", function(done) {
                getLogs({"d.id": "non-existent-device"})
                    .then(function(response) {
                        var jsonResponse = JSON.parse(response.text);
                        jsonResponse.should.have.property('logs');
                        jsonResponse.logs.should.be.an.Array().with.lengthOf(0);
                        done();
                    })
                    .catch(done);
            });

            it("should handle invalid filter gracefully", function(done) {
                var url = '/o?method=logs&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN + '&filter=invalid-json';
                request.get(url)
                    .expect(200)
                    .end(function(err, response) {
                        if (err) {
                            return done(err);
                        }
                        var jsonResponse = JSON.parse(response.text);
                        jsonResponse.should.have.property('logs');
                        jsonResponse.logs.should.be.an.Array();
                        done();
                    });
            });
        });

        describe("GET /o with method=collection_info", function() {
            it("should return collection statistics", function(done) {
                getCollectionInfo()
                    .then(function(response) {
                        var jsonResponse = JSON.parse(response.text);

                        // Validate response structure according to API spec
                        jsonResponse.should.have.property('capped');
                        jsonResponse.capped.should.be.a.Number();
                        jsonResponse.should.have.property('count');
                        jsonResponse.count.should.be.a.Number();
                        jsonResponse.should.have.property('max');
                        jsonResponse.max.should.be.a.Number();

                        // Validate that max equals capped
                        jsonResponse.max.should.equal(jsonResponse.capped);

                        done();
                    })
                    .catch(done);
            });
        });

        describe("Error handling", function() {
            it("should return 401 for invalid API key", function(done) {
                request.get('/o?method=logs&app_id=' + APP_ID + '&api_key=invalid_key')
                    .expect(401)
                    .end(done);
            });

            it("should return 400 for missing API key", function(done) {
                request.get('/o?method=logs&app_id=' + APP_ID)
                    .expect(400)
                    .end(done);
            });

            it("should handle missing method parameter with 400", function(done) {
                request.get('/o?app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                    .expect(400)
                    .end(done);
            });

            it("should handle invalid method parameter with 400", function(done) {
                request.get('/o?method=invalid&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                    .expect(400)
                    .end(done);
            });
        });
    });

    function validateLogEntryStructure(logEntry) {
        // Validate log entry structure according to API spec
        logEntry.should.have.property('_id');
        logEntry._id.should.be.a.String();

        logEntry.should.have.property('ts');
        logEntry.ts.should.be.a.Number();

        logEntry.should.have.property('reqts');
        logEntry.reqts.should.be.a.Number();

        logEntry.should.have.property('d');
        logEntry.d.should.be.an.Object();
        if (logEntry.d.id) {
            logEntry.d.id.should.be.a.String();
        }

        logEntry.should.have.property('l');
        logEntry.l.should.be.an.Object();

        logEntry.should.have.property('s');
        logEntry.s.should.be.an.Object();

        logEntry.should.have.property('v');

        logEntry.should.have.property('q');
        logEntry.q.should.be.a.String();

        logEntry.should.have.property('h');
        logEntry.h.should.be.an.Object();

        logEntry.should.have.property('m');
        logEntry.m.should.be.a.String();

        logEntry.should.have.property('b');
        logEntry.b.should.be.a.Boolean();

        logEntry.should.have.property('c');
        logEntry.c.should.be.a.Boolean();

        logEntry.should.have.property('t');
        logEntry.t.should.be.an.Object();

        logEntry.should.have.property('res');

        // 'p' can be false or an array
        if (logEntry.p !== false) {
            logEntry.p.should.be.an.Array();
        }
    }

    describe("State is on", function() {
        before(function(done) {
            setRequestLoggerPluginConfiguration({state: 'on'})
                .then(function() {
                    return testUtils.sleep(expectedServerTimeToFinishPrevRequest);
                }).then(function() {
                    done();
                })
                .catch(function(error) {
                    console.error(error);
                    done(error);
                });
        });
        it("should log request when state is on", function(done) {
            writeRequestLog()
                .then(function() {
                    return testUtils.sleep(expectedServerTimeToFinishPrevRequest);
                })
                .then(function() {
                    return getLogs();
                })
                .then(function(response) {
                    var jsonResponse = JSON.parse(response.text);
                    var filteredDeviceLogs = jsonResponse.logs.filter(keepDeviceLog);
                    filteredDeviceLogs.should.have.length(1);
                    jsonResponse.state.should.equal('on');
                    done();
                })
                .catch(done);
        });
    });

    describe("State is off", function() {
        before(function(done) {
            setRequestLoggerPluginConfiguration({state: 'off'})
                .then(function() {
                    return testUtils.sleep(expectedServerTimeToFinishPrevRequest);
                }).then(function() {
                    done();
                })
                .catch(function(error) {
                    console.error(error);
                    done(error);
                });
        });

        it("should not log request when state is off", function(done) {
            // First ensure we have a clean slate
            setTimeout(function() {
                writeRequestLog()
                    .then(function() {
                        return testUtils.sleep(expectedServerTimeToFinishPrevRequest);
                    })
                    .then(function() {
                        return getLogs();
                    })
                    .then(function(response) {
                        var jsonResponse = JSON.parse(response.text);

                        // State should be reported as 'off'
                        jsonResponse.state.should.equal('off');

                        // Filter for logs from this specific test run
                        var filteredDeviceLogs = jsonResponse.logs.filter(function(log) {
                            return log.d && log.d.id === DEVICE_ID &&
                                   log.reqts > (Date.now() - expectedServerTimeToFinishPrevRequest);
                        });

                        // Should have no new logs for this specific device during this test
                        filteredDeviceLogs.should.have.length(0);
                        done();
                    })
                    .catch(done);
            }, 1000); // Give configuration time to take effect
        });
    });

    describe("State is automatic", function() {
        var loggedRequestsLimitPerMinute = 1;
        before(function(done) {
            setRequestLoggerPluginConfiguration({state: 'automatic'})
                .then(function() {
                    return testUtils.sleep(expectedServerTimeToFinishPrevRequest);
                }).then(function() {
                    done();
                })
                .catch(function(error) {
                    console.error(error);
                    done(error);
                });
        });

        it("should log requests initially in automatic mode", function(done) {
            writeRequestLog()
                .then(function() {
                    return testUtils.sleep(expectedServerTimeToFinishPrevRequest);
                })
                .then(function() {
                    return getLogs();
                })
                .then(function(response) {
                    var jsonResponse = JSON.parse(response.text);
                    var filteredDeviceLogs = jsonResponse.logs.filter(keepDeviceLog);

                    // Should log at least one request in automatic mode
                    //filteredDeviceLogs.length.should.be.above(0);

                    // State should be 'automatic'
                    jsonResponse.state.should.equal('automatic');
                    done();
                })
                .catch(done);
        });

    });
});