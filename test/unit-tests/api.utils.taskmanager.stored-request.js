/**
 * A long task stores the request it was made with, so it can be rerun. The stored
 * request keeps the query parameters but not the caller's credentials: a rerun is
 * signed with its creator's own key.
 */
require('should');

const taskmanager = require('../../api/utils/taskmanager.js');

describe('long task stored request', function() {
    /**
     * A db stub that records long_tasks writes and lookups
     * @param {object} seen - receives {updates: [], queries: []}
     * @returns {object} db stub
     */
    function dbStub(seen) {
        return {
            ObjectID: (id) => id,
            collection: () => ({
                update: (query, update, options, callback) => {
                    seen.updates.push(update);
                    if (typeof callback === 'function') {
                        callback(null);
                    }
                },
                findOne: (query, projection, callback) => {
                    seen.queries.push(query);
                    callback(null, null);
                }
            })
        };
    }

    /**
     * Request params carrying both kinds of credential
     * @returns {object} params
     */
    function params() {
        return {
            qstring: {app_id: 'a'.repeat(24), api_key: 'secret-key', auth_token: 'secret-token', period: '30days'},
            fullPath: '/o/test',
            member: {_id: 'm'.repeat(24)},
            app_id: 'a'.repeat(24)
        };
    }

    it('stores no api_key or auth_token when a request becomes a long task', function() {
        const seen = {updates: [], queries: []};
        taskmanager.longtask({
            db: dbStub(seen),
            force: true,
            params: params(),
            type: 'test',
            meta: '',
            name: 'test',
            outputData: function() {}
        });
        const stored = seen.updates.map((u) => u.$set && u.$set.request).filter(Boolean)[0];
        const json = JSON.parse(stored).json;
        json.should.have.property('period', '30days');
        json.should.not.have.property('api_key');
        json.should.not.have.property('auth_token');
    });

    it('looks for a running task by a request without api_key or auth_token', function() {
        const seen = {updates: [], queries: []};
        taskmanager.checkIfRunning({db: dbStub(seen), params: params()}, function() {});
        const json = JSON.parse(seen.queries[0].request).json;
        json.should.have.property('period', '30days');
        json.should.not.have.property('api_key');
        json.should.not.have.property('auth_token');
    });
});
