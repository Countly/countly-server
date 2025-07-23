/**
 *  Description : Remove orphan widget and long_tasks records left behind after a dashboard is deleted
 *  Server  : countly
 *  Path    : $(countly dir)/bin/scripts/fix-data
 *  Command : node delete_widgets_of_deleted_dashboards.js [--dry-run]
 *  Usage   :
 *      # Preview only
 *      node delete_widgets_of_deleted_dashboards.js --dry-run
 *      # Actual deletion
 *      node delete_widgets_of_deleted_dashboards.js
 */
const DRY_RUN = process.argv.includes('--dry-run');

const BATCH_SIZE = 1000;
const pluginManager = require('../../../plugins/pluginManager.js');

// Widget type configurations for long_tasks relationships
const WIDGET_LONG_TASK_CONFIG = {
    'drill': {
        reportField: 'drill_report'
    },
    'users': {
        reportField: 'drill_report'
    },
    'formulas': {
        reportField: 'cmetrics'
    }
};

/**
 * Deletes documents in batches to avoid oversized commands
 * @param {Object} db - MongoDB connection
 * @param {String} collection - Collection name
 * @param {Array} ids - List of document ids to delete
 */
async function deleteByChunks(db, collection, ids) {
    let bucket = [];

    for (const id of ids) {
        bucket.push(id);

        if (bucket.length === BATCH_SIZE) {
            await runDelete(bucket);
            bucket = [];
        }
    }

    if (bucket.length) {
        await runDelete(bucket);
    }

    /**
     * Executes the delete operation for a batch of ids
     * @param {Array} batch - Array of document ids to delete
     * @returns {Promise<void>}
     * */
    async function runDelete(batch) {
        if (DRY_RUN) {
            console.log(`[dry-run] ${collection}: would delete ${batch.length}`);
        }
        else {
            const res = await db.collection(collection).deleteMany({ _id: { $in: batch } });
            console.log(`[deleted] ${collection}: ${res.deletedCount}`);
        }
    }
}

/**
 * Counts references to reports and returns only unreferenced ones
 * @param {Object} db - MongoDB connection
 * @param {Array} reportIds - Report IDs to be checked
 * @param {Array} excludeWidgetIds - Widget IDs to exclude from reference check
 * @returns {Array} Unreferenced report IDs
 */
async function getUnreferencedReports(db, reportIds, excludeWidgetIds) {
    if (!reportIds || !reportIds.length) {
        return [];
    }

    let referencedReports = [];

    // Check all widget types that can reference reports
    for (const [widgetType, config] of Object.entries(WIDGET_LONG_TASK_CONFIG)) {
        const query = {
            widget_type: widgetType,
            [config.reportField]: { $in: reportIds }
        };

        // Exclude orphan widgets from reference check
        if (excludeWidgetIds.length) {
            query._id = { $nin: excludeWidgetIds };
        }

        const widgets = await db.collection('widgets').find(query, { [config.reportField]: 1 }).toArray();

        widgets.forEach(widget => {
            const reports = widget[config.reportField] || [];
            referencedReports.push(...reports.map(reportId => reportId.toString()));
        });
    }

    // Return only those report IDs that are not referenced in any widget
    return reportIds.filter(reportId => !referencedReports.includes(reportId.toString()));
}

/**
 * Collects all linked long_task IDs from a widget based on its type
 * @param {Object} widget - Widget document
 * @returns {Array} Array of long_task IDs
 */
function collectAllLinkedLongTasks(widget) {
    const config = WIDGET_LONG_TASK_CONFIG[widget.widget_type];
    if (!config) {
        return [];
    }

    const reportField = config.reportField;
    return Array.isArray(widget[reportField]) ? widget[reportField] : [];
}


(async() => {
    const db = await pluginManager.dbConnection('countly');

    try {
        const dashboardWidgets = [];

        const dashCursor = db.collection('dashboards').find({widgets: {$exists: true, $not: {$size: 0}}}, {projection: {widgets: 1}});

        while (await dashCursor.hasNext()) {
            const dash = await dashCursor.next();
            for (const w of dash.widgets) {
                const idStr = (w && w.$oid) ? w.$oid : (w + '');
                if (idStr && !dashboardWidgets.includes(idStr)) {
                    dashboardWidgets.push(idStr);
                }
            }
        }

        await dashCursor.close();

        const orphanWidgetIds = [];
        const allLinkedLongTasks = [];

        const widgetCursor = db.collection('widgets').find({});

        while (await widgetCursor.hasNext()) {
            const w = await widgetCursor.next();
            if (!dashboardWidgets.includes(String(w._id))) {
                orphanWidgetIds.push(w._id);

                // Find linked long_tasks based on widget type
                const linkedTasks = collectAllLinkedLongTasks(w);
                allLinkedLongTasks.push(...linkedTasks);
            }
        }
        await widgetCursor.close();

        console.log(`Orphan widgets found: ${orphanWidgetIds.length}`);
        if (DRY_RUN && orphanWidgetIds.length) {
            console.log('Orphan widget IDs to be deleted:', orphanWidgetIds.map(id => id.toString()));
        }
        await deleteByChunks(db, 'widgets', orphanWidgetIds);

        const unreferencedLongTasks = await getUnreferencedReports(db, allLinkedLongTasks, orphanWidgetIds);
        console.log(`Unreferenced long_tasks to delete: ${unreferencedLongTasks.length}`);
        if (DRY_RUN && unreferencedLongTasks.length) {
            console.log('Unreferenced long_task IDs to be deleted:', unreferencedLongTasks.map(id => id.toString()));
        }
        await deleteByChunks(db, 'long_tasks', unreferencedLongTasks);

        console.log(DRY_RUN ? 'Dry-run finished' : 'Cleanup completed.');
    }
    catch (err) {
        console.error(err);
    }
    finally {
        db.close();
    }
})();