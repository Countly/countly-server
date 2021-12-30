'use strict';

const log = require('../../../api/utils/common.js').log('push:frontend');

module.exports = {
    init: (app, db) => {
        log.d('Ensuring messages index');

        db.collection('messages').createIndexes([
            {name: 'main', key: {app: 1, 'trigger.kind': 1, 'trigger.start': 1}},
        ]).catch(() => {});

        db.collection('push').createIndexes([
            {name: 'main', key: {_id: 1, a: 1, p: 1, f: 1}},
            {name: 'message', key: {m: 1}},
            {name: 'main_unique', key: {m: 1, u: 1, p: 1, f: 1}, unique: true},
        ]).catch(() => {});
    }
};