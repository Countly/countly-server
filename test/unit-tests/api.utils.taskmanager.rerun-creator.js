/**
 * A task is rerun only with its creator's own api_key. A task whose creator is
 * gone does not run again, global or not; a task whose creator exists still does.
 */
const should = require('should');

const common = require('../../api/utils/common.js');
const taskmanager = require('../../api/utils/taskmanager.js');

const APP_ID = 'a'.repeat(24);
const CREATOR_ID = 'c'.repeat(24);
const GONE_ID = 'f'.repeat(24);

describe('long task rerun signing', function() {
    let originalProcessRequest;
    let originalDb;
    let tasks;
    let members;

    /**
     * Collections the rerun touches.
     * @returns {object} db stub
     */
    function dbStub() {
        const lookup = {long_tasks: () => tasks, members: () => members};
        return {
            ObjectID: (id) => id,
            collection: (name) => ({
                findOne: (query, callback) => {
                    const rows = lookup[name]();
                    if (query.global_admin) {
                        return callback(null, rows.find((row) => row.global_admin) || null);
                    }
                    callback(null, rows.find((row) => row._id === query._id) || null);
                },
                update: (query, update, callback) => callback(null)
            })
        };
    }

    /**
     * Rerun a task and resolve with the request it was replayed with, or the refusal.
     * @param {string} id - task id
     * @returns {Promise<object>} {json} of the replayed request, or {refused}
     */
    function rerun(id) {
        return new Promise((resolve) => {
            common.processRequest = (params) => resolve({json: params.req.json});
            taskmanager.rerunTask({db: common.db, id}, (err, message) => {
                if (message !== 'Success') {
                    resolve({refused: message});
                }
            });
        });
    }

    /**
     * A stored task.
     * @param {object} fields - task fields
     * @returns {object} long_tasks document
     */
    function task(fields) {
        return Object.assign({request: JSON.stringify({uri: 'http://localhost/o/drill', json: {app_id: APP_ID}})}, fields);
    }

    beforeEach(function() {
        originalProcessRequest = common.processRequest;
        originalDb = common.db;
        common.db = dbStub();
        members = [{_id: CREATOR_ID, api_key: 'CREATORKEY'}, {_id: 'e'.repeat(24), api_key: 'ADMINKEY', global_admin: true}];
    });

    afterEach(function() {
        common.processRequest = originalProcessRequest;
        common.db = originalDb;
    });

    it('signs a task of an existing member with that member\'s key', async function() {
        tasks = [task({_id: 't1', creator: CREATOR_ID, global: true, autoRefresh: true})];
        const {json} = await rerun('t1');
        json.api_key.should.equal('CREATORKEY');
    });

    it('never falls back to a global admin for a global task whose creator is gone', async function() {
        tasks = [task({_id: 't2', creator: GONE_ID, global: true, autoRefresh: true})];
        const result = await rerun('t2');
        should.not.exist(result.json);
        result.refused.should.equal('No permission to run this task');
    });

    it('does not rerun a private task whose creator is gone', async function() {
        tasks = [task({_id: 't3', creator: GONE_ID, global: false})];
        (await rerun('t3')).refused.should.equal('No permission to run this task');
    });
});
