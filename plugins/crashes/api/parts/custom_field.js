const MAX_CUSTOM_FIELD_KEYS = 100;

/**
* Generate updates for cleaning up custom field from a crashgroup document
* @param {Object} crashgroup - crashgroup document, it has to contain '_id' and `custom` fields
* @returns {Object} update queries for mongo bulk update
*/
function generateUpdates(crashgroup) {
    const updates = [];
    const keysToRemove = {};
    const customField = crashgroup.custom;

    for (const key in customField) {
        const excessFields = Object.keys(customField[key]).length - MAX_CUSTOM_FIELD_KEYS;

        if (excessFields > 0) {
            Object.entries(customField[key])
                .sort((a, b) => a[1] - b[1])
                .slice(0, excessFields)
                .forEach(([k]) => keysToRemove[`custom.${key}.${k}`] = '');
        }
    }

    if (Object.keys(keysToRemove).length > 0) {
        updates.push({
            updateOne: {
                filter: { _id: crashgroup._id },
                update: {
                    $unset: keysToRemove,
                },
            },
        });
    }

    return updates;
}

/**
* Cleanup custom field from crashgroup documents
* @param {Object} countlyDb - db connection object
* @param {number} BATCH_SIZE - bulk write batch size
*/
async function cleanupCustomField(countlyDb, BATCH_SIZE = 200) {
    const apps = await countlyDb.collection('apps').find({}).project({_id: 1}).toArray();

    for (let idx = 0; idx < apps.length; idx += 1) {
        const crashgroupCollection = `app_crashgroups${apps[idx]._id}`;
        const crashgroups = await countlyDb.collection(crashgroupCollection)
            .find({ _id: { $ne: 'meta' }, 'custom': { $exists: true } })
            .project({ custom: 1 })
            .toArray();

        let updates = [];

        for (let idy = 0; idy < crashgroups.length; idy += 1) {
            updates = updates.concat(generateUpdates(crashgroups[idy]));

            if (updates.length && (updates.length === BATCH_SIZE || idy === crashgroups.length - 1)) {
                try {
                    await countlyDb.collection(crashgroupCollection).bulkWrite(updates, { ordered: false });
                }
                catch (err) {
                    console.error(`Failed updating collection ${crashgroupCollection}`, err);
                }
                finally {
                    updates = [];
                }
            }
        }
    }
}

module.exports = {
    generateUpdates,
    cleanupCustomField,
    MAX_CUSTOM_FIELD_KEYS,
};
