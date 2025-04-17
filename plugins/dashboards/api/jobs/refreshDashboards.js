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
         * @returns {varies} job done
         */
        function endJob() {
            log.d('Ending dashboards refresh job');
            clearTimeout(pingTimeout);
            pingTimeout = 0;
            return doneJob();
        }

        pluginManager.loadConfigs(countlyDb, async() => {
            //Fetch all sashboards.
            //Check for the ones that have set refresh rate.
            //Trigger regeneration for those dashboards.
            try {
                var dashboards = await countlyDb.collection('dashboards').find({}).toArray();
                for (var z = 0; z < dashboards.length; z++) {
                    if (dashboards[z].refreshRate && dashboards[z].refreshRate > 0) {
                        if (dashboards[z].refreshRate < 300) {
                            dashboards[z].refreshRate = 300;
                        }
                        log.d('Refreshing dashboard: ' + dashboards[z]._id);
                        await customDashboards.refreshDashboard(countlyDb, dashboards[z]);
                    }
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
