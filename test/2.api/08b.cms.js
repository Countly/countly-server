var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

describe('CMS API', function() {
    it('should save, read and clear CMS cache entries', async() => {
        const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        const APP_ID = testUtils.get("APP_ID");
        const namespace = 'server-guides';
        const entryId = `${namespace}_docs_${Date.now()}`;

        let sp = new URLSearchParams();
        sp.append('api_key', API_KEY_ADMIN);
        sp.append('app_id', APP_ID);
        sp.append('_id', namespace);
        sp.append('entries', JSON.stringify([
            {_id: entryId, title: 'Validator Guide', body: 'Welcome'}
        ]));

        const saveResponse = await request.get(`/i/cms/save_entries?${sp.toString()}`);
        should(saveResponse.status).equal(200);
        saveResponse.body.should.have.property('result', 'Entries saved');

        sp = new URLSearchParams();
        sp.append('api_key', API_KEY_ADMIN);
        sp.append('app_id', APP_ID);
        sp.append('_id', namespace);
        sp.append('query', JSON.stringify({title: 'Validator Guide'}));

        const readResponse = await request.get(`/o/cms/entries?${sp.toString()}`);
        should(readResponse.status).equal(200);
        readResponse.body.should.have.property('result');
        should(readResponse.body.result.data).be.Array();
        should(readResponse.body.result.data.find((entry) => entry._id === entryId)).exist();

        sp = new URLSearchParams();
        sp.append('api_key', API_KEY_ADMIN);
        sp.append('app_id', APP_ID);
        sp.append('_id', namespace);

        const clearResponse = await request.get(`/i/cms/clear?${sp.toString()}`);
        should(clearResponse.status).equal(200);
        clearResponse.body.should.have.property('result', 'CMS cache cleared');

        sp = new URLSearchParams();
        sp.append('api_key', API_KEY_ADMIN);
        sp.append('app_id', APP_ID);
        sp.append('_id', namespace);
        sp.append('query', JSON.stringify({_id: entryId}));

        const postClearResponse = await request.get(`/o/cms/entries?${sp.toString()}`);
        should(postClearResponse.status).equal(200);
        postClearResponse.body.should.have.property('result');
        should(postClearResponse.body.result.data).be.Array();
        should(postClearResponse.body.result.data.find((entry) => entry._id === entryId)).not.exist();
    });
});
