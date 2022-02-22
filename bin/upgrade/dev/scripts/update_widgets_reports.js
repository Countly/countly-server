var pluginManager = require('../../../../plugins/pluginManager.js'),
    _ = require('underscore'),
    crypto = require('crypto'),
    hash = require('object-hash'),
    asyncjs = require('async');

console.log("Upgrading widgets and reports data");

/**
 * The function creates a hash of the object disregarding
 * the order of constituents (arrays, objects)
 * @param {Object} obj Bookmark signature parts
 * @returns {String} sha1 hash
 */
function getBookmarkSignature(obj) {
    var signObj = {
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
    var query;
    try {
        query = JSON.parse(queryString);
    }
    catch (ex) {
        console.log("cannot parse", queryString);
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

//creates missing drill query for drill reports
function upgradeDrillReport(widget, report_id, countlyDb, countlyDrill, done) {
    countlyDb.collection("long_tasks").findOne({_id: report_id}, function(err, report){
        if (err) {
            console.log("Error", err);
            process.exit(1);
        }
        try {
            report.meta = JSON.parse(report.meta);
        }
        catch (ex) {
            console.log("Cannot parse", report.meta);
        }
        
        //get hash
        var sign = getBookmarkSignature({
            app_id: report.app_id, 
            event_key: report.meta.event, 
            creator: report.creator, 
            query_obj: report.meta.dbFilter, 
            by_val: report.meta.byVal || "[]"
        });
        var eventUnescaped = _.unescape(report.meta.event);
        countlyDrill.collection("drill_bookmarks").insertOne({
            "app_id": report.app_id,
            "event_key": report.meta.event,
            "name": report.report_name,
            "desc": report.report_desc,
            "global": report.global,
            "creator": report.creator,
            "by_val": report.meta.byVal || "[]",
            "by_val_text": report.meta.byVal || "",
            "query_obj": report.meta.dbFilter,
            "query_text": queryToName(report.meta.dbFilter),
            "sign": sign,
            "event_app_id": crypto.createHash('sha1').update(eventUnescaped + report.app_id).digest('hex')
        }, {ignore_errors: [11000]}, function(insertError, insertionRes) {
            console.log("Inserting drill query", insertionRes && insertionRes.result);
            countlyDrill.collection("drill_bookmarks").findOne({sign: sign}, function(err, res){
                countlyDb.collection("long_tasks").updateOne({_id: report._id}, {$set: {"linked_to": {
                    "_issuer": "wqm:drill",
                    "_sign": sign,
                    "_id": res._id,
                    "period": !report.meta.byVal
                }}}, function(){
                    done();
                });
            });
        });
    });
}

pluginManager.dbConnection().then((countlyDb) => {
    pluginManager.dbConnection("countly_drill").then((countlyDrill) => {
        countlyDb.collection('widgets').find({}).toArray(function(err, widgets) {
            if (err) {
                console.error("Error upgrading", err);
                process.exit(1);
            }
            function upgrade(widget, done) {
                console.log("Upgrading widgets", widget._id, widget.type);
                if (widget.drill_report && widget.drill_report.length) {
                    console.log("This is a drill widget");
                    asyncjs.eachSeries(widget.drill_report, function(report_id, callback){
                        upgradeDrillReport(widget, report_id, countlyDb, countlyDrill, callback);
                    }, done);
                }
                else {
                    done();
                }
                
            }
            asyncjs.eachSeries(widgets, upgrade, function() {
                console.log("Widgets and reports data upgrade finished");
                countlyDb.close();
                countlyDrill.close();
            });
        });
    });
});