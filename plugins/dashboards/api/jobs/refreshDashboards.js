'use strict';
/*
 * dashboards:refreshDashboards runs as an IPCJob, i.e. in a forked executor
 * subprocess (its own process/core) rather than inline in the single master
 * process. This stops the (potentially heavy) dashboard refresh from blocking
 * the master event loop and starving light jobs. Within the job, dashboards are
 * refreshed with bounded, configurable concurrency and per-dashboard error
 * isolation. getConcurrency()=1 guarantees at most one refresh pass at a time.
 */

const job = require('../../../../api/parts/jobs/job.js');
const res = require('../../../../api/parts/jobs/resource.js');
const log = require('../../../../api/utils/log.js')('job:dashboards:refreshDashboards');
const pluginManager = require('../../../pluginManager.js');
var customDashboards = require('./../parts/dashboards.js');

/**
 * Minimal lifecycle resource. The job only needs a DB connection (via this.db()),
 * so the resource owns no external handle - it just satisfies the IPCJob contract.
 */
class DashboardsRefreshResource extends res.Resource {
    /** open @returns {Promise} resolved once marked open */
    open() {
        this.opened();
        return Promise.resolve();
    }
    /** close @returns {Promise} resolved once marked closed */
    close() {
        this.closed();
        return Promise.resolve();
    }
    /** checkActive @returns {Promise} resolves true so the resource can be reused */
    checkActive() {
        return Promise.resolve(true);
    }
}

/** class RefreshDashboardsJob - runs in a forked executor subprocess */
class RefreshDashboardsJob extends job.IPCJob {
    /** resourceName @returns {string} non-unique resource type name */
    resourceName() {
        return 'dashboards:refresh';
    }
    /** createResource @param {string} _id id @param {string} name name @returns {Resource} resource */
    createResource(_id, name) {
        return new DashboardsRefreshResource(_id, name);
    }
    /** releaseResource @param {object} resource resource to release @returns {Promise} promise */
    releaseResource(resource) {
        return resource.close();
    }
    /** getConcurrency @returns {number} at most one refresh pass at a time */
    getConcurrency() {
        return 1;
    }

    /** run - executes inside the forked executor subprocess @returns {Promise} promise */
    async run() {
        const db = this.db();
        log.d('[%d] Starting dashboards refresh job', process.pid);

        // Ensure plugin configs are loaded in this subprocess before reading them.
        await new Promise(function(resolve) {
            pluginManager.loadConfigs(db, resolve);
        });

        var dashboards = await db.collection('dashboards').find({}).toArray();
        var toRefresh = dashboards.filter(function(d) {
            return d.refreshRate && d.refreshRate > 0;
        });

        // Bounded, configurable concurrency; conservative default keeps small instances safe.
        var cfg = pluginManager.getConfig('dashboards') || {};
        var LIMIT = parseInt(cfg.refresh_concurrency, 10);
        if (!LIMIT || LIMIT < 1) {
            LIMIT = 2;
        }

        for (var i = 0; i < toRefresh.length; i += LIMIT) {
            var batch = toRefresh.slice(i, i + LIMIT);
            // eslint-disable-next-line no-await-in-loop
            await Promise.all(batch.map(async function(dashboard) {
                if (dashboard.refreshRate < 300) {
                    dashboard.refreshRate = 300;
                }
                try {
                    log.d('[%d] Refreshing dashboard: %s', process.pid, dashboard._id);
                    await customDashboards.refreshDashboard(db, dashboard);
                }
                catch (e) {
                    // Isolate per-dashboard failures so one bad dashboard can't abort the pass.
                    log.e('Error refreshing dashboard ' + dashboard._id + ': ' + e);
                }
            }));
        }

        log.d('[%d] Dashboards refresh job done', process.pid);
    }
}

module.exports = RefreshDashboardsJob;
