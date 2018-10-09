const res = require('../../../../api/parts/jobs/resource.js'),
    log = require('../../../../api/utils/log.js')('job:data_migration:resource:' + process.pid);

/** resource class */
class MigrationResource extends res.Resource {
    /** 
     * Constroctor
     * @param {string} _id - id
     * @param {string} name -name
     * @param {object} args - args
     * @param {object} db - db connection
     */
    constructor(_id, name, args, db) {
        super(_id, name);
        this.db = db;
        // TODO: custom data
        this.x = this.data.x;
        log.d('[%d]: Initializing data_migration resource with %j / %j / %j', process.pid, _id, name, args);
    }

    /** 
     * Open resource: prepare some data, open connections, etc.
     * @returns {Promise} promise
     */
    open() {
        log.d('[%s]: Opening %j', this._id, this.x);
        return Promise.resolve();
    }

    /** 
     * Close resource: release data, close connections, etc.
     * @returns {Promise} promise
     */
    close() {
        return Promise.resolve();
    }

    /** 
     * Some custom method to call from job
     * @param {object} stuff - message
     * @returns {Promise} promise
     */
    migrate(stuff) {
        log.d('migrating: %j', stuff);
        console.log("running export");
        return Promise.resolve();
    }

    /** 
     * Keep-alive / cheking resource is still online
     * @returns {Promise} - promise
     */
    checkActive() {
        return new Promise((resolve) => {
            log.d('checkActive');
            setTimeout(() => {
                resolve(true);
            }, 2000);
        });
    }

    /** 
     * Don't terminate resource process on master exit
     * @returns {boolean} false
     */
    canBeTerminated() {
        return false;
    }
}

module.exports = MigrationResource;