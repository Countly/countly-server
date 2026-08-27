var should = require('should');
var InternalEventTrigger = require('../../plugins/hooks/api/parts/triggers/internal_event.js');

var withoutSecrets = InternalEventTrigger.withoutSecrets;

// An app document carries the sdk key, every rotated key, the immutable id_key and the
// checksum salt. Effects can emit the payload verbatim, since the http effect's body is a
// template and {{payload_json}} stringifies the whole thing to a url the hook's author
// chose, so none of that may reach the effect pipeline.
//
// The dispatch payload itself must stay whole, because systemlogs records it so a deleted
// or reset app can be recovered, so these cases also check the original is not mutated.
var SECRET_FIELDS = ['key', 'keys', 'id_key', 'salt', 'checksum_salt'];

/**
 * Collect the paths of any credential field left anywhere in an object
 * @param {object} obj - object to walk
 * @returns {Array} dotted paths of the fields found
 */
function secretsIn(obj) {
    var found = [];
    /**
     * Walk one level
     * @param {object} o - current value
     * @param {string} path - path so far
     * @returns {void}
     */
    function walk(o, path) {
        if (!o || typeof o !== 'object') {
            return;
        }
        Object.keys(o).forEach(function(k) {
            if (SECRET_FIELDS.indexOf(k) !== -1) {
                found.push((path ? path + '.' : '') + k);
            }
            walk(o[k], (path ? path + '.' : '') + k);
        });
    }
    walk(obj, '');
    return found;
}

/**
 * A representative app document
 * @returns {object} app document with every credential field populated
 */
function appDoc() {
    return {
        _id: '6a41837e902bfd5369ddc610',
        name: 'Test App',
        timezone: 'UTC',
        key: 'SDK_APP_KEY',
        id_key: 'IMMUTABLE_KEY',
        keys: [{key: 'SDK_APP_KEY', added_at: 1, last_data: 0}],
        salt: 'CHECKSUM_SALT',
        checksum_salt: 'CHECKSUM_SALT'
    };
}

/**
 * The update object /i/apps/update dispatches alongside the app document.
 *
 * Built the way api/parts/mgmt/apps.js builds it: the accepted key list is rebuilt on
 * EVERY update, so keys is always present; key appears whenever the key is rotated; and
 * id_key is filled in the first time an app that predates it is touched. The one thing
 * apps.js does delete is checksum_salt.
 * @returns {object} update object as dispatched
 */
function appUpdateDoc() {
    return {
        name: 'renamed',
        edited_at: 1755000000,
        key: 'ROTATED_APP_KEY',
        id_key: 'IMMUTABLE_KEY',
        keys: [
            {key: 'SDK_APP_KEY', added_at: 1, last_data: 0},
            {key: 'ROTATED_APP_KEY', added_at: 2, last_data: 0}
        ]
    };
}

describe('Hooks internal event payload', function() {
    describe('removes app credentials before the effect pipeline', function() {
        var cases = [
            // crashes/new and /i/apps/update nest the app under data.app
            ['/crashes/new', function() {
                return {data: {crash: {_id: 'c1'}, user: {uid: 'u1'}, app: appDoc()}, eventType: '/crashes/new'};
            }],
            // /i/apps/update sends two app shaped objects, and the update is not the
            // safer of the two: it carries the whole accepted key list on every update
            ['/i/apps/update', function() {
                return {data: {app: appDoc(), update: appUpdateDoc()}, appId: appDoc()._id, eventType: '/i/apps/update'};
            }],
            // while delete and reset pass the app document as data itself
            ['/i/apps/delete', function() {
                return {data: appDoc(), appId: appDoc()._id, eventType: '/i/apps/delete'};
            }],
            ['/i/apps/reset', function() {
                return {data: appDoc(), appId: appDoc()._id, eventType: '/i/apps/reset'};
            }],
            ['/i/apps/create', function() {
                return {data: appDoc(), appId: appDoc()._id, eventType: '/i/apps/create'};
            }]
        ];

        cases.forEach(function(entry) {
            var label = entry[0];
            var build = entry[1];
            it('strips them from ' + label, function() {
                var params = build();
                should(secretsIn(params).length).be.above(0); // the fixture is representative
                var out = withoutSecrets(params, params.eventType);
                should(secretsIn(out)).eql([]);
            });
            it('leaves the dispatched payload itself intact for ' + label, function() {
                var params = build();
                var before = secretsIn(params).length;
                withoutSecrets(params, params.eventType);
                // other subscribers of the same dispatch, systemlogs in particular, still
                // need the whole document
                should(secretsIn(params).length).equal(before);
            });
        });

        it('strips data.update even though data.app is present beside it', function() {
            // the two are not alternatives: an early version scrubbed whichever it found
            // first, which left every key in data.update on every single app update
            var params = {data: {app: appDoc(), update: appUpdateDoc()}, eventType: '/i/apps/update'};
            var out = withoutSecrets(params, '/i/apps/update');
            should(secretsIn(out.data.app)).eql([]);
            should(secretsIn(out.data.update)).eql([]);
            should(out.data.update).have.property('name', 'renamed');
            should(out.data.update).have.property('edited_at', 1755000000);
        });

        it('keeps the fields an effect actually uses', function() {
            var out = withoutSecrets({data: appDoc(), appId: 'a1', eventType: '/i/apps/delete'}, '/i/apps/delete');
            should(out.data).have.property('_id');
            should(out.data).have.property('name', 'Test App');
            should(out.data).have.property('timezone', 'UTC');
            should(out).have.property('appId', 'a1');
        });
    });

    describe('leaves unrelated payloads alone', function() {
        // "key" is an ordinary field elsewhere: an event has one, so a blanket scrub would
        // break any hook that references it
        var untouched = [
            ['an event with its own key', {data: {key: 'purchase', count: 1, sum: 9.99}, eventType: '/i/events'}],
            ['incoming sdk data', {data: {events: [{key: 'login'}]}, eventType: '/sdk/data_ingestion'}],
            ['an app user update', {data: {user: {uid: 'u1', custom: {key: 'value'}}}, eventType: '/i/app_users/update'}],
            ['a cohort transition', {data: {cohort: {_id: 'co1', name: 'n'}, user: {uid: 'u1'}}, eventType: '/cohort/enter'}]
        ];
        untouched.forEach(function(entry) {
            it('does not change ' + entry[0], function() {
                var params = JSON.parse(JSON.stringify(entry[1]));
                var out = withoutSecrets(params, params.eventType);
                should(JSON.stringify(out)).equal(JSON.stringify(entry[1]));
            });
        });
    });

    describe('handles payloads that are not objects', function() {
        it('returns them unchanged', function() {
            should(withoutSecrets(undefined, '/i/apps/delete')).equal(undefined);
            should(withoutSecrets(null, '/i/apps/delete')).equal(null);
            should(withoutSecrets('a string', '/i/apps/delete')).equal('a string');
        });
    });
});
