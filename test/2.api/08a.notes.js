var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

describe('Notes API', function() {
    it('should save, list and delete a note', async() => {
        const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        const APP_ID = testUtils.get("APP_ID");
        const noteText = `docs-note-${Date.now()}`;

        let sp = new URLSearchParams();
        sp.append('api_key', API_KEY_ADMIN);
        sp.append('app_id', APP_ID);
        sp.append('args', JSON.stringify({
            app_id: APP_ID,
            note: noteText,
            ts: Date.now(),
            noteType: 'public',
            color: '#F59E0B'
        }));

        const saveResponse = await request.get(`/i/notes/save?${sp.toString()}`);
        should(saveResponse.status).equal(200);
        saveResponse.body.should.have.property('result', 'Success');

        let noteId = null;
        for (let attempt = 0; attempt < 5 && !noteId; attempt++) {
            if (attempt > 0) {
                await new Promise((resolve) => setTimeout(resolve, 500));
            }

            sp = new URLSearchParams();
            sp.append('api_key', API_KEY_ADMIN);
            sp.append('app_id', APP_ID);
            sp.append('period', '365days');
            sp.append('notes_apps', JSON.stringify([APP_ID]));
            sp.append('iDisplayStart', '0');
            sp.append('iDisplayLength', '50');
            sp.append('sEcho', '1');
            sp.append('sSearch', noteText);

            const listResponse = await request.get(`/o/notes?${sp.toString()}`);
            should(listResponse.status).equal(200);
            listResponse.body.should.have.property('aaData');
            noteId = (listResponse.body.aaData || []).find((note) => note.note === noteText)?._id || null;
        }

        should.exist(noteId);

        sp = new URLSearchParams();
        sp.append('api_key', API_KEY_ADMIN);
        sp.append('app_id', APP_ID);
        sp.append('note_id', noteId);

        const deleteResponse = await request.get(`/i/notes/delete?${sp.toString()}`);
        should(deleteResponse.status).equal(200);
        deleteResponse.body.should.have.property('result', 'Success');
    });
});
