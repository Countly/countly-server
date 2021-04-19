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

function setRequestLoggerPluginStateToOff() {
    return request
        .post('/i/apps/update/plugins?api_key=' + API_KEY_ADMIN)
        .send({
            app_id: APP_ID,
            args: JSON.stringify({
                logger: {state: "off"}
            })
        })
        .expect(200);
}


describe("Request Logger Plugin", function() {

    after(function(done) {
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

    describe("State is on", function() {
        before(function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            writeRequestLog()
                .then(function() {
                    done();
                }).catch(function(error) {
                    done(error);
                });
        });

        it("should log request", function(done) {
            testUtils.sleep(expectedServerTimeToFinishPrevRequest).then(function() {
                request.get('/o?method=logs&app_id=' + APP_ID + '&app_key=' + APP_KEY + '&api_key=' + API_KEY_ADMIN)
                    .end(function(error, fetchLogsResponse) {
                        if (error) {
                            return done(error);
                        }
                        var fetchLogsJsonResponse = JSON.parse(fetchLogsResponse.text);
                        const filteredDeviceLogs = fetchLogsJsonResponse.filter(keepDeviceLog);
                        filteredDeviceLogs.should.have.length(1);
                        done();
                    });
            });
        });
    });

    describe("State is off", function() {
        before(function(done) {
            setRequestLoggerPluginStateToOff()
                .then(function() {
                    return testUtils.sleep(expectedServerTimeToFinishPrevRequest);
                }).then(function() {
                    return writeRequestLog();
                }).then(function() {
                    done();
                })
                .catch(function(error) {
                    done(error);
                });
        });

        it("should not log request", function(done) {
            testUtils.sleep(expectedServerTimeToFinishPrevRequest).then(function() {
                request.get('/o?method=logs&app_id=' + APP_ID + '&app_key=' + APP_KEY + '&api_key=' + API_KEY_ADMIN)
                    .end(function(error, fetchLogsResponse) {
                        if (error) {
                            console.error(error);
                            return done(error);
                        }
                        var fetchLogsJsonResponse = JSON.parse(fetchLogsResponse.text);
                        const filteredDeviceLogs = fetchLogsJsonResponse.filter(keepDeviceLog);
                        filteredDeviceLogs.should.have.length(1);
                        done();
                    });
            });
        });
    });
});