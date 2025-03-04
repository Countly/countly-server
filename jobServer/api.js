/* api.js */

const Logger = require('../api/utils/log.js');
const log = new Logger('jobs:api');

const plugins = require("../plugins/pluginManager");
const {validateGlobalAdmin} = require("../api/utils/rights");
const common = require("../api/utils/common");
const cronstrue = require('cronstrue');

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

        if (failedDate > finishedDate) {
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

        if (failedDate > finishedDate) {
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

    // Get default schedule value
    const defaultScheduleValue = mainDoc.repeatInterval;

    // Get override schedule value if it exists
    const overrideScheduleValue = jobConfig?.schedule;

    // Generate human-readable labels
    const defaultScheduleLabel = getScheduleLabel(defaultScheduleValue);
    const overrideScheduleLabel = overrideScheduleValue ? getScheduleLabel(overrideScheduleValue) : null;

    // Use the appropriate label based on which schedule is active
    const effectiveScheduleLabel = overrideScheduleValue ? overrideScheduleLabel : defaultScheduleLabel;

    // Merge in config overrides
    const finalConfig = {
        enabled: jobConfig?.enabled ?? true,

        // The default config is taken from the doc
        defaultConfig: {
            schedule: { value: defaultScheduleValue },
            retry: { attempts: mainDoc.attempts, delay: mainDoc.backoff }
        },

        // Keep the original field names for API compatibility 
        schedule: overrideScheduleValue,
        retry: jobConfig?.retry
    };

    // Create a composite document with data from the latest run
    // This ensures status is determined from the most recent run
    const latestRunData = {
        // Take the lockedAt value from either mainDoc or the group data
        lockedAt: groupItem.lockedAt || mainDoc.lockedAt || null,
        // Prioritize failedAt and lastFinishedAt from groupItem as they represent max values
        failedAt: groupItem.failedAt || mainDoc.failedAt || null,
        lastFinishedAt: groupItem.lastFinishedAt || mainDoc.lastFinishedAt || null,
        // Use the latest lastRunAt value
        lastRunAt: groupItem.lastRunAt || mainDoc.lastRunAt || null,
        // Include failReason if available
        failReason: groupItem.failedAt ? (groupItem.failReason || mainDoc.failReason) : mainDoc.failReason,
        // Include counts of normal docs (manual runs)
        manualRunCount: groupItem.normalDocCount || 0,
        manualFinishedCount: groupItem.normalFinishedCount || 0
    };

    const jobObj = {
        name: mainDoc.name,
        // Determine status using the latest run data
        status: getJobStatus(latestRunData),
        // Include both the effective schedule and the original values
        schedule: defaultScheduleValue,
        configuredSchedule: overrideScheduleValue,
        scheduleLabel: effectiveScheduleLabel,
        scheduleOverridden: !!overrideScheduleValue,
        // Include all timestamp fields from the latest run
        lockedAt: latestRunData.lockedAt,
        failedAt: latestRunData.failedAt,
        lastRunAt: latestRunData.lastRunAt,
        nextRunAt: mainDoc.nextRunAt || null,
        lastFinishedAt: latestRunData.lastFinishedAt,
        lastRunStatus: getRunStatus(latestRunData),
        failReason: latestRunData.failReason,
        // Calculate total runs (scheduled + manual)
        total: (mainDoc.runCount || 0) + (latestRunData.manualRunCount || 0)
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
                    // This can be implemented directly in MongoDB sort
                    detailSortQuery[sortColumn] = sortDir;

                    // Add consistent secondary sort fields to ensure stable ordering
                    // This ensures runs with the same value in the sorted column always appear in the same order
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

                // Aggregate the latest run data with focus on the newest manual run
                let latestRunData = null;

                if (normalDocs.length > 0 || scheduledDoc) {
                    // First, find the newest manual run document (type='normal') based on lastRunAt
                    let newestManualRun = null;

                    if (normalDocs.length > 0) {
                        // Sort normalDocs by lastRunAt in descending order
                        const sortedDocs = [...normalDocs].sort((a, b) => {
                            if (!a.lastRunAt) {
                                return 1;
                            } // null/undefined lastRunAt goes last
                            if (!b.lastRunAt) {
                                return -1;
                            }
                            // If timestamps are exactly equal, use _id for stable sorting
                            const timeCompare = new Date(b.lastRunAt) - new Date(a.lastRunAt);
                            if (timeCompare === 0 && a._id && b._id) {
                                return a._id.toString().localeCompare(b._id.toString());
                            }
                            return timeCompare; // newest first
                        });

                        // The first document is the newest manual run
                        newestManualRun = sortedDocs[0];
                    }

                    // Create base latestRunData object
                    const latestByStatus = {
                        lockedAt: null,
                        failedAt: null,
                        lastFinishedAt: null,
                        lastRunAt: null,
                        failReason: null,
                        // Count manual runs
                        manualRunCount: normalDocs.length,
                        manualFinishedCount: normalDocs.filter(doc => doc.lastFinishedAt).length
                    };

                    // First, apply data from the newest manual run if available
                    if (newestManualRun) {
                        if (newestManualRun.lockedAt) {
                            latestByStatus.lockedAt = newestManualRun.lockedAt;
                        }
                        if (newestManualRun.failedAt) {
                            // Only update failedAt if it's more recent than any existing lastFinishedAt
                            if (!latestByStatus.lastFinishedAt || new Date(newestManualRun.failedAt) > new Date(latestByStatus.lastFinishedAt)) {
                                latestByStatus.failedAt = newestManualRun.failedAt;
                                latestByStatus.failReason = newestManualRun.failReason;
                            }
                        }
                        if (newestManualRun.lastFinishedAt) {
                            // Update lastFinishedAt and clear failedAt if the successful completion is more recent
                            latestByStatus.lastFinishedAt = newestManualRun.lastFinishedAt;
                            if (latestByStatus.failedAt && new Date(newestManualRun.lastFinishedAt) > new Date(latestByStatus.failedAt)) {
                                latestByStatus.failedAt = null;
                                latestByStatus.failReason = null;
                            }
                        }
                        if (newestManualRun.lastRunAt) {
                            latestByStatus.lastRunAt = newestManualRun.lastRunAt;
                        }
                    }

                    // Then check if the scheduled doc has more recent timestamps
                    if (scheduledDoc) {
                        if (scheduledDoc.lockedAt && (!latestByStatus.lockedAt || new Date(scheduledDoc.lockedAt) > new Date(latestByStatus.lockedAt))) {
                            latestByStatus.lockedAt = scheduledDoc.lockedAt;
                        }
                        if (scheduledDoc.failedAt) {
                            // Only update failedAt if it's more recent than any existing lastFinishedAt
                            const failedDate = new Date(scheduledDoc.failedAt);
                            if ((!latestByStatus.failedAt || failedDate > new Date(latestByStatus.failedAt)) &&
                                (!latestByStatus.lastFinishedAt || failedDate > new Date(latestByStatus.lastFinishedAt))) {
                                latestByStatus.failedAt = scheduledDoc.failedAt;
                                latestByStatus.failReason = scheduledDoc.failReason;
                            }
                        }
                        if (scheduledDoc.lastFinishedAt) {
                            const finishedDate = new Date(scheduledDoc.lastFinishedAt);
                            if (!latestByStatus.lastFinishedAt || finishedDate > new Date(latestByStatus.lastFinishedAt)) {
                                latestByStatus.lastFinishedAt = scheduledDoc.lastFinishedAt;

                                // Clear failed status if the successful completion is more recent
                                if (latestByStatus.failedAt && finishedDate > new Date(latestByStatus.failedAt)) {
                                    latestByStatus.failedAt = null;
                                    latestByStatus.failReason = null;
                                }
                            }
                        }
                        if (scheduledDoc.lastRunAt && (!latestByStatus.lastRunAt || new Date(scheduledDoc.lastRunAt) > new Date(latestByStatus.lastRunAt))) {
                            latestByStatus.lastRunAt = scheduledDoc.lastRunAt;
                        }
                    }

                    // Look for any running job (lockedAt is set) across all documents
                    // This takes precedence as we want to show running status immediately
                    for (const doc of normalDocs) {
                        if (doc.lockedAt && (!latestByStatus.lockedAt || new Date(doc.lockedAt) > new Date(latestByStatus.lockedAt))) {
                            latestByStatus.lockedAt = doc.lockedAt;
                            // Update other fields from this running document
                            if (doc.lastRunAt) {
                                latestByStatus.lastRunAt = doc.lastRunAt;
                            }
                            // Note: we don't update failedAt/lastFinishedAt because a running job hasn't failed/finished yet
                        }
                    }

                    latestRunData = latestByStatus;
                }

                // Build jobDetails with latest run data
                const jobDetails = buildJobDetails(scheduledDoc, jobConfig, latestRunData);

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
                // Set up search based on query parameter
                const search = sSearch ? { name: new RegExp(sSearch, 'i') } : {};

                // We'll create a pipeline that groups by name. 
                // We prefer the doc with type='single' if it exists, because we sort by type ascending first.
                const pipeline = [
                    { $match: search },
                    {
                        $sort: (() => {
                            // Always sort by type first to prioritize 'single' jobs
                            const sortObj = { type: -1 };

                            // Handle special sorting for status (which is derived from timestamps)
                            if (sortColumn === 'status') {
                                // For status sorting, we need to sort by the relevant timestamps
                                // Status priority: RUNNING (lockedAt) > FAILED (failedAt) > COMPLETED (lastFinishedAt) > SCHEDULED
                                if (sortDir === 1) { // ascending
                                    // Prioritize in natural order: SCHEDULED, COMPLETED, FAILED, RUNNING
                                    sortObj.lockedAt = -1; // RUNNING last (if lockedAt exists)
                                    sortObj.failedAt = -1; // FAILED before RUNNING
                                    sortObj.lastFinishedAt = -1; // COMPLETED before FAILED
                                }
                                else { // descending
                                    // Prioritize in reverse order: RUNNING, FAILED, COMPLETED, SCHEDULED
                                    sortObj.lockedAt = 1; // RUNNING first (if lockedAt exists)
                                    sortObj.failedAt = 1; // FAILED after RUNNING
                                    sortObj.lastFinishedAt = 1; // COMPLETED after FAILED
                                }
                                // For jobs with the same status, sort by lastRunAt to show most recent first
                                sortObj.lastRunAt = -1;
                                // Add name as secondary sort for consistent ordering when status is the same
                                sortObj.name = sortDir;
                                // Add _id as tertiary sort for absolute stability
                                sortObj._id = sortDir;
                            }
                            // Handle sorting for timestamp-based fields used in lastRunStatus
                            else if (sortColumn === 'lastRunStatus') {
                                if (sortDir === 1) { // ascending: pending, success, failed
                                    sortObj.failedAt = -1;
                                    sortObj.lastFinishedAt = -1;
                                }
                                else { // descending: failed, success, pending
                                    sortObj.failedAt = 1;
                                    sortObj.lastFinishedAt = 1;
                                }
                                // For jobs with the same run status, sort by lastRunAt
                                sortObj.lastRunAt = -1;
                                // Add name as secondary sort for consistent ordering when status is the same
                                sortObj.name = sortDir;
                                // Add _id as tertiary sort for absolute stability
                                sortObj._id = sortDir;
                            }
                            // Handle direct sorting for actual date fields
                            else if (sortColumn === 'lastFinishedAt' || sortColumn === 'nextRunAt' || sortColumn === 'lastRunAt') {
                                // For date fields, always sort nulls last regardless of direction
                                // MongoDB can't do this directly in the sort stage, but we can handle nulls in the group stage
                                sortObj[sortColumn] = sortDir;
                                // Add name as secondary sort for consistent ordering when date is the same
                                sortObj.name = sortDir;
                                // Add _id as tertiary sort for absolute stability
                                sortObj._id = sortDir;
                            }
                            // Handle sorting when total is selected
                            else if (sortColumn === 'total') {
                                // Sort by the combined run count (scheduled + manual)
                                // This will be calculated later, but we can sort by the initial factors here
                                sortObj.runCount = sortDir; // From the single doc
                                sortObj.normalDocCount = sortDir; // From the aggregation
                                // Add name for secondary sort
                                sortObj.name = sortDir;
                                // Add _id as tertiary sort
                                sortObj._id = sortDir;
                            }
                            // Default to name sorting if column isn't directly sortable at db level
                            else if (sortColumn !== 'name' && sortColumn !== 'scheduleLabel') {
                                // Sort by name in a case-insensitive manner for consistency
                                sortObj.name = sortDir;
                                // Add _id as secondary sort for absolute stability when names are the same
                                sortObj._id = sortDir;
                            }
                            else {
                                // Sort by name in a case-insensitive manner for consistency
                                sortObj.name = sortDir;
                                // Add _id as secondary sort for absolute stability when names are the same
                                sortObj._id = sortDir;
                            }

                            return sortObj;
                        })()
                    },
                    {
                        $group: {
                            _id: "$name",
                            doc: { $first: "$$ROOT" }, // the first doc in each group
                            lastRunAt: { $max: "$lastRunAt" },
                            lastFinishedAt: { $max: "$lastFinishedAt" },
                            failedAt: { $max: "$failedAt" },
                            // Add lockedAt to track running jobs
                            lockedAt: { $max: "$lockedAt" },
                            // Count documents to help with run counts
                            normalDocCount: {
                                $sum: { $cond: [{ $eq: ["$type", "normal"] }, 1, 0] }
                            },
                            // Count finished normal docs
                            normalFinishedCount: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $eq: ["$type", "normal"] },
                                                { $ne: ["$lastFinishedAt", null] }
                                            ]
                                        },
                                        1,
                                        0
                                    ]
                                }
                            },
                            // Also gather failReason from the document with the latest failedAt
                            failReason: {
                                $first: {
                                    $cond: [
                                        { $eq: ["$failedAt", { $max: "$failedAt" }] },
                                        "$failReason",
                                        null
                                    ]
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            name: "$_id",
                            doc: 1,
                            lastRunAt: 1,
                            lastFinishedAt: 1,
                            failedAt: 1,
                            lockedAt: 1,
                            failReason: 1,
                            normalDocCount: 1,
                            normalFinishedCount: 1
                        }
                    },
                    { $skip: skip },
                    { $limit: limit }
                ];

                // total distinct job names
                const allNames = await jobsCollection.distinct('name', search);
                const totalCount = allNames.length;

                // Check if we need to use a collation for case-insensitive name sorting
                const options = {
                    allowDiskUse: true
                };

                // Run pipeline
                const rawJobs = await jobsCollection.aggregate(pipeline, options).toArray();

                // Fetch jobConfigs in one pass
                const jobConfigs = await jobConfigsCollection.find({}).toArray();
                const configMap = {};
                jobConfigs.forEach(cfg => {
                    // Store by jobName to match with the name field in pulseJobs
                    configMap[cfg.jobName] = cfg;
                });

                // Merge data
                const processed = rawJobs.map(item => {
                    const name = item.name;
                    const mainDoc = item.doc; // the doc from $first
                    const jobConfig = configMap[name] || null; // Use name to look up in configMap

                    // Ensure we're getting the latest status data, especially for manual runs
                    // The group aggregation already provides max values for timestamps,
                    // but we need to make sure lockedAt reflects current running state
                    const status = {
                        lockedAt: item.lockedAt,
                        failedAt: item.failedAt,
                        lastFinishedAt: item.lastFinishedAt,
                        lastRunAt: item.lastRunAt,
                        failReason: item.failReason,
                        normalDocCount: item.normalDocCount,
                        normalFinishedCount: item.normalFinishedCount
                    };

                    return buildListViewJob(mainDoc, jobConfig, status);
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