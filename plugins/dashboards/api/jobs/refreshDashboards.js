const job = require('../../../../api/parts/jobs/job.js');
const log = require('../../../../api/utils/log.js')('job:dashboards:refreshDashboards');
const pluginManager = require('../../../pluginManager.js');
var customDashboards = require('./../parts/dashboards.js');


/** class RefreshDashboardsJob */
class RefreshDashboardsJob extends job.Job {
    /** function run
     * @param {object} countlyDb - db connection object
     * @param {function} doneJob - function to call when finishing Job
     * @param {function} progressJob - fnction to call while running job
    */
    run(countlyDb, doneJob, progressJob) {
        var total = 0;
        var current = 0;
        var bookmark = '';
        log.d('Starting dashboards refresh job');

        /**
         * check job status periodically
         */
        function ping() {
            log.d('Pinging dashboards refresh job');
            if (pingTimeout) {
                progressJob(total, current, bookmark);
                pingTimeout = setTimeout(ping, 10000);
            }
        }
        var pingTimeout = setTimeout(ping, 10000);

        /**
         * end job
         * @param {Error=} err - optional error to pass to the job framework
         * @returns {varies} job done
         */
        function endJob(err) {
            log.d('Ending dashboards refresh job');
            clearTimeout(pingTimeout);
            pingTimeout = 0;
            return doneJob(err);
        }

        pluginManager.loadConfigs(countlyDb, async() => {
            // Fetch all dashboards, refresh the ones that have an auto refresh rate set.
            // Reliability/stability notes:
            //  - Dashboards are refreshed with BOUNDED concurrency so we never fan out an
            //    unbounded number of heavy aggregations against mongod (which, unbounded,
            //    can starve live customer queries / tip a small instance over).
            //  - Concurrency is configurable (dashboards.refresh_concurrency) with a small,
            //    safe default so resource-constrained instances stay safe out of the box.
            //  - Per-dashboard failures are isolated: one broken dashboard must not abort the
            //    whole pass (the previous sequential version aborted every remaining dashboard
            //    on the first throw).
            try {
                var dashboards = await countlyDb.collection('dashboards').find({}).toArray();

                var toRefresh = dashboards.filter(function(d) {
                    return d.refreshRate && d.refreshRate > 0;
                });
                total = toRefresh.length;

                var cfg = pluginManager.getConfig('dashboards') || {};
                var LIMIT = parseInt(cfg.refresh_concurrency, 10);
                if (!LIMIT || LIMIT < 1) {
                    LIMIT = 2; // conservative default; safe on small instances, tune up on large ones
                }

                for (var i = 0; i < toRefresh.length; i += LIMIT) {
                    var batch = toRefresh.slice(i, i + LIMIT);
                    // eslint-disable-next-line no-await-in-loop
                    await Promise.all(batch.map(async function(dashboard) {
                        if (dashboard.refreshRate < 300) {
                            dashboard.refreshRate = 300;
                        }
                        try {
                            log.d('Refreshing dashboard: ' + dashboard._id);
                            await customDashboards.refreshDashboard(countlyDb, dashboard);
                        }
                        catch (e) {
                            log.e('Error refreshing dashboard ' + dashboard._id + ': ' + e);
                        }
                        current++;
                    }));
                }
            }
            catch (error) {
                log.e('Error while refreshing dashboards: ' + error);
            }
            return endJob();
        });
    }
}

module.exports = RefreshDashboardsJob;
