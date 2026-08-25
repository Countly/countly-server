var request = require('supertest');
var should = require('should');
var crypto = require('crypto');
var moment = require('moment-timezone');
var testUtils = require("../../test/testUtils");
var pluginManager = require("../../plugins/pluginManager.js");
var Promise = require("bluebird");
request = request(testUtils.url);


const newAlert = {"alertName": "test", "alertDataType": "metric", "alertDataSubType": "Total users", "compareType": "increased by at least", "compareValue": "1", "selectedApps": [], "period": "every 1 hour on the 59th min", "alertBy": "email", "enabled": true, "compareDescribe": "Total users increased by at least 1%", "alertValues": ["a@a.com"]};
const alerts = [];

function getRequestURL(path) {
    const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
    const APP_ID = testUtils.get("APP_ID");
    return path + `?api_key=${API_KEY_ADMIN}&app_id=${APP_ID}`;
}

describe('Testing Alert', function() {
    describe('Testing Alert CRUD', function() {
        describe('Create Alert', function() {
            it('should create alert with valid params', function(done) {
                const APP_ID = testUtils.get("APP_ID");
                const alertConfig = Object.assign({}, newAlert, {selectedApps: [APP_ID]});

                request.get(getRequestURL('/i/alert/save') + "&alert_config=" + encodeURIComponent(JSON.stringify(alertConfig)))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        done();
                    });
            });
        });

        describe('Read alert', function() {
            it('should read alerts with valid params', function(done) {
                request.get(getRequestURL('/o/alert/list'))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        res.body.should.have.property("alertsList");
                        res.body.alertsList.forEach((r) => {
                            alerts.push(r);
                        });
                        alerts.length.should.be.above(0);
                        done();
                    });
            });
        });

        describe('Update alert', function() {
            it('should update alert with valid params', function(done) {
                const alertID = alerts[0]._id;
                const alertConfig = Object.assign({}, alerts[0]);
                alertConfig.alertName = "test2";
                request.get(getRequestURL('/i/alert/save') + "&alert_config=" + encodeURIComponent(JSON.stringify(alertConfig)))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        request.get(getRequestURL('/o/alert/list'))
                            .expect(200)
                            .end(function(err, res) {
                                if (err) {
                                    return done(err);
                                }
                                res.body.should.have.property("alertsList");
                                res.body.alertsList.forEach((r) =>{
                                    if (r._id === alertID) {
                                        r.should.have.property('alertName', 'test2');
                                        done();
                                    }
                                });

                            });
                    });
            });

            it('should able to change alert status', function(done) {
                const alertID = alerts[0]._id;
                const payload = {[alertID]: false};
                request.get(getRequestURL('/i/alert/status') + "&status=" + encodeURIComponent(JSON.stringify(payload)))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        request.get(getRequestURL('/o/alert/list'))
                            .expect(200)
                            .end(function(err, res) {
                                if (err) {
                                    return done(err);
                                }
                                res.body.should.have.property("alertsList");
                                res.body.alertsList.forEach((r) =>{
                                    if (r._id === alertID) {
                                        r.should.have.property('enabled', false);
                                        done();
                                    }
                                });

                            });
                    });
            });
        });

        describe('Delete Alert', function() {
            it('should able to delete alert', function(done) {
                const alertID = alerts[0]._id;
                request.get(getRequestURL('/i/reports/delete') + "&alertID=" + alertID)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        done();
                    });
            });
        });
    });


});


// Regression tests for authorization of the apps an alert targets.
//
// The endpoints authorize the caller against params.qstring.app_id, and the create path
// checks the submitted selectedApps. Neither says anything about the apps the *stored*
// alert points at, and an update may omit selectedApps to keep whatever is stored. So a
// member who created an alert for one app, then lost access to it while keeping alerts
// rights elsewhere, could still edit and re-enable that alert by sending the request with
// the app they do still hold.
//
// Both directions are covered here. The point of the fix is not only that the exploit
// stops working, but that everything a member is entitled to do still does.
describe('Testing Alert app authorization', function() {
    var API_KEY_ADMIN = "";
    var APP_A = "";
    var APP_B = "";
    var memberApiKey = "";
    var memberId = "";
    var alertOnA = "";
    var alertOnB = "";
    var uniq = Date.now();

    /**
     * Build an alert config
     * @param {object} over - fields to override
     * @returns {object} alert config
     */
    function alertFor(over) {
        return Object.assign({
            alertName: "authz-" + uniq,
            alertDataType: "metric",
            alertDataSubType: "Total users",
            compareType: "increased by at least",
            compareValue: "1",
            period: "every 1 hour on the 59th min",
            alertBy: "email",
            enabled: false,
            compareDescribe: "Total users increased by at least 1%",
            alertValues: ["authz-" + uniq + "@mail.test"]
        }, over);
    }

    /**
     * Set the member's alerts permissions to exactly the given apps
     * @param {Array} apps - app ids to grant
     * @param {function} cb - callback
     * @returns {void}
     */
    function grantAlertsOn(apps, cb) {
        var permission = {_: {a: [], u: [apps]}, c: {}, r: {}, u: {}, d: {}};
        apps.forEach(function(a) {
            permission.c[a] = {all: false, allowed: {alerts: true}};
            permission.r[a] = {all: false, allowed: {alerts: true}};
            permission.u[a] = {all: false, allowed: {alerts: true}};
            permission.d[a] = {all: false, allowed: {alerts: true}};
        });
        request.get('/i/users/update?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify({user_id: memberId, permission: permission})))
            .end(function() {
                cb();
            });
    }

    it('should set up two apps and a member with alerts rights on both', function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        APP_A = testUtils.get("APP_ID");
        request.get('/i/apps/create?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify({name: "authzAppB" + uniq, country: "TR", type: "mobile", category: "6", timezone: "Europe/Istanbul"})))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                APP_B = res.body._id;
                should.exist(APP_B);
                var permission = {_: {a: [], u: [[APP_A, APP_B]]}, c: {}, r: {}, u: {}, d: {}};
                [APP_A, APP_B].forEach(function(a) {
                    permission.c[a] = {all: false, allowed: {alerts: true}};
                    permission.r[a] = {all: false, allowed: {alerts: true}};
                    permission.u[a] = {all: false, allowed: {alerts: true}};
                    permission.d[a] = {all: false, allowed: {alerts: true}};
                });
                var userParams = {
                    full_name: "alertauthz" + uniq,
                    username: "alertauthz" + uniq,
                    password: "p4ssw0rD!",
                    email: "alertauthz" + uniq + "@mail.test",
                    permission: permission
                };
                request.get('/i/users/create?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify(userParams)))
                    .expect(200)
                    .end(function(e, r) {
                        if (e) {
                            return done(e);
                        }
                        memberApiKey = r.body.api_key;
                        memberId = r.body._id;
                        should.exist(memberApiKey);
                        done();
                    });
            });
    });

    it('should let the member create an alert on each app while they have both', function(done) {
        request.get('/i/alert/save?api_key=' + memberApiKey + '&app_id=' + APP_A + '&alert_config=' + encodeURIComponent(JSON.stringify(alertFor({selectedApps: [APP_A]}))))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                alertOnA = (res.body && (res.body._id || res.body)) + "";
                should.exist(alertOnA);
                request.get('/i/alert/save?api_key=' + memberApiKey + '&app_id=' + APP_B + '&alert_config=' + encodeURIComponent(JSON.stringify(alertFor({selectedApps: [APP_B], alertName: "authzB-" + uniq}))))
                    .expect(200)
                    .end(function(e, r) {
                        if (e) {
                            return done(e);
                        }
                        alertOnB = (r.body && (r.body._id || r.body)) + "";
                        should.exist(alertOnB);
                        done();
                    });
            });
    });

    it('should revoke access to the first app, keeping alerts rights on the second', function(done) {
        grantAlertsOn([APP_B], function() {
            done();
        });
    });

    // the exploit

    it('should refuse to update the revoked app alert through the app still held', function(done) {
        // selectedApps is omitted on purpose: that is what kept the stored target and
        // skipped the submitted-apps guard
        var payload = {_id: alertOnA, alertValues: ["attacker-" + uniq + "@mail.test"], compareValue: "0"};
        request.get('/i/alert/save?api_key=' + memberApiKey + '&app_id=' + APP_B + '&alert_config=' + encodeURIComponent(JSON.stringify(payload)))
            .expect(403)
            .end(function(err) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('should refuse to enable the revoked app alert', function(done) {
        var status = {};
        status[alertOnA] = true;
        request.get('/i/alert/status?api_key=' + memberApiKey + '&app_id=' + APP_B + '&status=' + encodeURIComponent(JSON.stringify(status)))
            .expect(403)
            .end(function(err) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('should not have changed the alert despite the attempts', function(done) {
        request.get('/o/alert/list?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_A)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var list = (res.body && res.body.alertsList) || [];
                var found = list.filter(function(a) {
                    return a._id + "" === alertOnA;
                })[0];
                should.exist(found);
                found.enabled.should.not.equal(true);
                JSON.stringify(found.alertValues).should.not.match(/attacker-/);
                done();
            });
    });

    it('should still hide the revoked app alert from the member list', function(done) {
        request.get('/o/alert/list?api_key=' + memberApiKey + '&app_id=' + APP_B)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var list = (res.body && res.body.alertsList) || [];
                list.filter(function(a) {
                    return a._id + "" === alertOnA;
                }).length.should.equal(0);
                done();
            });
    });

    // the happy paths, which have to keep working

    it('should still let the member update their own alert on the app they hold', function(done) {
        var payload = {_id: alertOnB, compareValue: "7"};
        request.get('/i/alert/save?api_key=' + memberApiKey + '&app_id=' + APP_B + '&alert_config=' + encodeURIComponent(JSON.stringify(payload)))
            .expect(200)
            .end(function(err) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('should still let the member enable and disable their own alert', function(done) {
        var on = {};
        on[alertOnB] = true;
        request.get('/i/alert/status?api_key=' + memberApiKey + '&app_id=' + APP_B + '&status=' + encodeURIComponent(JSON.stringify(on)))
            .expect(200)
            .end(function(err) {
                if (err) {
                    return done(err);
                }
                var off = {};
                off[alertOnB] = false;
                request.get('/i/alert/status?api_key=' + memberApiKey + '&app_id=' + APP_B + '&status=' + encodeURIComponent(JSON.stringify(off)))
                    .expect(200)
                    .end(function(e) {
                        if (e) {
                            return done(e);
                        }
                        done();
                    });
            });
    });

    it('should still let the member create a new alert on the app they hold', function(done) {
        request.get('/i/alert/save?api_key=' + memberApiKey + '&app_id=' + APP_B + '&alert_config=' + encodeURIComponent(JSON.stringify(alertFor({selectedApps: [APP_B], alertName: "authzB2-" + uniq}))))
            .expect(200)
            .end(function(err) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('should let the member switch OFF the revoked app alert, so they are not stuck with it', function(done) {
        // deliberately allowed: disabling only reduces what the alert does, and refusing
        // would leave them unable to stop mail they no longer want
        var off = {};
        off[alertOnA] = false;
        request.get('/i/alert/status?api_key=' + memberApiKey + '&app_id=' + APP_B + '&status=' + encodeURIComponent(JSON.stringify(off)))
            .expect(200)
            .end(function(err) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('should let a global admin update and enable any alert', function(done) {
        var payload = {_id: alertOnA, compareValue: "3"};
        request.get('/i/alert/save?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_A + '&alert_config=' + encodeURIComponent(JSON.stringify(payload)))
            .expect(200)
            .end(function(err) {
                if (err) {
                    return done(err);
                }
                var on = {};
                on[alertOnA] = true;
                request.get('/i/alert/status?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_A + '&status=' + encodeURIComponent(JSON.stringify(on)))
                    .expect(200)
                    .end(function(e) {
                        if (e) {
                            return done(e);
                        }
                        done();
                    });
            });
    });

    it('should let the member delete the revoked app alert they own', function(done) {
        // also deliberately allowed: deleting cannot reach another app's data, and the
        // owner needs a way to clean up
        request.get('/i/alert/delete?api_key=' + memberApiKey + '&app_id=' + APP_B + '&alertID=' + alertOnA)
            .expect(200)
            .end(function(err) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    after(function(done) {
        request.get('/o/alert/list?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_A)
            .end(function(listErr, listRes) {
                var list = ((listRes && listRes.body && listRes.body.alertsList) || []).filter(function(a) {
                    return typeof a.alertName === "string" && a.alertName.indexOf("" + uniq) > -1;
                });
                var pending = list.length;
                /**
                 * remove the member and the extra app once alerts are gone
                 * @returns {void}
                 */
                function cleanupRest() {
                    request.get('/i/users/delete?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify({user_ids: [memberId]})))
                        .end(function() {
                            if (!APP_B) {
                                return done();
                            }
                            request.get('/i/apps/delete?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify({app_id: APP_B})))
                                .end(function() {
                                    done();
                                });
                        });
                }
                if (!pending) {
                    return cleanupRest();
                }
                list.forEach(function(a) {
                    request.get('/i/alert/delete?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_A + '&alertID=' + a._id)
                        .end(function() {
                            pending--;
                            if (!pending) {
                                cleanupRest();
                            }
                        });
                });
            });
    });
});
