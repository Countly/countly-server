const should = require('should'),
    { Message } = require('../api/send/data'),
    { Splitter } = require('../api/send/platforms/utils/splitter'),
    FCM = require('../api/send/platforms/a');

function decode() {
    return Buffer.from('QUFBQTFFZE83dWs6QVBBOTFiRUVfWE5LU3U5aXdncTJuOGctYUdYaW9SeE9jN2swODBweHV2MklOcVVLZUV0alEtdDBxWWJ2cE01X2JYNmxKV0ZuUWNTSTIwU1g0c1drMXEyZThBT080Mk1FYjJGQm5faUc5cUV5M3dEZG5fZTl4WlZRWWNMX1FMQjJnVWIySkpVWTE2TTQ=', 'base64').toString('ascii');
}

describe('PUSH PLATFORMS', () => {
    class SplitterTest extends Splitter {
        constructor(log, type, creds, messages, options) {
            super(log, type, creds, messages, Object.assign(options, {concurrency: 500}));

            this.log = require('../../../api/utils/log')('test').sub(`wt`);
        }

        send(pushes, start, end, bytes) {
            for (let i = start + 1; i < end; i++) {
                should.equal(pushes[start].n, pushes[i].n);
                should.equal(pushes[start].h, pushes[i].h);
            }
            return Promise.resolve([{ids: pushes.slice(start, end), bytes}]);
        }
    }

    it('splitter splits', done => {
        let m1 = Message.test(),
            m2 = Message.test(),
            m3 = Message.test(),
            cr = new FCM.CREDS.fcm({
                key: 'test'
            }),
            data = [
                {_id: 0, n: '1', h: 0},

                {_id: 1, n: '1', h: 1},

                {_id: 2, n: '2', h: 2},
                {_id: 3, n: '2', h: 2},

                {_id: 4, n: '1', h: 2},

                {_id: 5, n: '1', h: 0},
                {_id: 6, n: '1', h: 0},

                {_id: 7, n: '3', h: 0},
                {_id: 8, n: '3', h: 0},
                {_id: 9, n: '3', h: 0},
            ];
        m1._data._id = '1';
        m2._data._id = '2';
        m3._data._id = '3';

        let splitter = new SplitterTest('push:test', 'tt', cr, [m1.json, m2.json, m3.json], {}),
            results = [];
        splitter.on('data', dt => results.push(dt));
        splitter.on('error', err => should.fail('error thrown', err));
        splitter.end({payload: data, length: JSON.stringify(data).length});

        setTimeout(() => {
            should.equal(results.length, 1);
            let {p, l} = results[0];
            should.equal(p.length, 6);
            should.deepEqual(p[0].ids, data.slice(0, 1));
            should.deepEqual(p[1].ids, data.slice(1, 2));
            should.deepEqual(p[2].ids, data.slice(2, 4));
            should.deepEqual(p[3].ids, data.slice(4, 5));
            should.deepEqual(p[4].ids, data.slice(5, 7));
            should.deepEqual(p[5].ids, data.slice(7, 10));
            done();
        }, 100);
    });

    it('FCM validates incorrect key', done => {
        let cr = new FCM.CREDS.fcm({
                key: 'test'
            }),
            c = new FCM.connection('push:test', 'a', cr, [], {});
        c.connect().then(ok => {
            should.equal(ok, false);
            done();
        }, done);
    }).timeout(3000);

    it('FCM validates correct key', done => {
        let cr = new FCM.CREDS.fcm({
                key: decode()
            }),
            c = new FCM.connection('push:test', 'a', cr, [], {});
        c.connect().then(ok => {
            should.equal(ok, true);
            done();
        }, done);
    }).timeout(3000);
});
