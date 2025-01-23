const Logger = require('../api/utils/log.js');
const log = new Logger('jobs:api');

const plugins = require("../plugins/pluginManager");
const {validateGlobalAdmin} = require("../api/utils/rights");
const common = require("../api/utils/common");
const cronstrue = require('cronstrue');
const moment = require('moment');

/**
 * Maps job status based on job properties
 * @param {Object} job - The job object
 * @param {Date} [job.lockedAt] - When the job was locked
 * @param {Date} [job.failedAt] - When the job failed
 * @param {Date} [job.lastFinishedAt] - When the job last finished
 * @returns {string} Status - "RUNNING", "FAILED", "COMPLETED", or "SCHEDULED"
 */
const getJobStatus = (job) => {
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
};

/**
 * Maps job run status based on job properties
 * @param {Object} job - The job object
 * @param {Date} [job.failedAt] - When the job failed
 * @param {Date} [job.lastFinishedAt] - When the job last finished
 * @returns {string} Status - "failed", "success", or "pending"
 */
const getRunStatus = (job) => {
    if (job.failedAt) {
        return "failed";
    }
    if (job.lastFinishedAt) {
        return "success";
    }
    return "pending";
};

// Format job duration helper
const formatJobDuration = (startDate, endDate) => {
    if (!startDate || !endDate) {
        return null;
    }
    return ((new Date(endDate) - new Date(startDate)) / 1000).toFixed(2);
};

// Get schedule label helper
const getScheduleLabel = (schedule) => {
    if (!schedule) {
        return '';
    }
    try {
        return cronstrue.toString(schedule);
    }
    catch (e) {
        return schedule;
    }
};

/**
 * Job management API endpoint for controlling job configurations
 * @name /i/jobs
 * @example
 * // Enable a job
 * POST /i/jobs
 * {
 *   "jobName": "cleanupJob",
 *   "action": "enable"
 * }
 * Response: { "code": 200, "message": "Success" }
 * 
 * // Disable a job
 * POST /i/jobs
 * {
 *   "jobName": "cleanupJob",
 *   "action": "disable"
 * }
 * Response: { "code": 200, "message": "Success" }
 * 
 * // Trigger immediate job execution
 * POST /i/jobs
 * {
 *   "jobName": "cleanupJob",
 *   "action": "runNow"
 * }
 * Response: { "code": 200, "message": "Success" }
 * 
 * // Update schedule
 * POST /i/jobs
 * {
 *   "jobName": "cleanupJob",
 *   "action": "updateSchedule",
 *   "schedule": "0 0 * * *"  // Runs at midnight every day
 * }
 * Response: { "code": 200, "message": "Success" }
 * 
 * // Update retry configuration
 * POST /i/jobs
 * {
 *   "jobName": "cleanupJob",
 *   "action": "updateRetry",
 *   "retry": {
 *     "attempts": 3,    // Number of retry attempts
 *     "delay": 300      // Delay between retries in seconds
 *   }
 * }
 * Response: { "code": 200, "message": "Success" }
 * 
 * @returns {Object} Response
 * @returns {number} Response.code - Status codes:
 *                                  200: Success
 *                                  400: Invalid parameters or missing required fields
 *                                  500: Internal server error
 * @returns {string} Response.message - Status message describing the result
 */
plugins.register('/i/jobs', async function(ob) {
    validateGlobalAdmin(ob.params, async function() {
        const {jobName, schedule, retry} = ob.params.qstring || {};
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

            await jobsCollection.updateOne(
                { jobName },
                { $set: updateData }
            );
            common.returnMessage(ob.params, 200, 'Success');
        }
        catch (error) {
            log.e('Error in jobs API:', { error: error.message, stack: error.stack });
            common.returnMessage(ob.params, 500, 'Internal server error');
        }
    });
    return true;
});

/**
 * Job query API endpoint for retrieving job information
 * @name /o/jobs
 * @example
 * // Get all jobs with pagination and search
 * GET /o/jobs
 * {
 *   "iDisplayStart": 0,        // Pagination start index
 *   "iDisplayLength": 50,      // Number of records per page
 *   "sSearch": "backup",       // Search term for job names
 *   "iSortCol_0": "nextRunAt", // Column to sort by
 *   "sSortDir_0": "desc"       // Sort direction: "asc" or "desc"
 * }
 * Response: {
 *   "sEcho": "1",
 *   "iTotalRecords": 100,
 *   "iTotalDisplayRecords": 5,
 *   "aaData": [{
 *     "job": {
 *       "name": "backupJob",
 *       "status": "SCHEDULED",
 *       "schedule": "0 0 * * *",
 *       "scheduleLabel": "At 12:00 AM",
 *       "nextRunAt": "2024-03-20T00:00:00.000Z",
 *       "lastFinishedAt": "2024-03-19T00:00:00.000Z",
 *       "lastRunStatus": "success",
 *       "failReason": null
 *     },
 *     "config": {
 *       "enabled": true,
 *       "schedule": "0 0 * * *",
 *       "retry": { "attempts": 3, "delay": 300 }
 *     }
 *   }]
 * }
 * 
 * // Get specific job details with run history
 * GET /o/jobs
 * {
 *   "name": "cleanupJob",
 *   "iDisplayStart": 0,
 *   "iDisplayLength": 50
 * }
 * Response: {
 *   "sEcho": "1",
 *   "iTotalRecords": 10,
 *   "iTotalDisplayRecords": 10,
 *   "aaData": [{
 *     "lastRunAt": "2024-03-19T00:00:00.000Z",
 *     "status": "COMPLETED",
 *     "lastRunStatus": "success",
 *     "duration": "45.32",
 *     "failReason": null,
 *     "result": { "processedRecords": 1000 },
 *     "runCount": 1,
 *     "dataAsString": "{\n  \"processedRecords\": 1000\n}"
 *   }],
 *   "jobDetails": {
 *     "config": {
 *       "enabled": true,
 *       "defaultConfig": {
 *         "schedule": { "value": "0 0 * * *" },
 *         "retry": { "attempts": 3, "delay": 300 }
 *       },
 *       "scheduleLabel": "At 12:00 AM",
 *       "scheduleOverride": null,
 *       "retryOverride": null
 *     },
 *     "currentState": {
 *       "status": "SCHEDULED",
 *       "nextRun": "2024-03-20T00:00:00.000Z",
 *       "lastRun": "2024-03-19T00:00:00.000Z",
 *       "lastRunStatus": "success",
 *       "failReason": null,
 *       "lastRunDuration": "45.32",
 *       "finishedCount": 10,
 *       "totalRuns": 10
 *     }
 *   }
 * }
 * 
 * @returns {Object} Response
 * @returns {string} Response.sEcho - Echo parameter from request for DataTables
 * @returns {number} Response.iTotalRecords - Total number of records before filtering
 * @returns {number} Response.iTotalDisplayRecords - Number of records after filtering
 * @returns {Array<Object>} Response.aaData - Array of job data or job runs
 * @returns {Object} [Response.jobDetails] - Detailed job information when querying specific job
 * @returns {Object} Response.jobDetails.config - Job configuration including schedule and retry settings
 * @returns {Object} Response.jobDetails.currentState - Current job state including next run and statistics
 */
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

            // If jobName is provided, fetch detailed view
            if (jobName) {
                // Get job definition and config
                const [jobConfig, latestJob] = await Promise.all([
                    jobConfigsCollection.findOne({ jobName }),
                    jobsCollection.findOne(
                        { name: jobName, type: { $ne: 'single' } }, // Exclude single runs
                        { sort: { lastRunAt: -1 } }
                    )
                ]);

                // Get individual job runs
                const jobRuns = await jobsCollection
                    .find({
                        name: jobName,
                        type: 'single' // Only get single run instances
                    })
                    .sort({ lastRunAt: -1 })
                    .skip(Number(iDisplayStart) || 0)
                    .limit(Number(iDisplayLength) || 50)
                    .toArray();

                const total = await jobsCollection.countDocuments({
                    name: jobName,
                    type: 'single'
                });

                // Process job runs with more detailed information
                const processedRuns = jobRuns.map(run => ({
                    lastRunAt: run.lastRunAt,
                    status: getJobStatus(run),
                    lastRunStatus: getRunStatus(run),
                    duration: formatJobDuration(run.lastRunAt, run.lastFinishedAt),
                    failReason: run.failReason,
                    result: run.result,
                    runCount: run.runCount,
                    dataAsString: JSON.stringify(run.result || {}, null, 2)
                }));

                // Structure job details with clear separation
                const jobDetails = {
                    config: {
                        ...jobConfig,
                        enabled: jobConfig?.enabled ?? true,
                        defaultConfig: {
                            schedule: { value: latestJob?.repeatInterval },
                            retry: {
                                attempts: latestJob?.attempts,
                                delay: latestJob?.backoff
                            }
                        },
                        scheduleLabel: getScheduleLabel(jobConfig?.defaultConfig?.schedule?.value),
                        scheduleOverride: jobConfig?.schedule,
                        retryOverride: jobConfig?.retry
                    },
                    currentState: latestJob ? {
                        status: getJobStatus(latestJob),
                        nextRun: latestJob.nextRunAt,
                        lastRun: latestJob.lastFinishedAt,
                        lastRunStatus: getRunStatus(latestJob),
                        failReason: latestJob.failReason,
                        lastRunDuration: formatJobDuration(latestJob.lastRunAt, latestJob.lastFinishedAt),
                        finishedCount: latestJob.finishedCount,
                        totalRuns: latestJob.runCount
                    } : null
                };

                common.returnOutput(ob.params, {
                    sEcho: ob.params.qstring.sEcho,
                    iTotalRecords: total,
                    iTotalDisplayRecords: total,
                    aaData: processedRuns,
                    jobDetails: jobDetails
                });
                return;
            }

            // Handle list view if no jobName provided
            const skip = Number(iDisplayStart) || 0;
            const limit = Number(iDisplayLength) || 50;
            const search = sSearch || '';
            const sort = {
                [iSortCol_0 || 'nextRunAt']: sSortDir_0 === 'desc' ? -1 : 1
            };

            await handleListView(ob, jobsCollection, jobConfigsCollection, search, sort, skip, limit);
        }
        catch (error) {
            log.e('Error in jobs API:', { error: error.message, stack: error.stack });
            common.returnMessage(ob.params, 500, 'Internal server error');
        }
    });
    return true;
});

/**
 * Handles detailed view for a specific job
 * @param {Object} ob - Request object
 * @param {string} jobName - Name of the job
 * @param {Collection} jobsCollection - MongoDB jobs collection
 * @param {Collection} jobConfigsCollection - MongoDB job configs collection
 * @param {number} skip - Number of records to skip
 * @param {number} limit - Number of records to return
 * @returns {Promise<void>}
 */
async function handleDetailedView(ob, jobName, jobsCollection, jobConfigsCollection, skip, limit) {
    const query = { name: jobName };

    const [jobRuns, jobConfig, latestJob] = await Promise.all([
        jobsCollection.find({ ...query, type: "single" })
            .sort({ nextRunAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray(),
        jobConfigsCollection.findOne({ jobName }),
        jobsCollection.findOne(
            { name: jobName },
            { sort: { lastFinishedAt: -1, lastRunAt: -1 } }
        )
    ]);

    const total = await jobsCollection.countDocuments({ ...query, type: "single" });

    const processedRuns = jobRuns.map(run => ({
        name: run.name,
        status: getJobStatus(run),
        schedule: run.repeatInterval,
        scheduleLabel: run.repeatInterval ? getScheduleLabel(run.repeatInterval) : 'Manual Run',
        next: run.nextRunAt,
        finished: run.lastFinishedAt,
        lastRunStatus: getRunStatus(run),
        failReason: run.failReason,
        data: run.data,
        dataAsString: JSON.stringify(run.data, null, 2),
        duration: formatJobDuration(run.lastRunAt, run.lastFinishedAt),
        durationInSeconds: formatJobDuration(run.lastRunAt, run.lastFinishedAt) + 's',
        lastRunAt: run.lastRunAt,
        nextRunDate: run.nextRunAt ? moment(run.nextRunAt).format('D MMM, YYYY') : '-',
        nextRunTime: run.nextRunAt ? moment(run.nextRunAt).format('HH:mm:ss') : '-',
        lastRun: run.lastFinishedAt ? moment(run.lastFinishedAt).fromNow() : '-'
    }));

    const jobDetails = {
        config: {
            ...jobConfig,
            scheduleLabel: jobConfig?.defaultConfig?.schedule?.value ?
                getScheduleLabel(jobConfig.defaultConfig.schedule.value) : '-',
        },
        currentState: latestJob ? {
            status: getJobStatus(latestJob),
            nextRun: latestJob.nextRunAt,
            lastRun: latestJob.lastFinishedAt,
            lastRunStatus: getRunStatus(latestJob),
            failReason: latestJob.failReason,
            lastRunDuration: formatJobDuration(latestJob.lastRunAt, latestJob.lastFinishedAt)
        } : null
    };

    common.returnOutput(ob.params, {
        sEcho: ob.params.qstring.sEcho,
        iTotalRecords: total,
        iTotalDisplayRecords: total,
        aaData: processedRuns,
        jobDetails: jobDetails
    });
}

/**
 * Handles list view for all jobs
 * @param {Object} ob - Request object
 * @param {Collection} jobsCollection - MongoDB jobs collection
 * @param {Collection} jobConfigsCollection - MongoDB job configs collection
 * @param {string} search - Search string to filter jobs
 * @param {Object} sort - Sort configuration
 * @param {number} skip - Number of records to skip
 * @param {number} limit - Number of records to return
 * @returns {Promise<void>}
 */
async function handleListView(ob, jobsCollection, jobConfigsCollection, search, sort, skip, limit) {
    const query = search ? { name: new RegExp(search, 'i') } : {};

    const pipeline = [
        { $match: query },
        {
            $group: {
                _id: "$name",
                doc: { $first: "$$ROOT" },
                lastFinishedAt: { $max: "$lastFinishedAt" },
                lastRunAt: { $max: "$lastRunAt" },
                lastFailedAt: { $max: "$failedAt" },
                lastStatus: {
                    $first: {
                        $cond: [
                            { $eq: ["$type", "single"] },
                            {
                                status: {
                                    $switch: {
                                        branches: [
                                            { case: { $ne: ["$lockedAt", null] }, then: "RUNNING" },
                                            { case: { $ne: ["$failedAt", null] }, then: "FAILED" },
                                            { case: { $ne: ["$lastFinishedAt", null] }, then: "COMPLETED" }
                                        ],
                                        default: "SCHEDULED"
                                    }
                                },
                                failReason: "$failReason",
                                lastRunStatus: {
                                    $switch: {
                                        branches: [
                                            { case: { $ne: ["$failedAt", null] }, then: "failed" },
                                            { case: { $ne: ["$lastFinishedAt", null] }, then: "success" }
                                        ],
                                        default: "pending"
                                    }
                                }
                            },
                            "$$ROOT"
                        ]
                    }
                }
            }
        },
        {
            $addFields: {
                "doc.lastFinishedAt": "$lastFinishedAt",
                "doc.lastRunAt": "$lastRunAt",
                "doc.failedAt": "$lastFailedAt",
                "doc.status": "$lastStatus.status",
                "doc.failReason": "$lastStatus.failReason",
                "doc.lastRunStatus": "$lastStatus.lastRunStatus"
            }
        },
        { $replaceRoot: { newRoot: "$doc" }},
        { $sort: sort },
        { $skip: skip },
        { $limit: limit }
    ];

    const [jobs, configs, total] = await Promise.all([
        jobsCollection.aggregate(pipeline).toArray(),
        jobConfigsCollection.find({}).toArray(),
        jobsCollection.distinct('name', query).then(names => names.length)
    ]);

    const configMap = configs.reduce((map, config) => {
        map[config.jobName] = config;
        return map;
    }, {});

    const processedJobs = jobs.map(job => {
        const config = configMap[job.name] || {
            enabled: true,
            defaultConfig: {
                schedule: { value: job.repeatInterval },
                retry: { attempts: job.attempts, delay: job.backoff }
            }
        };

        return {
            job: {
                name: job.name,
                status: getJobStatus(job),
                schedule: config.defaultConfig.schedule.value,
                scheduleLabel: getScheduleLabel(config.defaultConfig.schedule.value),
                nextRunAt: job.nextRunAt,
                lastFinishedAt: job.lastFinishedAt,
                lastRunStatus: getRunStatus(job),
                failReason: job.failReason,
                total
            },
            config: {
                enabled: config.enabled,
                schedule: config.defaultConfig.schedule.value,
                retry: config.defaultConfig.retry
            }
        };
    });

    common.returnOutput(ob.params, {
        sEcho: ob.params.qstring.sEcho,
        iTotalRecords: total,
        iTotalDisplayRecords: total,
        aaData: processedJobs
    });
}