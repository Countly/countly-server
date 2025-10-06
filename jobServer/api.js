/* api.js */
// TODO: first version this needs more checks and refactoring and fixes
console.log("JobServer API loaded2")

const Logger = require('../api/utils/log.js');
const log = new Logger('jobs:api');

const plugins = require("../plugins/pluginManager");
const {validateGlobalAdmin} = require("../api/utils/rights");
const common = require("../api/utils/common");
const cronstrue = require('cronstrue');
const {isValidCron} = require('cron-validator');

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

    // If both failedAt and lastFinishedAt are present, use the most recent one
    if (job.failedAt && job.lastFinishedAt) {
        const failedDate = new Date(job.failedAt);
        const finishedDate = new Date(job.lastFinishedAt);

        if (failedDate >= finishedDate) {
            return "FAILED";
        }
        else {
            return "COMPLETED";
        }
    }

    // If only one is present
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
 * @param {Object} job doc from pulseJobs
 * @returns {String} "failed", "success", or "pending"
 */
function getRunStatus(job) {
    // If both failedAt and lastFinishedAt are present, use the most recent one
    if (job.failedAt && job.lastFinishedAt) {
        const failedDate = new Date(job.failedAt);
        const finishedDate = new Date(job.lastFinishedAt);

        if (failedDate >= finishedDate) {
            return "failed";
        }
        else {
            return "success";
        }
    }

    // If only one is present
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
 * @param {Date} startDate doc.lastRunAt
 * @param {Date} endDate doc.lastFinishedAt
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
 * @param {String} schedule doc.repeatInterval
 * @returns {String} e.g. "Every 10 minutes"
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
 * @param {Object} latestRunData Optional data from the latest run (aggregated from normal docs)
 * @returns {Object} e.g. { config: {...}, currentState: {...} }
 */
function buildJobDetails(scheduledDoc, jobConfig, latestRunData = null) {
    if (!scheduledDoc && !jobConfig) {
        return {};
    }

    const enabled = jobConfig?.enabled ?? true;

    // Get the default schedule value
    const defaultScheduleValue = jobConfig?.defaultConfig?.schedule?.value || scheduledDoc?.repeatInterval;

    // Get the override schedule value if it exists
    const overrideScheduleValue = jobConfig?.schedule;

    // Generate human-readable labels for both default and override schedules
    const defaultScheduleLabel = getScheduleLabel(defaultScheduleValue);
    const overrideScheduleLabel = overrideScheduleValue ? getScheduleLabel(overrideScheduleValue) : null;

    // Get default config from the scheduled doc or use existing defaultConfig from jobConfig
    const defaultConfig = jobConfig?.defaultConfig || {
        schedule: { value: scheduledDoc?.repeatInterval },
        retry: {
            attempts: scheduledDoc?.attempts,
            delay: scheduledDoc?.backoff
        }
    };

    // Combine default config from the scheduled doc + overrides from jobConfigs
    const details = {
        config: {
            ...(jobConfig || {}),

            // Ensure we have the correct defaultConfig
            defaultConfig: defaultConfig,

            enabled,
            // Keep original field names for API compatibility
            schedule: overrideScheduleValue || null,
            scheduleOverride: overrideScheduleValue || null,
            retryOverride: jobConfig?.retry || null,
            // The human-friendly labels
            scheduleLabel: defaultScheduleLabel,
            scheduleOverrideLabel: overrideScheduleLabel,
            // Flag to indicate if schedule is overridden
            hasScheduleOverride: !!overrideScheduleValue
        },
        currentState: {}
    };

    // If we have a scheduledDoc or latestRunData, fill out currentState
    if (scheduledDoc || latestRunData) {
        // If we have latestRunData, combine it with scheduledDoc for status determination
        // This ensures we're using the latest run's status
        const statusDoc = latestRunData ? {
            // Prioritize latest run data for status determination
            lockedAt: latestRunData.lockedAt || scheduledDoc?.lockedAt,
            failedAt: latestRunData.failedAt || scheduledDoc?.failedAt,
            lastFinishedAt: latestRunData.lastFinishedAt || scheduledDoc?.lastFinishedAt,
            lastRunAt: latestRunData.lastRunAt || scheduledDoc?.lastRunAt,
            failReason: latestRunData.failReason || scheduledDoc?.failReason
        } : scheduledDoc;

        // Use scheduledDoc for nextRunAt, but latestRunData for everything else when available
        details.currentState = {
            status: getJobStatus(statusDoc),
            nextRun: scheduledDoc?.nextRunAt,
            lastRun: statusDoc.lastFinishedAt,
            lastRunStatus: getRunStatus(statusDoc),
            failedAt: statusDoc.failedAt,
            failReason: statusDoc.failReason,
            lastRunDuration: formatJobDuration(statusDoc.lastRunAt, statusDoc.lastFinishedAt),
            // Additional fields if needed
            finishedCount: (scheduledDoc?.finishedCount || 0) + (latestRunData?.manualFinishedCount || 0),
            totalRuns: (scheduledDoc?.runCount || 0) + (latestRunData?.manualRunCount || 0)
        };
    }

    return details;
}

/**
 * Process a "normal" (type='normal') doc for job details table
 * Ensures all fields needed for status-based sorting are included
 * @param {Object} doc doc from pulseJobs, type='normal'
 * @returns {Object} Job run details with all required timestamps
 */
function processRunDoc(doc) {
    return {
        // Include all timestamp fields needed for accurate status-based sorting
        lastRunAt: doc.lastRunAt,
        lastFinishedAt: doc.lastFinishedAt,
        lockedAt: doc.lockedAt,
        failedAt: doc.failedAt,
        // Computed fields
        status: getJobStatus(doc),
        duration: formatJobDuration(doc.lastRunAt, doc.lastFinishedAt),
        result: doc.result,
        failReason: doc.failReason,
        dataAsString: doc.result ? JSON.stringify(doc.result, null, 2) : null
    };
}

// Helper functions are defined above

/**
 * Get the most recent status information between scheduled and manual runs
 * @param {Object} scheduledJob The scheduled job document (type='single')
 * @param {Array} manualRuns Array of manual run documents (type='normal')
 * @returns {Object} Combined status information with the most recent data
 */
function getLatestStatusInfo(scheduledJob, manualRuns) {
    // Initialize with scheduled job data or empty object
    const statusInfo = {
        lockedAt: scheduledJob?.lockedAt || null,
        failedAt: scheduledJob?.failedAt || null,
        lastFinishedAt: scheduledJob?.lastFinishedAt || null,
        lastRunAt: scheduledJob?.lastRunAt || scheduledJob?.lastRunAtCpy || null,
        failReason: scheduledJob?.failReason || null,
        // Count manual runs
        manualRunCount: manualRuns.length,
        manualFinishedCount: manualRuns.filter(doc => doc.lastFinishedAt).length
    };

    // If no manual runs, return scheduled job data
    if (!manualRuns.length) {
        return statusInfo;
    }

    // Find the most recent manual run by lastRunAt
    const sortedManualRuns = [...manualRuns].sort((a, b) => {
        if (!a.lastRunAt) {
            return 1;
        }
        if (!b.lastRunAt) {
            return -1;
        }
        return new Date(b.lastRunAt) - new Date(a.lastRunAt);
    });

    const latestManualRun = sortedManualRuns[0];

    // Update with the latest manual run data
    if (latestManualRun.lastRunAt && (!statusInfo.lastRunAt && new Date(latestManualRun.lastFinishedAt) > new Date(statusInfo.lastFinishedAt))) {
        statusInfo.lastRunAt = latestManualRun.lastRunAt;
    }

    // Check for running jobs (lockedAt present)
    const runningJobs = manualRuns.filter(job => job.lockedAt);
    if (runningJobs.length) {
        // Find the most recently started running job
        const latestRunningJob = runningJobs.sort((a, b) => {
            return new Date(b.lockedAt) - new Date(a.lockedAt);
        })[0];

        statusInfo.lockedAt = latestRunningJob.lockedAt;
        // Update lastRunAt for the running job if available
        if (latestRunningJob.lastRunAt) {
            statusInfo.lastRunAt = latestRunningJob.lastRunAt;
        }
    }

    // Find the most recent failure across all manual runs
    const failedJobs = manualRuns.filter(job => job.failedAt);
    if (failedJobs.length) {
        const latestFailedJob = failedJobs.sort((a, b) => {
            return new Date(b.failedAt) - new Date(a.failedAt);
        })[0];

        // Only update if this failure is more recent than our current failure and completion
        if ((!statusInfo.failedAt || new Date(latestFailedJob.failedAt) > new Date(statusInfo.failedAt)) &&
            (!statusInfo.lastFinishedAt || new Date(latestFailedJob.failedAt) > new Date(statusInfo.lastFinishedAt))) {
            statusInfo.failedAt = latestFailedJob.failedAt;
            statusInfo.failReason = latestFailedJob.failReason;
        }
    }

    // Find the most recent successful completion
    const completedJobs = manualRuns.filter(job => job.lastFinishedAt);
    if (completedJobs.length) {
        const latestCompletedJob = completedJobs.sort((a, b) => {
            return new Date(b.lastFinishedAt) - new Date(a.lastFinishedAt);
        })[0];

        // Update if this is the most recent completion
        if (!statusInfo.lastFinishedAt || new Date(latestCompletedJob.lastFinishedAt) > new Date(statusInfo.lastFinishedAt)) {
            statusInfo.lastFinishedAt = latestCompletedJob.lastFinishedAt;

            // Clear failure status if completion is more recent
            if (statusInfo.failedAt && new Date(latestCompletedJob.lastFinishedAt) > new Date(statusInfo.failedAt)) {
                statusInfo.failedAt = null;
                statusInfo.failReason = null;
            }
        }
    }

    return statusInfo;
}

/**
 * Build a job row for the listing page
 * @param {Object} mainDoc doc from pipeline ($first)
 * @param {Object} jobConfig from jobConfigs
 * @param {Object} statusInfo Combined status info from scheduled and manual runs
 * @returns {Object} { job: {...}, config: {...} }
 */
function buildListViewJob(mainDoc, jobConfig, statusInfo) {
    // If there's no doc, return something minimal
    if (!mainDoc) {
        return { job: {}, config: {} };
    }

    // Get default schedule value
    const defaultScheduleValue = mainDoc.repeatInterval;

    // Get override schedule value if it exists
    const overrideScheduleValue = jobConfig?.schedule;

    // Generate human-readable labels
    const defaultScheduleLabel = getScheduleLabel(defaultScheduleValue);
    const overrideScheduleLabel = overrideScheduleValue ? getScheduleLabel(overrideScheduleValue) : null;

    // Use the appropriate label based on which schedule is active
    const effectiveScheduleLabel = overrideScheduleValue ? overrideScheduleLabel : defaultScheduleLabel;

    // Get default config values from the main doc
    const defaultConfig = jobConfig?.defaultConfig || {
        schedule: { value: defaultScheduleValue },
        retry: { attempts: mainDoc.attempts, delay: mainDoc.backoff }
    };

    // Merge in config overrides
    const finalConfig = {
        enabled: jobConfig?.enabled ?? true,

        // The default config is taken from either jobConfig or the doc
        defaultConfig: defaultConfig,

        // Keep the original field names for API compatibility 
        schedule: overrideScheduleValue,
        retry: jobConfig?.retry
    };

    const jobObj = {
        name: mainDoc.name,
        // Determine status using the latest run data
        status: getJobStatus(statusInfo),
        // Include both the effective schedule and the original values
        schedule: defaultScheduleValue,
        configuredSchedule: overrideScheduleValue,
        scheduleLabel: effectiveScheduleLabel,
        scheduleOverridden: !!overrideScheduleValue,
        // Include all timestamp fields from the latest run
        lockedAt: statusInfo.lockedAt,
        failedAt: statusInfo.failedAt,
        lastRunAt: statusInfo.lastRunAt,
        nextRunAt: mainDoc.nextRunAt || null,
        lastFinishedAt: statusInfo.lastFinishedAt,
        lastRunStatus: getRunStatus(statusInfo),
        failReason: statusInfo.failReason,
        // Calculate total runs (scheduled + manual)
        total: (mainDoc.runCount || 0) + (statusInfo.manualRunCount || 0)
    };

    return {
        job: jobObj,
        config: finalConfig
    };
}

// ----------------------------------
// /jobs/i endpoint
// ----------------------------------
plugins.register('/jobs/i', async function(ob) {
    console.log("Got jobs request");
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

                // Validate cron expression if provided
                if (schedule && typeof schedule === 'string') {
                    if (!isValidCron(schedule)) {
                        common.returnMessage(ob.params, 400, 'Invalid cron expression provided');
                        return;
                    }
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
            if (common.jobServer) {
                // Apply update to job runner
                common.jobServer.applyConfig({ jobName, ...updateData });
            }
            console.log("Job done");
            log.d(`Job ${jobName} ${action} success`);
            plugins.dispatch('/systemlogs', {
                params: ob.params,
                action: `jobs_${action}`,
                data: { name: jobName, ...updateData },
            });
            
            common.returnMessage(ob.params, 200, 'Success');
        }
        catch (error) {
            log.e('Error in /jobs/i:', { error: error.message, stack: error.stack });
            common.returnMessage(ob.params, 500, 'Internal server error');
        }
    });
    return true;
});

// ----------------------------------
// /jobs/o endpoint
// ----------------------------------
plugins.register('/jobs/o', async function(ob) {
    validateGlobalAdmin(ob.params, async function() {
        const db = common.db;
        const jobsCollection = db.collection('pulseJobs');
        const jobConfigsCollection = db.collection('jobConfigs');
        const jobHistoriesCollection = db.collection('jobHistories');
        const columns = ["name", "status", "scheduleLabel", "nextRunAt", "lastFinishedAt", "lastRunStatus", "total" ];
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
            const sortColumn = columns[iSortCol_0] || 'name';
            const sortDir = (sSortDir_0 === 'desc') ? -1 : 1;

            // If a specific job name is provided -> detail view
            if (jobName) {
                // The "scheduled" doc (type: 'single')
                const scheduledDoc = await jobsCollection.findOne({
                    name: jobName,
                    type: 'single'
                });

                const jobHistoryDocs = await jobHistoriesCollection.find({
                    name: jobName,
                }).toArray();

                // The "normal" docs (type: 'normal')
                const query = { name: jobName, type: 'normal' };

                // Determine appropriate sorting for the job details view
                let detailSortQuery = {};

                // If status is requested as sort column, sort by the relevant timestamps
                if (sortColumn === 'status') {
                    if (sortDir === 1) { // ascending: SCHEDULED, COMPLETED, FAILED, RUNNING
                        detailSortQuery = {
                            lockedAt: -1, // RUNNING last
                            failedAt: -1, // FAILED before RUNNING
                            lastFinishedAt: -1 // COMPLETED before FAILED
                        };
                    }
                    else { // descending: RUNNING, FAILED, COMPLETED, SCHEDULED
                        detailSortQuery = {
                            lockedAt: 1, // RUNNING first
                            failedAt: 1, // FAILED after RUNNING
                            lastFinishedAt: 1 // COMPLETED after FAILED
                        };
                    }
                    // For runs with the same status, sort by lastRunAt to show most recent first
                    detailSortQuery.lastRunAt = -1;
                    // Add _id as final sort for absolute stability
                    detailSortQuery._id = sortDir;
                }
                // Handle direct date field sorting
                else if (['lastRunAt', 'lastFinishedAt'].includes(sortColumn)) {
                    // For date fields, handle null values consistently
                    detailSortQuery[sortColumn] = sortDir;

                    // Add consistent secondary sort fields to ensure stable ordering
                    if (sortColumn !== 'lastRunAt') {
                        detailSortQuery.lastRunAt = -1;
                    }
                    if (sortColumn !== 'lastFinishedAt') {
                        detailSortQuery.lastFinishedAt = -1;
                    }

                    // Add _id as final sort for absolute stability
                    detailSortQuery._id = sortDir;
                }
                // Default to sorting by lastRunAt (most recent first) with consistent secondary sort
                else {
                    detailSortQuery.lastRunAt = -1;
                    detailSortQuery.lastFinishedAt = -1;
                    detailSortQuery._id = -1; // Consistent secondary sort
                }

                // Add options for case-insensitive sorting if sorting by name
                const cursorOptions = {};
                if (sortColumn === 'name') {
                    cursorOptions.collation = { locale: 'en', strength: 2 }; // Case-insensitive
                }

                const normalDocsCursor = jobsCollection.find(query)
                    .sort(detailSortQuery)
                    .skip(skip)
                    .limit(limit);

                // Apply collation if needed
                if (cursorOptions.collation) {
                    normalDocsCursor.collation(cursorOptions.collation);
                }

                const [normalDocs, total] = await Promise.all([
                    normalDocsCursor.toArray(),
                    jobsCollection.countDocuments(query)
                ]);

                // Fetch config override
                const jobConfig = await jobConfigsCollection.findOne({ jobName });

                // Get the latest run information combining scheduled and manual runs
                const latestRunData = getLatestStatusInfo(scheduledDoc, normalDocs);

                // Build job details using the combined latest run data
                const jobDetails = buildJobDetails(scheduledDoc, jobConfig, latestRunData);

                // Process normal docs
                const processedRuns = normalDocs.map(doc => processRunDoc(doc));

                common.returnOutput(ob.params, {
                    sEcho: ob.params.qstring.sEcho,
                    iTotalRecords: total,
                    iTotalDisplayRecords: total,
                    aaData: processedRuns,
                    jobDetails: jobDetails,
                    jobHistories: jobHistoryDocs,
                });
                return;
            }
            else {
                // OPTIMIZED LIST VIEW APPROACH

                // Set up search based on query parameter
                const searchQuery = sSearch ? { name: new RegExp(sSearch, 'i') } : {};

                // 1. Count total distinct job names for pagination info
                const totalCount = (await jobsCollection.distinct('name', {
                    ...searchQuery,
                    type: 'single'
                })).length;

                // 2. Fetch single (scheduled) jobs with pagination and sorting
                const singleJobsQuery = {
                    ...searchQuery,
                    type: 'single'
                };

                // Handle sorting
                let singleJobsSort = {};

                // Default to name sorting
                if (sortColumn === 'name') {
                    singleJobsSort.name = sortDir;
                }
                // Handle status sorting (depends on timestamp fields)
                else if (sortColumn === 'status') {
                    if (sortDir === 1) { // ascending: SCHEDULED, COMPLETED, FAILED, RUNNING
                        singleJobsSort = {
                            lockedAt: -1,
                            failedAt: -1,
                            lastFinishedAt: -1
                        };
                    }
                    else { // descending
                        singleJobsSort = {
                            lockedAt: 1,
                            failedAt: 1,
                            lastFinishedAt: 1
                        };
                    }
                    // Secondary sort by name for consistent ordering
                    singleJobsSort.name = 1;
                }
                // Handle timestamp sorting
                else if (['lastFinishedAt', 'nextRunAt', 'lastRunAt'].includes(sortColumn)) {
                    singleJobsSort[sortColumn] = sortDir;
                    // Secondary sort by name for consistent ordering
                    singleJobsSort.name = 1;
                }
                // Handle total sorting (runCount)
                else if (sortColumn === 'total') {
                    singleJobsSort.runCount = sortDir;
                    // Secondary sort by name for consistent ordering
                    singleJobsSort.name = 1;
                }
                // For other columns, default to name sort
                else {
                    singleJobsSort.name = sortDir;
                }

                // Add _id as final sort for absolute stability
                singleJobsSort._id = 1;

                // Set collation for case-insensitive sorting when sorting by name
                const sortOptions = {};
                if (sortColumn === 'name' || !columns.includes(sortColumn)) {
                    sortOptions.collation = { locale: 'en', strength: 2 };
                }

                // Fetch scheduled (single) jobs with pagination and sorting
                const singleJobsCursor = jobsCollection.find(singleJobsQuery)
                    .sort(singleJobsSort)
                    .skip(skip)
                    .limit(limit);

                // Apply collation if needed
                if (sortOptions.collation) {
                    singleJobsCursor.collation(sortOptions.collation);
                }

                // Get scheduled jobs
                const singleJobs = await singleJobsCursor.toArray();

                // If no jobs found, return empty result
                if (singleJobs.length === 0) {
                    common.returnOutput(ob.params, {
                        sEcho: ob.params.qstring.sEcho,
                        iTotalRecords: totalCount,
                        iTotalDisplayRecords: totalCount,
                        aaData: []
                    });
                    return;
                }

                // Extract job names to fetch related data
                const jobNames = singleJobs.map(job => job.name);

                // 3. Fetch all relevant job configs at once
                const jobConfigs = await jobConfigsCollection.find({
                    jobName: { $in: jobNames }
                }).toArray();

                // Create a map for faster config lookups
                const jobConfigMap = {};
                jobConfigs.forEach(config => {
                    jobConfigMap[config.jobName] = config;
                });

                // 4. Fetch all manual runs for these jobs at once
                const normalJobs = await jobsCollection.find({
                    name: { $in: jobNames },
                    type: 'normal'
                }).toArray();

                // Group manual jobs by name for faster processing
                const normalJobsByName = {};
                normalJobs.forEach(job => {
                    if (!normalJobsByName[job.name]) {
                        normalJobsByName[job.name] = [];
                    }
                    normalJobsByName[job.name].push(job);
                });

                // 5. Process each job with its manual runs and config
                const processedJobs = singleJobs.map(singleJob => {
                    const name = singleJob.name;
                    const jobConfig = jobConfigMap[name] || null;
                    const relatedManualJobs = normalJobsByName[name] || [];

                    // Get combined status from scheduled job and all its manual runs
                    const latestStatusInfo = getLatestStatusInfo(singleJob, relatedManualJobs);

                    // Build the list view job with correct status information
                    return buildListViewJob(singleJob, jobConfig, latestStatusInfo);
                });

                // Format the final output array with { job, config } structure
                const finalOutput = processedJobs.map(data => ({
                    job: data.job,
                    config: data.config
                }));

                // Post-sort the results if we're sorting by a computed field
                // This ensures that status sorting works correctly since it depends on multiple fields
                if (sortColumn === 'status' || sortColumn === 'lastRunStatus') {
                    finalOutput.sort((a, b) => {
                        // For status sorting
                        if (sortColumn === 'status') {
                            const statusOrder = {
                                'RUNNING': 0,
                                'FAILED': 1,
                                'COMPLETED': 2,
                                'SCHEDULED': 3
                            };

                            const statusA = statusOrder[a.job.status];
                            const statusB = statusOrder[b.job.status];

                            if (statusA !== statusB) {
                                return sortDir === 1 ? statusA - statusB : statusB - statusA;
                            }
                        }

                        // For lastRunStatus sorting
                        if (sortColumn === 'lastRunStatus') {
                            const runStatusOrder = {
                                'failed': 0,
                                'success': 1,
                                'pending': 2
                            };

                            const runStatusA = runStatusOrder[a.job.lastRunStatus];
                            const runStatusB = runStatusOrder[b.job.lastRunStatus];

                            if (runStatusA !== runStatusB) {
                                return sortDir === 1 ? runStatusA - runStatusB : runStatusB - runStatusA;
                            }
                        }

                        // Fallback to name sorting for consistent ordering
                        return sortDir === 1
                            ? a.job.name.localeCompare(b.job.name)
                            : b.job.name.localeCompare(a.job.name);
                    });
                }

                // Return the final result
                common.returnOutput(ob.params, {
                    sEcho: ob.params.qstring.sEcho,
                    iTotalRecords: totalCount,
                    iTotalDisplayRecords: totalCount,
                    aaData: finalOutput
                });
            }
        }
        catch (error) {
            log.e('Error in /jobs/o:', { error: error.message, stack: error.stack });
            common.returnMessage(ob.params, 500, 'Internal server error');
        }
    });
    return true;
});
