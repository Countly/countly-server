/**
 * /o/export/db leaves the reset token (prid) out of password_reset rows, in
 * JSON and in CSV, the same field DB Viewer withholds.
 *
 * Fixture: one password_reset row written directly, removed afterwards.
 */

require('should');
const supertest = require('supertest');

const testUtils = require('../testUtils');

const request = supertest(testUtils.url);

describe('DB export of password_reset', () => {
    let API_KEY_ADMIN = '';
    const STAMP = Date.now();
    const ROW_ID = 'export_password_reset_' + STAMP;
    const PRID = 'export_password_reset_prid_' + STAMP;

    /**
     * Export the fixture row
     * @param {string} type - json or csv
     * @returns {Promise<object>} response
     */
    function exportRow(type) {
        return request.get('/o/export/db')
            .query({
                api_key: API_KEY_ADMIN,
                db: 'countly',
                collection: 'password_reset',
                query: JSON.stringify({ _id: ROW_ID }),
                type: type
            })
            .buffer(true)
            .parse((res, cb) => {
                let data = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => cb(null, data));
            });
    }

    before(async() => {
        API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');
        await testUtils.db.collection('password_reset').insertOne({ _id: ROW_ID, prid: PRID, user_id: 'export_password_reset_user', timestamp: Math.round(STAMP / 1000) });
    });

    after(async() => {
        await testUtils.db.collection('password_reset').deleteOne({ _id: ROW_ID });
    });

    it('exports the row without prid as JSON', async() => {
        const res = await exportRow('json');
        res.status.should.equal(200, res.body);
        res.body.should.containEql(ROW_ID);
        res.body.should.containEql('export_password_reset_user');
        res.body.should.not.containEql(PRID);
        res.body.should.not.containEql('prid');
    });

    it('exports the row without prid as CSV', async() => {
        const res = await exportRow('csv');
        res.status.should.equal(200, res.body);
        res.body.should.containEql(ROW_ID);
        res.body.should.not.containEql(PRID);
        res.body.should.not.containEql('prid');
    });
});
