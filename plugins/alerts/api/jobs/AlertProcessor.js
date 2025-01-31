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
     * @param {Db} db The database connection
     * @param {Function} done Callback function to be called when the job is complete
     *                       Call with error as first parameter if job fails
     *                       Call with null and optional result as second parameter if job succeeds
     */
    async run(db, done) {
        try {
            const currentTime = new Date();
            this.log.d('Starting alerts processing at:', currentTime);

            // Determine which type of alerts to process based on current time
            const minute = currentTime.getMinutes();
            const hour = currentTime.getHours();
            const isLastDayOfMonth = currentTime.getDate() === new Date(currentTime.getFullYear(), currentTime.getMonth() + 1, 0).getDate();

            // Build query conditions
            const timeConditions = [];

            // Check for hourly alerts (run at minute 59)
            if (minute === 59) {
                timeConditions.push({ period: 'hourly' });
            }

            // Check for daily alerts (run at 23:59)
            if (hour === 23 && minute === 59) {
                timeConditions.push({ period: 'daily' });
            }

            // Check for monthly alerts (run at 23:59 on last day of month)
            if (isLastDayOfMonth && hour === 23 && minute === 59) {
                timeConditions.push({ period: 'monthly' });
            }

            // If no alerts should run at this time, exit early
            if (timeConditions.length === 0) {
                this.log.d('No alerts scheduled for current time');
                return done(null, 'No alerts scheduled for current time');
            }

            // Get all enabled alerts that match the time conditions
            const alerts = await common.db.collection("alerts").find({
                $and: [
                    { enabled: true },
                    { alertDataSubType: { $nin: Object.values(TRIGGERED_BY_EVENT) } },
                    { $or: timeConditions }
                ]
            }).toArray();

            this.log.d('Found alerts to process:', alerts.length);

            // Process each alert
            const results = await Promise.allSettled(alerts.map(async(alert) => {
                try {
                    // Handle profile_groups to cohorts mapping
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

                    this.log.d('Successfully processed alert:', alert._id);
                    return { alertId: alert._id, success: true };
                }
                catch (err) {
                    this.log.e('Error processing alert:', alert._id, err);
                    return { alertId: alert._id, success: false, error: err.message };
                }
            }));

            // Log summary of processing results
            const successful = results.filter(r => r.status === 'fulfilled');
            const failed = results.filter(r => r.status === 'rejected');

            this.log.d('Alerts processing completed:', {
                total: alerts.length,
                successful: successful.length,
                failed: failed.length
            });

            // If any alerts failed, log details
            if (failed.length > 0) {
                this.log.e('Failed alerts:', failed.map(f => f.reason));
                const errors = failed.map(f => f.reason).join('\n');
                return done(new Error(`Failed to process alerts:\n${errors}`));
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