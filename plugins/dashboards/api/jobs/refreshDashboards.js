const Job = require('../../../../jobServer/Job.js');
const pluginManager = require('../../../pluginManager.js');
var customDashboards = require('./../parts/dashboards.js');


/** class RefreshDashboardsJob */
class RefreshDashboardsJob extends Job {

    /**
     * Get the schedule configuration for the job.
     * @returns {Object} Schedule configuration object
     */
    getSchedule() {
        return {
            type: 'schedule',
            value: '*/5 * * * *' // Every 5 minutes
        };
    }

    /**
     * Check job status periodically
     * @param {number} total - total items
     * @param {number} current - current items processed
     * @param {string} bookmark - current bookmark
     * @param {function} progressJob - progress callback
     * @param {NodeJS.Timeout} pingTimeout - timeout reference
     */
    ping(total, current, bookmark, progressJob, pingTimeout) {
        this.log.d('Pinging dashboards refresh job');
        if (pingTimeout) {
            progressJob(total, current, bookmark);
            setTimeout(() => this.ping(total, current, bookmark, progressJob, pingTimeout), 10000);
        }
    }

    /**
     * End job cleanup
     * @param {NodeJS.Timeout} pingTimeout - timeout to clear
     * @param {function} doneJob - completion callback
     * @returns {*} result of doneJob callback
     */
    endJob(pingTimeout, doneJob) {
        this.log.d('Ending dashboards refresh job');
        clearTimeout(pingTimeout);
        return doneJob();
    }

    /** function run
     * @param {object} countlyDb - db connection object
     * @param {function} doneJob - function to call when finishing Job
     * @param {function} progressJob - function to call while running job
    */
    run(countlyDb, doneJob, progressJob) {
        var total = 0;
        var current = 0;
        var bookmark = '';
        this.log.d('Starting dashboards refresh job');

        var pingTimeout = setTimeout(() => this.ping(total, current, bookmark, progressJob, pingTimeout), 10000);

        pluginManager.loadConfigs(countlyDb, async() => {
            //Fetch all dashboards.
            //Check for the ones that have set refresh rate.
            //Trigger regeneration for those dashboards.
            try {
                var dashboards = await countlyDb.collection('dashboards').find({}).toArray();
                for (var z = 0; z < dashboards.length; z++) {
                    if (dashboards[z].refreshRate && dashboards[z].refreshRate > 0) {
                        if (dashboards[z].refreshRate < 300) {
                            dashboards[z].refreshRate = 300;
                        }
                        this.log.d('Refreshing dashboard: ' + dashboards[z]._id);
                        await customDashboards.refreshDashboard(countlyDb, dashboards[z]);
                    }
                }
            }
            catch (error) {
                this.log.e('Error while refreshing dashboards: ' + error);
            }
            return this.endJob(pingTimeout, doneJob);
        });
    }
}

module.exports = RefreshDashboardsJob;
