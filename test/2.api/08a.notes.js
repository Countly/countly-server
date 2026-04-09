var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

describe('Notes API', function() {
    it('should save, list and delete a note', async() => {
        const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        const APP_ID = testUtils.get("APP_ID");
        const noteText = `docs-note-${Date.now()}`;
        const noteTs = Date.now() - (60 * 60 * 1000);

        let sp = new URLSearchParams();
        const saveArgs = {
            app_id: APP_ID,
            note: noteText,
            ts: noteTs,
            noteType: 'public',
            color: '#F59E0B'
        };
        sp.append('api_key', API_KEY_ADMIN);
        sp.append('app_id', APP_ID);
        sp.append('args', JSON.stringify(saveArgs));

        const saveResponse = await request.get(`/i/notes/save?${sp.toString()}`);
        console.log('[notes-test] save request args:', saveArgs);
        console.log('[notes-test] save response:', saveResponse.status, saveResponse.body);
        should(saveResponse.status).equal(200);
        saveResponse.body.should.have.property('result', 'Success');

        let noteId = null;
        let lastSearchBody = null;
        let lastPageBody = null;
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
            lastSearchBody = listResponse.body;
            console.log('[notes-test] search list response attempt', attempt + 1, listResponse.status, listResponse.body);
            should(listResponse.status).equal(200);
            noteId = (listResponse.body.aaData || []).find((note) => note.note === noteText)?._id || null;

            if (!noteId) {
                const allSp = new URLSearchParams();
                allSp.append('api_key', API_KEY_ADMIN);
                allSp.append('app_id', APP_ID);
                allSp.append('period', '365days');
                allSp.append('notes_apps', JSON.stringify([APP_ID]));
                allSp.append('iDisplayStart', '0');
                allSp.append('iDisplayLength', '10');
                allSp.append('sEcho', '1');

                const allListResponse = await request.get(`/o/notes?${allSp.toString()}`);
                lastPageBody = allListResponse.body;
                console.log('[notes-test] unfiltered list response attempt', attempt + 1, allListResponse.status, allListResponse.body);
                should(allListResponse.status).equal(200);
            }
        }

        if (!noteId) {
            console.log('[notes-test] final search body:', lastSearchBody);
            console.log('[notes-test] final unfiltered page body:', lastPageBody);
        }
        should.exist(noteId);

        sp = new URLSearchParams();
        sp.append('api_key', API_KEY_ADMIN);
        sp.append('app_id', APP_ID);
        sp.append('note_id', noteId);

        const deleteResponse = await request.get(`/i/notes/delete?${sp.toString()}`);
        console.log('[notes-test] delete response:', deleteResponse.status, deleteResponse.body);
        should(deleteResponse.status).equal(200);
        deleteResponse.body.should.have.property('result', 'Success');
    });
});
