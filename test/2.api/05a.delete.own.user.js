var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

describe('Delete own account', function() {
    it('should delete a secondary global admin account with valid password', async() => {
        const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        const suffix = Date.now();

        let sp = new URLSearchParams();
        sp.append('api_key', API_KEY_ADMIN);
        sp.append('args', JSON.stringify({
            full_name: `Delete Own ${suffix}`,
            username: `delete_own_${suffix}`,
            password: 'DocsDelete1!A',
            email: `delete-own-${suffix}@example.com`,
            global_admin: true
        }));

        const createResponse = await request.get(`/i/users/create?${sp.toString()}`);
        should(createResponse.status).equal(200);
        createResponse.body.should.have.property('_id');
        createResponse.body.should.have.property('api_key');

        const ownUserId = createResponse.body._id;
        const ownApiKey = createResponse.body.api_key;

        sp = new URLSearchParams();
        sp.append('api_key', ownApiKey);
        sp.append('password', 'DocsDelete1!A');

        const deleteOwnResponse = await request.get(`/i/users/deleteOwnAccount?${sp.toString()}`);
        should(deleteOwnResponse.status).equal(200);
        deleteOwnResponse.body.should.have.property('result', 'Success');

        sp = new URLSearchParams();
        sp.append('api_key', API_KEY_ADMIN);

        const allUsersResponse = await request.get(`/o/users/all?${sp.toString()}`);
        should(allUsersResponse.status).equal(200);
        should(allUsersResponse.body[ownUserId]).be.undefined();
    });
});
