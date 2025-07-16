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
        const orphanLongTaskIds = [];

        const widgetCursor = db.collection('widgets').find({}, {projection: {_id: 1, drill_report: 1}});

        while (await widgetCursor.hasNext()) {
            const w = await widgetCursor.next();
            if (!dashboardWidgets.includes(String(w._id))) {
                orphanWidgetIds.push(w._id);
                if (Array.isArray(w.drill_report)) {
                    orphanLongTaskIds.push(...w.drill_report);
                }
            }
        }
        await widgetCursor.close();

        console.log(`Orphan widgets found: ${orphanWidgetIds.length}`);
        console.log(`Linked long_tasks to drop: ${orphanLongTaskIds.length}`);

        await deleteByChunks(db, 'widgets', orphanWidgetIds);
        await deleteByChunks(db, 'long_tasks', orphanLongTaskIds);


        console.log(DRY_RUN ? 'Dry-run finished' : 'Cleanup completed.');
    }
    catch (err) {
        console.error(err);
    }
    finally {
        db.close();
    }
})();
