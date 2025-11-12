var should = require('should');
var countlyConfig = require("../frontend/express/config.js");
var common = require('../api/utils/common.js');
const reqq = require('supertest');
should.Assertion.add('haveSameItems', function(other) {
    this.params = { operator: 'to be have same items' };

    this.obj.forEach(item => {
    //both arrays should at least contain the same items
        other.should.containEql(item);
    });
    // both arrays need to have the same number of items
    this.obj.length.should.be.equal(other.length);
});

if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function(str) {
        return this.slice(0, str.length) == str;
    };
}

if (typeof String.prototype.endsWith != 'function') {
    String.prototype.endsWith = function(str) {
        return this.slice(-str.length) == str;
    };
}
var testUtils = function testUtils() {
    var csrf;
    var apiKey;
    var isLoggedIn = false;
    var that = this;
    var props = {
        APP_ID: process.env.COUNTLY_TEST_APP_ID || "",
        APP_KEY: process.env.COUNTLY_TEST_APP_KEY || "",
        API_KEY_ADMIN: process.env.COUNTLY_TEST_API_KEY_ADMIN || ""
    };
    var RE = /^-{0,1}\d*\.{0,1}\d+$/;

    this.url = (process.env.COUNTLY_CONFIG_PROTOCOL || "http") + "://" + (process.env.COUNTLY_CONFIG_HOSTNAME || "localhost") + (countlyConfig.path || "");
    this.name = "Test Test";
    this.username = "test";
    this.password = "Test1test$";
    this.email = "test@domain.com";
    this.permission = {
        "_": {
            "u": [],
            "a": []
        }
    };
    this.testScalingFactor = 1.5;//this is used to multiply the base timeout time for tests. Should be decreased of more powerful servers
    this.testWaitTimeForDrillEvents = 5300;//in ms, how long should the test wait for drill to finish it's actions
    this.testWaitTimeForResetApp = 1200;//in ms, how long should the test wait for a app reset
    this.weakPassword = "20202020";
    this.setCSRF = function(token) {
        csrf = token;
    };

    this.CSRFfromBody = function(body) {
        //var rePattern = new RegExp(/countlyGlobal\["csrf_token"\] = "([^"]*)";/);
        var rePattern = new RegExp(/value="([^"]*)" name="_csrf"/);
        var arrMatches = body.match(rePattern);
        if (!arrMatches || !arrMatches[1]) {
            rePattern = new RegExp(/value=([^\s]*) name=_csrf/);
            arrMatches = body.match(rePattern);
        }
        csrf = arrMatches[1];
        return csrf;
    };

    this.getCSRF = function() {
        return csrf;
    };

    this.waitCSRF = function(done) {
        if (csrf) {
            done();
        }
        else {
            setTimeout(function() {
                that.waitCSRF(done);
            }, 1000);
        }
    };

    this.getApiKey = function(agent) {
        agent
            .get('/api-key')
            .auth(this.username, this.password)
            .end(function(err, res) {
                apiKey = res.text;
            });
    };

    this.waitApiKey = function(done) {
        if (apiKey) {
            done();
        }
        else {
            setTimeout(function() {
                that.waitApiKey(done);
            }, 1000);
        }
    };

    this.loadCSRF = function(agent, done) {
        agent
            .get('/dashboard')
            .expect(200)
            .end(function(err, res) {
                var rePattern = new RegExp(/countlyGlobal\["csrf_token"\] = "([^"]*)";/);
                var arrMatches = res.text.match(rePattern);
                csrf = arrMatches[1];
                done();
            });
    };

    this.login = function(agent) {
        agent
            .get('/login')
            .expect('Content-Type', "text/html; charset=utf-8")
            .expect(200)
            .end(function(err, res) {
                that.CSRFfromBody(res.text);
                //bug in superagent not saving cookies before callback
                process.nextTick(function() {
                    agent
                        .post('/login')
                        .send({username: that.username, password: that.password, _csrf: that.getCSRF()})
                        .expect('location', '/dashboard')
                        .expect(302)
                        .end(function(err, res) {
                            isLoggedIn = true;
                        });
                });
            });
    };

    this.logout = function() {
        isLoggedIn = false;
    };

    this.waitLogin = function(done) {
        if (isLoggedIn) {
            done();
        }
        else {
            setTimeout(function() {
                that.waitLogin(done);
            }, 1000);
        }
    };

    this.getLinkType = function(link) {
        if (link.endsWith(".js")) {
            return "application/javascript";
        }
        else if (link.endsWith(".css")) {
            return "text/css; charset=UTF-8";
        }
        else if (link.endsWith(".png")) {
            return "image/png";
        }
        return "text/html; charset=utf-8";
    };

    this.get = function(key) {
        return props[key];
    };

    this.set = function(key, val) {
        props[key] = val;
    };

    function recheckDeletion(retry, db, callback) {
        db.collection("mutation_manager").countDocuments({ type: 'delete', status: { $ne: "completed" }}, function(err, count) {
            if (err) {
                callback(err);
            }
            else if (count === 0) {
                callback();
            }
            else {
                console.log("Records existing:" + count);
                if (retry > 0) {
                    console.log("Waiting for deletions to finish... retries left: " + retry);
                    setTimeout(function() {
                        recheckDeletion(retry - 1, db, callback);
                    }, 5000);
                }
                else {
                    callback();
                }
            }
        });
    }
    this.triggerJobToRun = function(jobName, callback) {
        if (jobName === "api:deletionManagerJob") {
            jobName = "api:mutationManagerJob";
        }
        var request = reqq(this.url);
        var self = this;
        request.get("/jobs/i?jobName=" + encodeURIComponent(jobName) + "&action=runNow&api_key=" + props.API_KEY_ADMIN)
            .expect(200)
            .end(function(err, res) {
                if (res && res.text) {
                    console.log(res.text);
                }
                else {
                    console.log("No response text");
                    console.log(JSON.stringify(res));
                }
                if (jobName === "api:mutationManagerJob") {
                    recheckDeletion(5, self.db, callback);
                }
                else {
                    callback(err);
                }
            });
    };

    this.triggerMergeProcessing = function(callback) {
        //Update lu in all app_user_merge documents to allow processing
        var date = Math.round(new Date().getTime() / 1000) - 100;
        var self = this;
        this.db.collection("app_user_merges").updateMany({}, {$set: {lu: date}}, function(err, res) {
            if (err) {
                callback(err);
            }
            else {
                self.triggerJobToRun("api:userMerge", callback);
            }
        });
    };
    this.validateBreakdownTotalsInDrillData = function(db, options, callback) {
        var match = options.query || {};
        if (options.app_id) {
            match["a"] = options.app_id;
        }
        if (options.event) {
            if (options.event.indexOf("[CLY]_") !== 0) {
                match["e"] = "[CLY]_custom";
                match["n"] = options.event;
            }
            else {
                match["e"] = options.event;
            }
        }
        if (options.name) {
            match["n"] = options.name;
        }


        if (options.period) {
            var periodObj = common.getPeriodObj(options.period);
            match["ts"] = {"$gte": periodObj.start, "$lt": periodObj.end};
        }

        var pipeline = [{"$match": match}];
        var iid = {"uid": "$uid"};
        var iid2 = "$_id.k0";
        for (var k = 0;k < options.breakdownKeys.length; k++) {
            pipeline.push({"$unwind": "$" + options.breakdownKeys[k]});
            iid["k" + k] = "$" + options.breakdownKeys[k];
        }
        pipeline.push({"$addFields": {"n": {"$cond": [{"$eq": ["$up.ls", "$up.fs"]}, 1, 0]}}});
        pipeline.push({"$group": {"_id": iid, "t": {"$sum": 1}, "ls": {"$min": "$up.ls"}, n: {"$max": "$n"}, "fs": {"$min": "$up.fs"}}});

        pipeline.push({"$group": {"_id": iid2, "n": {"$sum": 1}, "u": {"$sum": 1}, "t": {"$sum": "$t"}, "fs": {"$min": "$fs"}, "ls": {"$min": "$ls"}}});
        if (options.event === "[CLY]_session") {
            var pipeline2 = JSON.parse(JSON.stringify(pipeline));
            pipeline2[0]["$match"]["e"] = "[CLY]_session_begin";
            pipeline.push({"$unionWith": {coll: "drill_events", pipeline: pipeline2}});
            pipeline.push({"$group": {"_id": "$_id", "n": {"$max": "$n"}, "u": {"$max": "$u"}, "t": {"$max": "$t"}, "fs": {"$min": "$fs"}, "ls": {"$min": "$ls"}}});
        }
        db.collection("drill_events").aggregate(pipeline, function(err, res) {
            console.log(res);
            if (err) {
                callback(err);
            }
            else {
                res = res || [];

                var resMapped = {};
                for (var i = 0; i < res.length; i++) {
                    resMapped[res[i]._id] = res[i];
                }
                var errors = [];
                if (Object.keys(resMapped).length != Object.keys(options.values).length) {
                    errors.push("Expected " + Object.keys(options.values).length + " breakdowns but found " + Object.keys(resMapped).length);
                }
                for (var key in options.values) {
                    if (!resMapped[key]) {
                        errors.push("Expected breakdown " + key + " not found");
                    }
                    else {
                        for (var mm in options.values[key]) {
                            if (resMapped[key][mm] !== options.values[key][mm]) {
                                errors.push("Expected " + mm + " to be " + options.values[key][mm] + " but found " + resMapped[key][mm]);
                            }
                        }
                    }
                }

                if (errors.length > 0) {
                    callback(errors.join(","));
                }
                else {
                    callback();
                }

            }
        });
    };


    this.validateTotalsInDrillData = function(db, options, callback) {
        var match = options.query || {};
        if (options.app_id) {
            match["a"] = options.app_id;
        }
        if (options.event) {
            if (options.event.indexOf("[CLY]_") !== 0) {
                match["e"] = "[CLY]_custom";
                match["n"] = options.event;
            }
            else {
                match["e"] = options.event;
            }
        }
        if (options.name) {
            match["n"] = options.name;
        }


        if (options.period) {
            var periodObj = common.getPeriodObj(options.period);
            match["ts"] = {"$gte": periodObj.start, "$lt": periodObj.end};
        }

        var pipeline = [{"$match": match}];
        options.values = options.values || {};
        pipeline.push({"$group": {"_id": "$uid", "t": {"$sum": "$c"}, "ls": {"$min": "$up.ls"}, "fs": {"$min": "$up.fs"}}});
        pipeline.push({"$group": {"_id": null, "u": {"$sum": 1}, "t": {"$sum": "$t"}, "fs": {"$min": "$fs"}, "ls": {"$min": "$ls"}}});
        if (options.event === "[CLY]_session") {
            var pipeline2 = JSON.parse(JSON.stringify(pipeline));
            pipeline2[0]["$match"]["e"] = "[CLY]_session_begin";
            pipeline.push({"$unionWith": {coll: "drill_events", pipeline: pipeline2}});
            pipeline.push({"$group": {"_id": null, "u": {"$max": "$u"}, "t": {"$max": "$t"}, "fs": {"$min": "$fs"}, "ls": {"$min": "$ls"}}});
        }
        console.log(JSON.stringify(pipeline));
        db.collection("drill_events").aggregate(pipeline, function(err, res) {
            console.log(res);
            if (err) {
                callback(err);
            }
            else {
                res = res || [];
                res = res[0] || {};
                var errors = [];
                if (res.fs && res.fs === res.ls) {
                    res.n = 1;
                }
                for (var mm in options.values) {
                    if (options.values[mm] && res[mm] !== options.values[mm]) {
                        errors.push("Expected " + mm + " to be " + options.values[mm] + " but found " + res[mm]);
                    }
                }
                if (errors.length > 0) {
                    callback(errors.join(","));
                }
                else {
                    callback();
                }
            }
        });
    };

    this.validateSessionData = function(err, res, done, correct) {
        if (err) {
            return done(err);
        }
        var ob = JSON.parse(res.text);
        ob.should.not.be.empty;
        ob.should.have.property("meta", correct.meta);
        //ob.should.have.property("meta", {"countries":["Unknown"],"f-ranges":["0"],"l-ranges":["0"]});
        for (var i in ob) {
            if (i != "meta") {
                ob.should.have.property(i).and.not.eql({});
                if (RE.test(i)) {
                    for (var c in correct) {
                        if (c == "Unknown") {
                            ob[i].should.have.property(c, {"u": correct.u, "t": correct.t, "n": correct.n});
                        }
                        else if (c != "meta") {
                            ob[i].should.have.property(c, correct[c]);
                        }
                    }
                    for (var j in ob[i]) {
                        if (RE.test(j)) {
                            for (var c in correct) {
                                if (c == "Unknown") {
                                    ob[i][j].should.have.property(c, {"u": correct.u, "t": correct.t, "n": correct.n});
                                }
                                else if (c != "meta") {
                                    ob[i][j].should.have.property(c, correct[c]);
                                }
                            }
                            for (var k in ob[i][j]) {
                                if (RE.test(k)) {
                                    for (var c in correct) {
                                        if (c == "Unknown") {
                                            ob[i][j][k].should.have.property(c, {"u": correct.u, "t": correct.t, "n": correct.n});
                                        }
                                        else if (c != "meta") {
                                            ob[i][j][k].should.have.property(c, correct[c]);
                                        }
                                    }
                                }
                            }
                        }
                        else if (j.indexOf("w") == 0) {
                            var w = {};
                            if (correct.u) {
                                w["u"] = correct.u;
                            }
                            if (correct.f) {
                                w["f"] = correct.f;
                            }
                            if (correct.l) {
                                w["l"] = correct.l;
                            }
                            if (correct.ds) {
                                w["ds"] = correct.ds;
                            }
                            if (correct.p) {
                                w["p"] = correct.p;
                            }
                            if (correct.Unknown) {
                                w["Unknown"] = {"u": correct.u};
                            }
                            ob[i].should.have.property(j, w);
                        }
                    }
                }
            }
        }
        done();
    };

    this.validateDashboard = function(err, res, done, correct) {
        function compare(a, b) {
            if (a.last_nom < b.last_nom) {
                return -1;
            }
            if (a.last_nom > b.last_nom) {
                return 1;
            }
            return 0;
        }
        if (err) {
            return done(err);
        }
        var ob = JSON.parse(res.text);
        var props = ['30days', '7days', 'today'];
        var prop;
        for (var i = 0; i < props.length; i++) {
            prop = props[i];
            ob.should.have.property(prop);
            var period = ob[prop];
            period.should.have.property("dashboard");
            var dashboard = period["dashboard"];
            dashboard.should.have.property("total_sessions", {"total": correct.total_sessions, "change": "NA", "trend": "u"});
            if (prop != "today" && correct.total_users == 0) {
                dashboard.should.have.property("total_users", {"total": correct.total_users, "change": "NA", "trend": "u", "is_estimate": true});
            }
            else {
                dashboard.should.have.property("total_users", {"total": correct.total_users, "change": "NA", "trend": "u", "is_estimate": false});
            }
            dashboard.should.have.property("new_users", {"total": correct.new_users, "change": "NA", "trend": "u"});
            dashboard.should.have.property("total_time", {"total": correct.total_time, "change": "NA", "trend": "u"});
            if (correct.avg_time) {
                dashboard.should.have.property("avg_time", {"total": correct.avg_time, "change": "NA", "trend": "u"});
            }
            if (correct.avg_requests) {
                dashboard.should.have.property("avg_requests", {"total": correct.avg_requests, "change": "NA", "trend": "u"});
            }
            period.should.have.property("top");
            var top = period["top"];
            top.platforms.sort();
            top.resolutions.sort();
            top.carriers.sort();
            top.should.have.property("platforms", correct.platforms.sort(compare));
            top.should.have.property("resolutions", correct.resolutions.sort(compare));
            top.should.have.property("carriers", correct.carriers.sort(compare));
            top.should.have.property("users");
            period.should.have.property("period");
        }
        done();
    };

    this.validateCountries = function(err, res, done, correct) {
        if (err) {
            return done(err);
        }
        var ob = JSON.parse(res.text);
        ob.should.not.be.empty;
        var props = ['30days', '7days', 'today'];
        var key;
        for (var j = 0; j < props.length; j++) {
            key = props[j];
            ob.should.have.property(key).and.not.empty;
            for (var i = ob[key].length - 1; i >= 0; i--) {
                ob[key][i].should.have.property("country", correct.country);
                ob[key][i].should.have.property("code", correct.code);
                ob[key][i].should.have.property("t", correct.t);
                if (key == "today") {
                    ob[key][i].should.have.property("u", correct.u);
                }
                ob[key][i].should.have.property("n", correct.n);
            }
        }
        done();
    };

    this.validateMetrics = function(err, res, done, correct) {
        if (err) {
            return done(err);
        }
        var ob = JSON.parse(res.text);
        ob.should.not.be.empty;
        if (ob["meta"]) {
            for (var i in ob["meta"]) {
                ob["meta"][i].sort();
            }
        }
        if (correct["meta"]) {
            for (var i in correct["meta"]) {
                correct["meta"][i].sort();
            }
        }
        ob.should.have.property("meta").eql(correct.meta);
        for (var i in ob) {
            ob.should.have.property(i).and.not.eql({});
            if (RE.test(i)) {
                for (var c in correct) {
                    if (c != "meta") {
                        ob[i].should.have.property(c, correct[c]);
                    }
                }
                for (var j in ob[i]) {
                    if (RE.test(j)) {
                        for (var c in correct) {
                            if (c != "meta") {
                                ob[i][j].should.have.property(c, correct[c]);
                            }
                        }
                        for (var k in ob[i][j]) {
                            if (RE.test(k)) {
                                for (var c in correct) {
                                    if (c != "meta") {
                                        ob[i][j][k].should.have.property(c, correct[c]);
                                    }
                                }
                            }
                        }
                    }
                    else if (j.indexOf("w") == 0) {
                        var w = {};
                        for (var c in correct) {
                            if (c != "meta") {
                                w[c] = {u: correct[c].u};
                            }
                        }
                        ob[i].should.have.property(j, w);
                    }
                }
            }
        }
        done();
    };

    this.validateEvents = function(err, res, done, correct, refresh) {
        if (err) {
            return done(err);
        }
        var ob = JSON.parse(res.text);
        ob.should.not.be.empty;
        if (correct.meta) {
            for (var i in ob.meta) {
                ob.meta[i].sort();
            }
            ob.should.have.property("meta", correct.meta);
        }
        for (var i in ob) {
            if (i != "meta") {
                ob.should.have.property(i).and.not.eql({});
                if (RE.test(i)) {
                    if (!refresh) {
                        for (var c in correct) {
                            if (c != "meta") {
                                if (c == "s") {
                                    ob[i].should.have.property(c);
                                    ob[i][c].should.be.approximately(correct[c], 0.0001);
                                }
                                else {
                                    ob[i].should.have.property(c, correct[c]);
                                }
                            }
                        }
                    }
                    for (var j in ob[i]) {
                        if (RE.test(j)) {
                            if (!refresh) {
                                for (var c in correct) {
                                    if (c != "meta") {
                                        if (c == "s") {
                                            ob[i][j].should.have.property(c);
                                            ob[i][j][c].should.be.approximately(correct[c], 0.0001);
                                        }
                                        else {
                                            ob[i][j].should.have.property(c, correct[c]);
                                        }
                                    }
                                }
                            }
                            for (var k in ob[i][j]) {
                                if (RE.test(k)) {
                                    for (var c in correct) {
                                        if (c != "meta") {
                                            if (c == "s") {
                                                ob[i][j][k].should.have.property(c);
                                                ob[i][j][k][c].should.be.approximately(correct[c], 0.0001);
                                            }
                                            else {
                                                ob[i][j][k].should.have.property(c, correct[c]);
                                            }
                                        }
                                    }
                                    var totals = {};
                                    for (var n in ob[i][j][k]) {
                                        if (RE.test(n)) {
                                            for (var m in ob[i][j][k][n]) {
                                                if (!totals[m]) {
                                                    totals[m] = 0;
                                                }
                                                totals[m] += ob[i][j][k][n][m];
                                            }
                                        }
                                    }
                                    if (Object.keys(totals).length) {
                                        //totals for hours should match
                                        for (var c in correct) {
                                            if (c != "meta") {
                                                if (c == "s") {
                                                    totals.should.have.property(c);
                                                    totals[c].should.be.approximately(correct[c], 0.0001);
                                                }
                                                else {
                                                    totals.should.have.property(c, correct[c]);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        done();
    };

    this.sleep = function(timeToSleepInMs = 5000) {
        return new Promise(function(resolve) {
            setTimeout(resolve, timeToSleepInMs);
        });
    };

    /**
     * Reloads the ClickHouse identity dictionary (uid_map_dict).
     * This forces immediate reload of the dictionary instead of waiting for automatic refresh.
     * Useful in tests when you need immediate propagation of uid mapping changes.
     * @param {Function} callback - Callback function to call when reload is complete
     */
    this.reloadIdentityDictionary = function(callback) {
        try {
            const clickhouseApi = require('../plugins/clickhouse/api/api.js');
            const client = clickhouseApi.getClient();

            if (!client) {
                return callback(new Error('ClickHouse client not available'));
            }

            const Identity = require('../plugins/clickhouse/api/users/Identity.js');
            const identity = new Identity(client);

            identity.reloadDictionary()
                .then(() => {
                    console.log('Identity dictionary reloaded successfully');
                    callback();
                })
                .catch((err) => {
                    console.error('Failed to reload identity dictionary:', err);
                    callback(err);
                });
        }
        catch (err) {
            console.error('Error setting up identity dictionary reload:', err);
            callback(err);
        }
    };
};

module.exports = new testUtils();