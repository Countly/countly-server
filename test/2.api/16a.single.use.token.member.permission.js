var request = require('supertest');
require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var APP_ID = "";

/**
* Send several requests at once and resolve with their status codes
* @param {string[]} paths - request paths
* @returns {Promise<number[]>} status codes, in order
*/
function together(paths) {
    return Promise.all(paths.map(function(path) {
        return new Promise(function(resolve, reject) {
            request.get(path).end(function(err, res) {
                if (err && !res) {
                    return reject(err);
                }
                resolve(res.status);
            });
        });
    }));
}

/**
* Create a token with the admin api_key
* @param {string} query - extra query string
* @returns {Promise<string>} the token
*/
function createToken(query) {
    return new Promise(function(resolve, reject) {
        request
            .get('/i/token/create?api_key=' + API_KEY_ADMIN + query)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return reject(err);
                }
                resolve(JSON.parse(res.text).result);
            });
    });
}

describe('Single use tokens', function() {
    before(function() {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        APP_ID = testUtils.get("APP_ID");
    });

    it('lets exactly one of several parallel requests with a single use token through', async function() {
        var token = await createToken('&multi=false');
        var path = '/o/token/list?auth_token=' + token;
        var statuses = await together([path, path, path, path, path, path]);
        statuses.filter(function(status) {
            return status === 200;
        }).length.should.equal(1, 'statuses: ' + statuses.join(','));
        (await together([path]))[0].should.not.equal(200);
    });

    it('keeps a multi token usable in parallel and again afterwards', async function() {
        var token = await createToken('&multi=true&ttl=600');
        var path = '/o/token/list?auth_token=' + token;
        (await together([path, path, path, path])).should.eql([200, 200, 200, 200]);
        (await together([path]))[0].should.equal(200);
        await together(['/i/token/delete?api_key=' + API_KEY_ADMIN + '&tokenid=' + token]);
    });
});

describe('Member permission without app lists', function() {
    var memberId = "";
    var memberKey = "";
    var rightsOnly = {};

    before(function() {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        APP_ID = testUtils.get("APP_ID");
        var all = {};
        all[APP_ID] = {all: true, allowed: {}};
        rightsOnly = {c: all, r: all, u: all, d: all};
    });

    /**
    * Read the stored member
    * @returns {Promise<object>} member document
    */
    function storedMember() {
        return testUtils.db.collection('members').findOne({_id: testUtils.db.ObjectID(memberId)});
    }

    /**
    * Call an app admin endpoint as the member
    * @returns {Promise<object>} status and body
    */
    function appAdminCall() {
        return new Promise(function(resolve) {
            request
                .get('/o/apps/details?api_key=' + memberKey + '&app_id=' + APP_ID)
                .end(function(err, res) {
                    resolve({status: res.status, body: res.text});
                });
        });
    }

    /**
    * Update the member with the admin api_key
    * @param {object} args - update arguments besides user_id
    * @returns {Promise<void>} resolves on 200
    */
    function update(args) {
        return new Promise(function(resolve, reject) {
            request
                .get('/i/users/update?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify(Object.assign({user_id: memberId}, args))))
                .expect(200)
                .end(function(err) {
                    return err ? reject(err) : resolve();
                });
        });
    }

    it('creation with a permission-only argument stores empty app lists', function(done) {
        var args = {full_name: "Rights only", username: "rights.only.member", password: testUtils.password, email: "rights.only.member@test.test", permission: rightsOnly};
        request
            .get('/i/users/create?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify(args)))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                memberId = ob._id;
                memberKey = ob.api_key;
                storedMember().then(function(member) {
                    member.permission._.should.eql({a: [], u: []});
                    done();
                }).catch(done);
            });
    });

    it('an update with a permission-only argument is stored with app lists', async function() {
        await update({permission: {_: {a: [APP_ID], u: []}, c: rightsOnly.c, r: rightsOnly.r, u: rightsOnly.u, d: rightsOnly.d}});
        (await appAdminCall()).status.should.equal(200);
        await update({permission: rightsOnly});
        var member = await storedMember();
        member.permission._.should.eql({a: [], u: []});
        member.permission.r[APP_ID].should.eql({all: true, allowed: {}});
    });

    it('the member is answered by their rights, not locked out', async function() {
        var refused = await appAdminCall();
        refused.status.should.equal(401);
        JSON.parse(refused.body).result.should.equal('User does not have right');
        await update({permission: {_: {a: [APP_ID], u: []}, c: rightsOnly.c, r: rightsOnly.r, u: rightsOnly.u, d: rightsOnly.d}});
        (await appAdminCall()).status.should.equal(200);
    });

    it('a stored permission with no _ gets a clean refusal', async function() {
        await testUtils.db.collection('members').updateOne({_id: testUtils.db.ObjectID(memberId)}, {$set: {permission: rightsOnly}});
        var refused = await appAdminCall();
        refused.status.should.equal(401);
        JSON.parse(refused.body).result.should.equal('User does not have right');
    });

    after(function(done) {
        if (!memberId) {
            return done();
        }
        request
            .get('/i/users/delete?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({user_ids: [memberId]}))
            .end(function() {
                done();
            });
    });
});
