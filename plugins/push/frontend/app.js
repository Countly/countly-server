'use strict';

const log = require('../../../api/utils/common.js').log('push:frontend');

module.exports = {
    init: (app, db) => {
        log.d('Ensuring messages index');

        db.collection('messages').createIndexes([
            {name: 'main', key: {app: 1, state: 1, 'trigger.kind': 1, 'trigger.start': 1}},
        ]).catch(() => {});

        db.collection('push').createIndexes([
            {name: 'main', key: {_id: 1, m: 1, p: 1, f: 1}},
        ]).catch(() => {});

        db.collection('plugins').updateMany({}, {$unset: {'push.proxyhttp': 1}}).catch(() => {});
    }
};