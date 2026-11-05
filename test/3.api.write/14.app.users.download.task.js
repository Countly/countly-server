/**
 * /o/app_users/download/<task id> serves the app user export a task names only when
 * the caller may read the task and the export belongs to the app the request is for.
 *
 * Fixtures: a second app, a member reading the fixture app, three long_tasks and
 * their exports rows written directly and removed afterwards.
 */

require('should');
const crypto = require('crypto');
const supertest = require('supertest');

const testUtils = require('../testUtils');

const request = supertest(testUtils.url);

describe('App user export download by task id', () => {
    const RUN = crypto.randomBytes(6).toString('hex');
    let API_KEY_ADMIN = '';
    let APP_ID = '';
    let OTHER_APP_ID = '';
    let READER = { id: '', key: '' };
    const TASKS = {};
    const EIDS = [];

    /**
     * Download by task id as the reader
     * @param {string} taskId - long task id
     * @returns {Promise<object>} {status, text}
     */
    async function download(taskId) {
        const res = await request.get('/o/app_users/download/' + taskId)
            .query({ api_key: READER.key, app_id: APP_ID })
            .buffer(true)
            .parse((response, cb) => {
                let data = '';
                response.setEncoding('utf8');
                response.on('data', (chunk) => {
                    data += chunk;
                });
                response.on('end', () => cb(null, data));
            });
        return { status: res.status, text: res.body + '' };
    }

    /**
     * Store a completed export task and the export row it names
     * @param {string} key - fixture key
     * @param {string} appId - app the export is of
     * @param {object} fields - extra task fields
     * @returns {Promise} resolves when stored
     */
    async function storeTask(key, appId, fields) {
        const eid = 'appUser_' + appId + '_dl' + RUN + key;
        const id = 'dl_task_' + RUN + '_' + key;
        TASKS[key] = id;
        EIDS.push(eid);
        await testUtils.db.collection('long_tasks').insertOne(Object.assign({
            _id: id,
            type: 'AppUserExport',
            app_id: appId,
            status: 'completed',
            data: JSON.stringify(eid + '.json'),
            creator: '000000000000000000000000'
        }, fields));
        await testUtils.db.collection('exports').insertOne({ _eid: eid, __id: 'row_' + RUN + '_' + key });
    }

    before(async() => {
        API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');
        APP_ID = testUtils.get('APP_ID');

        const app = await request.get('/i/apps/create')
            .query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ name: 'Download task other app ' + RUN }) }).expect(200);
        OTHER_APP_ID = app.body._id;

        const args = {
            full_name: 'Download task reader',
            username: 'download_task_reader_' + RUN,
            password: testUtils.password,
            email: 'download_task_reader_' + RUN + '@test.test',
            permission: {
                _: { a: [], u: [[APP_ID]] },
                c: {},
                r: { [APP_ID]: { all: true, allowed: {} } },
                u: {},
                d: {},
            },
        };
        const member = await request.get('/i/users/create').query({ api_key: API_KEY_ADMIN, args: JSON.stringify(args) }).expect(200);
        READER = { id: member.body._id, key: member.body.api_key };

        await storeTask('other', OTHER_APP_ID, {});
        await storeTask('private', APP_ID, { global: false });
        await storeTask('own', APP_ID, {});
    });

    after(async() => {
        await testUtils.db.collection('long_tasks').deleteMany({ _id: { $in: Object.keys(TASKS).map((k) => TASKS[k]) } });
        await testUtils.db.collection('exports').deleteMany({ _eid: { $in: EIDS } });
        if (READER.id) {
            await request.get('/i/users/delete').query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ user_ids: [READER.id] }) });
        }
        if (OTHER_APP_ID) {
            await request.get('/i/apps/delete').query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ app_id: OTHER_APP_ID }) });
        }
    });

    it('refuses a task whose export belongs to another app', async() => {
        const res = await download(TASKS.other);
        res.status.should.equal(403, res.text);
        res.text.should.not.containEql('row_' + RUN + '_other');
    });

    it('refuses a task the caller may not read', async() => {
        const res = await download(TASKS.private);
        res.status.should.equal(403, res.text);
        res.text.should.not.containEql('row_' + RUN + '_private');
    });

    it('answers 404 for an unknown task', async() => {
        const res = await download('dl_task_' + RUN + '_missing');
        res.status.should.equal(404, res.text);
    });

    it('serves a readable task of the requested app', async() => {
        const res = await download(TASKS.own);
        res.status.should.equal(200, res.text);
        res.text.should.containEql('row_' + RUN + '_own');
    });
});
