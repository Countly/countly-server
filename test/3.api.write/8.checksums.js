var request = require("supertest");
var should = require("should");
var testUtils = require("../testUtils");
var crypto = require("crypto");

request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";
var TEST_SALT = "sodiumchloride";
var TEST_SALTBAD = "hydrogencyanide";

function calculate_checksum(message, salt, algorithm = "sha1") {
    return crypto.createHash(algorithm).update(message + salt).digest("hex").toUpperCase();
}

describe("Testing checksum validations", function() {
    describe("Setting the salt for the app", function() {
        it("should successfully update the app", function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");

            const args = {app_id: APP_ID, salt: TEST_SALT};

            request
                .get("/i/apps/update")
                .query({api_key: API_KEY_ADMIN, args: JSON.stringify(args)})
                .expect(200)
                .end(function(error, response) {
                    if (error) {
                        return done(error);
                    }

                    const responseObject = JSON.parse(response.text);
                    responseObject.should.have.property("salt", TEST_SALT);
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
    });

    describe("Without a checksum", function() {
        it("should fail to write", function(done) {
            request
                .get("/i")
                .query({device_id: DEVICE_ID, app_key: APP_KEY})
                .expect(200)
                .end(function(error, response) {
                    if (error) {
                        return done(error);
                    }

                    const responseObject = JSON.parse(response.text);
                    responseObject.should.have.property("result", "Request does not have checksum");
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
    });

    describe("With incorrect SHA-1 checksum", function() {
        it("should fail to write", function(done) {
            const checksum = calculate_checksum("app_key=" + APP_KEY + "&device_id=" + DEVICE_ID, TEST_SALTBAD);

            request
                .get("/i")
                .query({device_id: DEVICE_ID, app_key: APP_KEY, checksum: checksum}).sortQuery()
                .expect(200)
                .end(function(error, response) {
                    if (error) {
                        return done(error);
                    }

                    const responseObject = JSON.parse(response.text);
                    responseObject.should.have.property("result", "Request does not match checksum");
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
    });

    describe("With incorrect SHA-256 checksum", function() {
        it("should fail to write", function(done) {
            const checksum = calculate_checksum("app_key=" + APP_KEY + "&device_id=" + DEVICE_ID, TEST_SALTBAD, "sha256");

            request
                .get("/i")
                .query({device_id: DEVICE_ID, app_key: APP_KEY, checksum256: checksum}).sortQuery()
                .expect(200)
                .end(function(error, response) {
                    if (error) {
                        return done(error);
                    }

                    const responseObject = JSON.parse(response.text);
                    responseObject.should.have.property("result", "Request does not match checksum");
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
    });

    describe("Using GET with correct SHA-1 checksum", function() {
        it("should succeed to write", function(done) {
            const checksum = calculate_checksum("app_key=" + APP_KEY + "&device_id=" + DEVICE_ID, TEST_SALT);

            request
                .get("/i")
                .query({device_id: DEVICE_ID, app_key: APP_KEY, checksum: checksum}).sortQuery()
                .expect(200)
                .end(function(error, response) {
                    if (error) {
                        return done(error);
                    }

                    const responseObject = JSON.parse(response.text);
                    responseObject.should.have.property("result", "Success");
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
    });

    describe("Using POST with correct SHA-1 checksum", function() {
        it("should succeed to write", function(done) {
            const checksum = calculate_checksum("app_key=" + APP_KEY + "&device_id=" + DEVICE_ID, TEST_SALT);

            request
                .post("/i")
                .type("form")
                .send({app_key: APP_KEY})
                .send({device_id: DEVICE_ID})
                .send({checksum: checksum})
                .expect(200)
                .end(function(error, response) {
                    if (error) {
                        return done(error);
                    }

                    const responseObject = JSON.parse(response.text);
                    responseObject.should.have.property("result", "Success");
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
    });

    describe("Using GET with correct SHA-256 checksum", function() {
        it("should succeed to write", function(done) {
            const checksum = calculate_checksum("app_key=" + APP_KEY + "&device_id=" + DEVICE_ID, TEST_SALT, "sha256");

            request
                .get("/i")
                .query({device_id: DEVICE_ID, app_key: APP_KEY, checksum256: checksum}).sortQuery()
                .expect(200)
                .end(function(error, response) {
                    if (error) {
                        return done(error);
                    }

                    const responseObject = JSON.parse(response.text);
                    responseObject.should.have.property("result", "Success");
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
    });

    describe("Using POST with correct SHA-256 checksum", function() {
        it("should succeed to write", function(done) {
            const checksum = calculate_checksum("app_key=" + APP_KEY + "&device_id=" + DEVICE_ID, TEST_SALT, "sha256");

            request
                .post("/i")
                .type("form")
                .send({app_key: APP_KEY})
                .send({device_id: DEVICE_ID})
                .send({checksum256: checksum})
                .expect(200)
                .end(function(error, response) {
                    if (error) {
                        return done(error);
                    }

                    const responseObject = JSON.parse(response.text);
                    responseObject.should.have.property("result", "Success");
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
    });

    describe("Removing the salt for the app", function() {
        it("should successfully update it as an empty string", function(done) {
            const args = {app_id: APP_ID, salt: ""};

            request
                .get("/i/apps/update")
                .query({api_key: API_KEY_ADMIN, args: JSON.stringify(args)})
                .expect(200)
                .end(function(error, response) {
                    if (error) {
                        return done(error);
                    }

                    const responseObject = JSON.parse(response.text);
                    responseObject.should.have.property("salt", "");
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
    });

    describe("Reseting app", function() {
        it("should successfully reset data", function(done) {
            const args = {app_id: APP_ID, "period": "reset"};
            request
                .get("/i/apps/reset")
                .query({api_key: API_KEY_ADMIN, args: JSON.stringify(args)})
                .expect(200)
                .end(function(error, response) {
                    if (error) {
                        return done(error);
                    }
                    const responseObject = JSON.parse(response.text);
                    responseObject.should.have.property("result", "Success");
                    done();
                });
        });
    });
});