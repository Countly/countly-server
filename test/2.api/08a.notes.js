var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

describe('Notes API', function() {
    it('should save and delete a note', async() => {
        const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        const APP_ID = testUtils.get("APP_ID");
        const noteText = `docs-note-${Date.now()}`;
        const noteTs = Date.now() - (60 * 60 * 1000);

        let sp = new URLSearchParams();
        sp.append('api_key', API_KEY_ADMIN);
        sp.append('app_id', APP_ID);
        sp.append('args', JSON.stringify({
            app_id: APP_ID,
            note: noteText,
            ts: noteTs,
            noteType: 'public',
            color: '#F59E0B'
        }));

        const saveResponse = await request.get(`/i/notes/save?${sp.toString()}`);
        should(saveResponse.status).equal(200);
        saveResponse.body.should.have.property('result', 'Success');

        let createdNote = null;
        for (let attempt = 0; attempt < 5 && !createdNote; attempt++) {
            if (attempt > 0) {
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
            createdNote = await testUtils.db.collection('notes').findOne({app_id: APP_ID, note: noteText});
        }

        should.exist(createdNote);
        should.exist(createdNote._id);

        sp = new URLSearchParams();
        sp.append('api_key', API_KEY_ADMIN);
        sp.append('app_id', APP_ID);
        sp.append('note_id', createdNote._id + "");

        const deleteResponse = await request.get(`/i/notes/delete?${sp.toString()}`);
        should(deleteResponse.status).equal(200);
        deleteResponse.body.should.have.property('result', 'Success');
    });
});
