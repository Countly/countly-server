const DEFAULT_MAX_CUSTOM_FIELD_KEYS = 100;

/**
* Generate updates for cleaning up custom field from a crashgroup document
* @param {Object} crashgroup - crashgroup document, it has to contain '_id' and `keys` fields
* @param {number} maxCustomFieldKeys - how many unique custom field keys should be kept
* @returns {Object} update queries for mongo bulk update
*/
function generateUpdates(crashgroup, maxCustomFieldKeys = DEFAULT_MAX_CUSTOM_FIELD_KEYS) {
    const queries = [];
    const keysToClean = crashgroup.keys;

    keysToClean.forEach((key) => {
        queries.push({
            $set: {
                [`custom.${key}`]: {
                    $arrayToObject: {
                        $slice: [
                            {
                                $sortArray: {
                                    input: { $objectToArray: `$custom.${key}` },
                                    sortBy: { v: -1 }
                                },
                            },
                            maxCustomFieldKeys,
                        ],
                    },
                },
            },
        });
    });

    return {
        updateOne: {
            filter: { _id: crashgroup._id },
            update: queries,
        },
    };
}

/**
* Cleanup custom field from crashgroup documents
* @param {Object} countlyDb - db connection object
* @param {number} maxCustomFieldKeys - how many unique custom field keys should be kept
* @param {number} BATCH_SIZE - bulk write batch size
*/
async function cleanupCustomField(
    countlyDb,
    maxCustomFieldKeys = DEFAULT_MAX_CUSTOM_FIELD_KEYS,
    BATCH_SIZE = 20
) {
    const appsCursor = await countlyDb.collection('apps').find({}).project({_id: 1, name: 1});

    while (await appsCursor.hasNext()) {
        const app = await appsCursor.next();
        console.log(`Updating crashgroup for ${app.name}`);

        const crashgroupCollection = `app_crashgroups${app._id}`;
        const crashgroupsCursor = await countlyDb.collection(crashgroupCollection)
            .aggregate([
                {
                    $project: {
                        _id: 1,
                        custom: {
                            $map: {
                                input: { $objectToArray: "$custom" },
                                as: "item",
                                in: {
                                    key: "$$item.k",
                                    size: { "$size": {"$objectToArray": "$$item.v"} }
                                },
                            },
                        },
                    },
                },
                { $unwind: "$custom" },
                { $match: { "custom.size": { "$gt": maxCustomFieldKeys } } },
                { $group: { _id: "$_id", keys: { $push: "$custom.key" } } },
            ]);

        let updates = [];

        while (await crashgroupsCursor.hasNext()) {
            const crashgroup = await crashgroupsCursor.next();
            updates = updates.concat(generateUpdates(crashgroup, maxCustomFieldKeys));

            if (updates.length && updates.length === BATCH_SIZE) {
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

        if (updates.length && updates.length > 0) {
            try {
                await countlyDb.collection(crashgroupCollection).bulkWrite(updates, { ordered: false });
            }
            catch (err) {
                console.error(`Failed updating collection ${crashgroupCollection}`, err);
            }
        }

        console.log(`${app.name} done`);
    }
}

module.exports = {
    generateUpdates,
    cleanupCustomField,
    DEFAULT_MAX_CUSTOM_FIELD_KEYS,
};
