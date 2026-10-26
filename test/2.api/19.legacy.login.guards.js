/**
 * Guards on the legacy dashboard's sign-in routes (frontend/express/app.js):
 * the login failure counter, sessions and token logins of a locked member, and
 * the public screenshots route.
 */
var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
var countlyFs = require('../../api/utils/countlyFs.js');
var authorize = require('../../api/utils/authorizer.js');

var LOGIN_TRIES = 3;

/**
 * Removes every login failure counter these tests can create for a username
 * @param {Array<string>} names - identifiers as typed
 * @returns {Promise} resolves when removed
 */
function clearCounters(names) {
    var ids = [];
    names.forEach(function(name) {
        ids.push(JSON.stringify(["login", name]));
        ids.push(JSON.stringify(["login", name.trim().toLowerCase()]));
    });
    return testUtils.db.collection('failed_logins').deleteMany({_id: {$in: ids}});
}

/**
 * Loads the login page and returns its CSRF token
 * @param {object} agent - supertest agent
 * @param {string} page - page to read the token from
 * @returns {Promise<string>} the token
 */
function loadCSRF(agent, page) {
    return agent.get(page || '/login').expect(200).then(function(res) {
        return testUtils.CSRFfromBody(res.text);
    });
}

describe('Legacy login failure counter', function() {
    var VARIANTS = [testUtils.username, " " + testUtils.username, testUtils.username + " ", testUtils.username.toUpperCase(), " " + testUtils.username + " "];

    before(function() {
        return clearCounters(VARIANTS);
    });
    afterEach(function() {
        return clearCounters(VARIANTS);
    });

    describe('GET /api-key', function() {
        it('counts whitespace and case variants of a username as one account', async function() {
            var agent = request.agent(testUtils.url);
            var typed = [" " + testUtils.username, testUtils.username + " ", testUtils.username.toUpperCase()];
            for (var i = 0; i < LOGIN_TRIES; i++) {
                await agent.get('/api-key').auth(typed[i], 'wrong password').expect(401);
            }
            var res = await agent.get('/api-key').auth(" " + testUtils.username + " ", testUtils.password).expect(401);
            res.text.should.equal("-1");
        });

        it('still returns the api key for the right password when not blocked', async function() {
            var res = await request(testUtils.url).get('/api-key').auth(" " + testUtils.username + " ", testUtils.password).expect(200);
            res.text.should.equal(testUtils.get("API_KEY_ADMIN"));
        });
    });

    describe('POST /login', function() {
        /**
         * Fails the login the given number of times
         * @param {object} agent - supertest agent
         * @param {string} csrf - CSRF token of the agent's session
         */
        async function failLogins(agent, csrf) {
            for (var i = 0; i < LOGIN_TRIES; i++) {
                await agent.post('/login')
                    .send({username: testUtils.username, password: 'wrong password', _csrf: csrf})
                    .expect('location', '/login?message=login.result')
                    .expect(302);
            }
        }

        ['/login/', '/LOGIN', '/login'].forEach(function(path) {
            it('refuses a blocked account on ' + path, async function() {
                var agent = request.agent(testUtils.url);
                var csrf = await loadCSRF(agent);
                await failLogins(agent, csrf);
                await agent.post(path)
                    .send({username: " " + testUtils.username, password: testUtils.password, _csrf: csrf})
                    .expect('location', '/login?message=login.blocked')
                    .expect(302);
            });
        });

        it('still signs in with the right password on /login/ when not blocked', async function() {
            var agent = request.agent(testUtils.url);
            var csrf = await loadCSRF(agent);
            await agent.post('/login/')
                .send({username: " " + testUtils.username, password: testUtils.password, _csrf: csrf})
                .expect('location', '/dashboard')
                .expect(302);
        });
    });

    describe('POST /mobile/login', function() {
        // The route has no views to render, so its answer is not asserted: what
        // it does to the account's failure counter is.
        var COUNTER = JSON.stringify(["login", testUtils.username]);

        /**
         * Posts the mobile login form
         * @param {object} agent - supertest agent
         * @param {string} csrf - CSRF token of the agent's session
         * @param {string} name - username as typed
         * @param {string} pass - password
         * @returns {Promise} resolves with the response
         */
        function post(agent, csrf, name, pass) {
            return agent.post('/mobile/login').send({username: name, password: pass, _csrf: csrf});
        }

        it('does not accept the right password for a blocked account', async function() {
            var agent = request.agent(testUtils.url);
            var csrf = await loadCSRF(agent);
            for (var i = 0; i < LOGIN_TRIES; i++) {
                await post(agent, csrf, testUtils.username + " ", 'wrong password');
            }
            await post(agent, csrf, " " + testUtils.username, testUtils.password);
            var counter = await testUtils.db.collection('failed_logins').findOne({_id: COUNTER});
            should.exist(counter);
            counter.fails.should.equal(LOGIN_TRIES);
        });

        it('clears the counter for the right password when not blocked', async function() {
            var agent = request.agent(testUtils.url);
            var csrf = await loadCSRF(agent);
            await post(agent, csrf, testUtils.username, 'wrong password');
            should.exist(await testUtils.db.collection('failed_logins').findOne({_id: COUNTER}));
            await post(agent, csrf, " " + testUtils.username, testUtils.password);
            // the counter is cleared without waiting for the write
            var counter = true;
            for (var attempt = 0; attempt < 50 && counter; attempt++) {
                counter = await testUtils.db.collection('failed_logins').findOne({_id: COUNTER});
                if (counter) {
                    await new Promise(function(resolve) {
                        setTimeout(resolve, 100);
                    });
                }
            }
            should.not.exist(counter);
        });
    });
});

describe('Locking a member', function() {
    var API_KEY_ADMIN = "";
    var member = null;
    var memberAgent = null;
    var adminAgent = null;
    var username = "lockprobe";
    var password = testUtils.password;

    /**
     * Creates a login token for the member, as the renderer does
     * @returns {Promise<string>} token
     */
    function loginToken() {
        return new Promise(function(resolve, reject) {
            authorize.save({
                db: testUtils.db,
                multi: false,
                owner: member._id,
                ttl: 300,
                purpose: "LoginAuthToken",
                can_login: true,
                callback: function(err, token) {
                    return err ? reject(err) : resolve(token);
                }
            });
        });
    }

    /**
     * Signs an agent in through the login form
     * @param {object} agent - supertest agent
     * @param {string} name - username
     * @param {string} pass - password
     */
    async function signIn(agent, name, pass) {
        var csrf = await loadCSRF(agent);
        await agent.post('/login').send({username: name, password: pass, _csrf: csrf}).expect('location', '/dashboard').expect(302);
    }

    before(async function() {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        var args = {full_name: "Lock Probe", username: username, password: password, email: "lockprobe@example.com", permission: testUtils.permission};
        var res = await request(testUtils.url).get('/i/users/create').query({api_key: API_KEY_ADMIN, args: JSON.stringify(args)}).expect(200);
        member = JSON.parse(res.text);
        should.exist(member._id);
        memberAgent = request.agent(testUtils.url);
        adminAgent = request.agent(testUtils.url);
        await signIn(memberAgent, username, password);
        await signIn(adminAgent, testUtils.username, testUtils.password);
    });

    after(async function() {
        if (member) {
            await request(testUtils.url).get('/i/users/delete').query({api_key: API_KEY_ADMIN, args: JSON.stringify({user_ids: [member._id]})}).expect(200);
        }
        await clearCounters([username]);
    });

    it('lets an unlocked member open the dashboard and use a login token', async function() {
        await memberAgent.get('/dashboard').expect(200);
        var token = await loginToken();
        await request.agent(testUtils.url).get('/login/token/' + token).expect('location', '/dashboard').expect(302);
    });

    it('locks the member', async function() {
        var args = {user_id: member._id, locked: true};
        var res = await request(testUtils.url).get('/i/users/update').query({api_key: API_KEY_ADMIN, args: JSON.stringify(args)}).expect(200);
        JSON.parse(res.text).result.should.equal("Success");
    });

    it('ends the locked member\'s dashboard session', async function() {
        var res = await memberAgent.get('/dashboard').expect(302);
        res.headers.location.should.startWith('/login');
    });

    it('refuses a login token of the locked member', async function() {
        var token = await loginToken();
        await request.agent(testUtils.url).get('/login/token/' + token).expect('location', '/login?message=login.result').expect(302);
    });

    it('keeps the session of the admin who locked the member', async function() {
        await adminAgent.get('/dashboard').expect(200);
    });
});

describe('Public screenshots route', function() {
    // a 1x1 PNG
    var PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
    var SHARED_PNG = Buffer.concat([PNG, Buffer.from("shared")]);
    var DIR = require('path').resolve(__dirname, '../../frontend/express/public/images/screenshots');
    var stored = "screenshot_" + require('crypto').randomBytes(16).toString("hex") + ".png";
    var shared = "screenshot_" + require('crypto').randomBytes(16).toString("hex") + ".png";

    /**
     * Promisified countlyFs.saveData
     * @param {string} name - file name
     * @param {Buffer} data - contents
     * @param {object} options - countlyFs options
     * @returns {Promise} resolves when saved
     */
    function save(name, data, options) {
        return new Promise(function(resolve, reject) {
            countlyFs.saveData("screenshots", DIR + "/" + name, data, options, function(err) {
                return err ? reject(err) : resolve();
            });
        });
    }

    /**
     * Removes a stored screenshot, ignoring one that is already gone
     * @param {string} name - file name
     * @param {object} options - countlyFs options
     * @returns {Promise} resolves when removed
     */
    function remove(name, options) {
        return new Promise(function(resolve) {
            countlyFs.deleteFile("screenshots", DIR + "/" + name, options, function() {
                resolve();
            });
        });
    }

    before(async function() {
        countlyFs.setHandler(testUtils.db);
        // a screenshot saved the way /o/render does: under its own name
        await save(stored, PNG, {writeMode: "overwrite"});
        // a record under the shared id older versions saved every render to
        await save(shared, SHARED_PNG, {id: "core", writeMode: "overwrite"});
    });

    after(async function() {
        await remove(stored, {});
        await remove(shared, {id: "core"});
    });

    it('serves a stored screenshot by its name without a session', async function() {
        var res = await request(testUtils.url).get('/images/screenshots/' + stored)
            .buffer(true)
            .parse(function(r, cb) {
                var chunks = [];
                r.on('data', function(c) {
                    chunks.push(c);
                });
                r.on('end', function() {
                    cb(null, Buffer.concat(chunks));
                });
            })
            .expect('Content-Type', 'image/png')
            .expect(200);
        Buffer.compare(res.body, PNG).should.equal(0);
    });

    it('returns nothing for a name that was never stored', async function() {
        var unknown = "screenshot_" + require('crypto').randomBytes(16).toString("hex") + ".png";
        var res = await request(testUtils.url).get('/images/screenshots/' + unknown).expect(200);
        res.headers['content-type'].should.not.containEql('image/png');
        res.text.should.equal("false");
    });

    it('returns nothing for a name that is not a screenshot name', async function() {
        var res = await request(testUtils.url).get('/images/screenshots/anything.png').expect(200);
        res.text.should.equal("false");
    });
});
