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

module.exports = {
    generateUpdates,
    MAX_CUSTOM_FIELD_KEYS,
};
