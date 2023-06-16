var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var USER_ID = "";

describe('Updating user', function() {
    describe('without args', function() {
        it('should bad request', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            USER_ID = testUtils.get("USER_ID");
            request
                .get('/i/users/update?api_key=' + API_KEY_ADMIN)
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
    describe('updating name', function() {
        it('should success', function(done) {
            var params = {user_id: USER_ID, full_name: "Name Surname"};
            request
                .get('/i/users/update?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    done();
                });
        });
    });
    describe('verify name update', function() {
        it('should display new name', function(done) {
            request
                .get('/o/users/all?api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property(USER_ID);
                    var user = ob[USER_ID];
                    user.should.have.property('full_name', "Name Surname");
                    done();
                });
        });
    });
    describe('User permission when user is updated', async() => {
        it('Should set correct permission when user is updated', async() => {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            // Create new user
            const params = JSON.stringify({
                full_name: 'testedit1',
                username: 'testedit1',
                password: 'p4ssw0rD!',
                email: 'testedit1@mail.co',
            });

            let sp = new URLSearchParams();
            sp.append('api_key', API_KEY_ADMIN);
            sp.append('args', params);

            const response = await request.get(`/i/users/create?${sp.toString()}`);
            const userId = response.body._id;

            const editParams = JSON.stringify({user_id: userId, admin_of: ['appId']});

            sp = new URLSearchParams();
            sp.append('api_key', API_KEY_ADMIN);
            sp.append('args', editParams);

            const editResponse = await request.get(`/i/users/update?${sp.toString()}`);

            should(editResponse.status).equal(200);

            sp = new URLSearchParams();
            sp.append('api_key', API_KEY_ADMIN);

            const allUserResponse = await request.get(`/o/users/all?${sp.toString()}`);
            const user = allUserResponse.body[userId];

            should(user.permission._.a).deepEqual(['appId']);

            // Delete user
            sp = new URLSearchParams();
            sp.append('api_key', API_KEY_ADMIN);
            sp.append('args', JSON.stringify({ user_ids: [userId] }));

            await request.get(`/i/users/delete?${sp.toString()}`);
        });
    });
    describe('Update user permission when app is deleted', async() => {
        it('Should update user permission when app is deleted', async() => {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");

            // Create new app
            let sp = new URLSearchParams();
            sp.append('api_key', API_KEY_ADMIN);
            sp.append('args', JSON.stringify({ name: 'testappdelete1' }));

            const appResponse = await request.get(`/i/apps/create?${sp.toString()}`);
            const appId = appResponse.body._id;

            // Create new user with admin access to new app
            const userParams = JSON.stringify({
                full_name: 'testappdelete1',
                username: 'testappdelete1',
                password: 'p4ssw0rD!',
                email: 'mail@mail.com',
                permission: {
                    _: {
                        a: [appId],
                        u: [],
                    },
                },
            });
            sp = new URLSearchParams();
            sp.append('api_key', API_KEY_ADMIN);
            sp.append('args', userParams);

            const userResponse = await request.get(`/i/users/create?${sp.toString()}`);
            const userId = userResponse.body._id;

            // Delete the app
            sp = new URLSearchParams();
            sp.append('api_key', API_KEY_ADMIN);
            sp.append('args', JSON.stringify({ app_id: appId }));

            await request.get(`/i/apps/delete?${sp.toString()}`);

            // Check that user permission is updated
            sp = new URLSearchParams();
            sp.append('api_key', API_KEY_ADMIN);
            const allUserResponse = await request.get(`/o/users/all?${sp.toString()}`);
            const user = allUserResponse.body[userId];

            should(user.permission._.a).deepEqual([]);

            // Delete user
            sp = new URLSearchParams();
            sp.append('api_key', API_KEY_ADMIN);
            sp.append('args', JSON.stringify({ user_ids: [userId] }));

            await request.get(`/i/users/delete?${sp.toString()}`);
        });
        it('Should update user permission when app is deleted', async() => {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");

            // Create new app
            let sp = new URLSearchParams();
            sp.append('api_key', API_KEY_ADMIN);
            sp.append('args', JSON.stringify({ name: 'testappdelete2' }));

            const appResponse = await request.get(`/i/apps/create?${sp.toString()}`);
            const appId = appResponse.body._id;

            // Create new user with access to new app
            const userParams = JSON.stringify({
                full_name: 'testappdelete2',
                username: 'testappdelete2',
                password: 'p4ssw0rD!',
                email: 'mail@mail.com',
                permission: {
                    c: { [appId]: {} },
                    r: { [appId]: {} },
                    u: { [appId]: {} },
                    d: { [appId]: {} },
                    _: {
                        a: [],
                        u: [[appId]],
                    },
                },
            });
            sp = new URLSearchParams();
            sp.append('api_key', API_KEY_ADMIN);
            sp.append('args', userParams);

            const userResponse = await request.get(`/i/users/create?${sp.toString()}`);
            const userId = userResponse.body._id;

            // Delete the app
            sp = new URLSearchParams();
            sp.append('api_key', API_KEY_ADMIN);
            sp.append('args', JSON.stringify({ app_id: appId }));

            await request.get(`/i/apps/delete?${sp.toString()}`);

            // Check that user permission is updated
            sp = new URLSearchParams();
            sp.append('api_key', API_KEY_ADMIN);
            const allUserResponse = await request.get(`/o/users/all?${sp.toString()}`);
            const user = allUserResponse.body[userId];

            should(user.permission).deepEqual({
                _: { a: [], u: [] },
                c: {},
                r: {},
                u: {},
                d: {},
            });

            // Delete user
            sp = new URLSearchParams();
            sp.append('api_key', API_KEY_ADMIN);
            sp.append('args', JSON.stringify({ user_ids: [userId] }));

            await request.get(`/i/users/delete?${sp.toString()}`);
        });
    });
});