/* api.js */

const Logger = require('../api/utils/log.js');
const log = new Logger('jobs:api');

const plugins = require("../plugins/pluginManager");
const {validateGlobalAdmin} = require("../api/utils/rights");
const common = require("../api/utils/common");
const cronstrue = require('cronstrue');
const moment = require('moment');

// ----------------------------------
// Helper Functions
// ----------------------------------

/**
 * Determine job status from the doc's timestamps
 * @param {Object} job Document from pulseJobs
 * @returns {String} "RUNNING", "FAILED", "COMPLETED", or "SCHEDULED"
 */
function getJobStatus(job) {
    if (job.lockedAt) {
        return "RUNNING";
    }
    if (job.failedAt) {
        return "FAILED";
    }
    if (job.lastFinishedAt) {
        return "COMPLETED";
    }
    return "SCHEDULED";
}

/**
 * Determine run status for a single job doc
 * @param {Object} job
 * @returns {String} "failed", "success", or "pending"
 */
function getRunStatus(job) {
    if (job.failedAt) {
        return "failed";
    }
    if (job.lastFinishedAt) {
        return "success";
    }
    return "pending";
}

/**
 * Returns job duration in seconds (string), or null if start/end not present
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {String|null} e.g. "2.34"
 */
function formatJobDuration(startDate, endDate) {
    if (!startDate || !endDate) {
        return null;
    }
    const ms = new Date(endDate) - new Date(startDate);
    return (ms / 1000).toFixed(2);
}

/**
 * Returns a human-friendly label for a cron expression using cronstrue, or the raw expression if invalid
 * @param {String} schedule
 * @returns {String}
 */
function getScheduleLabel(schedule) {
    if (!schedule) {
        return '';
    }
    try {
        return cronstrue.toString(schedule);
    }
    catch (e) {
        return schedule;
    }
}

/**
 * Build the "jobDetails" object for a scheduled doc
 * @param {Object} scheduledDoc doc from pulseJobs, type='single'
 * @param {Object} jobConfig doc from jobConfigs
 * @returns {Object}
 */
function buildJobDetails(scheduledDoc, jobConfig) {
    if (!scheduledDoc && !jobConfig) {
        return {};
    }

    const enabled = jobConfig?.enabled ?? true;

    // Combine default config from the scheduled doc + overrides from jobConfigs
    const details = {
        config: {
            ...(jobConfig || {}),

            // We ensure we have defaultConfig if jobConfig is missing it
            defaultConfig: {
                schedule: { value: scheduledDoc?.repeatInterval },
                retry: {
                    attempts: scheduledDoc?.attempts,
                    delay: scheduledDoc?.backoff
                }
            },

            enabled,
            // The "override" fields
            scheduleOverride: jobConfig?.schedule || null,
            retryOverride: jobConfig?.retry || null,
            // The human-friendly label from the scheduled doc's cron
            scheduleLabel: getScheduleLabel(
                jobConfig?.defaultConfig?.schedule?.value ||
                scheduledDoc?.repeatInterval
            )
        },
        currentState: {}
    };

    // If we have a scheduledDoc, fill out currentState
    if (scheduledDoc) {
        details.currentState = {
            status: getJobStatus(scheduledDoc),
            nextRun: scheduledDoc.nextRunAt,
            lastRun: scheduledDoc.lastFinishedAt,
            lastRunStatus: getRunStatus(scheduledDoc),
            failReason: scheduledDoc.failReason,
            lastRunDuration: formatJobDuration(scheduledDoc.lastRunAt, scheduledDoc.lastFinishedAt),
            // Additional fields if needed
            finishedCount: scheduledDoc.finishedCount,
            totalRuns: scheduledDoc.runCount
        };
    }

    return details;
}

/**
 * Process a "normal" (type='normal') doc for job details table
 * @param {Object} doc
 * @returns {Object}
 */
function processRunDoc(doc) {
    return {
        lastRunAt: doc.lastRunAt,
        status: getJobStatus(doc),
        duration: formatJobDuration(doc.lastRunAt, doc.lastFinishedAt),
        result: doc.result,
        failReason: doc.failReason,
        dataAsString: JSON.stringify(doc.result || {}, null, 2)
    };
}

/**
 * Build a job row for the listing page
 * @param {Object} mainDoc doc from pipeline ($first)
 * @param {Object} jobConfig from jobConfigs
 * @param {Object} groupItem aggregator object (with lastRunAt, lastFinishedAt, etc.)
 * @returns {Object} { job: {...}, config: {...} }
 */
function buildListViewJob(mainDoc, jobConfig, groupItem) {
    // If there's no doc, return something minimal
    if (!mainDoc) {
        return { job: {}, config: {} };
    }

    // Merge in config overrides
    const finalConfig = {
        enabled: jobConfig?.enabled ?? true,

        // The default config is taken from the doc
        defaultConfig: {
            schedule: { value: mainDoc.repeatInterval },
            retry: { attempts: mainDoc.attempts, delay: mainDoc.backoff }
        },

        // The user overrides
        schedule: jobConfig?.schedule,
        retry: jobConfig?.retry
    };

    const jobObj = {
        name: mainDoc.name,
        status: getJobStatus(mainDoc),
        schedule: finalConfig.defaultConfig.schedule.value,
        scheduleLabel: getScheduleLabel(finalConfig.defaultConfig.schedule.value),
        nextRunAt: mainDoc.nextRunAt,
        lastFinishedAt: groupItem.lastFinishedAt,
        lastRunStatus: getRunStatus(mainDoc),
        failReason: mainDoc.failReason,
        // "total" can be included if you want. Here it's arbitrary:
        total: 0
    };

    return {
        job: jobObj,
        config: finalConfig
    };
}

// ----------------------------------
// /i/jobs endpoint
// ----------------------------------
plugins.register('/i/jobs', async function(ob) {
    validateGlobalAdmin(ob.params, async function() {
        const { jobName, schedule, retry } = ob.params.qstring || {};
        const action = ob.params.qstring?.action;

        if (!jobName) {
            common.returnMessage(ob.params, 400, 'Job name is required');
            return;
        }

        const jobsCollection = common.db.collection('jobConfigs');
        const updateData = { updatedAt: new Date() };

        try {
            switch (action) {
            case 'enable':
                updateData.enabled = true;
                break;
            case 'disable':
                updateData.enabled = false;
                break;
            case 'runNow':
                updateData.runNow = true;
                break;
            case 'updateSchedule':
                if (!schedule) {
                    common.returnMessage(ob.params, 400, 'Schedule configuration is required');
                    return;
                }
                updateData.schedule = schedule;
                break;
            case 'updateRetry':
                if (!retry) {
                    common.returnMessage(ob.params, 400, 'Retry configuration is required');
                    return;
                }
                updateData.retry = retry;
                break;
            default:
                common.returnMessage(ob.params, 400, 'Invalid action');
                return;
            }

            // Update or insert if missing
            await jobsCollection.updateOne(
                { jobName },
                { $set: updateData },
                { upsert: true }
            );
            common.returnMessage(ob.params, 200, 'Success');
        }
        catch (error) {
            log.e('Error in /i/jobs:', { error: error.message, stack: error.stack });
            common.returnMessage(ob.params, 500, 'Internal server error');
        }
    });
    return true;
});

// ----------------------------------
// /o/jobs endpoint
// ----------------------------------
plugins.register('/o/jobs', async function(ob) {
    validateGlobalAdmin(ob.params, async function() {
        const db = common.db;
        const jobsCollection = db.collection('pulseJobs');
        const jobConfigsCollection = db.collection('jobConfigs');

        try {
            const {
                name: jobName,
                iDisplayStart,
                iDisplayLength,
                sSearch,
                iSortCol_0,
                sSortDir_0
            } = ob.params.qstring;

            // Basic pagination & sorting
            const skip = Number(iDisplayStart) || 0;
            const limit = Number(iDisplayLength) || 50;
            const sortColumn = iSortCol_0 || 'nextRunAt';
            const sortDir = (sSortDir_0 === 'desc') ? -1 : 1;

            // If a specific job name is provided -> detail view
            if (jobName) {
                // The "scheduled" doc (type: 'single')
                const scheduledDoc = await jobsCollection.findOne({
                    name: jobName,
                    type: 'single'
                });

                // The "normal" docs (type: 'normal')
                const query = { name: jobName, type: 'normal' };
                const normalDocsCursor = jobsCollection.find(query)
                    .sort({ lastRunAt: -1 })
                    .skip(skip)
                    .limit(limit);

                const [normalDocs, total] = await Promise.all([
                    normalDocsCursor.toArray(),
                    jobsCollection.countDocuments(query)
                ]);

                // Fetch config override
                const jobConfig = await jobConfigsCollection.findOne({ jobName });

                // Build jobDetails
                const jobDetails = buildJobDetails(scheduledDoc, jobConfig);

                // Process normal docs
                const processedRuns = normalDocs.map(doc => processRunDoc(doc));

                common.returnOutput(ob.params, {
                    sEcho: ob.params.qstring.sEcho,
                    iTotalRecords: total,
                    iTotalDisplayRecords: total,
                    aaData: processedRuns,
                    jobDetails: jobDetails
                });
                return;
            }
            else {
                // Listing all unique job names
                const search = sSearch ? { name: new RegExp(sSearch, 'i') } : {};

                // We'll create a pipeline that groups by name. 
                // We prefer the doc with type='single' if it exists, because we sort by type ascending first.
                const pipeline = [
                    { $match: search },
                    {
                        $sort: {
                            type: -1, // ensures 'single' (0) is sorted before 'normal' (1)
                            [sortColumn]: sortDir
                        }
                    },
                    {
                        $group: {
                            _id: "$name",
                            doc: { $first: "$$ROOT" }, // the first doc in each group
                            lastRunAt: { $max: "$lastRunAt" },
                            lastFinishedAt: { $max: "$lastFinishedAt" },
                            failedAt: { $max: "$failedAt" }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            name: "$_id",
                            doc: 1,
                            lastRunAt: 1,
                            lastFinishedAt: 1,
                            failedAt: 1
                        }
                    },
                    { $skip: skip },
                    { $limit: limit }
                ];

                // total distinct job names
                const allNames = await jobsCollection.distinct('name', search);
                const totalCount = allNames.length;

                // Run pipeline
                const rawJobs = await jobsCollection.aggregate(pipeline).toArray();

                // Fetch jobConfigs in one pass
                const jobConfigs = await jobConfigsCollection.find({}).toArray();
                const configMap = {};
                jobConfigs.forEach(cfg => {
                    configMap[cfg.jobName] = cfg;
                });

                // Merge data
                const processed = rawJobs.map(item => {
                    const jobName = item.name;
                    const mainDoc = item.doc; // the doc from $first
                    const jobConfig = configMap[jobName] || null;

                    return buildListViewJob(mainDoc, jobConfig, item);
                });

                // Each entry in final array should be { job: {...}, config: {...} }
                const finalOutput = processed.map(data => ({
                    job: data.job,
                    config: data.config
                }));

                // Return
                common.returnOutput(ob.params, {
                    sEcho: ob.params.qstring.sEcho,
                    iTotalRecords: totalCount,
                    iTotalDisplayRecords: totalCount,
                    aaData: finalOutput
                });
            }
        }
        catch (error) {
            log.e('Error in /o/jobs:', { error: error.message, stack: error.stack });
            common.returnMessage(ob.params, 500, 'Internal server error');
        }
    });
    return true;
});
