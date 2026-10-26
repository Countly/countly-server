/**
 * A deleted member's tasks stop refreshing themselves: /i/users/delete turns off
 * auto-refresh on every task the member created, and nobody else's.
 */
require('should');

const common = require('../../api/utils/common.js');
const taskmanager = require('../../api/utils/taskmanager.js');

const MEMBER_ID = 'a'.repeat(24);

describe('long tasks of a deleted member', function() {
    let originalDb;
    let writes;

    beforeEach(function() {
        originalDb = common.db;
        writes = [];
        common.db = {
            collection: (name) => ({
                updateMany: (query, update) => {
                    writes.push({name, query, update});
                    return Promise.resolve({modifiedCount: 1});
                }
            })
        };
    });

    afterEach(function() {
        common.db = originalDb;
    });

    it('is registered for /i/users/delete', function() {
        const plugins = require('../../plugins/pluginManager.js');
        const original = plugins.register;
        const registered = [];
        plugins.register = (event, cb) => registered.push({event, cb});
        const path = require.resolve('../../api/utils/taskmanager.js');
        try {
            delete require.cache[path];
            const fresh = require(path);
            registered.should.containEql({event: '/i/users/delete', cb: fresh.onMemberDeleted});
        }
        finally {
            plugins.register = original;
            delete require.cache[path];
        }
    });

    it('turns off auto-refresh on the member\'s own tasks only', async function() {
        await taskmanager.onMemberDeleted({data: {_id: MEMBER_ID, email: 'm@example.com'}});
        writes.should.eql([{name: 'long_tasks', query: {creator: MEMBER_ID, autoRefresh: true}, update: {$set: {autoRefresh: false}}}]);
    });

    it('does nothing for a member that no longer exists', async function() {
        await taskmanager.onMemberDeleted({data: {}});
        await taskmanager.onMemberDeleted({});
        writes.should.eql([]);
    });

    it('rejects the deletion when the tasks cannot be stopped', async function() {
        common.db = {collection: () => ({updateMany: () => Promise.reject(new Error('down'))})};
        await taskmanager.onMemberDeleted({data: {_id: MEMBER_ID}}).should.be.rejected();
    });
});
