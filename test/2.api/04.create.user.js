var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";

describe('Creating user', function() {
    describe('without args', function() {
        it('should bad request', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            request
                .get('/i/users/create?api_key=' + API_KEY_ADMIN)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result');
                    ob.result.should.be.instanceof(Array).and.have.lengthOf(1);
                    ob.result[0].should.be.exactly('Missing \'args\' parameter');
                    done();
                });
        });
    });
    describe('without name', function() {
        it('should bad request', function(done) {
            var params = {username: testUtils.username, permission: testUtils.permission, password: testUtils.password, email: testUtils.email};
            request
                .get('/i/users/create?&api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result');
                    ob.result.should.be.instanceof(Array).and.have.lengthOf(1);
                    ob.result[0].should.be.exactly('Missing full_name argument');
                    done();
                });
        });
    });
    describe('without username', function() {
        it('should bad request', function(done) {
            var params = {full_name: testUtils.name, permission: testUtils.permission, password: testUtils.password, email: testUtils.email};
            request
                .get('/i/users/create?&api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result');
                    ob.result.should.be.instanceof(Array).and.have.lengthOf(1);
                    ob.result[0].should.be.exactly('Missing username argument');
                    done();
                });
        });
    });
    describe('without password', function() {
        it('should bad request', function(done) {
            var params = {full_name: testUtils.name, permission: testUtils.permission, username: testUtils.username, email: testUtils.email};
            request
                .get('/i/users/create?&api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result');
                    ob.result.should.be.instanceof(Array).and.have.lengthOf(1);
                    ob.result[0].should.be.exactly('Missing password argument');
                    done();
                });
        });
    });
    describe('without email', function() {
        it('should bad request', function(done) {
            var params = {full_name: testUtils.name, permission: testUtils.permission, username: testUtils.username, password: testUtils.password};
            request
                .get('/i/users/create?&api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result');
                    ob.result.should.be.instanceof(Array).and.have.lengthOf(1);
                    ob.result[0].should.be.exactly('Missing email argument');
                    done();
                });
        });
    });
    describe('with same username', function() {
        it('should bad request', function(done) {
            var params = {full_name: testUtils.name, permission: testUtils.permission, username: testUtils.username, password: testUtils.password, email: testUtils.email + ".test"};
            request
                .get('/i/users/create?&api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result');
                    ob.result.should.be.instanceof(Array).and.have.lengthOf(1);
                    ob.result[0].should.be.exactly('Email or username already exists');
                    done();
                });
        });
    });
    describe('with same username', function() {
        it('should bad request', function(done) {
            var params = {full_name: testUtils.name, permission: testUtils.permission, username: testUtils.username + "1", password: testUtils.password, email: testUtils.email};
            request
                .get('/i/users/create?&api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result');
                    ob.result.should.be.instanceof(Array).and.have.lengthOf(1);
                    ob.result[0].should.be.exactly('Email or username already exists');
                    done();
                });
        });
    });
    describe('successfully create', function() {
        it('should create user', function(done) {
            var params = {full_name: testUtils.name, permission: testUtils.permission, username: testUtils.username + "1", password: testUtils.password, email: testUtils.email + ".test"};
            request
                .get('/i/users/create?&api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('full_name', testUtils.name);
                    ob.should.have.property('username', testUtils.username + "1");
                    ob.should.have.property('email', testUtils.email + ".test");
                    ob.should.have.property('api_key');
                    testUtils.set("API_KEY_USER", ob["api_key"]);
                    testUtils.set("USER_ID", ob["_id"]);
                    done();
                });
        });
    });
    describe('permission', async() => {
        it('should generate correct permission object if no permission object provided', async() => {
            const params = JSON.stringify({
                full_name: testUtils.name,
                username: `${testUtils.username}_permission`,
                password: testUtils.password,
                email: `${testUtils.email}_permission`,
            });

            const response = await request.get(`/i/users/create?&api_key=${API_KEY_ADMIN}&args=params`);
            const userId = response.body._id;

            should(response.status).equal(200);
            should(response.body.permission).eql({
                _: { a: [], u: [] },
                c: {},
                r: {},
                u: {},
                d: {},
            });

            await request
                .get(`/i/users/delete?api_key=${API_KEY_ADMIN}&args=${JSON.stringify({ user_ids: [userId] })}`);
        });
        it(`should generate correct permission object if 'admin_of' provided`, async() => {
            const APP_KEY = testUtils.get('APP_KEY');
            const params = JSON.stringify({
                full_name: testUtils.name,
                username: `${testUtils.username}_permission`,
                password: testUtils.password,
                email: `${testUtils.email}_permission`,
                admin_of: [APP_KEY],
            });

            const response = await request.get(`/i/users/create?&api_key=${API_KEY_ADMIN}&args=params`);
            const userId = response.body._id;

            should(response.status).equal(200);
            should(response.body.permission).eql({
                _: { a: [], u: [] },
                c: { [APP_KEY]: { all: true, allowed: {} } },
                r: { [APP_KEY]: { all: true, allowed: {} } },
                u: { [APP_KEY]: { all: true, allowed: {} } },
                d: { [APP_KEY]: { all: true, allowed: {} } },
            });

            await request
                .get(`/i/users/delete?api_key=${API_KEY_ADMIN}&args=${JSON.stringify({ user_ids: [userId] })}`);
        });
        it(`should generate correct permission object if 'user_of' provided`, async() => {
            const APP_KEY = testUtils.get('APP_KEY');
            const params = JSON.stringify({
                full_name: testUtils.name,
                username: `${testUtils.username}_permission`,
                password: testUtils.password,
                email: `${testUtils.email}_permission`,
                user_of: [APP_KEY],
            });

            const response = await request.get(`/i/users/create?&api_key=${API_KEY_ADMIN}&args=params`);
            const userId = response.body._id;

            should(response.status).equal(200);
            should(response.body.permission).eql({
                _: { a: [], u: [APP_KEY] },
                c: {},
                r: { [APP_KEY]: { all: true, allowed: {} } },
                u: {},
                d: {},
            });

            await request
                .get(`/i/users/delete?api_key=${API_KEY_ADMIN}&args=${JSON.stringify({ user_ids: [userId] })}`);
        });
    });
});