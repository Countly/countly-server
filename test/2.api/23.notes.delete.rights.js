/**
 * /i/notes/delete removes the note named by note_id, and the permission check
 * is made on that same note. A member who may delete their own note on one app
 * cannot remove another app's private note, whatever else the request carries.
 *
 * Fixtures: a second app and a member who is admin of it only, created through
 * the API; notes written through /i/notes/save. All removed afterwards.
 */

const should = require('should');
const supertest = require('supertest');

const testUtils = require('../testUtils');

const request = supertest(testUtils.url);

describe('Notes delete rights', () => {
    let API_KEY_ADMIN = '';
    let APP_A = '';
    let APP_B = '';
    let MEMBER = null;
    const STAMP = Date.now();
    const TEXT_A = 'notes_delete_rights_a_' + STAMP;
    const TEXT_B = 'notes_delete_rights_b_' + STAMP;
    let NOTE_A = '';
    let NOTE_B = '';

    /**
     * Save a note through the API
     * @param {string} apiKey - caller's api key
     * @param {string} appId - app the note belongs to
     * @param {string} text - note text
     * @returns {Promise<object>} the response
     */
    function saveNote(apiKey, appId, text) {
        const args = { note: text, ts: Date.now(), noteType: 'private', color: 1 };
        return request.get('/i/notes/save').query({ api_key: apiKey, app_id: appId, args: JSON.stringify(args) });
    }

    /**
     * Find a note's id by its text
     * @param {string} text - note text
     * @returns {Promise<string>} the note id, or '' when it does not exist
     */
    async function noteId(text) {
        const note = await testUtils.db.collection('notes').findOne({ note: text });
        return note ? note._id + '' : '';
    }

    before(async() => {
        API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');
        APP_A = testUtils.get('APP_ID');

        const app = await request.get('/i/apps/create').query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ name: 'notes_delete_rights_' + STAMP }) });
        app.status.should.equal(200, app.text);
        APP_B = app.body._id;

        const args = {
            full_name: 'notes_delete_rights',
            username: 'notes_delete_rights_' + STAMP,
            password: testUtils.password,
            email: 'notes_delete_rights_' + STAMP + '@test.test',
            permission: {
                _: { a: [APP_B], u: [] },
                c: {},
                r: {},
                u: {},
                d: {},
            },
        };
        const member = await request.get('/i/users/create').query({ api_key: API_KEY_ADMIN, args: JSON.stringify(args) });
        member.status.should.equal(200, member.text);
        MEMBER = { id: member.body._id, key: member.body.api_key };

        const a = await saveNote(API_KEY_ADMIN, APP_A, TEXT_A);
        a.status.should.equal(200, a.text);
        NOTE_A = await noteId(TEXT_A);

        const b = await saveNote(MEMBER.key, APP_B, TEXT_B);
        b.status.should.equal(200, b.text);
        NOTE_B = await noteId(TEXT_B);
    });

    after(async() => {
        await testUtils.db.collection('notes').deleteMany({ note: { $in: [TEXT_A, TEXT_B] } });
        if (MEMBER && MEMBER.id) {
            await request.get('/i/users/delete').query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ user_ids: [MEMBER.id] }) });
        }
        if (APP_B) {
            await request.get('/i/apps/delete').query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ app_id: APP_B }) });
        }
    });

    it('Should have created the fixtures', () => {
        should(NOTE_A).be.a.String().and.not.be.empty();
        should(NOTE_B).be.a.String().and.not.be.empty();
    });

    it('Should refuse deleting another app\'s private note', async() => {
        const res = await request.get('/i/notes/delete').query({ api_key: MEMBER.key, app_id: APP_B, note_id: NOTE_A });
        res.status.should.equal(403, res.text);
        (await noteId(TEXT_A)).should.equal(NOTE_A);
    });

    it('Should check and delete the same note when args._id names another one', async() => {
        const res = await request.get('/i/notes/delete').query({ api_key: MEMBER.key, app_id: APP_B, note_id: NOTE_A, args: JSON.stringify({ _id: NOTE_B }) });
        res.status.should.equal(403, res.text);
        (await noteId(TEXT_A)).should.equal(NOTE_A);
        (await noteId(TEXT_B)).should.equal(NOTE_B);
    });

    it('Should refuse a delete without a valid note_id', async() => {
        const res = await request.get('/i/notes/delete').query({ api_key: MEMBER.key, app_id: APP_B, note_id: 'not-an-id' });
        res.status.should.equal(403, res.text);
    });

    it('Should delete the member\'s own note', async() => {
        const res = await request.get('/i/notes/delete').query({ api_key: MEMBER.key, app_id: APP_B, note_id: NOTE_B });
        res.status.should.equal(200, res.text);
        (await noteId(TEXT_B)).should.equal('');
        (await noteId(TEXT_A)).should.equal(NOTE_A);
    });
});
