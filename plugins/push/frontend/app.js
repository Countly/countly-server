'use strict';

const log = require('../../../api/utils/common.js').log('push:frontend');

module.exports = {
    init: (app, db) => {
        log.d('Ensuring messages index');
        db.collection("messages").ensureIndex({'result.status': 1, apps: 1, created: 1, source: 1, auto: 1, tx: 1}, {background: true}, function(err) {
            if (err) {
                log.e('Error at ensureIndex', err);
            }
            else {
                log.d('Ensured messages index');
            }
        });
    }
};