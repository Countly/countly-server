var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

// A token limited to one app authenticates as its owner, and long tasks are matched to
// their creator by member id. The task endpoints must still keep the token to its app:
// the owner's tasks on other apps are neither listed, counted nor readable with it.
describe('Long tasks with a token limited to one app', function() {
    var API_KEY_ADMIN = "";
    var APP_ID = "";
    var APP_ID2 = "";
    var token = "";
    var marker = "scoped-token-tasks-" + Date.now();
    var taskOnApp = marker + "-a";
    var taskOnOtherApp = marker + "-b";

    before(function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        APP_ID = testUtils.get("APP_ID");
        request
            .get('/i/apps/create?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({name: "Scoped token tasks app"}))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                APP_ID2 = JSON.parse(res.text)._id;
                done();
            });
    });

    before(function(done) {
        var permission = {_: {a: [], u: [[APP_ID]]}, c: {}, r: {}, u: {}, d: {}};
        permission.r[APP_ID] = {all: false, allowed: {core: true}};
        request
            .get('/i/token/create?api_key=' + API_KEY_ADMIN + '&purpose=tasks&multi=true&ttl=3600&permission=' + encodeURIComponent(JSON.stringify(permission)))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                token = JSON.parse(res.text).result;
                done();
            });
    });

    before(async function() {
        var owner = await testUtils.db.collection("members").findOne({api_key: API_KEY_ADMIN}, {projection: {_id: 1}});
        var base = {ts: Date.now(), start: Date.now(), end: Date.now(), status: "completed", type: "tableExport", creator: owner._id + "", global: false, report_name: marker, request: "{}"};
        await testUtils.db.collection("long_tasks").insertMany([
            Object.assign({}, base, {_id: taskOnApp, app_id: APP_ID}),
            Object.assign({}, base, {_id: taskOnOtherApp, app_id: APP_ID2})
        ]);
    });

    after(async function() {
        await testUtils.db.collection("long_tasks").deleteMany({_id: {$in: [taskOnApp, taskOnOtherApp]}});
        await request.get('/i/token/delete?api_key=' + API_KEY_ADMIN + '&tokenid=' + token);
        await request.get('/i/apps/delete?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({app_id: APP_ID2}));
    });

    /**
     * Lists the test tasks with a credential
     * @param {string} credential - api_key=... or auth_token=...
     * @param {function} done - callback with the listed task ids
     */
    function listTasks(credential, done) {
        request
            .get('/o/tasks/list?' + credential + '&app_id=' + APP_ID + '&data_source=all&iDisplayStart=0&iDisplayLength=50&sSearch=' + marker)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                done(null, JSON.parse(res.text).aaData.map(function(task) {
                    return task._id;
                }).sort());
            });
    }

    it('the owner lists its tasks on both apps', function(done) {
        listTasks('api_key=' + API_KEY_ADMIN, function(err, ids) {
            if (err) {
                return done(err);
            }
            ids.should.eql([taskOnApp, taskOnOtherApp]);
            done();
        });
    });

    it('the token lists only the task on its app', function(done) {
        listTasks('auth_token=' + token, function(err, ids) {
            if (err) {
                return done(err);
            }
            ids.should.eql([taskOnApp]);
            done();
        });
    });

    it('the token counts only tasks on its app', function(done) {
        request
            .get('/o/tasks/count?auth_token=' + token + '&app_id=' + APP_ID + '&query=' + encodeURIComponent(JSON.stringify({report_name: marker})))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var counts = JSON.parse(res.text);
                counts.should.eql([{_id: APP_ID, c: 1}]);
                done();
            });
    });

    it('the token reads the task on its app', function(done) {
        request
            .get('/o/tasks/task?auth_token=' + token + '&app_id=' + APP_ID + '&task_id=' + taskOnApp)
            .expect(200)
            .end(done);
    });

    it('the token cannot read the task on the other app', function(done) {
        request
            .get('/o/tasks/task?auth_token=' + token + '&app_id=' + APP_ID + '&task_id=' + taskOnOtherApp)
            .expect(400)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                JSON.parse(res.text).should.have.property('result', 'Task does not exist');
                done();
            });
    });
});
