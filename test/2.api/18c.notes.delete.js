/**
 * /i/notes/delete removes the note named by note_id, and the edit permission is
 * checked against that same note. An id in args does not change which note is
 * checked or deleted.
 *
 * Fixtures: a second app, an admin of that app only, a private note on the
 * test app owned by nobody in this suite, all removed afterwards.
 */

const should = require('should');
const supertest = require('supertest');

const testUtils = require('../testUtils');

const request = supertest(testUtils.url);

describe('Notes delete', () => {
    let API_KEY_ADMIN = '';
    let APP_ID = '';
    let OTHER_APP_ID = '';
    let MEMBER = null;
    let FOREIGN_NOTE_ID = null;
    let OWN_NOTE_ID = null;

    /**
     * Find a note by id
     * @param {string|object} id - note id
     * @returns {Promise<object>} the note or null
     */
    function findNote(id) {
        return testUtils.db.collection('notes').findOne({ _id: testUtils.db.ObjectID(id + '') });
    }

    before(async() => {
        API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');
        APP_ID = testUtils.get('APP_ID');

        const appRes = await request.get('/i/apps/create').query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ name: 'notes_delete_' + Date.now() }) });
        appRes.status.should.equal(200, appRes.text);
        OTHER_APP_ID = appRes.body._id;

        const stamp = Date.now();
        const memberRes = await request.get('/i/users/create').query({
            api_key: API_KEY_ADMIN,
            args: JSON.stringify({
                full_name: 'notes_delete_member',
                username: 'notes_delete_member_' + stamp,
                password: testUtils.password,
                email: 'notes_delete_member_' + stamp + '@test.test',
                permission: {
                    _: { a: [OTHER_APP_ID], u: [] },
                    c: { [OTHER_APP_ID]: { all: true, allowed: {} } },
                    r: { [OTHER_APP_ID]: { all: true, allowed: {} } },
                    u: { [OTHER_APP_ID]: { all: true, allowed: {} } },
                    d: { [OTHER_APP_ID]: { all: true, allowed: {} } },
                },
            }),
        });
        memberRes.status.should.equal(200, memberRes.text);
        MEMBER = { id: memberRes.body._id, key: memberRes.body.api_key };

        const inserted = await testUtils.db.collection('notes').insertOne({
            app_id: APP_ID + '',
            note: 'notes_delete foreign private note',
            ts: Date.now(),
            noteType: 'private',
            emails: [],
            color: 1,
            owner: '000000000000000000000000',
            created_at: Date.now(),
            updated_at: Date.now(),
        });
        FOREIGN_NOTE_ID = inserted.insertedId + '';
    });

    after(async() => {
        const ids = [FOREIGN_NOTE_ID, OWN_NOTE_ID].filter(Boolean).map((id) => testUtils.db.ObjectID(id));
        if (ids.length) {
            await testUtils.db.collection('notes').deleteMany({ _id: { $in: ids } });
        }
        if (MEMBER && MEMBER.id) {
            await request.get('/i/users/delete').query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ user_ids: [MEMBER.id] }) });
        }
        if (OTHER_APP_ID) {
            await request.get('/i/apps/delete').query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ app_id: OTHER_APP_ID }) });
        }
    });

    it('Should let the member save a note on their own app', async() => {
        const res = await request.get('/i/notes/save').query({
            api_key: MEMBER.key,
            app_id: OTHER_APP_ID,
            args: JSON.stringify({ note: 'notes_delete own note', ts: Date.now(), noteType: 'private', color: 1 }),
        });
        res.status.should.equal(200, res.text);
        const own = await testUtils.db.collection('notes').findOne({ app_id: OTHER_APP_ID + '', owner: MEMBER.id + '' });
        should(own).not.be.null();
        OWN_NOTE_ID = own._id + '';
    });

    it('Should refuse to delete a note on another app when args names the member\'s own note', async() => {
        const res = await request.get('/i/notes/delete').query({
            api_key: MEMBER.key,
            app_id: OTHER_APP_ID,
            note_id: FOREIGN_NOTE_ID,
            args: JSON.stringify({ _id: OWN_NOTE_ID }),
        });
        res.status.should.equal(403, res.text);
        should(await findNote(FOREIGN_NOTE_ID)).not.be.null();
        should(await findNote(OWN_NOTE_ID)).not.be.null();
    });

    it('Should refuse to delete a note on another app', async() => {
        const res = await request.get('/i/notes/delete').query({
            api_key: MEMBER.key,
            app_id: OTHER_APP_ID,
            note_id: FOREIGN_NOTE_ID,
        });
        res.status.should.equal(403, res.text);
        should(await findNote(FOREIGN_NOTE_ID)).not.be.null();
    });

    it('Should answer 403 for a note id that does not exist', async() => {
        const res = await request.get('/i/notes/delete').query({
            api_key: MEMBER.key,
            app_id: OTHER_APP_ID,
            note_id: '000000000000000000000001',
        });
        res.status.should.equal(403, res.text);
    });

    it('Should delete the member\'s own note', async() => {
        const res = await request.get('/i/notes/delete').query({
            api_key: MEMBER.key,
            app_id: OTHER_APP_ID,
            note_id: OWN_NOTE_ID,
        });
        res.status.should.equal(200, res.text);
        should(await findNote(OWN_NOTE_ID)).be.null();
        should(await findNote(FOREIGN_NOTE_ID)).not.be.null();
    });
});
