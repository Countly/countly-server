/**
 * @typedef {import('../../../../types/pluginManager').Database} Database
 */

const Job = require('../../../../jobServer/Job');
const common = require('../../../../api/utils/common.js');
const { TRIGGERED_BY_EVENT } = require('../parts/common-lib.js');
const ALERT_MODULES = {
    "views": require("../alertModules/views.js"),
    "users": require("../alertModules/users.js"),
    "sessions": require("../alertModules/sessions.js"),
    "survey": require("../alertModules/survey.js"),
    "nps": require("../alertModules/nps.js"),
    "revenue": require("../alertModules/revenue.js"),
    "events": require("../alertModules/events.js"),
    "rating": require("../alertModules/rating.js"),
    "cohorts": require("../alertModules/cohorts.js"),
    "dataPoints": require("../alertModules/dataPoints.js"),
    "crashes": require("../alertModules/crashes.js"),
};

/**
 * Alert Processor Job
 */
class AlertProcessor extends Job {

    /**
     * Run the alert processor job
     * @returns {GetScheduleConfig} Schedule configuration object
     */
    getSchedule() {
        return {
            type: 'schedule',
            value: "0 * * * *" // Every hour
        };
    }

    /**
     * @param {Database} db The database connection
     * @param {Function} done Callback function to be called when the job is complete
     *                       Call with error as first parameter if job fails
     *                       Call with null and optional result as second parameter if job succeeds
     */
    async run(db, done) {
        try {
            const currentTime = new Date();
            this.log.d('Starting alerts processing at:', currentTime);

            // Calculate thresholds in JavaScript just before issuing the query
            const hourThreshold = new Date(currentTime.getTime() - 60 * 60 * 1000);
            const dayThreshold = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);
            const monthThreshold = new Date(currentTime);
            monthThreshold.setMonth(monthThreshold.getMonth() - 1);

            // Build query conditions with pre-calculated date thresholds
            const query = {
                enabled: true,
                alertDataSubType: { $nin: Object.values(TRIGGERED_BY_EVENT) },
                $or: [
                    {
                        period: 'hourly',
                        $or: [
                            { lastRunTime: { $exists: false } },
                            { lastRunTime: { $lte: hourThreshold } }
                        ]
                    },
                    {
                        period: 'daily',
                        $or: [
                            { lastRunTime: { $exists: false } },
                            { lastRunTime: { $lte: dayThreshold } }
                        ]
                    },
                    {
                        period: 'monthly',
                        $or: [
                            { lastRunTime: { $exists: false } },
                            { lastRunTime: { $lte: monthThreshold } }
                        ]
                    }
                ]
            };

            // Use a cursor to iterate through alerts one by one.
            const cursor = common.db.collection("alerts").find(query);
            let totalAlerts = 0;
            let successfulCount = 0;
            let failedCount = 0;
            let failures = [];

            while (await cursor.hasNext()) {
                totalAlerts++;
                const alert = await cursor.next();
                try {
                    // Handle profile_groups mapping to cohorts
                    if (alert.alertDataType === 'profile_groups') {
                        alert.alertDataType = 'cohorts';
                    }

                    const module = ALERT_MODULES[alert.alertDataType];
                    if (!module) {
                        throw new Error(`Alert module not found: ${alert.alertDataType}`);
                    }

                    // Process the alert
                    await module.check({
                        alertConfigs: alert,
                        scheduledTo: currentTime,
                    });

                    // Update lastRunTime in the alert document after successful processing
                    await common.db.collection("alerts").updateOne(
                        { _id: alert._id },
                        { $set: { lastRunTime: currentTime } }
                    );

                    this.log.d('Successfully processed alert:', alert._id);
                    successfulCount++;
                }
                catch (err) {
                    this.log.e('Error processing alert:', alert._id, err);
                    failedCount++;
                    failures.push({ alertId: alert._id, error: err.message });
                }
            }

            this.log.d('Alerts processing completed:', {
                total: totalAlerts,
                successful: successfulCount,
                failed: failedCount
            });

            if (failedCount > 0) {
                const errors = failures.map(f => `Alert ${f.alertId}: ${f.error}`).join('\n');
                return done(new Error(`Failed to process some alerts:\n${errors}`));
            }
            return done();
        }
        catch (err) {
            this.log.e('Fatal error in alerts processing:', err);
            done(err);
        }
    }
}

module.exports = AlertProcessor;