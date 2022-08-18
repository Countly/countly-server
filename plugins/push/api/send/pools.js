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
        this.pools = {}; // {hash: connection}
        this.poolsBack = {}; // {appid: [hash, hash]}
        this.connectionCounter = 0;
    }

    /**
     * Get pool id
     * 
     * @param {string} creds creds hash
     * @param {string} platform platform key
     * @param {string} field field key
     * @returns {string} pool id
     */
    id(creds, platform, field) {
        return creds + '|' + platform + field;
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
     * Connection pool constructor
     * 
     * @param {string} app app id of the pool
     * @param {string} platform platform of the pool
     * @param {string} field type of connection: ap, at, id, ia, ip, ht, hp
     * @param {Creds} creds credentials instance
     * @param {State} state state instance
     * @param {Object} cfg cfg object
     * @param {integer} cfg.bytes how much bytes can be processed simultaniously by a single connection
     * @param {integer} cfg.workers how much connections (workers) can be used in parallel
     * @param {Object} cfg.proxy proxy configuration
     */
    async connect(app, platform, field, creds, state, cfg) {
        this.cfg = cfg;
        let id = this.id(creds.hash, platform, field);
        if (!(id in this.pools)) {
            log.i('Adding pool %s %s %s => %s ', app, platform, field, id);
            if (!this.poolsBack[app]) {
                this.poolsBack[app] = [];
            }
            this.poolsBack[app].push(id);
            let pool = new Pool(id, platform + field, creds, state, cfg),
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
                    this.connectionCounter--;
                    this.poolsBack[app] = this.poolsBack[app].filter(i => i !== id);
                }
            });
            pool.on('data', () => {
                ls = Date.now();
            });
            await pool.grow();
            tm = setTimeout(timeout, 300000).unref();
            this.pools[id] = pool;
            this.connectionCounter++;
            log.i('Added pool %s ', id);
        }

        return this.pools[id];
    }

    /**
     * Check is we can't increase number of workers anymore
     */
    get isFull() {
        return this.cfg && this.connectionCounter >= this.cfg.pool.pools;
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
    }
}

const pools = new Pools();

module.exports = { pools };


