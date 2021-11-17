const { Pool } = require("./pool"),
    log = require('../../../../api/utils/log.js')('push:send:pools');

/**
 * Global storage for all the shared pools on the server
 */
class Pools {
    /**
     * Constructor
     */
    constructor() {
        this.pools = {};
    }

    /**
     * Get pool id
     * 
     * @param {string} app app id
     * @param {string} platform platform key
     * @param {string} field field key
     * @returns {string} pool id
     */
    id(app, platform, field) {
        return app + '|' + platform + field;
    }

    /**
     * Check if Pools instance already has a pool with the id provided
     * 
     * @param {string} id pool id to check
     * @returns {boolean} true if has
     */
    has(id) {
        return id in this.pools;
    }

    /**
     * Send message object to all pools of this app
     * 
     * @param {string} app app id
     * @param {object[]} messages array of message object
     */
    message(app, messages) {
        for (let k in this.pools) {
            if (k.indexOf(app) === 0) {
                this.pools[k].send_messages(messages);
            }
        }
    }

    /**
     * Connection pool constructor
     * 
     * @param {string} app app id of the pool
     * @param {string} platform platform of the pool
     * @param {string} field type of connection: ap, at, id, ia, ip, ht, hp
     * @param {string} key authorization key: server key for FCM/HW, P8/P12 for APN
     * @param {string} secret passphrase for P12
     * @param {Object[]} messages array of initial messages
     * @param {Object} options options object
     * @param {integer} options.bytes how much bytes can be processed simultaniously by a single connection
     * @param {integer} options.workers how much connections (workers) can be used in parallel
     * @param {Object} options.proxy proxy configuration
     */
    async connect(app, platform, field, key, secret, messages, options) {
        let id = this.id(app, platform, field);
        if (!(id in this.pools)) {
            log.i('Adding pool %s ', id);
            let pool = new Pool(id, platform + field, key, secret, messages, options),
                tm,
                ls = Date.now(),
                /**
                 * Timeout function to close unused pool
                 */
                timeout = () => {
                    if (!pool.destroyed && Date.now() - ls > 300000) { // 5 min
                        log.i('Destroying pool on timeout %s / %s', platform + field, id);
                        clearTimeout(tm);
                        pool.destroy();
                    }
                    else {
                        tm = setTimeout(timeout, 300000).unref();
                    }
                };
            pool.on('close', () => {
                if (this.pools[id] === pool) {
                    log.i('Destroying pool on close %s / %s', platform + field, id);
                    clearTimeout(tm);
                    delete this.pools[id];
                }
            });
            pool.on('data', () => {
                ls = Date.now();
            });
            await pool.grow();
            tm = setTimeout(timeout, 300000).unref();
            this.pools[id] = pool;
            log.i('Added pool %s ', id);
        }

        return this.pools[id];
    }

    /**
     * Release resources on process exit
     * 
     * @param {string} id pool id to stop
     * @param {function} callback callback to call when done
     */
    exit(id) {
        if (id) {
            if (this.pools[id]) {
                log.i('Destroying pool on exit %s', id);
                this.pools[id].destroy(null);
            }
        }
        else {
            for (id in this.pools) {
                log.i('Destroying pool on all exit %s', id);
                this.pools[id].destroy();
            }
        }
        this.pools = {};
    }
}

const pools = new Pools();

module.exports = { pools };


