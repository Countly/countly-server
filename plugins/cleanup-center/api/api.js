/**
 * Cleanup Center Plugin API
 * Comprehensive data governance and entity management for Countly
 */

/* eslint-disable valid-jsdoc, require-jsdoc */
const pluginOb = {};
const common = require('../../../api/utils/common.js');
const plugins = require('../../pluginManager.js');
const log = common.log('cleanup-center:api');
const { validateRead, validateUpdate, validateDelete } = require('../../../api/utils/rights.js');
const moment = require('moment');

const FEATURE_NAME = 'cleanup_center';
const AUDIT_COLLECTION = 'cleanup_audit_log';
const METADATA_COLLECTION = 'cleanup_metadata';

/**
 * Helper to safely format date (currently unused but kept for future use)
 * @param {number} timestamp - Timestamp to format
 * @returns {string} Formatted date string
 */
// eslint-disable-next-line no-unused-vars
function safeFormatDate(timestamp) {
    if (!timestamp || timestamp < 946684800000) {
        return 'N/A';
    }
    return moment(timestamp).format('YYYY-MM-DD HH:mm');
}

/**
 * Log an action to the audit trail
 */
async function logAudit(params, action, entityId, entityType, entityKey, before, after) {
    try {
        const auditEntry = {
            timestamp: Date.now(),
            actor: params.member._id.toString(),
            actorName: params.member.full_name || params.member.username || params.member.email,
            action: action,
            entityId: entityId,
            entityType: entityType,
            entityKey: entityKey,
            before: before || {},
            after: after || {},
            appId: params.qstring.app_id || null
        };

        await common.db.collection(AUDIT_COLLECTION).insertOne(auditEntry);
        log.d('Audit logged:', action, entityType, entityKey);
    }
    catch (error) {
        log.e('Error logging audit:', error);
    }
}

/**
 * Get or create metadata for an entity
 */
async function getEntityMetadata(appId, entityType, entityKey) {
    try {
        const metadata = await common.db.collection(METADATA_COLLECTION).findOne({
            app_id: appId,
            entity_type: entityType,
            entity_key: entityKey
        });

        if (metadata) {
            return metadata;
        }

        const newMetadata = {
            app_id: appId,
            entity_type: entityType,
            entity_key: entityKey,
            status: 'live',
            hidden: false,
            blocked: false,
            owner: null,
            tags: [],
            validationRules: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        await common.db.collection(METADATA_COLLECTION).insertOne(newMetadata);
        return newMetadata;
    }
    catch (error) {
        log.e('Error getting entity metadata:', error);
        return null;
    }
}

/**
 * Update entity metadata
 */
async function updateEntityMetadata(appId, entityType, entityKey, updates) {
    try {
        const result = await common.db.collection(METADATA_COLLECTION).updateOne(
            {
                app_id: appId,
                entity_type: entityType,
                entity_key: entityKey
            },
            {
                $set: {
                    ...updates,
                    updatedAt: Date.now()
                }
            },
            { upsert: true }
        );

        return result.modifiedCount > 0 || result.upsertedCount > 0;
    }
    catch (error) {
        log.e('Error updating entity metadata:', error);
        return false;
    }
}

/**
 * Extract events and their segmentations
 */
async function extractEvents(appId) {
    const entities = [];

    try {
        // Get events from drill_meta collection (has all the metadata we need)
        const drillMetaEvents = await common.drillDb.collection('drill_meta').find({
            _id: { $regex: `^${appId}_` },
            cohort: { $ne: true },
            biglist: { $ne: true }
        }).toArray();

        for (const event of drillMetaEvents) {
            const eventKey = event.e || event._id.replace(`${appId}_`, '');

            // Skip internal Countly events
            if (eventKey.indexOf('[CLY]_') === 0) {
                continue;
            }

            const metadata = await getEntityMetadata(appId, 'event', eventKey);

            // Calculate usage from segments (sum of all segment counts)
            let totalCount = 0;
            if (event.sg) {
                for (const segKey in event.sg) {
                    const segment = event.sg[segKey];
                    if (segment && segment.values) {
                        for (const valKey in segment.values) {
                            if (segment.values[valKey] && segment.values[valKey].c) {
                                totalCount += segment.values[valKey].c || 0;
                            }
                        }
                    }
                }
            }

            // Get last seen timestamp
            const lastSeen = event.lts ? moment(event.lts).toDate() : null;

            entities.push({
                id: `event_${appId}_${eventKey}`,
                type: 'event',
                key: eventKey,
                displayName: metadata?.displayNameOverride || eventKey,
                status: metadata ? metadata.status : (event.status || 'live'),
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : (event.status === 'blocked'),
                owner: metadata ? metadata.owner : (event.owner || null),
                lastSeen: lastSeen ? lastSeen.toISOString() : null,
                usage30d: totalCount,
                createdAt: metadata ? metadata.createdAt : (event.cts ? (typeof event.cts === 'number' ? (event.cts < 10000000000 ? event.cts * 1000 : event.cts) : moment(event.cts).valueOf()) : null),
                updatedAt: metadata ? metadata.updatedAt : (event.lts ? (typeof event.lts === 'number' ? (event.lts < 10000000000 ? event.lts * 1000 : event.lts) : moment(event.lts).valueOf()) : null),
                tags: metadata ? metadata.tags : [],
                // Additional event data
                segmentCount: event.sg ? Object.keys(event.sg).length : 0,
                description: event.description || null
            });
        }

        // Also get events from events collection that might not be in drill_meta yet
        const eventsCol = await common.db.collection('events').findOne({ _id: common.db.ObjectID(appId) });

        if (eventsCol && eventsCol.list) {
            const existingKeys = new Set(entities.map(e => e.key));

            for (const eventKey of eventsCol.list) {
                if (eventKey.indexOf('[CLY]_') === 0 || existingKeys.has(eventKey)) {
                    continue;
                }

                const metadata = await getEntityMetadata(appId, 'event', eventKey);

                entities.push({
                    id: `event_${appId}_${eventKey}`,
                    type: 'event',
                    key: eventKey,
                    displayName: metadata?.displayNameOverride || eventKey,
                    status: metadata ? metadata.status : 'live',
                    hidden: metadata ? metadata.hidden : false,
                    blocked: metadata ? metadata.blocked : false,
                    owner: metadata ? metadata.owner : null,
                    lastSeen: null,
                    usage30d: 0,
                    createdAt: metadata ? metadata.createdAt : null,
                    updatedAt: metadata ? metadata.updatedAt : null,
                    tags: metadata ? metadata.tags : [],
                    segmentCount: 0,
                    description: null
                });
            }
        }
    }
    catch (error) {
        log.e('Error extracting events:', error);
    }

    return entities;
}

/**
 * Extract event properties (segmentations)
 */
async function extractEventProperties(appId) {
    const entities = [];

    try {
        // Get event segmentations from drill_meta
        const drillMetaEvents = await common.drillDb.collection('drill_meta').find({
            _id: { $regex: `^${appId}_` },
            cohort: { $ne: true },
            biglist: { $ne: true }
        }).toArray();

        for (const event of drillMetaEvents) {
            const eventKey = event.e || event._id.replace(`${appId}_`, '');

            if (eventKey.indexOf('[CLY]_') === 0) {
                continue;
            }

            if (event.sg) {
                for (const segKey in event.sg) {
                    const segment = event.sg[segKey];
                    const metadata = await getEntityMetadata(appId, 'event_property', `${eventKey}.${segKey}`);

                    // Count distinct values and total usage
                    let distinctValues = 0;
                    let totalUsage = 0;
                    if (segment && segment.values) {
                        distinctValues = Object.keys(segment.values).length;
                        for (const valKey in segment.values) {
                            if (segment.values[valKey] && segment.values[valKey].c) {
                                totalUsage += segment.values[valKey].c || 0;
                            }
                        }
                    }

                    entities.push({
                        id: `event_property_${appId}_${eventKey}_${segKey}`,
                        type: 'event_property',
                        key: `${eventKey}.${segKey}`,
                        displayName: metadata?.displayNameOverride || segKey,
                        parentEvent: eventKey,
                        status: metadata ? metadata.status : 'live',
                        hidden: metadata ? metadata.hidden : false,
                        blocked: metadata ? metadata.blocked : false,
                        owner: metadata ? metadata.owner : null,
                        lastSeen: event.lts ? moment(event.lts).toDate().toISOString() : null,
                        usage30d: totalUsage,
                        distinctValues: distinctValues,
                        dataType: segment.type || 'string',
                        createdAt: metadata ? metadata.createdAt : null,
                        updatedAt: metadata ? metadata.updatedAt : null,
                        tags: metadata ? metadata.tags : []
                    });
                }
            }
        }
    }
    catch (error) {
        log.e('Error extracting event properties:', error);
    }

    return entities;
}

/**
 * Extract user properties
 */
async function extractUserProperties(appId) {
    const entities = [];

    try {
        const fields = await common.db.collection('app_user_fields').findOne({ _id: common.db.ObjectID(appId) });

        if (fields) {
            for (const fieldKey in fields) {
                if (fieldKey === '_id') {
                    continue;
                }

                const fieldData = fields[fieldKey];
                const metadata = await getEntityMetadata(appId, 'user_property', fieldKey);

                entities.push({
                    id: `user_property_${appId}_${fieldKey}`,
                    type: 'user_property',
                    key: fieldKey,
                    displayName: metadata?.displayNameOverride || fieldKey,
                    dataType: fieldData.type || 'unknown',
                    status: metadata ? metadata.status : 'live',
                    hidden: metadata ? metadata.hidden : false,
                    blocked: metadata ? metadata.blocked : false,
                    owner: metadata ? metadata.owner : null,
                    lastSeen: 'Active',
                    usage30d: 0,
                    createdAt: metadata ? metadata.createdAt : null,
                    updatedAt: metadata ? metadata.updatedAt : null,
                    tags: metadata ? metadata.tags : []
                });
            }
        }
    }
    catch (error) {
        log.e('Error extracting user properties:', error);
    }

    return entities;
}

/**
 * Extract views
 */
async function extractViews(appId) {
    const entities = [];

    try {
        const viewData = await common.db.collection(`app_viewdata${appId}`).find({}).limit(100).toArray();

        for (const view of viewData) {
            const metadata = await getEntityMetadata(appId, 'view', view._id);

            entities.push({
                id: `view_${appId}_${view._id}`,
                type: 'view',
                key: view._id,
                displayName: metadata?.displayNameOverride || view._id,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : null,
                lastSeen: 'Active',
                usage30d: view.c || 0,
                createdAt: metadata ? metadata.createdAt : null,
                updatedAt: metadata ? metadata.updatedAt : null,
                tags: metadata ? metadata.tags : []
            });
        }
    }
    catch (error) {
        log.e('Error extracting views:', error);
    }

    return entities;
}

/**
 * Extract errors and crashes
 */
async function extractErrors(appId) {
    const entities = [];

    try {
        const crashes = await common.db.collection('app_crashes' + appId).find({}).limit(100).toArray();

        for (const crash of crashes) {
            const metadata = await getEntityMetadata(appId, 'error', crash._id);

            entities.push({
                id: `error_${appId}_${crash._id}`,
                type: 'error',
                key: crash._id,
                displayName: metadata?.displayNameOverride || crash.name || crash._id,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : null,
                lastSeen: crash.latest_version || 'N/A',
                usage30d: crash.reports || 0,
                affectedUsers: crash.users || 0,
                createdAt: metadata ? metadata.createdAt : crash.startTime,
                updatedAt: metadata ? metadata.updatedAt : crash.lastTime,
                tags: metadata ? metadata.tags : []
            });
        }
    }
    catch (error) {
        log.e('Error extracting errors:', error);
    }

    return entities;
}

/**
 * Extract feature flags
 */
async function extractFeatureFlags(appId) {
    const entities = [];

    try {
        const params = await common.db.collection(`remoteconfig_parameters${appId}`).find({}).toArray();

        for (const param of params) {
            const metadata = await getEntityMetadata(appId, 'feature_flag', param.parameter);

            entities.push({
                id: `feature_flag_${appId}_${param.parameter}`,
                type: 'feature_flag',
                key: param.parameter,
                displayName: metadata?.displayNameOverride || param.parameter,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : null,
                lastSeen: param.ts ? moment(param.ts).format('YYYY-MM-DD') : 'N/A',
                usage30d: 0,
                createdAt: metadata ? metadata.createdAt : param.ts,
                updatedAt: metadata ? metadata.updatedAt : param.ts,
                tags: metadata ? metadata.tags : [],
                enabled: param.status === 'Running'
            });
        }
    }
    catch (error) {
        log.e('Error extracting feature flags:', error);
    }

    return entities;
}

/**
 * Extract cohorts (user segments)
 */
async function extractCohorts(appId) {
    const entities = [];

    try {
        const cohorts = await common.db.collection('cohorts').find({ app_id: appId }).toArray();

        for (const cohort of cohorts) {
            const metadata = await getEntityMetadata(appId, 'cohort', cohort._id.toString());

            entities.push({
                id: `cohort_${appId}_${cohort._id}`,
                type: 'cohort',
                key: cohort.name || cohort._id.toString(),
                displayName: metadata?.displayNameOverride || cohort.name,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (cohort.creator ? (typeof cohort.creator === 'object' ? cohort.creator.toString() : String(cohort.creator)) : null),
                lastSeen: cohort.lts ? moment(cohort.lts).toDate().toISOString() : null,
                usage30d: cohort.count || 0,
                createdAt: cohort.created_at || null,
                updatedAt: cohort.stateChanged || null,
                tags: metadata ? metadata.tags : [],
                userCount: cohort.count || 0,
                description: cohort.description || null
            });
        }
    }
    catch (error) {
        log.e('Error extracting cohorts:', error);
    }

    return entities;
}

/**
 * Extract dashboards
 */
async function extractDashboards(appId) {
    const entities = [];

    try {
        // Dashboards don't have app_id field - they're global entities
        // Get all dashboards and filter by widgets that belong to the app
        const allDashboards = await common.db.collection('dashboards').find({}).toArray();

        // If appId is provided, filter dashboards that have widgets for this app
        // Otherwise, include all dashboards
        const dashboards = appId ? allDashboards.filter(dashboard => {
            if (!dashboard.widgets || !Array.isArray(dashboard.widgets) || dashboard.widgets.length === 0) {
                return false;
            }
            // Check if any widget belongs to this app
            // We need to fetch widget data to check their apps
            // For now, include all dashboards with widgets (we'll filter by widget apps later if needed)
            return true;
        }) : allDashboards;

        // Get widget data to check which apps they belong to
        const widgetIds = [];
        dashboards.forEach(dashboard => {
            if (dashboard.widgets && Array.isArray(dashboard.widgets)) {
                dashboard.widgets.forEach(w => {
                    const widgetId = typeof w === 'string' ? w : (w ? w.toString() : null);
                    if (widgetId && widgetIds.indexOf(widgetId) === -1) {
                        widgetIds.push(widgetId);
                    }
                });
            }
        });

        const widgetsMap = {};
        if (widgetIds.length > 0) {
            try {
                const objectIds = widgetIds
                    .filter(id => id && common.db.ObjectID.isValid(id))
                    .map(id => common.db.ObjectID(id));

                if (objectIds.length > 0) {
                    const widgets = await common.db.collection('widgets').find({
                        _id: { $in: objectIds }
                    }).toArray();
                    widgets.forEach(widget => {
                        widgetsMap[widget._id.toString()] = widget;
                    });
                }
            }
            catch (error) {
                log.e('Error fetching widgets for dashboards:', error);
            }
        }

        for (const dashboard of dashboards) {
            // If appId is provided, check if dashboard has widgets for this app
            if (appId) {
                let hasAppWidgets = false;
                if (dashboard.widgets && Array.isArray(dashboard.widgets)) {
                    for (const widgetId of dashboard.widgets) {
                        const widget = widgetsMap[widgetId.toString()];
                        if (widget && widget.apps && Array.isArray(widget.apps)) {
                            const widgetAppIds = widget.apps.map(a => a.toString());
                            if (widgetAppIds.includes(appId.toString())) {
                                hasAppWidgets = true;
                                break;
                            }
                        }
                    }
                }
                if (!hasAppWidgets) {
                    continue; // Skip this dashboard if it doesn't have widgets for this app
                }
            }

            // Use the first app from widgets, or null if no widgets
            let dashboardAppId = appId || null;
            if (!dashboardAppId && dashboard.widgets && dashboard.widgets.length > 0) {
                const firstWidget = widgetsMap[dashboard.widgets[0].toString()];
                if (firstWidget && firstWidget.apps && firstWidget.apps.length > 0) {
                    dashboardAppId = firstWidget.apps[0].toString();
                }
            }

            const metadata = await getEntityMetadata(dashboardAppId, 'dashboard', dashboard._id.toString());

            // Helper to convert date to timestamp
            const toTimestamp = (dateValue) => {
                if (!dateValue) {
                    return null;
                }
                if (typeof dateValue === 'number') {
                    return dateValue;
                }
                if (dateValue instanceof Date) {
                    return dateValue.getTime();
                }
                const momentDate = moment(dateValue);
                return momentDate.isValid() ? momentDate.valueOf() : null;
            };

            // Calculate lastSeen from view_users array and detect unused dashboards
            let lastSeenDate = null;
            let viewCount = 0;
            let isUnused = false;
            let recentViewCount = 0; // Views in last 30 days

            try {
                if (dashboard.view_users && Array.isArray(dashboard.view_users) && dashboard.view_users.length > 0) {
                    viewCount = dashboard.view_users.length;
                    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

                    // Find the most recent view date and count recent views
                    const dates = dashboard.view_users.map(v => {
                        if (!v || !v.date) {
                            return null;
                        }
                        const timestamp = new Date(v.date).getTime();
                        if (isNaN(timestamp)) {
                            return null;
                        }

                        // Count recent views (last 30 days)
                        if (timestamp >= thirtyDaysAgo) {
                            recentViewCount++;
                        }

                        return timestamp;
                    }).filter(d => d !== null);

                    if (dates.length > 0) {
                        const maxDate = Math.max(...dates);
                        lastSeenDate = new Date(maxDate).toISOString();

                        // Dashboard is unused if last view was more than 30 days ago
                        if (maxDate < thirtyDaysAgo) {
                            isUnused = true;
                        }
                    }
                }
                else if (dashboard.last_viewed) {
                    // Fallback to old last_viewed field
                    lastSeenDate = moment(dashboard.last_viewed).toDate().toISOString();
                    const lastViewedTime = new Date(dashboard.last_viewed).getTime();
                    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                    if (lastViewedTime < thirtyDaysAgo) {
                        isUnused = true;
                    }
                }
                else {
                    // No view data at all
                    isUnused = true;
                }
            }
            catch (error) {
                log.e('Error calculating lastSeen for dashboard:', dashboard._id, error);
                lastSeenDate = null;
            }

            entities.push({
                id: `dashboard_${dashboardAppId || 'global'}_${dashboard._id}`,
                type: 'dashboard',
                key: dashboard.name || dashboard._id.toString(),
                displayName: metadata?.displayNameOverride || dashboard.name,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (dashboard.owner_id ? (typeof dashboard.owner_id === 'object' ? dashboard.owner_id.toString() : String(dashboard.owner_id)) : null),
                lastSeen: lastSeenDate,
                usage30d: recentViewCount, // Views in last 30 days only
                totalViews: viewCount, // Total all-time views
                createdAt: metadata ? metadata.createdAt : toTimestamp(dashboard.created_at),
                updatedAt: metadata ? metadata.updatedAt : toTimestamp(dashboard.updated_at),
                updatedBy: metadata ? metadata.updatedBy : (dashboard.updated_by || null),
                tags: metadata ? metadata.tags : [],
                widgetCount: dashboard.widgets ? dashboard.widgets.length : 0,
                isShared: dashboard.is_shared || false,
                isUnused: isUnused, // Flag for dashboards not viewed in 30 days
                appId: dashboardAppId, // Store the app ID for filtering
                viewUsers: dashboard.view_users || [] // Include view_users for detailed tracking
            });
        }
    }
    catch (error) {
        log.e('Error extracting dashboards:', error);
    }

    return entities;
}

/**
 * Extract funnels
 */
async function extractFunnels(appId) {
    const entities = [];

    try {
        const funnels = await common.db.collection('funnels').find({ app_id: appId }).toArray();

        for (const funnel of funnels) {
            const metadata = await getEntityMetadata(appId, 'funnel', funnel._id.toString());

            entities.push({
                id: `funnel_${appId}_${funnel._id}`,
                type: 'funnel',
                key: funnel.name || funnel._id.toString(),
                displayName: metadata?.displayNameOverride || funnel.name,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (funnel.creator ? (typeof funnel.creator === 'object' ? funnel.creator.toString() : String(funnel.creator)) : null),
                lastSeen: funnel.last_viewed ? moment(funnel.last_viewed).toDate().toISOString() : null,
                usage30d: funnel.view_count || 0,
                createdAt: funnel.created || null,
                updatedAt: null,
                tags: metadata ? metadata.tags : [],
                stepCount: funnel.steps ? funnel.steps.length : 0,
                description: funnel.description || null
            });
        }
    }
    catch (error) {
        log.e('Error extracting funnels:', error);
    }

    return entities;
}

/**
 * Extract reports
 */
async function extractReports(appId) {
    const entities = [];

    try {
        const reports = await common.db.collection('long_tasks').find({
            app_id: appId,
            type: { $in: ['report', 'scheduled_report'] }
        }).toArray();

        for (const report of reports) {
            const metadata = await getEntityMetadata(appId, 'report', report._id.toString());

            entities.push({
                id: `report_${appId}_${report._id}`,
                type: 'report',
                key: report.report_name || report._id.toString(),
                displayName: metadata?.displayNameOverride || report.report_name,
                status: metadata ? metadata.status : (report.status || 'live'),
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (report.creator ? (typeof report.creator === 'object' ? report.creator.toString() : String(report.creator)) : null),
                lastSeen: report.ts ? moment(report.ts).toDate().toISOString() : null,
                usage30d: 0,
                createdAt: metadata ? metadata.createdAt : (report.start || null),
                updatedAt: metadata ? metadata.updatedAt : (report.end || null),
                tags: metadata ? metadata.tags : [],
                isScheduled: report.type === 'scheduled_report',
                frequency: report.frequency || null
            });
        }
    }
    catch (error) {
        log.e('Error extracting reports:', error);
    }

    return entities;
}

/**
 * Extract alerts
 */
async function extractAlerts(appId) {
    const entities = [];

    try {
        const alerts = await common.db.collection('alerts').find({ selectedApps: appId }).toArray();

        for (const alert of alerts) {
            const metadata = await getEntityMetadata(appId, 'alert', alert._id.toString());

            entities.push({
                id: `alert_${appId}_${alert._id}`,
                type: 'alert',
                key: alert.alertName || alert._id.toString(),
                displayName: metadata?.displayNameOverride || alert.alertName,
                status: metadata ? metadata.status : (alert.enabled ? 'live' : 'paused'),
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (alert.createdBy ? (typeof alert.createdBy === 'object' ? alert.createdBy.toString() : String(alert.createdBy)) : null),
                lastSeen: alert.lastTriggered ? moment(alert.lastTriggered).toDate().toISOString() : null,
                usage30d: alert.triggerCount || 0,
                createdAt: alert.createdAt || null,
                updatedAt: null,
                tags: metadata ? metadata.tags : [],
                isEnabled: alert.enabled || false,
                alertType: alert.alertDataSubType || alert.alertDataType || 'unknown'
            });
        }
    }
    catch (error) {
        log.e('Error extracting alerts:', error);
    }

    return entities;
}

/**
 * Extract push campaigns
 */
async function extractCampaigns(appId) {
    const entities = [];

    try {
        const campaigns = await common.db.collection('messages').find({ apps: appId }).toArray();

        for (const campaign of campaigns) {
            const metadata = await getEntityMetadata(appId, 'campaign', campaign._id.toString());

            entities.push({
                id: `campaign_${appId}_${campaign._id}`,
                type: 'campaign',
                key: campaign.messagePerLocale ? (campaign.messagePerLocale.default?.title || campaign._id.toString()) : campaign._id.toString(),
                displayName: metadata?.displayNameOverride || (campaign.messagePerLocale ? campaign.messagePerLocale.default?.title : null),
                status: metadata ? metadata.status : (campaign.result?.status || 'draft'),
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (campaign.info?.createdBy ? (typeof campaign.info.createdBy === 'object' ? campaign.info.createdBy.toString() : String(campaign.info.createdBy)) : null),
                lastSeen: campaign.sent_ts ? moment(campaign.sent_ts).toDate().toISOString() : null,
                usage30d: campaign.result?.sent || 0,
                createdAt: campaign.info?.created || null,
                updatedAt: campaign.info?.updated || null,
                tags: metadata ? metadata.tags : [],
                campaignType: campaign.type || 'push',
                sentCount: campaign.result?.sent || 0,
                platform: campaign.platforms ? campaign.platforms.join(', ') : 'all'
            });
        }
    }
    catch (error) {
        log.e('Error extracting campaigns:', error);
    }

    return entities;
}

/**
 * Extract A/B tests
 */
async function extractABTests(appId) {
    const entities = [];

    try {
        const abtests = await common.db.collection('ab').find({ app_id: appId }).toArray();

        for (const test of abtests) {
            const metadata = await getEntityMetadata(appId, 'ab_test', test._id.toString());

            entities.push({
                id: `ab_test_${appId}_${test._id}`,
                type: 'ab_test',
                key: test.name || test._id.toString(),
                displayName: metadata?.displayNameOverride || test.name,
                status: metadata ? metadata.status : (test.status || 'draft'),
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (test.created_by ? (typeof test.created_by === 'object' ? test.created_by.toString() : String(test.created_by)) : null),
                lastSeen: test.end_date ? moment(test.end_date).toDate().toISOString() : null,
                usage30d: test.participants || 0,
                createdAt: metadata ? metadata.createdAt : (test.start_date || null),
                updatedAt: metadata ? metadata.updatedAt : (test.updated_at || null),
                tags: metadata ? metadata.tags : [],
                variantCount: test.variants ? test.variants.length : 0,
                participants: test.participants || 0,
                isActive: test.status === 'running'
            });
        }
    }
    catch (error) {
        log.e('Error extracting A/B tests:', error);
    }

    return entities;
}

/**
 * Extract API keys (global, not app-specific)
 */
async function extractAPIKeys() {
    const entities = [];

    try {
        const apiKeys = await common.db.collection('api_keys').find({}).toArray();

        for (const key of apiKeys) {
            const metadata = await getEntityMetadata('global', 'api_key', key._id.toString());

            entities.push({
                id: `api_key_global_${key._id}`,
                type: 'api_key',
                key: key.name || key.key.substring(0, 8) + '...',
                displayName: metadata?.displayNameOverride || key.name,
                status: metadata ? metadata.status : (key.active ? 'live' : 'disabled'),
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (key.created_by ? (typeof key.created_by === 'object' ? key.created_by.toString() : String(key.created_by)) : null),
                lastSeen: key.last_used ? moment(key.last_used).toDate().toISOString() : null,
                usage30d: key.usage_count || 0,
                createdAt: metadata ? metadata.createdAt : (key.created || null),
                updatedAt: metadata ? metadata.updatedAt : (key.updated || null),
                tags: metadata ? metadata.tags : [],
                isActive: key.active !== false,
                permissions: key.permissions ? Object.keys(key.permissions).length : 0
            });
        }
    }
    catch (error) {
        log.e('Error extracting API keys:', error);
    }

    return entities;
}

/**
 * Extract Apps
 */
async function extractApps() {
    const entities = [];

    try {
        const apps = await common.db.collection('apps').find({}).toArray();

        for (const app of apps) {
            const metadata = await getEntityMetadata('global', 'app', app._id.toString());

            entities.push({
                id: `app_global_${app._id}`,
                type: 'app',
                key: app.name || app._id.toString(),
                displayName: metadata?.displayNameOverride || app.name,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (app.owner ? (typeof app.owner === 'object' ? app.owner.toString() : String(app.owner)) : null),
                lastSeen: app.edited_at ? moment(app.edited_at).toDate().toISOString() : null,
                usage30d: 0,
                createdAt: app.created_at || null,
                updatedAt: app.edited_at || null,
                tags: metadata ? metadata.tags : [],
                appKey: app.key,
                category: app.category || null,
                timezone: app.timezone || null
            });
        }
    }
    catch (error) {
        log.e('Error extracting apps:', error);
    }

    return entities;
}

/**
 * Extract Members (Users)
 */
async function extractMembers() {
    const entities = [];

    try {
        const members = await common.db.collection('members').find({}).toArray();

        for (const member of members) {
            const metadata = await getEntityMetadata('global', 'member', member._id.toString());

            entities.push({
                id: `member_global_${member._id}`,
                type: 'member',
                key: member.username || member.email,
                displayName: metadata?.displayNameOverride || member.full_name || member.username,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : member._id.toString(),
                lastSeen: member.last_login ? moment(member.last_login).toDate().toISOString() : null,
                usage30d: 0,
                createdAt: member.created_at || null,
                updatedAt: null,
                tags: metadata ? metadata.tags : [],
                email: member.email,
                isAdmin: member.global_admin || false
            });
        }
    }
    catch (error) {
        log.e('Error extracting members:', error);
    }

    return entities;
}

/**
 * Extract User Groups
 */
async function extractUserGroups() {
    const entities = [];

    try {
        const groups = await common.db.collection('groups').find({}).toArray();

        for (const group of groups) {
            const metadata = await getEntityMetadata('global', 'user_group', group._id.toString());

            entities.push({
                id: `user_group_global_${group._id}`,
                type: 'user_group',
                key: group.name || group._id.toString(),
                displayName: metadata?.displayNameOverride || group.name,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : null,
                lastSeen: null,
                usage30d: 0,
                createdAt: metadata ? metadata.createdAt : null,
                updatedAt: metadata ? metadata.updatedAt : null,
                tags: metadata ? metadata.tags : [],
                memberCount: group.members ? group.members.length : 0
            });
        }
    }
    catch (error) {
        log.e('Error extracting user groups:', error);
    }

    return entities;
}

/**
 * Extract Widgets
 */
async function extractWidgets(appId) {
    const entities = [];

    try {
        const widgets = await common.db.collection('widgets').find({ app_id: appId }).toArray();

        for (const widget of widgets) {
            const metadata = await getEntityMetadata(appId, 'widget', widget._id.toString());

            entities.push({
                id: `widget_${appId}_${widget._id}`,
                type: 'widget',
                key: widget.widget_name || widget._id.toString(),
                displayName: metadata?.displayNameOverride || widget.widget_name,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : null,
                lastSeen: null,
                usage30d: 0,
                createdAt: metadata ? metadata.createdAt : null,
                updatedAt: metadata ? metadata.updatedAt : null,
                tags: metadata ? metadata.tags : [],
                widgetType: widget.widget_type || 'unknown'
            });
        }
    }
    catch (error) {
        log.e('Error extracting widgets:', error);
    }

    return entities;
}

/**
 * Extract Surveys
 */
async function extractSurveys(appId) {
    const entities = [];

    try {
        const surveys = await common.db.collection('nps').find({
            app_id: appId,
            type: 'survey'
        }).toArray();

        for (const survey of surveys) {
            const metadata = await getEntityMetadata(appId, 'survey', survey._id.toString());

            entities.push({
                id: `survey_${appId}_${survey._id}`,
                type: 'survey',
                key: survey.name || survey._id.toString(),
                displayName: metadata?.displayNameOverride || survey.name,
                status: metadata ? metadata.status : (survey.status || 'live'),
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (survey.creator ? (typeof survey.creator === 'object' ? survey.creator.toString() : String(survey.creator)) : null),
                lastSeen: survey.end_date ? moment(survey.end_date).toDate().toISOString() : null,
                usage30d: survey.response_count || 0,
                createdAt: survey.created_at || null,
                updatedAt: null,
                tags: metadata ? metadata.tags : [],
                responseCount: survey.response_count || 0
            });
        }
    }
    catch (error) {
        log.e('Error extracting surveys:', error);
    }

    return entities;
}

/**
 * Extract NPS
 */
async function extractNPS(appId) {
    const entities = [];

    try {
        const npsList = await common.db.collection('nps').find({
            app_id: appId,
            type: 'nps'
        }).toArray();

        for (const nps of npsList) {
            const metadata = await getEntityMetadata(appId, 'nps', nps._id.toString());

            entities.push({
                id: `nps_${appId}_${nps._id}`,
                type: 'nps',
                key: nps.name || nps._id.toString(),
                displayName: metadata?.displayNameOverride || nps.name,
                status: metadata ? metadata.status : (nps.status || 'live'),
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (nps.creator ? nps.creator.toString() : null),
                lastSeen: nps.end_date ? moment(nps.end_date).toDate().toISOString() : null,
                usage30d: nps.response_count || 0,
                createdAt: nps.created_at || null,
                updatedAt: null,
                tags: metadata ? metadata.tags : [],
                responseCount: nps.response_count || 0,
                npsScore: nps.nps_score || 0
            });
        }
    }
    catch (error) {
        log.e('Error extracting NPS:', error);
    }

    return entities;
}

/**
 * Extract Flows
 */
async function extractFlows(appId) {
    const entities = [];

    try {
        const flows = await common.db.collection('flow_schemas').find({ app_id: appId }).toArray();

        for (const flow of flows) {
            const metadata = await getEntityMetadata(appId, 'flow', flow._id.toString());

            entities.push({
                id: `flow_${appId}_${flow._id}`,
                type: 'flow',
                key: flow.name || flow._id.toString(),
                displayName: metadata?.displayNameOverride || flow.name,
                status: metadata ? metadata.status : (flow.status || 'live'),
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : null,
                lastSeen: flow.status_changed ? moment(flow.status_changed).toDate().toISOString() : null,
                usage30d: 0,
                createdAt: flow.created || null,
                updatedAt: flow.status_changed || null,
                tags: metadata ? metadata.tags : []
            });
        }
    }
    catch (error) {
        log.e('Error extracting flows:', error);
    }

    return entities;
}

/**
 * Extract Hooks
 */
async function extractHooks() {
    const entities = [];

    try {
        const hooks = await common.db.collection('hooks').find({}).toArray();

        for (const hook of hooks) {
            const metadata = await getEntityMetadata('global', 'hook', hook._id.toString());

            entities.push({
                id: `hook_global_${hook._id}`,
                type: 'hook',
                key: hook.name || hook._id.toString(),
                displayName: metadata?.displayNameOverride || hook.name,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (hook.createdBy ? hook.createdBy.toString() : null),
                lastSeen: hook.last_triggered ? moment(hook.last_triggered).toDate().toISOString() : null,
                usage30d: hook.trigger_count || 0,
                createdAt: hook.created_at || null,
                updatedAt: null,
                tags: metadata ? metadata.tags : [],
                hookType: hook.type || 'unknown'
            });
        }
    }
    catch (error) {
        log.e('Error extracting hooks:', error);
    }

    return entities;
}

/**
 * Extract Notes
 */
async function extractNotes(appId) {
    const entities = [];

    try {
        const notes = await common.db.collection('notes').find({ app_id: appId }).toArray();

        for (const note of notes) {
            const metadata = await getEntityMetadata(appId, 'note', note._id.toString());

            entities.push({
                id: `note_${appId}_${note._id}`,
                type: 'note',
                key: note.note || note._id.toString(),
                displayName: metadata?.displayNameOverride || (note.note ? note.note.substring(0, 50) : note._id.toString()),
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (note.owner || null),
                lastSeen: note.updated_at ? moment(note.updated_at).toDate().toISOString() : null,
                usage30d: 0,
                createdAt: note.created_at || null,
                updatedAt: note.updated_at || null,
                tags: metadata ? metadata.tags : []
            });
        }
    }
    catch (error) {
        log.e('Error extracting notes:', error);
    }

    return entities;
}

/**
 * Extract Remote Config Conditions
 */
async function extractRemoteConfigConditions(appId) {
    const entities = [];

    try {
        const conditions = await common.db.collection(`remoteconfig_conditions${appId}`).find({}).toArray();

        for (const condition of conditions) {
            const metadata = await getEntityMetadata(appId, 'remote_config_condition', condition._id.toString());

            entities.push({
                id: `remote_config_condition_${appId}_${condition._id}`,
                type: 'remote_config_condition',
                key: condition.name || condition._id.toString(),
                displayName: metadata?.displayNameOverride || condition.name,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : null,
                lastSeen: null,
                usage30d: 0,
                createdAt: metadata ? metadata.createdAt : null,
                updatedAt: metadata ? metadata.updatedAt : null,
                tags: metadata ? metadata.tags : []
            });
        }
    }
    catch (error) {
        log.e('Error extracting remote config conditions:', error);
    }

    return entities;
}

/**
 * Extract Attribution Campaigns
 */
async function extractAttributionCampaigns(appId) {
    const entities = [];

    try {
        const campaigns = await common.db.collection('campaigns').find({ app_id: appId }).toArray();

        for (const campaign of campaigns) {
            const metadata = await getEntityMetadata(appId, 'attribution_campaign', campaign._id.toString());

            entities.push({
                id: `attribution_campaign_${appId}_${campaign._id}`,
                type: 'attribution_campaign',
                key: campaign.name || campaign._id.toString(),
                displayName: metadata?.displayNameOverride || campaign.name,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : null,
                lastSeen: campaign.edited_at ? moment(campaign.edited_at).toDate().toISOString() : null,
                usage30d: 0,
                createdAt: campaign.created_at || null,
                updatedAt: campaign.edited_at || null,
                tags: metadata ? metadata.tags : []
            });
        }
    }
    catch (error) {
        log.e('Error extracting attribution campaigns:', error);
    }

    return entities;
}

/**
 * Extract Drill Bookmarks
 */
async function extractDrillBookmarks(appId) {
    const entities = [];

    try {
        const bookmarks = await common.db.collection('drill_bookmarks').find({ app_id: appId }).toArray();

        for (const bookmark of bookmarks) {
            const metadata = await getEntityMetadata(appId, 'drill_bookmark', bookmark._id.toString());

            entities.push({
                id: `drill_bookmark_${appId}_${bookmark._id}`,
                type: 'drill_bookmark',
                key: bookmark.bookmark_name || bookmark._id.toString(),
                displayName: metadata?.displayNameOverride || bookmark.bookmark_name,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (bookmark.creator || null),
                lastSeen: null,
                usage30d: 0,
                createdAt: metadata ? metadata.createdAt : null,
                updatedAt: metadata ? metadata.updatedAt : null,
                tags: metadata ? metadata.tags : []
            });
        }
    }
    catch (error) {
        log.e('Error extracting drill bookmarks:', error);
    }

    return entities;
}

/**
 * Extract Event Groups
 */
async function extractEventGroups(appId) {
    const entities = [];

    try {
        const eventGroups = await common.db.collection('event_groups').find({ app_id: appId }).toArray();

        for (const group of eventGroups) {
            const metadata = await getEntityMetadata(appId, 'event_group', group._id.toString());

            entities.push({
                id: `event_group_${appId}_${group._id}`,
                type: 'event_group',
                key: group.name || group._id.toString(),
                displayName: metadata?.displayNameOverride || group.name,
                status: metadata ? metadata.status : (group.status || 'live'),
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : null,
                lastSeen: null,
                usage30d: 0,
                createdAt: metadata ? metadata.createdAt : null,
                updatedAt: metadata ? metadata.updatedAt : null,
                tags: metadata ? metadata.tags : [],
                eventCount: group.events ? group.events.length : 0
            });
        }
    }
    catch (error) {
        log.e('Error extracting event groups:', error);
    }

    return entities;
}

/**
 * Extract Event Categories
 */
async function extractEventCategories(appId) {
    const entities = [];

    try {
        const categories = await common.db.collection('event_categories').find({ app_id: appId }).toArray();

        for (const category of categories) {
            const metadata = await getEntityMetadata(appId, 'event_category', category._id.toString());

            entities.push({
                id: `event_category_${appId}_${category._id}`,
                type: 'event_category',
                key: category.name || category._id.toString(),
                displayName: metadata?.displayNameOverride || category.name,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : null,
                lastSeen: null,
                usage30d: 0,
                createdAt: metadata ? metadata.createdAt : null,
                updatedAt: metadata ? metadata.updatedAt : null,
                tags: metadata ? metadata.tags : []
            });
        }
    }
    catch (error) {
        log.e('Error extracting event categories:', error);
    }

    return entities;
}

/**
 * Extract Formulas (Calculated Metrics)
 */
async function extractFormulas(appId) {
    const entities = [];

    try {
        const formulas = await common.db.collection('calculated_metrics').find({ app_id: appId }).toArray();

        for (const formula of formulas) {
            const metadata = await getEntityMetadata(appId, 'formula', formula._id.toString());

            entities.push({
                id: `formula_${appId}_${formula._id}`,
                type: 'formula',
                key: formula.name || formula._id.toString(),
                displayName: metadata?.displayNameOverride || formula.name,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (formula.owner_id ? formula.owner_id.toString() : null),
                lastSeen: null,
                usage30d: 0,
                createdAt: metadata ? metadata.createdAt : null,
                updatedAt: metadata ? metadata.updatedAt : null,
                tags: metadata ? metadata.tags : [],
                formula: formula.formula || null
            });
        }
    }
    catch (error) {
        log.e('Error extracting formulas:', error);
    }

    return entities;
}

/**
 * Extract Star Rating Widgets
 */
async function extractStarRatingWidgets(appId) {
    const entities = [];

    try {
        const widgets = await common.db.collection('feedback_widgets').find({ app_id: appId }).toArray();

        for (const widget of widgets) {
            const metadata = await getEntityMetadata(appId, 'star_rating_widget', widget._id.toString());

            entities.push({
                id: `star_rating_widget_${appId}_${widget._id}`,
                type: 'star_rating_widget',
                key: widget.name || widget._id.toString(),
                displayName: metadata?.displayNameOverride || widget.name,
                status: metadata ? metadata.status : (widget.is_active ? 'live' : 'paused'),
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : null,
                lastSeen: null,
                usage30d: 0,
                createdAt: widget.created_at || null,
                updatedAt: null,
                tags: metadata ? metadata.tags : [],
                responseCount: widget.response_count || 0
            });
        }
    }
    catch (error) {
        log.e('Error extracting star rating widgets:', error);
    }

    return entities;
}

/**
 * Extract Blocking Rules
 */
async function extractBlockingRules(appId) {
    const entities = [];

    try {
        const app = await common.db.collection('apps').findOne({ _id: common.db.ObjectID(appId) });

        if (app && app.blocks && Array.isArray(app.blocks)) {
            for (let i = 0; i < app.blocks.length; i++) {
                const block = app.blocks[i];
                const blockId = `${appId}_block_${i}`;
                const metadata = await getEntityMetadata(appId, 'blocking_rule', blockId);

                entities.push({
                    id: `blocking_rule_${appId}_${i}`,
                    type: 'blocking_rule',
                    key: block.name || `Rule ${i + 1}`,
                    displayName: metadata?.displayNameOverride || block.name || `Rule ${i + 1}`,
                    status: metadata ? metadata.status : (block.enabled ? 'live' : 'disabled'),
                    hidden: metadata ? metadata.hidden : false,
                    blocked: metadata ? metadata.blocked : false,
                    owner: metadata ? metadata.owner : null,
                    lastSeen: null,
                    usage30d: 0,
                    createdAt: metadata ? metadata.createdAt : null,
                    updatedAt: metadata ? metadata.updatedAt : null,
                    tags: metadata ? metadata.tags : [],
                    ruleType: block.type || 'unknown'
                });
            }
        }
    }
    catch (error) {
        log.e('Error extracting blocking rules:', error);
    }

    return entities;
}

/**
 * Extract Date Presets
 */
async function extractDatePresets() {
    const entities = [];

    try {
        const presets = await common.db.collection('date_presets').find({}).toArray();

        for (const preset of presets) {
            const metadata = await getEntityMetadata('global', 'date_preset', preset._id.toString());

            entities.push({
                id: `date_preset_global_${preset._id}`,
                type: 'date_preset',
                key: preset.name || preset._id.toString(),
                displayName: metadata?.displayNameOverride || preset.name,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (preset.owner ? preset.owner.toString() : null),
                lastSeen: null,
                usage30d: 0,
                createdAt: preset.created || null,
                updatedAt: null,
                tags: metadata ? metadata.tags : []
            });
        }
    }
    catch (error) {
        log.e('Error extracting date presets:', error);
    }

    return entities;
}

/**
 * Extract Journey Definitions
 */
async function extractJourneyDefinitions(appId) {
    const entities = [];

    try {
        const journeys = await common.db.collection('journey_definition').find({ app_id: appId }).toArray();

        for (const journey of journeys) {
            const metadata = await getEntityMetadata(appId, 'journey_definition', journey._id.toString());

            entities.push({
                id: `journey_definition_${appId}_${journey._id}`,
                type: 'journey_definition',
                key: journey.name || journey._id.toString(),
                displayName: metadata?.displayNameOverride || journey.name,
                status: metadata ? metadata.status : (journey.status || 'live'),
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (journey.createdBy ? journey.createdBy.toString() : null),
                lastSeen: null,
                usage30d: 0,
                createdAt: journey.created || null,
                updatedAt: null,
                tags: metadata ? metadata.tags : []
            });
        }
    }
    catch (error) {
        log.e('Error extracting journey definitions:', error);
    }

    return entities;
}

/**
 * Extract Journey Versions
 */
async function extractJourneyVersions(appId) {
    const entities = [];

    try {
        const versions = await common.db.collection('journey_versions').find({ app_id: appId }).toArray();

        for (const version of versions) {
            const metadata = await getEntityMetadata(appId, 'journey_version', version._id.toString());

            entities.push({
                id: `journey_version_${appId}_${version._id}`,
                type: 'journey_version',
                key: `${version.journey_id}_v${version.version}`,
                displayName: metadata?.displayNameOverride || `Version ${version.version}`,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : null,
                lastSeen: null,
                usage30d: 0,
                createdAt: metadata ? metadata.createdAt : null,
                updatedAt: metadata ? metadata.updatedAt : null,
                tags: metadata ? metadata.tags : [],
                journeyId: version.journey_id,
                versionNumber: version.version
            });
        }
    }
    catch (error) {
        log.e('Error extracting journey versions:', error);
    }

    return entities;
}

/**
 * Extract Content Blocks
 */
async function extractContentBlocks(appId) {
    const entities = [];

    try {
        const blocks = await common.db.collection('content_blocks').find({ app_id: appId }).toArray();

        for (const block of blocks) {
            const metadata = await getEntityMetadata(appId, 'content_block', block._id.toString());

            entities.push({
                id: `content_block_${appId}_${block._id}`,
                type: 'content_block',
                key: block.name || block._id.toString(),
                displayName: metadata?.displayNameOverride || block.name,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : null,
                lastSeen: null,
                usage30d: 0,
                createdAt: block.details?.created || null,
                updatedAt: null,
                tags: metadata ? metadata.tags : [],
                contentType: block.type || 'unknown'
            });
        }
    }
    catch (error) {
        log.e('Error extracting content blocks:', error);
    }

    return entities;
}

/**
 * Extract Data Transformations
 */
async function extractDataTransformations(appId) {
    const entities = [];

    try {
        const transformations = await common.db.collection('datamanager_transforms').find({ app_id: appId }).toArray();

        for (const transform of transformations) {
            const metadata = await getEntityMetadata(appId, 'data_transformation', transform._id.toString());

            entities.push({
                id: `data_transformation_${appId}_${transform._id}`,
                type: 'data_transformation',
                key: transform.name || transform._id.toString(),
                displayName: metadata?.displayNameOverride || transform.name,
                status: metadata ? metadata.status : (transform.enabled ? 'live' : 'disabled'),
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : null,
                lastSeen: null,
                usage30d: 0,
                createdAt: metadata ? metadata.createdAt : null,
                updatedAt: metadata ? metadata.updatedAt : null,
                tags: metadata ? metadata.tags : [],
                transformationType: transform.type || 'unknown'
            });
        }
    }
    catch (error) {
        log.e('Error extracting data transformations:', error);
    }

    return entities;
}

/**
 * Extract Crash Symbolication Files
 */
async function extractCrashSymbols(appId) {
    const entities = [];

    try {
        const symbols = await common.db.collection(`app_crashsymbols${appId}`).find({}).toArray();

        for (const symbol of symbols) {
            const metadata = await getEntityMetadata(appId, 'crash_symbol', symbol._id.toString());

            entities.push({
                id: `crash_symbol_${appId}_${symbol._id}`,
                type: 'crash_symbol',
                key: symbol.file_name || symbol._id.toString(),
                displayName: metadata?.displayNameOverride || symbol.file_name,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : null,
                lastSeen: null,
                usage30d: 0,
                createdAt: metadata ? metadata.createdAt : (symbol.uploaded_at || null),
                updatedAt: metadata ? metadata.updatedAt : null,
                tags: metadata ? metadata.tags : [],
                platform: symbol.platform || 'unknown',
                version: symbol.version || null
            });
        }
    }
    catch (error) {
        log.e('Error extracting crash symbols:', error);
    }

    return entities;
}

/**
 * Extract Crash Groups
 */
async function extractCrashGroups(appId) {
    const entities = [];

    try {
        const crashGroups = await common.db.collection(`app_crashgroups${appId}`).find({}).limit(100).toArray();

        for (const group of crashGroups) {
            const metadata = await getEntityMetadata(appId, 'crash_group', group._id.toString());

            entities.push({
                id: `crash_group_${appId}_${group._id}`,
                type: 'crash_group',
                key: group.name || group._id.toString(),
                displayName: metadata?.displayNameOverride || group.name,
                status: metadata ? metadata.status : (group.is_hidden ? 'hidden' : 'live'),
                hidden: metadata ? metadata.hidden : (group.is_hidden || false),
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : null,
                lastSeen: group.lastTs ? moment(group.lastTs).toDate().toISOString() : null,
                usage30d: group.reports || 0,
                createdAt: group.firstTs || null,
                updatedAt: group.lastTs || null,
                tags: metadata ? metadata.tags : [],
                crashCount: group.reports || 0,
                affectedUsers: group.users || 0
            });
        }
    }
    catch (error) {
        log.e('Error extracting crash groups:', error);
    }

    return entities;
}

/**
 * Extract Geo Locations
 */
async function extractGeoLocations() {
    const entities = [];

    try {
        const geos = await common.db.collection('geos').find({}).toArray();

        for (const geo of geos) {
            const metadata = await getEntityMetadata('global', 'geo_location', geo._id.toString());

            entities.push({
                id: `geo_location_global_${geo._id}`,
                type: 'geo_location',
                key: geo.name || geo._id.toString(),
                displayName: metadata?.displayNameOverride || geo.name,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : null,
                lastSeen: null,
                usage30d: 0,
                createdAt: geo.created || null,
                updatedAt: null,
                tags: metadata ? metadata.tags : [],
                latitude: geo.latitude || null,
                longitude: geo.longitude || null
            });
        }
    }
    catch (error) {
        log.e('Error extracting geo locations:', error);
    }

    return entities;
}

/**
 * Extract Online User Alerts
 */
async function extractOnlineUserAlerts(appId) {
    const entities = [];

    try {
        const alerts = await common.db.collection('concurrent_users_alerts').find({ app_id: appId }).toArray();

        for (const alert of alerts) {
            const metadata = await getEntityMetadata(appId, 'online_user_alert', alert._id.toString());

            entities.push({
                id: `online_user_alert_${appId}_${alert._id}`,
                type: 'online_user_alert',
                key: alert.name || alert._id.toString(),
                displayName: metadata?.displayNameOverride || alert.name,
                status: metadata ? metadata.status : (alert.enabled ? 'live' : 'disabled'),
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (alert.created_by ? alert.created_by.toString() : null),
                lastSeen: alert.last_triggered ? moment(alert.last_triggered).toDate().toISOString() : null,
                usage30d: alert.trigger_count || 0,
                createdAt: metadata ? metadata.createdAt : null,
                updatedAt: metadata ? metadata.updatedAt : null,
                tags: metadata ? metadata.tags : [],
                threshold: alert.threshold || 0
            });
        }
    }
    catch (error) {
        log.e('Error extracting online user alerts:', error);
    }

    return entities;
}

/**
 * Extract Authentication Tokens
 */
async function extractAuthTokens() {
    const entities = [];

    try {
        const tokens = await common.db.collection('auth_tokens').find({}).toArray();

        for (const token of tokens) {
            const metadata = await getEntityMetadata('global', 'auth_token', token._id.toString());

            entities.push({
                id: `auth_token_global_${token._id}`,
                type: 'auth_token',
                key: token.token ? token.token.substring(0, 12) + '...' : token._id.toString(),
                displayName: metadata?.displayNameOverride || (token.purpose || 'Token'),
                status: metadata ? metadata.status : (token.ttl && token.ttl < Date.now() ? 'expired' : 'live'),
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (token.owner ? token.owner.toString() : null),
                lastSeen: token.last_used ? moment(token.last_used).toDate().toISOString() : null,
                usage30d: 0,
                createdAt: metadata ? metadata.createdAt : (token.created_at || null),
                updatedAt: metadata ? metadata.updatedAt : null,
                tags: metadata ? metadata.tags : [],
                expiresAt: token.ttl || null
            });
        }
    }
    catch (error) {
        log.e('Error extracting auth tokens:', error);
    }

    return entities;
}

/**
 * Extract Long Tasks
 */
async function extractLongTasks(appId) {
    const entities = [];

    try {
        const tasks = await common.db.collection('long_tasks').find({
            app_id: appId,
            type: { $nin: ['report', 'scheduled_report'] }
        }).limit(100).toArray();

        for (const task of tasks) {
            const metadata = await getEntityMetadata(appId, 'long_task', task._id.toString());

            entities.push({
                id: `long_task_${appId}_${task._id}`,
                type: 'long_task',
                key: task.name || task._id.toString(),
                displayName: metadata?.displayNameOverride || task.name,
                status: metadata ? metadata.status : (task.status || 'pending'),
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (task.creator ? task.creator.toString() : null),
                lastSeen: task.end ? moment(task.end).toDate().toISOString() : null,
                usage30d: 0,
                createdAt: task.ts || null,
                updatedAt: null,
                tags: metadata ? metadata.tags : [],
                taskType: task.type || 'unknown'
            });
        }
    }
    catch (error) {
        log.e('Error extracting long tasks:', error);
    }

    return entities;
}

/**
 * Extract Populator Templates
 */
async function extractPopulatorTemplates() {
    const entities = [];

    try {
        const templates = await common.db.collection('populator_templates').find({}).toArray();

        for (const template of templates) {
            const metadata = await getEntityMetadata('global', 'populator_template', template._id.toString());

            entities.push({
                id: `populator_template_global_${template._id}`,
                type: 'populator_template',
                key: template.name || template._id.toString(),
                displayName: metadata?.displayNameOverride || template.name,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : (template.lastEditedBy ? template.lastEditedBy.toString() : null),
                lastSeen: null,
                usage30d: 0,
                createdAt: metadata ? metadata.createdAt : null,
                updatedAt: metadata ? metadata.updatedAt : null,
                tags: metadata ? metadata.tags : []
            });
        }
    }
    catch (error) {
        log.e('Error extracting populator templates:', error);
    }

    return entities;
}

/**
 * Extract Populator Environments
 */
async function extractPopulatorEnvironments() {
    const entities = [];

    try {
        const environments = await common.db.collection('populator_environments').find({}).toArray();

        for (const env of environments) {
            const metadata = await getEntityMetadata('global', 'populator_environment', env._id.toString());

            entities.push({
                id: `populator_environment_global_${env._id}`,
                type: 'populator_environment',
                key: env.name || env._id.toString(),
                displayName: metadata?.displayNameOverride || env.name,
                status: metadata ? metadata.status : 'live',
                hidden: metadata ? metadata.hidden : false,
                blocked: metadata ? metadata.blocked : false,
                owner: metadata ? metadata.owner : null,
                lastSeen: null,
                usage30d: 0,
                createdAt: env.createdAt || null,
                updatedAt: null,
                tags: metadata ? metadata.tags : []
            });
        }
    }
    catch (error) {
        log.e('Error extracting populator environments:', error);
    }

    return entities;
}

(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    // Helper function to resolve owner IDs to member names
    async function resolveOwnerNames(entities) {
        const ownerIds = new Set();
        const ownerIdStrings = new Set();

        // First pass: collect all owner IDs
        entities.forEach(entity => {
            if (entity.owner && entity.owner !== null && entity.owner !== undefined) {
                const ownerStr = String(entity.owner).trim();
                // Skip if it's already a name (contains space or @)
                if (ownerStr && ownerStr.length > 0 && !ownerStr.includes(' ') && !ownerStr.includes('@')) {
                    // Check if it's a valid ObjectID format (24 hex chars)
                    if (common.db.ObjectID.isValid(ownerStr)) {
                        ownerIds.add(ownerStr);
                        ownerIdStrings.add(ownerStr);
                    }
                    // Also check for numeric strings that might be ObjectIDs when converted
                    else if (/^[0-9a-fA-F]{24}$/.test(ownerStr)) {
                        ownerIds.add(ownerStr);
                        ownerIdStrings.add(ownerStr);
                    }
                }
            }
        });

        if (ownerIds.size === 0) {
            // No owner IDs to resolve, but ensure all null/undefined owners are explicitly null
            const entitiesWithOwners = entities.filter(e => e.owner && e.owner !== null && e.owner !== undefined);
            log.d(`No owner IDs to resolve. Total entities: ${entities.length}, entities with owners: ${entitiesWithOwners.length}`);
            if (entitiesWithOwners.length > 0) {
                log.d('Sample entities with owners:', entitiesWithOwners.slice(0, 5).map(e => ({
                    type: e.type,
                    key: e.key,
                    owner: e.owner,
                    ownerType: typeof e.owner
                })));
            }
            entities.forEach(entity => {
                if (!entity.owner || entity.owner === undefined) {
                    entity.owner = null;
                }
            });
            return entities;
        }

        try {
            // Convert all owner IDs to ObjectIDs for querying
            const ownerIdArray = Array.from(ownerIds)
                .map(id => {
                    try {
                        if (common.db.ObjectID.isValid(id)) {
                            return common.db.ObjectID(id);
                        }
                        return null;
                    }
                    catch (e) {
                        log.d('Error converting owner ID to ObjectID:', id, e);
                        return null;
                    }
                })
                .filter(id => id !== null);

            if (ownerIdArray.length > 0) {
                log.d(`Resolving ${ownerIdArray.length} owner IDs to names`);
                const members = await common.db.collection('members').find({
                    _id: { $in: ownerIdArray }
                }).toArray();

                log.d(`Found ${members.length} members for owner resolution`);

                const membersMap = {};
                members.forEach(member => {
                    const memberId = member._id.toString();
                    // Prefer full_name, fallback to username, then email
                    const name = member.full_name || member.username || member.email;
                    if (name) {
                        membersMap[memberId] = name;
                    }
                });

                log.d(`Created members map with ${Object.keys(membersMap).length} entries`);

                // Update entities with resolved owner names
                let resolvedCount = 0;
                let notFoundCount = 0;
                entities.forEach(entity => {
                    if (entity.owner && entity.owner !== null && entity.owner !== undefined) {
                        const ownerStr = String(entity.owner).trim();
                        // Only update if it's not already a name (contains space or @) and it's in our map
                        if (ownerStr && !ownerStr.includes(' ') && !ownerStr.includes('@')) {
                            if (membersMap[ownerStr]) {
                                entity.owner = membersMap[ownerStr];
                                resolvedCount++;
                            }
                            else if (ownerIdStrings.has(ownerStr)) {
                                // This was an ID we tried to resolve but couldn't find - keep the ID for now
                                // Don't set to null, as it might be a valid ID that just doesn't exist in members
                                notFoundCount++;
                                log.d(`Owner ID not found in members: ${ownerStr} for entity ${entity.type}:${entity.key}`);
                            }
                        }
                    }
                    else {
                        // If owner is null/undefined/empty, ensure it's null
                        entity.owner = null;
                    }
                });

                log.d(`Resolved ${resolvedCount} owner names, ${notFoundCount} not found`);
            }
            else {
                log.d('No valid ObjectIDs found for owner resolution');
            }
        }
        catch (error) {
            log.e('Error resolving owner names:', error);
        }

        return entities;
    }

    // GET /o/cleanup/entities - List all entities with filters
    plugins.register("/o/cleanup/entities", function(ob) {
        const params = ob.params;

        validateRead(params, FEATURE_NAME, async function() {
            try {
                const appId = params.qstring.app_id;
                const type = params.qstring.type;
                const status = params.qstring.status;
                const q = params.qstring.q;
                const owner = params.qstring.owner;

                log.d('Fetching entities for app:', appId || 'ALL APPS', 'type:', type);

                let allEntities = [];

                // If appId is null/undefined, get entities from all apps
                let appIdsToProcess = [];
                if (appId) {
                    appIdsToProcess = [appId];
                }
                else {
                    // Get all app IDs
                    const apps = await common.db.collection('apps').find({}).toArray();
                    appIdsToProcess = apps.map(app => app._id.toString());
                    log.d('Processing entities for all apps:', appIdsToProcess.length);
                }

                // Helper function to extract entities for all apps
                const extractForAllApps = async(extractFunction) => {
                    const results = [];
                    for (const currentAppId of appIdsToProcess) {
                        const entities = await extractFunction(currentAppId);
                        results.push(...entities);
                    }
                    return results;
                };

                if (!type || type === 'event') {
                    const events = appId ? await extractEvents(appId) : await extractForAllApps(extractEvents);
                    allEntities = allEntities.concat(events);
                }

                if (!type || type === 'event_property') {
                    const eventProps = appId ? await extractEventProperties(appId) : await extractForAllApps(extractEventProperties);
                    allEntities = allEntities.concat(eventProps);
                }

                if (!type || type === 'user_property') {
                    const userProps = appId ? await extractUserProperties(appId) : await extractForAllApps(extractUserProperties);
                    allEntities = allEntities.concat(userProps);
                }

                if (!type || type === 'view') {
                    const views = appId ? await extractViews(appId) : await extractForAllApps(extractViews);
                    allEntities = allEntities.concat(views);
                }

                if (!type || type === 'error') {
                    const errors = appId ? await extractErrors(appId) : await extractForAllApps(extractErrors);
                    allEntities = allEntities.concat(errors);
                }

                if (!type || type === 'feature_flag') {
                    const flags = appId ? await extractFeatureFlags(appId) : await extractForAllApps(extractFeatureFlags);
                    allEntities = allEntities.concat(flags);
                }

                if (!type || type === 'cohort') {
                    const cohorts = appId ? await extractCohorts(appId) : await extractForAllApps(extractCohorts);
                    allEntities = allEntities.concat(cohorts);
                }

                if (!type || type === 'dashboard') {
                    // Dashboards are global entities without a direct app_id.
                    // When an appId is provided, extractDashboards will filter by widgets for that app.
                    // When appId is null/undefined, extractDashboards will return all dashboards.
                    const dashboards = await extractDashboards(appId || null);
                    allEntities = allEntities.concat(dashboards);
                }

                if (!type || type === 'funnel') {
                    const funnels = appId ? await extractFunnels(appId) : await extractForAllApps(extractFunnels);
                    allEntities = allEntities.concat(funnels);
                }

                if (!type || type === 'report') {
                    const reports = appId ? await extractReports(appId) : await extractForAllApps(extractReports);
                    allEntities = allEntities.concat(reports);
                }

                if (!type || type === 'alert') {
                    const alerts = appId ? await extractAlerts(appId) : await extractForAllApps(extractAlerts);
                    allEntities = allEntities.concat(alerts);
                }

                if (!type || type === 'campaign') {
                    const campaigns = appId ? await extractCampaigns(appId) : await extractForAllApps(extractCampaigns);
                    allEntities = allEntities.concat(campaigns);
                }

                if (!type || type === 'ab_test') {
                    const abtests = appId ? await extractABTests(appId) : await extractForAllApps(extractABTests);
                    allEntities = allEntities.concat(abtests);
                }

                if (!type || type === 'api_key') {
                    const apikeys = await extractAPIKeys();
                    allEntities = allEntities.concat(apikeys);
                }

                // NEW: Additional entity types
                if (!type || type === 'app') {
                    const apps = await extractApps();
                    allEntities = allEntities.concat(apps);
                }

                if (!type || type === 'member') {
                    const members = await extractMembers();
                    allEntities = allEntities.concat(members);
                }

                if (!type || type === 'user_group') {
                    const userGroups = await extractUserGroups();
                    allEntities = allEntities.concat(userGroups);
                }

                if (!type || type === 'widget') {
                    const widgets = appId ? await extractWidgets(appId) : await extractForAllApps(extractWidgets);
                    allEntities = allEntities.concat(widgets);
                }

                if (!type || type === 'survey') {
                    const surveys = appId ? await extractSurveys(appId) : await extractForAllApps(extractSurveys);
                    allEntities = allEntities.concat(surveys);
                }

                if (!type || type === 'nps') {
                    const nps = appId ? await extractNPS(appId) : await extractForAllApps(extractNPS);
                    allEntities = allEntities.concat(nps);
                }

                if (!type || type === 'flow') {
                    const flows = appId ? await extractFlows(appId) : await extractForAllApps(extractFlows);
                    allEntities = allEntities.concat(flows);
                }

                if (!type || type === 'hook') {
                    const hooks = await extractHooks();
                    allEntities = allEntities.concat(hooks);
                }

                if (!type || type === 'note') {
                    const notes = appId ? await extractNotes(appId) : await extractForAllApps(extractNotes);
                    allEntities = allEntities.concat(notes);
                }

                if (!type || type === 'remote_config_condition') {
                    const conditions = appId ? await extractRemoteConfigConditions(appId) : await extractForAllApps(extractRemoteConfigConditions);
                    allEntities = allEntities.concat(conditions);
                }

                if (!type || type === 'attribution_campaign') {
                    const attributionCampaigns = appId ? await extractAttributionCampaigns(appId) : await extractForAllApps(extractAttributionCampaigns);
                    allEntities = allEntities.concat(attributionCampaigns);
                }

                if (!type || type === 'drill_bookmark') {
                    const bookmarks = appId ? await extractDrillBookmarks(appId) : await extractForAllApps(extractDrillBookmarks);
                    allEntities = allEntities.concat(bookmarks);
                }

                if (!type || type === 'event_group') {
                    const eventGroups = appId ? await extractEventGroups(appId) : await extractForAllApps(extractEventGroups);
                    allEntities = allEntities.concat(eventGroups);
                }

                if (!type || type === 'event_category') {
                    const eventCategories = appId ? await extractEventCategories(appId) : await extractForAllApps(extractEventCategories);
                    allEntities = allEntities.concat(eventCategories);
                }

                if (!type || type === 'formula') {
                    const formulas = appId ? await extractFormulas(appId) : await extractForAllApps(extractFormulas);
                    allEntities = allEntities.concat(formulas);
                }

                if (!type || type === 'star_rating_widget') {
                    const starRatingWidgets = appId ? await extractStarRatingWidgets(appId) : await extractForAllApps(extractStarRatingWidgets);
                    allEntities = allEntities.concat(starRatingWidgets);
                }

                if (!type || type === 'blocking_rule') {
                    const blockingRules = appId ? await extractBlockingRules(appId) : await extractForAllApps(extractBlockingRules);
                    allEntities = allEntities.concat(blockingRules);
                }

                if (!type || type === 'date_preset') {
                    const datePresets = await extractDatePresets();
                    allEntities = allEntities.concat(datePresets);
                }

                if (!type || type === 'journey_definition') {
                    const journeyDefinitions = appId ? await extractJourneyDefinitions(appId) : await extractForAllApps(extractJourneyDefinitions);
                    allEntities = allEntities.concat(journeyDefinitions);
                }

                if (!type || type === 'journey_version') {
                    const journeyVersions = appId ? await extractJourneyVersions(appId) : await extractForAllApps(extractJourneyVersions);
                    allEntities = allEntities.concat(journeyVersions);
                }

                if (!type || type === 'content_block') {
                    const contentBlocks = appId ? await extractContentBlocks(appId) : await extractForAllApps(extractContentBlocks);
                    allEntities = allEntities.concat(contentBlocks);
                }

                if (!type || type === 'data_transformation') {
                    const transformations = appId ? await extractDataTransformations(appId) : await extractForAllApps(extractDataTransformations);
                    allEntities = allEntities.concat(transformations);
                }

                if (!type || type === 'crash_symbol') {
                    const crashSymbols = appId ? await extractCrashSymbols(appId) : await extractForAllApps(extractCrashSymbols);
                    allEntities = allEntities.concat(crashSymbols);
                }

                if (!type || type === 'crash_group') {
                    const crashGroups = await extractCrashGroups(appId);
                    allEntities = allEntities.concat(crashGroups);
                }

                if (!type || type === 'geo_location') {
                    const geoLocations = await extractGeoLocations();
                    allEntities = allEntities.concat(geoLocations);
                }

                if (!type || type === 'online_user_alert') {
                    const onlineUserAlerts = await extractOnlineUserAlerts(appId);
                    allEntities = allEntities.concat(onlineUserAlerts);
                }

                if (!type || type === 'auth_token') {
                    const authTokens = await extractAuthTokens();
                    allEntities = allEntities.concat(authTokens);
                }

                if (!type || type === 'long_task') {
                    const longTasks = await extractLongTasks(appId);
                    allEntities = allEntities.concat(longTasks);
                }

                if (!type || type === 'populator_template') {
                    const populatorTemplates = await extractPopulatorTemplates();
                    allEntities = allEntities.concat(populatorTemplates);
                }

                if (!type || type === 'populator_environment') {
                    const populatorEnvironments = await extractPopulatorEnvironments();
                    allEntities = allEntities.concat(populatorEnvironments);
                }

                let filteredEntities = allEntities;

                if (type) {
                    filteredEntities = filteredEntities.filter(e => e.type === type);
                }

                if (status) {
                    filteredEntities = filteredEntities.filter(e => e.status === status);
                }

                if (owner) {
                    filteredEntities = filteredEntities.filter(e => e.owner === owner);
                }

                if (q) {
                    const query = q.toLowerCase();
                    filteredEntities = filteredEntities.filter(e =>
                        e.key.toLowerCase().includes(query) ||
                        e.displayName.toLowerCase().includes(query)
                    );
                }

                // Resolve owner IDs to member names
                filteredEntities = await resolveOwnerNames(filteredEntities);

                // Ensure all timestamps are in milliseconds and validate them
                filteredEntities.forEach(entity => {
                    const normalizeTimestamp = (ts) => {
                        if (!ts || ts === null || ts === undefined) {
                            return null;
                        }

                        let normalized = ts;

                        // If it's a string, try to parse it
                        if (typeof normalized === 'string') {
                            const parsed = moment(normalized);
                            if (parsed.isValid()) {
                                normalized = parsed.valueOf();
                            }
                            else {
                                return null;
                            }
                        }

                        // If it's a number, check if it's in seconds or milliseconds
                        if (typeof normalized === 'number') {
                            const tsStr = Math.round(normalized).toString();

                            // If it's 10 digits, it's likely in seconds
                            if (tsStr.length === 10) {
                                normalized = normalized * 1000;
                            }
                            // If it's less than a reasonable minimum (year 2000 in ms = 946684800000), it might be seconds
                            // But also check if it's a very large number that might be incorrectly interpreted
                            else if (normalized > 0 && normalized < 946684800000) {
                                normalized = normalized * 1000;
                            }
                            // If it's an unreasonably large number (more than year 2100), it might be in wrong units
                            else if (normalized > 4102444800000) { // Year 2100 in milliseconds
                                // Try dividing by 1000 to see if it makes sense
                                const testDate = new Date(normalized / 1000);
                                if (!isNaN(testDate.getTime()) && testDate.getFullYear() >= 1970 && testDate.getFullYear() <= 2100) {
                                    normalized = normalized / 1000;
                                }
                            }

                            // Validate the date is reasonable
                            const date = new Date(normalized);
                            if (isNaN(date.getTime()) || date.getFullYear() < 1970 || date.getFullYear() > 2100) {
                                return null;
                            }
                        }

                        return normalized;
                    };

                    entity.createdAt = normalizeTimestamp(entity.createdAt);
                    entity.updatedAt = normalizeTimestamp(entity.updatedAt);
                });

                log.i(`Returning ${filteredEntities.length} entities`);
                common.returnOutput(params, { entities: filteredEntities });
            }
            catch (error) {
                log.e('Error fetching entities:', error);
                common.returnMessage(params, 500, 'Error fetching entities');
            }
        });

        return true;
    });

    // GET /o/cleanup/entities/details - Get single entity details
    plugins.register("/o/cleanup/entities/details", function(ob) {
        const params = ob.params;

        validateRead(params, FEATURE_NAME, async function() {
            try {
                const entityId = params.qstring.entity_id;

                if (!entityId) {
                    common.returnMessage(params, 400, 'Missing entity_id');
                    return;
                }

                const parts = entityId.split('_');
                if (parts.length < 3) {
                    common.returnMessage(params, 400, 'Invalid entity_id format');
                    return;
                }

                const type = parts[0];
                const appId = parts[1];
                const key = parts.slice(2).join('_');

                const metadata = await getEntityMetadata(appId, type, key);

                const auditHistory = await common.db.collection(AUDIT_COLLECTION)
                    .find({ entityId: entityId })
                    .sort({ timestamp: -1 })
                    .limit(10)
                    .toArray();

                common.returnOutput(params, {
                    entity: {
                        id: entityId,
                        type: type,
                        key: key,
                        metadata: metadata,
                        auditHistory: auditHistory
                    }
                });
            }
            catch (error) {
                log.e('Error fetching entity details:', error);
                common.returnMessage(params, 500, 'Error fetching entity details');
            }
        });

        return true;
    });

    // POST /o/cleanup/entities/hide
    plugins.register("/o/cleanup/entities/hide", function(ob) {
        const params = ob.params;

        validateUpdate(params, FEATURE_NAME, async function() {
            try {
                const entityId = params.qstring.entity_id;
                const hidden = params.qstring.hidden === 'true' || params.qstring.hidden === true;

                if (!entityId) {
                    common.returnMessage(params, 400, 'Missing entity_id');
                    return;
                }

                const parts = entityId.split('_');
                const type = parts[0];
                const appId = parts[1];
                const key = parts.slice(2).join('_');

                const before = await getEntityMetadata(appId, type, key);
                await updateEntityMetadata(appId, type, key, { hidden: hidden });
                const after = await getEntityMetadata(appId, type, key);

                await logAudit(params, 'hide', entityId, type, key, before, after);

                common.returnMessage(params, 200, 'Entity updated');
            }
            catch (error) {
                log.e('Error hiding entity:', error);
                common.returnMessage(params, 500, 'Error hiding entity');
            }
        });

        return true;
    });

    // POST /o/cleanup/entities/block
    plugins.register("/o/cleanup/entities/block", function(ob) {
        const params = ob.params;

        validateUpdate(params, FEATURE_NAME, async function() {
            try {
                const entityId = params.qstring.entity_id;
                const blocked = params.qstring.blocked === 'true' || params.qstring.blocked === true;

                if (!entityId) {
                    common.returnMessage(params, 400, 'Missing entity_id');
                    return;
                }

                const parts = entityId.split('_');
                const type = parts[0];
                const appId = parts[1];
                const key = parts.slice(2).join('_');

                const before = await getEntityMetadata(appId, type, key);
                await updateEntityMetadata(appId, type, key, {
                    blocked: blocked,
                    status: blocked ? 'blocked' : 'live'
                });
                const after = await getEntityMetadata(appId, type, key);

                await logAudit(params, 'block', entityId, type, key, before, after);

                common.returnMessage(params, 200, 'Entity updated');
            }
            catch (error) {
                log.e('Error blocking entity:', error);
                common.returnMessage(params, 500, 'Error blocking entity');
            }
        });

        return true;
    });

    // POST /o/cleanup/entities/rename
    plugins.register("/o/cleanup/entities/rename", function(ob) {
        const params = ob.params;

        validateUpdate(params, FEATURE_NAME, async function() {
            try {
                const entityId = params.qstring.entity_id;
                const newName = params.qstring.new_name;

                if (!entityId || !newName) {
                    common.returnMessage(params, 400, 'Missing entity_id or new_name');
                    return;
                }

                const parts = entityId.split('_');
                const type = parts[0];
                const appId = parts[1];
                const key = parts.slice(2).join('_');

                const before = await getEntityMetadata(appId, type, key);
                await updateEntityMetadata(appId, type, key, { displayNameOverride: newName });
                const after = await getEntityMetadata(appId, type, key);

                await logAudit(params, 'rename', entityId, type, key, before, after);

                common.returnMessage(params, 200, 'Entity renamed');
            }
            catch (error) {
                log.e('Error renaming entity:', error);
                common.returnMessage(params, 500, 'Error renaming entity');
            }
        });

        return true;
    });

    // POST /o/cleanup/entities/merge
    plugins.register("/o/cleanup/entities/merge", function(ob) {
        const params = ob.params;

        validateUpdate(params, FEATURE_NAME, async function() {
            try {
                const sourceId = params.qstring.source_id;
                const targetId = params.qstring.target_id;

                if (!sourceId || !targetId) {
                    common.returnMessage(params, 400, 'Missing source_id or target_id');
                    return;
                }

                const sourceParts = sourceId.split('_');
                const sourceType = sourceParts[0];
                const sourceAppId = sourceParts[1];
                const sourceKey = sourceParts.slice(2).join('_');

                const before = await getEntityMetadata(sourceAppId, sourceType, sourceKey);
                await updateEntityMetadata(sourceAppId, sourceType, sourceKey, {
                    mergedInto: targetId,
                    status: 'deprecated'
                });
                const after = await getEntityMetadata(sourceAppId, sourceType, sourceKey);

                await logAudit(params, 'merge', sourceId, sourceType, sourceKey, before, after);

                common.returnMessage(params, 200, 'Entities merged');
            }
            catch (error) {
                log.e('Error merging entities:', error);
                common.returnMessage(params, 500, 'Error merging entities');
            }
        });

        return true;
    });

    // POST /o/cleanup/entities/delete
    plugins.register("/o/cleanup/entities/delete", function(ob) {
        const params = ob.params;

        validateDelete(params, FEATURE_NAME, async function() {
            try {
                const entityId = params.qstring.entity_id;

                if (!entityId) {
                    common.returnMessage(params, 400, 'Missing entity_id');
                    return;
                }

                const parts = entityId.split('_');
                const type = parts[0];
                const appId = parts[1];
                const key = parts.slice(2).join('_');

                const before = await getEntityMetadata(appId, type, key);
                await updateEntityMetadata(appId, type, key, {
                    markedForDeletion: true,
                    deletedAt: Date.now(),
                    status: 'deprecated'
                });
                const after = await getEntityMetadata(appId, type, key);

                await logAudit(params, 'delete', entityId, type, key, before, after);

                common.returnMessage(params, 200, 'Entity marked for deletion');
            }
            catch (error) {
                log.e('Error deleting entity:', error);
                common.returnMessage(params, 500, 'Error deleting entity');
            }
        });

        return true;
    });

    // POST /o/cleanup/entities/change-type
    plugins.register("/o/cleanup/entities/change-type", function(ob) {
        const params = ob.params;

        validateUpdate(params, FEATURE_NAME, async function() {
            try {
                const entityId = params.qstring.entity_id;
                const newType = params.qstring.new_type;

                if (!entityId || !newType) {
                    common.returnMessage(params, 400, 'Missing entity_id or new_type');
                    return;
                }

                const parts = entityId.split('_');
                const type = parts[0];
                const appId = parts[1];
                const key = parts.slice(2).join('_');

                const before = await getEntityMetadata(appId, type, key);
                await updateEntityMetadata(appId, type, key, { dataTypeOverride: newType });
                const after = await getEntityMetadata(appId, type, key);

                await logAudit(params, 'change-type', entityId, type, key, before, after);

                common.returnMessage(params, 200, 'Entity type changed');
            }
            catch (error) {
                log.e('Error changing entity type:', error);
                common.returnMessage(params, 500, 'Error changing entity type');
            }
        });

        return true;
    });

    // POST /o/cleanup/entities/validate
    plugins.register("/o/cleanup/entities/validate", function(ob) {
        const params = ob.params;

        validateUpdate(params, FEATURE_NAME, async function() {
            try {
                const entityId = params.qstring.entity_id;
                const validationRule = params.qstring.validation_rule;

                if (!entityId || !validationRule) {
                    common.returnMessage(params, 400, 'Missing entity_id or validation_rule');
                    return;
                }

                const parts = entityId.split('_');
                const type = parts[0];
                const appId = parts[1];
                const key = parts.slice(2).join('_');

                const before = await getEntityMetadata(appId, type, key);
                const currentRules = before ? before.validationRules || [] : [];
                currentRules.push({
                    rule: validationRule,
                    addedAt: Date.now(),
                    addedBy: params.member._id.toString()
                });

                await updateEntityMetadata(appId, type, key, { validationRules: currentRules });
                const after = await getEntityMetadata(appId, type, key);

                await logAudit(params, 'validate', entityId, type, key, before, after);

                common.returnMessage(params, 200, 'Validation rule added');
            }
            catch (error) {
                log.e('Error adding validation rule:', error);
                common.returnMessage(params, 500, 'Error adding validation rule');
            }
        });

        return true;
    });

    // GET /o/cleanup/audit - Get audit history
    plugins.register("/o/cleanup/audit", function(ob) {
        const params = ob.params;

        validateRead(params, FEATURE_NAME, async function() {
            try {
                const appId = params.qstring.app_id;
                const entityType = params.qstring.entity_type;
                const action = params.qstring.action;
                const actor = params.qstring.actor;
                const limit = parseInt(params.qstring.limit) || 100;
                const skip = parseInt(params.qstring.skip) || 0;

                const query = {};
                if (appId) {
                    query.appId = appId;
                }
                if (entityType) {
                    query.entityType = entityType;
                }
                if (action) {
                    query.action = action;
                }
                if (actor) {
                    query.actor = actor;
                }

                const total = await common.db.collection(AUDIT_COLLECTION).countDocuments(query);
                const auditLogs = await common.db.collection(AUDIT_COLLECTION)
                    .find(query)
                    .sort({ timestamp: -1 })
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                common.returnOutput(params, {
                    logs: auditLogs,
                    total: total,
                    skip: skip,
                    limit: limit
                });
            }
            catch (error) {
                log.e('Error fetching audit logs:', error);
                common.returnMessage(params, 500, 'Error fetching audit logs');
            }
        });

        return true;
    });

    /**
     * Test endpoint to populate view_users data for dashboards
     * This will be used for testing purposes
     */
    plugins.register('/i/cleanup-center/test-populate-views', function(ob) {
        const params = ob.params;

        validateUpdate(params, FEATURE_NAME, function() {
            (async function() {
                try {
                    const dashboards = await common.db.collection('dashboards').find({}).toArray();
                    const memberIds = ['user1', 'user2', 'user3']; // Test user IDs

                    for (const dashboard of dashboards) {
                        const viewUsers = [];
                        const viewCount = Math.floor(Math.random() * 20) + 1; // Random 1-20 views

                        for (let i = 0; i < viewCount; i++) {
                            const randomUserId = memberIds[Math.floor(Math.random() * memberIds.length)];
                            const randomDaysAgo = Math.floor(Math.random() * 90); // Random 0-90 days ago
                            const viewDate = new Date();
                            viewDate.setDate(viewDate.getDate() - randomDaysAgo);

                            viewUsers.push({
                                userId: randomUserId,
                                date: viewDate
                            });
                        }

                        await common.db.collection('dashboards').updateOne(
                            { _id: dashboard._id },
                            { $set: { view_users: viewUsers } }
                        );
                    }

                    common.returnOutput(params, {
                        success: true,
                        message: `Populated view_users for ${dashboards.length} dashboards`,
                        count: dashboards.length
                    });
                }
                catch (error) {
                    log.e('Error populating test data:', error);
                    common.returnMessage(params, 500, 'Error populating test data');
                }
            })();
        });

        return true;
    });

}());

module.exports = pluginOb;

