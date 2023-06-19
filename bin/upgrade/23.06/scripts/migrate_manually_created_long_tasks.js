const crypto = require('crypto');

const hash = require('object-hash');
const _ = require('underscore');

const pluginManager = require('../../../../plugins/pluginManager.js');

console.log('Migrating manually created long tasks');

/**
 * The function creates a hash of the object disregarding
 * the order of constituents (arrays, objects)
 * @param {Object} obj Bookmark signature parts
 * @returns {String} sha1 hash
 */
function getBookmarkSignature(obj) {
    const signObj = {
        app_id: obj.app_id,
        namespace: obj.namespace,
        event_key: obj.event_key,
        creator: obj.creator
    };

    ["query_obj", "by_val"].forEach((fieldKey) => {
        if (fieldKey in obj) {
            if (typeof obj[fieldKey] === 'string') {
                signObj[fieldKey] = JSON.parse(obj[fieldKey]);
            }
            else {
                signObj[fieldKey] = obj[fieldKey];
            }
        }
    });

    signObj.namespace = signObj.namespace || "";
    signObj.query_obj = signObj.query_obj || {};
    signObj.by_val = signObj.by_val || [];

    return hash(signObj, {
        unorderedArrays: true,
        unorderedObjects: true
    });
}

const operators = {
    "$in": "is in",
    "$nin": "is not in",
    "rgxcn": "contains",
    "rgxntc": "doesn't contain",
    "isset": "is set",
    "$lt": "<",
    "$lte": "<=",
    "$gt": ">",
    "$gte": ">="
};

function queryToName(queryString) {
    let query;
    if (typeof queryString === "undefined") {
        try {
            query = JSON.parse(queryString);
        }
        catch (ex) {
            console.log("cannot parse", queryString);
        }
    }
    else {
        query = queryString;
    }
    if (!query) {
        return "";
    }
    var parts = [];

    for (let field in query) {
        let niceField = field.replace("sg.", "").replace("cmp.", "campaign ").replace("up.", "");

        for (let operation in query[field]) {
            let value = query[field][operation];

            if (operation in operators) {
                if ((operation === "$in" || operation === "$nin") && (value.length === 1)) {
                    let specialOperator = (operation === "$in" ? "==" : "!=");
                    parts.push(niceField + " " + specialOperator + " " + value[0]);
                }
                else {
                    parts.push(niceField + " " + operators[operation] + " " + value);
                }
            }
        }
    }

    if (parts.length) {
        return "(" + parts.join(" AND ") + ")";
    }
    else {
        return "";
    }
};

async function upgradeDrillReport(report, countlyDb, countlyDrill) {
    try {
        report.meta = JSON.parse(report.meta);
    }
    catch (ex) {
        console.log("Cannot parse", report.meta);
    }

    let byVal = report.meta.byVal;
    if (byVal && typeof byVal === "string") {
        byVal = [byVal];
    }
    const sign = getBookmarkSignature({
        app_id: report.app_id, 
        event_key: report.meta.event, 
        creator: report.creator, 
        query_obj: report.meta.dbFilter, 
        by_val: byVal || []
    });

    const eventUnescaped = _.unescape(report.meta.event);

    try {
        const { insertedId } = await countlyDrill.collection('drill_bookmarks').insertOne({
            "app_id": report.app_id,
            "event_key": report.meta.event,
            "name": report.report_name,
            "desc": report.report_desc,
            "global": report.global,
            "creator": report.creator,
            "by_val": JSON.stringify(byVal || []),
            "by_val_text": report.meta.byVal + "" || "",
            "query_obj": JSON.stringify(report.meta.dbFilter),
            "query_text": queryToName(report.meta.dbFilter),
            "sign": sign,
            "event_app_id": crypto.createHash('sha1').update(eventUnescaped + report.app_id).digest('hex')
        });

        const queryConfig = {
            _id: insertedId + '',
            period: report.period_desc || true,
        };

        const queryConfigSign = hash(queryConfig, {
            unorderedArrays: true,
            unorderedObjects: true,
        });

        await countlyDb.collection('long_tasks').updateOne({ _id: report._id }, {
            $set: {
                linked_to: {
                    _issuer: 'manually_created',
                    _sign: queryConfigSign,
                    _id: insertedId + '',
                    period: report.period_desc || true,
                },
            },
        });
    }
    catch (err) {
        console.log(`Error when migrating report ${report._id}\n${err}`);
    }
}

pluginManager.dbConnection().then(async (countlyDb) => {
    pluginManager.dbConnection('countly_drill').then(async (countlyDrill) => {
        const tasksToMigrate = await countlyDb.collection('long_tasks')
            .find({ type: 'drill', manually_create: true, $or: [
                { linked_to: { $exists: false } },
                { linked_to: { $eq: null } },
            ]})
            .toArray();

        for (let idx = 0; idx < tasksToMigrate.length; idx += 1) {
            await upgradeDrillReport(tasksToMigrate[idx], countlyDb, countlyDrill);
        }

        console.log('Migrating manually created long tasks finished');

        countlyDb.close();
        countlyDrill.close();
    });
});
