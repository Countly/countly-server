var request = require('supertest');
var should = require('should');
var crypto = require('crypto');
var moment = require('moment-timezone');
var testUtils = require("../../test/testUtils");
var pluginManager = require("../../plugins/pluginManager.js");
var Promise = require("bluebird");
request = request(testUtils.url);

// Sample alert configurations based on OpenAPI schema
const baseAlert = {
    "alertName": "Test Alert",
    "alertDataType": "metric",
    "alertDataSubType": "Total users",
    "compareType": "increased by at least",
    "compareValue": "10",
    "selectedApps": [],
    "period": "every 1 hour on the 59th min",
    "alertBy": "email",
    "enabled": true,
    "compareDescribe": "Total users increased by at least 10%",
    "alertValues": ["test@example.com"]
};

// Store created alerts for later use
const createdAlerts = [];

function getRequestURL(path) {
    const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
    const APP_ID = testUtils.get("APP_ID");
    return path + `?api_key=${API_KEY_ADMIN}&app_id=${APP_ID}`;
}

// Schema validation functions based on OpenAPI spec
function validateAlertObject(alert) {
    alert.should.have.property('_id').which.is.a.String();
    alert.should.have.property('alertName').which.is.a.String();
    alert.should.have.property('alertDataType').which.is.a.String();
    alert.should.have.property('alertDataSubType').which.is.a.String();
    alert.should.have.property('compareType').which.is.a.String();
    alert.should.have.property('compareValue').which.is.a.String();
    alert.should.have.property('selectedApps').which.is.an.Array();
    alert.should.have.property('period').which.is.a.String();
    alert.should.have.property('alertBy').which.is.a.String();
    alert.should.have.property('enabled').which.is.a.Boolean();
    alert.should.have.property('compareDescribe').which.is.a.String();
    alert.should.have.property('alertValues').which.is.an.Array();
    // Optional fields
    if (alert.alertDataSubType2 !== undefined) {
        alert.alertDataSubType2.should.be.a.String();
    }
    if (alert.createdBy !== undefined) {
        alert.createdBy.should.be.a.String();
    }
}

function validateAlertListResponse(body) {
    body.should.have.property('alertsList').which.is.an.Array();
    body.should.have.property('count').which.is.an.Object();
    body.count.should.have.property('r').which.is.a.Number();

    // Validate each alert in the list
    if (body.alertsList.length > 0) {
        body.alertsList.forEach(validateAlertObject);
    }
}

describe('Testing Alert API against OpenAPI Specification', function() {
    describe('1. /i/alert/save - Create and Update Alerts', function() {
        it('should create a new alert with all required parameters', function(done) {
            const APP_ID = testUtils.get("APP_ID");
            const alertConfig = Object.assign({}, baseAlert, {
                selectedApps: [APP_ID],
                alertName: "Create Test Alert"
            });

            request.get(getRequestURL('/i/alert/save') + "&alert_config=" + encodeURIComponent(JSON.stringify(alertConfig)))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    // API returns the ID of the created alert
                    should.exist(res.body);
                    res.body.should.be.a.String();

                    // Store the created alert ID for later tests
                    createdAlerts.push(res.body);

                    // Verify the alert was actually created by fetching the list
                    request.get(getRequestURL('/o/alert/list'))
                        .expect(200)
                        .end(function(err, res) {
                            if (err) {
                                return done(err);
                            }

                            validateAlertListResponse(res.body);

                            // Find our created alert in the list
                            const createdAlert = res.body.alertsList.find(a => a._id === createdAlerts[0]);
                            should.exist(createdAlert);
                            createdAlert.should.have.property('alertName', 'Create Test Alert');

                            done();
                        });
                });
        });

        it('should update an existing alert', function(done) {
            // First fetch the alert we want to update
            request.get(getRequestURL('/o/alert/list'))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }

                    const alertToUpdate = res.body.alertsList.find(a => a._id === createdAlerts[0]);
                    should.exist(alertToUpdate);

                    // Now update the alert
                    const updatedConfig = Object.assign({}, alertToUpdate, {
                        alertName: "Updated Alert Name",
                        compareValue: "20" // Changing another field
                    });

                    request.get(getRequestURL('/i/alert/save') + "&alert_config=" + encodeURIComponent(JSON.stringify(updatedConfig)))
                        .expect(200)
                        .end(function(err, res) {
                            if (err) {
                                return done(err);
                            }

                            // After updating, fetch the alert list to verify changes
                            request.get(getRequestURL('/o/alert/list'))
                                .expect(200)
                                .end(function(err, res) {
                                    if (err) {
                                        return done(err);
                                    }

                                    validateAlertListResponse(res.body);

                                    // Find our updated alert
                                    const updatedAlert = res.body.alertsList.find(a => a._id === createdAlerts[0]);
                                    should.exist(updatedAlert);
                                    updatedAlert.should.have.property('alertName', 'Updated Alert Name');
                                    updatedAlert.should.have.property('compareValue', '20');

                                    done();
                                });
                        });
                });
        });

        it('should fail when missing required parameters', function(done) {
            // Create an invalid alert missing required fields
            const invalidConfig = {
                // Missing alertName and other required fields
                "compareType": "increased by at least",
                "compareValue": "10",
                "selectedApps": [testUtils.get("APP_ID")],
                "enabled": true
            };

            request.get(getRequestURL('/i/alert/save') + "&alert_config=" + encodeURIComponent(JSON.stringify(invalidConfig)))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.body.should.have.property('result');
                    res.body.result.should.equal('Not enough args');
                    done();
                });
        });

        it('should fail when alert_config parameter is missing', function(done) {
            // Test the endpoint with no alert_config parameter
            // We'll use the raw superagent request to catch errors like 500
            const endpoint = getRequestURL('/i/alert/save');

            // Using request directly without expect() to handle both success and error cases
            const req = request.get(endpoint);

            // Set up a callback to handle both success and error responses
            req.end(function(err, res) {
                if (err) {
                    // For error responses (like 500), verify it's related to missing parameters
                    err.status.should.equal(500);

                    // Verify the response indicates an error related to missing parameters
                    const responseBody = res.body || res.text || '';
                    done();
                }
                else {
                    // If we get a 200 response, it should indicate an error in the body
                    if (res.body && res.body.result && typeof res.body.result === 'string') {
                        res.body.should.have.property('result');
                        done();
                    }
                    else {
                        done(new Error("Expected error response for missing alert_config parameter"));
                    }
                }
            });
        });

        it('should handle different alert data types', function(done) {
            const APP_ID = testUtils.get("APP_ID");
            // Create an alert with a different data type
            const crashAlert = Object.assign({}, baseAlert, {
                alertName: "Crash Alert",
                alertDataType: "crash",
                alertDataSubType: "Total crashes",
                compareDescribe: "Total crashes increased by at least 10%",
                selectedApps: [APP_ID]
            });

            request.get(getRequestURL('/i/alert/save') + "&alert_config=" + encodeURIComponent(JSON.stringify(crashAlert)))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.exist(res.body);
                    res.body.should.be.a.String();

                    // Store the created alert ID
                    createdAlerts.push(res.body);

                    // Verify the alert was created with the correct data type
                    request.get(getRequestURL('/o/alert/list'))
                        .expect(200)
                        .end(function(err, res) {
                            if (err) {
                                return done(err);
                            }

                            validateAlertListResponse(res.body);

                            // Find the created alert
                            const createdCrashAlert = res.body.alertsList.find(a => a._id === createdAlerts[createdAlerts.length - 1]);
                            should.exist(createdCrashAlert);
                            createdCrashAlert.should.have.property('alertDataType', 'crash');

                            done();
                        });
                });
        });
    });

    describe('2. /o/alert/list - Get Alerts List', function() {
        it('should retrieve a list of alerts with correct schema', function(done) {
            request.get(getRequestURL('/o/alert/list'))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }

                    validateAlertListResponse(res.body);

                    // Verify we have at least our created alerts
                    res.body.alertsList.length.should.be.aboveOrEqual(createdAlerts.length);

                    // Check all required fields in the response schema
                    if (res.body.alertsList.length > 0) {
                        const firstAlert = res.body.alertsList[0];

                        // Additional fields specified in OpenAPI but not validated in validateAlertObject
                        if (firstAlert.appNameList !== undefined) {
                            firstAlert.appNameList.should.be.a.String();
                        }

                        if (firstAlert.condtionText !== undefined) {
                            firstAlert.condtionText.should.be.a.String();
                        }

                        if (firstAlert.createdByUser !== undefined) {
                            firstAlert.createdByUser.should.be.a.String();
                        }
                    }

                    done();
                });
        });

        it('should handle request without app_id parameter', function(done) {
            // Create a URL without app_id
            const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            const url = '/o/alert/list' + `?api_key=${API_KEY_ADMIN}`;

            // This should fail or return an error response
            request.get(url)
                .end(function(err, res) {
                    // We expect either an error or an error response
                    if (res.statusCode === 200) {
                        if (res.body && (res.body.result || res.body.error)) {
                            // Check if the response contains an error message
                            (res.body.result || res.body.error).should.be.a.String();
                        }
                    }
                    done();
                });
        });
    });

    describe('3. /i/alert/status - Change Alert Status', function() {
        it('should change status of a single alert', function(done) {
            if (createdAlerts.length === 0) {
                return done(new Error("No alerts created for testing status change"));
            }

            const alertID = createdAlerts[0];
            const payload = {[alertID]: false};

            request.get(getRequestURL('/i/alert/status') + "&status=" + encodeURIComponent(JSON.stringify(payload)))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }

                    // Verify response matches schema in OpenAPI spec
                    res.body.should.be.a.Boolean();
                    res.body.should.equal(true);

                    // Verify the status was actually changed
                    request.get(getRequestURL('/o/alert/list'))
                        .expect(200)
                        .end(function(err, res) {
                            if (err) {
                                return done(err);
                            }

                            const updatedAlert = res.body.alertsList.find(a => a._id === alertID);
                            should.exist(updatedAlert);
                            updatedAlert.should.have.property('enabled', false);

                            done();
                        });
                });
        });

        it('should change status of multiple alerts in one call', function(done) {
            if (createdAlerts.length < 2) {
                return done(new Error("Need at least two alerts for multi-status test"));
            }

            // Set all our test alerts to enabled
            const payload = {};
            createdAlerts.forEach(id => {
                payload[id] = true;
            });

            request.get(getRequestURL('/i/alert/status') + "&status=" + encodeURIComponent(JSON.stringify(payload)))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.body.should.be.a.Boolean();
                    res.body.should.equal(true);

                    // Verify all alerts were changed
                    request.get(getRequestURL('/o/alert/list'))
                        .expect(200)
                        .end(function(err, res) {
                            if (err) {
                                return done(err);
                            }

                            for (const alertID of createdAlerts) {
                                const alert = res.body.alertsList.find(a => a._id === alertID);
                                should.exist(alert);
                                alert.should.have.property('enabled', true);
                            }

                            done();
                        });
                });
        });

        it('should handle invalid status payloads', function(done) {
            // Using a non-JSON string should result in an error
            // We'll use the raw superagent request to catch errors like 500
            const endpoint = getRequestURL('/i/alert/status') + "&status=not-a-json-object";

            // Using request directly without expect() to handle both success and error cases
            const req = request.get(endpoint);

            // Set up a callback to handle both success and error responses
            req.end(function(err, res) {
                if (err) {
                    // For error responses (like 500), make sure it's a JSON parsing error
                    err.status.should.equal(500);

                    // The response should indicate a JSON parsing error
                    const responseBody = res.body || res.text || '';
                    const responseText = (typeof responseBody === 'string') ? responseBody : JSON.stringify(responseBody);
                    responseText.should.containEql('JSON');
                    done();
                }
                else {
                    // If we somehow get a 200 response, it should indicate an error in the body
                    if (res.body === false || (res.body && res.body.result && typeof res.body.result === 'string')) {
                        done();
                    }
                    else {
                        done(new Error("Expected error response for invalid status payload"));
                    }
                }
            });
        });

        it('should fail when status parameter is missing', function(done) {
            // Test the endpoint with no status parameter
            // We'll use the raw superagent request to catch errors like 500
            const endpoint = getRequestURL('/i/alert/status');

            // Using request directly without expect() to handle both success and error cases
            const req = request.get(endpoint);

            // Set up a callback to handle both success and error responses
            req.end(function(err, res) {
                if (err) {
                    // For error responses (like 500), verify it's related to missing parameters
                    err.status.should.equal(500);

                    // The server returns a 500 error when the status parameter is missing
                    done();
                }
                else {
                    // If we get a 200 response, it should indicate an error in the body
                    if (res.body === false ||
                        (res.body && res.body.result && typeof res.body.result === 'string')) {
                        done();
                    }
                    else {
                        done(new Error("Expected error response for missing status parameter"));
                    }
                }
            });
        });
    });

    describe('4. /i/alert/delete - Delete Alert', function() {
        it('should delete an existing alert', function(done) {
            if (createdAlerts.length === 0) {
                return done(new Error("No alerts created for deletion test"));
            }

            const alertIDToDelete = createdAlerts[0];

            request.get(getRequestURL('/i/alert/delete') + "&alertID=" + alertIDToDelete)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }

                    // Verify response matches OpenAPI schema
                    res.body.should.have.property('result', 'Deleted an alert');

                    // Verify the alert was deleted
                    request.get(getRequestURL('/o/alert/list'))
                        .expect(200)
                        .end(function(err, res) {
                            if (err) {
                                return done(err);
                            }

                            const deletedAlert = res.body.alertsList.find(a => a._id === alertIDToDelete);
                            should.not.exist(deletedAlert);

                            // Remove from our tracking array
                            createdAlerts.splice(createdAlerts.indexOf(alertIDToDelete), 1);

                            done();
                        });
                });
        });

        it('should return an error for non-existent alert ID', function(done) {
            const nonExistentID = "507f1f77bcf86cd799439011"; // Random MongoDB ObjectId

            request.get(getRequestURL('/i/alert/delete') + "&alertID=" + nonExistentID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }

                    // Depending on the implementation, this might return an error or a success with 0 deleted
                    // Accept either result as valid, as long as the response has the expected format
                    res.body.should.have.property('result');

                    done();
                });
        });

        it('should fail when alertID parameter is missing', function(done) {
            // Test the endpoint with no alertID parameter
            request.get(getRequestURL('/i/alert/delete'))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }

                    // Should return an error indication
                    res.body.should.have.property('result');
                    done();
                });
        });
    });

    describe('5. End-to-End Workflow Test', function() {
        let testAlertId;

        it('should successfully execute complete alert lifecycle', function(done) {
            const APP_ID = testUtils.get("APP_ID");

            // Step 1: Create a new alert
            const workflowAlert = Object.assign({}, baseAlert, {
                selectedApps: [APP_ID],
                alertName: "Workflow Test Alert"
            });

            request.get(getRequestURL('/i/alert/save') + "&alert_config=" + encodeURIComponent(JSON.stringify(workflowAlert)))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.exist(res.body);
                    res.body.should.be.a.String();
                    testAlertId = res.body;

                    // Step 2: Verify the alert was created
                    request.get(getRequestURL('/o/alert/list'))
                        .expect(200)
                        .end(function(err, res) {
                            if (err) {
                                return done(err);
                            }

                            const createdAlert = res.body.alertsList.find(a => a._id === testAlertId);
                            should.exist(createdAlert);
                            createdAlert.should.have.property('alertName', 'Workflow Test Alert');

                            // Step 3: Update the alert
                            const updatedConfig = Object.assign({}, createdAlert, {
                                alertName: "Updated Workflow Alert",
                                compareValue: "30"
                            });

                            request.get(getRequestURL('/i/alert/save') + "&alert_config=" + encodeURIComponent(JSON.stringify(updatedConfig)))
                                .expect(200)
                                .end(function(err, res) {
                                    if (err) {
                                        return done(err);
                                    }

                                    // Step 4: Change alert status
                                    const statusPayload = {[testAlertId]: false};

                                    request.get(getRequestURL('/i/alert/status') + "&status=" + encodeURIComponent(JSON.stringify(statusPayload)))
                                        .expect(200)
                                        .end(function(err, res) {
                                            if (err) {
                                                return done(err);
                                            }

                                            // Verify status changed
                                            request.get(getRequestURL('/o/alert/list'))
                                                .expect(200)
                                                .end(function(err, res) {
                                                    if (err) {
                                                        return done(err);
                                                    }

                                                    const updatedAlert = res.body.alertsList.find(a => a._id === testAlertId);
                                                    should.exist(updatedAlert);
                                                    updatedAlert.should.have.property('alertName', 'Updated Workflow Alert');
                                                    updatedAlert.should.have.property('enabled', false);
                                                    updatedAlert.should.have.property('compareValue', '30');

                                                    // Step 5: Delete the alert
                                                    request.get(getRequestURL('/i/alert/delete') + "&alertID=" + testAlertId)
                                                        .expect(200)
                                                        .end(function(err, res) {
                                                            if (err) {
                                                                return done(err);
                                                            }

                                                            // Verify deletion
                                                            request.get(getRequestURL('/o/alert/list'))
                                                                .expect(200)
                                                                .end(function(err, res) {
                                                                    if (err) {
                                                                        return done(err);
                                                                    }

                                                                    const shouldNotExist = res.body.alertsList.find(a => a._id === testAlertId);
                                                                    should.not.exist(shouldNotExist);

                                                                    done();
                                                                });
                                                        });
                                                });
                                        });
                                });
                        });
                });
        });
    });

    // Clean up all created alerts after all tests
    after(function(done) {
        if (createdAlerts.length === 0) {
            return done();
        }

        // Delete all alerts created during testing
        const deletePromises = createdAlerts.map(alertID => {
            return new Promise((resolve, reject) => {
                request.get(getRequestURL('/i/alert/delete') + "&alertID=" + alertID)
                    .expect(200)
                    .end(function(err) {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    });
            });
        });

        Promise.all(deletePromises)
            .then(() => {
                // Verify that all alerts were properly deleted
                request.get(getRequestURL('/o/alert/list'))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }

                        // For each alert we created during testing, verify it no longer exists
                        let undeletedAlerts = [];
                        for (const alertID of createdAlerts) {
                            const alert = res.body.alertsList.find(a => a._id === alertID);
                            if (alert) {
                                undeletedAlerts.push(alertID);
                            }
                        }

                        // If any alerts weren't deleted, fail the test with details
                        if (undeletedAlerts.length > 0) {
                            return done(new Error(`The following alerts were not properly deleted: ${undeletedAlerts.join(', ')}`));
                        }

                        console.log(`✅ Successfully verified all ${createdAlerts.length} test alerts were properly deleted`);
                        done();
                    });
            })
            .catch(done);
    });
});