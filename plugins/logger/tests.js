var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";
var expectedServerTimeToFinishPrevRequest = 2500;


function fetchRemoteConfig() {
    return request.get('/o/sdk?method=fetch_remote_config&app_id=' + APP_ID + '&app_key=' + APP_KEY + '&device_id=' + DEVICE_ID);
}

function setRequestLoggerPluginStateToOff() {
    return request
        .post('/i/apps/update/plugins?api_key=' + API_KEY_ADMIN)
        .send({
            app_id: APP_ID,
            args: JSON.stringify({
                logger: {state: "off"}
            })
        });
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
            fetchRemoteConfig()
                .then(function(response) {
                    console.log(response);
                    done();
                }).catch(function(error) {
                    console.error(error);
                    done(error);
                });
        });

        it("should log request", function(done) {
            testUtils.sleep(expectedServerTimeToFinishPrevRequest).then(function() {
                request.get('/o?method=logs&app_id=' + APP_ID + '&app_key=' + APP_KEY + '&api_key=' + API_KEY_ADMIN)
                    .end(function(error, fetchLogsResponse) {
                        if (error) {
                            console.error(error);
                            return done(error);
                        }
                        var fetchLogsJsonResponse = JSON.parse(fetchLogsResponse.text);
                        fetchLogsJsonResponse.should.not.be.empty;
                        fetchLogsJsonResponse.should.have.length(1);
                        done();
                    });
            });
        });
    });

    describe("State is off", function() {
        before(function(done) {
            setRequestLoggerPluginStateToOff()
                .then(function(response) {
                    console.log(response);
                    return testUtils.sleep(expectedServerTimeToFinishPrevRequest);
                }).then(function(response) {
                    console.log(response);
                    return fetchRemoteConfig();
                }).then(function() {
                    done();
                })
                .catch(function(error) {
                    console.error(error);
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
                        var expectedNumberOfRequestsFromPreviousTestCases = 1;
                        var fetchLogsJsonResponse = JSON.parse(fetchLogsResponse.text);
                        fetchLogsJsonResponse.should.have.length(expectedNumberOfRequestsFromPreviousTestCases);
                        done();
                    });
            });
        });
    });
});