const should = require('should'),
    { Message } = require('../api/send/data'),
    { FRAME } = require('../api/send/proto'),
    { Splitter } = require('../api/send/platforms/utils/splitter'),
    FCM = require('../api/send/platforms/a');

/**
 * A FCM service-account.json data URI
 * @param {object} account - its JSON content
 * @returns {string} data URI
 */
function serviceAccount(account) {
    return 'data:application/json;base64,' + Buffer.from(JSON.stringify(account)).toString('base64');
}

describe('PUSH PLATFORMS', () => {

    it('initializes common', () => require('../../pluginManager').connectToAllDatabases());

    class SplitterTest extends Splitter {
        constructor(log, type, creds, messages, options) {
            super(log, type, creds, messages, Object.assign(options, {pool: {concurrency: 500}}));

            this.log = require('../../../api/utils/log')('test').sub(`wt`);
        }

        send(pushes, start, end, bytes) {
            for (let i = start + 1; i < end; i++) {
                should.equal(pushes[start].n, pushes[i].n);
                should.equal(pushes[start].h, pushes[i].h);
            }
            return Promise.resolve([{ids: pushes.slice(start, end), bytes}]);
        }

        connect() {
            return Promise.resolve(true);
        }
    }

    // it('splitter splits', done => {
    //     let m1 = Message.test(),
    //         m2 = Message.test(),
    //         m3 = Message.test(),
    //         cr = new FCM.CREDS.fcm({
    //             key: 'test'
    //         }),
    //         data = [
    //             {_id: 0, n: '1', h: 0},

    //             {_id: 1, n: '1', h: 1},

    //             {_id: 2, n: '2', h: 2},
    //             {_id: 3, n: '2', h: 2},

    //             {_id: 4, n: '1', h: 2},

    //             {_id: 5, n: '1', h: 0},
    //             {_id: 6, n: '1', h: 0},

    //             {_id: 7, n: '3', h: 0},
    //             {_id: 8, n: '3', h: 0},
    //             {_id: 9, n: '3', h: 0},
    //         ];
    //     m1._data._id = '1';
    //     m2._data._id = '2';
    //     m3._data._id = '3';

    //     let splitter = new SplitterTest('push:test', 'tt', cr, [m1.json, m2.json, m3.json], {}),
    //         results = [];
    //     splitter.on('data', dt => results.push(dt));
    //     splitter.on('error', err => should.fail('error thrown', err));
    //     splitter.on('close', () => {
    //         should.equal(results.length, 1);
    //         let {p} = results[0];
    //         should.equal(p.length, 6);
    //         should.deepEqual(p[0].ids, data.slice(0, 1));
    //         should.deepEqual(p[1].ids, data.slice(1, 2));
    //         should.deepEqual(p[2].ids, data.slice(2, 4));
    //         should.deepEqual(p[3].ids, data.slice(4, 5));
    //         should.deepEqual(p[4].ids, data.slice(5, 7));
    //         should.deepEqual(p[5].ids, data.slice(7, 10));
    //         done();
    //     });
    //     splitter.end({frame: FRAME.SEND, payload: data, length: JSON.stringify(data).length});
    // });

    // FCM credentials are a Firebase service account; the legacy server key API was shut
    // down by Google in 2024. Checking an account against Google needs a real one, so these
    // cover the validation that decides what can be saved.
    it('FCM refuses credentials without a service account file, including a legacy server key', () => {
        should.deepEqual(new FCM.CREDS.fcm({type: 'fcm'}).validate(), ['Updating FCM credentials requires a service-account.json file']);
        should.deepEqual(new FCM.CREDS.fcm({type: 'fcm', key: 'AAAA-legacy-server-key'}).validate(), ['Updating FCM credentials requires a service-account.json file']);
    });

    it('FCM refuses a service account file that is not a usable json', () => {
        should.deepEqual(new FCM.CREDS.fcm({type: 'fcm', serviceAccountFile: 'data:text/plain;base64,e30='}).validate(), ['Service account file needs to be valid json file with .json file extension']);
        should.deepEqual(new FCM.CREDS.fcm({type: 'fcm', serviceAccountFile: 'data:application/json;base64,' + Buffer.from('{x').toString('base64')}).validate(), ['Service account file includes an invalid JSON data']);
        should.deepEqual(new FCM.CREDS.fcm({type: 'fcm', serviceAccountFile: serviceAccount({project_id: 'p', client_email: 'e@p'})}).validate(), ["Service account json doesn't contain project_id, private_key and client_email"]);
    });

    it('FCM accepts a complete service account and hashes it', () => {
        const file = serviceAccount({project_id: 'countly-test', private_key: '-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----\n', client_email: 'push@countly-test.iam.gserviceaccount.com'}),
            creds = new FCM.CREDS.fcm({type: 'fcm', serviceAccountFile: file}),
            same = new FCM.CREDS.fcm({type: 'fcm', serviceAccountFile: file});
        should.not.exist(creds.validate());
        should.not.exist(same.validate());
        // the hash identifies the account, so uploading the same file again matches it
        creds._data.hash.should.match(/^[0-9a-f]{64}$/);
        should.equal(same._data.hash, creds._data.hash);
    });
});
