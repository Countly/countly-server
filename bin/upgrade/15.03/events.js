print("events.js started " + new Date());

// Test prefix is added to target collection name. Use it for test purposes.
var TEST_PREFIX = "";

var currDBAddress = "IP_ADDRESS:PORT";
var targetDBAddress = "IP_ADDRESS:PORT";
var currDBName = "countly";
var targetDBName = "countly";

/*
 **************************************************
 ****************DO NOT EDIT BELOW*****************
 **************************************************
 */

load("parseConnection.js");

var currDBAddress = dbObject.host;
var targetDBAddress = dbObject.host;
var currDBName = dbObject.name;
var targetDBName = dbObject.name;

if (currDBAddress == "IP_ADDRESS:PORT" || targetDBAddress == "IP_ADDRESS:PORT") {
    print("**********************************");
    print("Please configure currDBAddress and targetDBAddress before running this script...");
    print("**********************************");
    quit();
}

var currConn = new Mongo(currDBAddress);
var targetConn = new Mongo(targetDBAddress);
var currDB = currConn.getDB(currDBName);
var targetDB = targetConn.getDB(targetDBName);
if (dbObject.username && dbObject.password) {
    currDB.auth(dbObject.username, dbObject.password);
    targetDB.auth(dbObject.username, dbObject.password);
}

var eventCollNames = [];
currDB.getCollectionNames().filter(function(name) {
    return name.match(/events.+/);
}).forEach(function(name) {
    eventCollNames.push(name);
});

/* ++++ START MARKING OLD DOCUMENTS */
for (var i = 0; i < eventCollNames.length; i++) {
    currDB.getCollection(eventCollNames[i]).update({}, {$set: {old: true}}, {multi: true});
}
/* ---- END MARKING OLD COLLECTIONS */

/* ++++ START SPLITTING AND MOVING COLLECTIONS */
var months = [];
var days = [];
var weeks = [];
var forbiddenSegValues = [];

for (var i = 1; i < 13; i++) {
    months.push(i + "");
}
for (var i = 1; i < 32; i++) {
    days.push(i + ""); forbiddenSegValues.push(i + "");
}
for (var i = 1; i < 54; i++) {
    weeks.push("w" + i);
}

function flattenObject(ob) {
    var toReturn = {};

    for (var i in ob) {
        if (!ob.hasOwnProperty(i)) {
            continue;
        }

        if ((typeof ob[i]) == 'object') {
            var flatObject = flattenObject(ob[i]);
            for (var x in flatObject) {
                if (!flatObject.hasOwnProperty(x)) {
                    continue;
                }

                if (!isNaN(parseFloat(flatObject[x])) && isFinite(flatObject[x])) {
                    if (x.search(/\.s$/) !== -1 || x == "s") {
                        toReturn[i + '.' + x] = parseFloat(flatObject[x].toFixed(5));
                    }
                    else {
                        toReturn[i + '.' + x] = NumberInt(flatObject[x]);
                    }
                }
                else {
                    toReturn[i + '.' + x] = flatObject[x];
                }
            }
        }
        else {
            if (!isNaN(parseFloat(ob[i])) && isFinite(ob[i])) {
                if (i.search(/\.s$/) !== -1 || i == "s") {
                    toReturn[i] = parseFloat(ob[i].toFixed(5));
                }
                else {
                    toReturn[i] = NumberInt(ob[i]);
                }
            }
            else {
                toReturn[i] = ob[i];
            }
        }
    }

    return toReturn;
}

function skipProperty(prop) {
    if (prop == "_id" ||
        prop == "meta" ||
        prop == "old" ||
        prop == "m" ||
        prop == "d" ||
        prop == "s" ||
        prop == "a") {
        return true;
    }
    else {
        return false;
    }
}

function splitStandart(doc, curr, target) {
    var yearsInDoc = [];

    for (var year in doc) {
        if (skipProperty(year)) {
            continue;
        }

        yearsInDoc.push(year);

        var zeroObjToInsert = {
            s: doc._id + "",
            m: year + ":0",
            d: {}
        };

        for (var month in doc[year]) {
            if (months.indexOf(month) === -1) {
                continue;
            }

            var monthObjToInsert = {
                s: doc._id + "",
                m: year + ":" + month,
                d: {}
            };

            for (var day in doc[year][month]) {
                if (days.indexOf(day) === -1) {
                    continue;
                }

                monthObjToInsert.d[day] = doc[year][month][day];
            }

            var flatMonthObj = flattenObject(monthObjToInsert);

            if (curr.indexOf("events") !== -1) {
                for (var updateProp in flatMonthObj) {
                    var updatePropSplit = updateProp.split(".");
                    if (updatePropSplit.length == 4 && forbiddenSegValues.indexOf(updatePropSplit[2]) !== -1) {
                        flatMonthObj[updatePropSplit[0] + "." + updatePropSplit[1] + ".[CLY]" + updatePropSplit[2] + "." + updatePropSplit[3]] = flatMonthObj[updateProp];
                        delete flatMonthObj[updateProp];
                    }
                }
            }

            targetDB.getCollection(target).update({_id: doc._id + "_" + year + ":" + month}, {$set: flatMonthObj}, {upsert: true});
        }

        if (Object.keys(zeroObjToInsert.d).length) {
            targetDB.getCollection(target).update({_id: doc._id + "_" + year + ":0"}, {$set: flattenObject(zeroObjToInsert)}, {upsert: true});
        }
    }

    return yearsInDoc;
}

function splitEventNoSegment(doc, curr, target) {
    var yearsInDoc = [];

    for (var year in doc) {
        if (skipProperty(year)) {
            continue;
        }

        yearsInDoc.push(year);

        for (var month in doc[year]) {
            if (months.indexOf(month) === -1) {
                continue;
            }

            var monthObjToInsert = {
                s: doc._id + "",
                m: year + ":" + month,
                d: {}
            };

            for (var day in doc[year][month]) {
                if (days.indexOf(day) === -1) {
                    continue;
                }

                monthObjToInsert.d[day] = doc[year][month][day];
            }

            targetDB.getCollection(target).update({_id: doc._id + "_" + year + ":" + month}, {$set: flattenObject(monthObjToInsert)}, {upsert: true});
        }
    }

    return yearsInDoc;
}

function splitCollections(curr, target) {
    var omitSegments = [],
        omitCounts = [];

    currDB.getCollection(curr).find({_id: "no-segment"}, {meta: 1}).forEach(function(doc) {
        if (doc && doc.meta) {
            for (var segment in doc.meta) {
                if (doc.meta[segment].length > 1000) {
                    omitSegments.push(segment);
                    omitCounts.push(doc.meta[segment].length);
                }
            }
        }
    });

    currDB.getCollection(curr).find().forEach(function(doc) {
        if (omitSegments.indexOf(doc._id) !== -1) {
            //print("omitted " + curr + " - " + doc._id + "  count: " + omitCounts[omitSegments.indexOf(doc._id)]);
            return;
        }

        var yearsInDoc = [];

        if (doc._id == "no-segment") {
            yearsInDoc = splitEventNoSegment(doc, curr, target);
        }
        else {
            yearsInDoc = splitStandart(doc, curr, target);
        }

        if (doc.meta) {
            for (var i = 0; i < yearsInDoc.length; i++) {
                var zeroObjToInsert = {
                    m: yearsInDoc[i] + ":0"
                };

                if (curr.indexOf("events") !== -1) {
                    zeroObjToInsert.s = doc._id + "";

                    for (var metaArr in doc.meta) {
                        var tmpMetaArr = [];
                        for (var j = 0; j < doc.meta[metaArr].length; j++) {
                            if (forbiddenSegValues.indexOf(doc.meta[metaArr][j]) !== -1) {
                                tmpMetaArr.push("[CLY]" + doc.meta[metaArr][j]);
                            }
                            else {
                                tmpMetaArr.push(doc.meta[metaArr][j]);
                            }
                        }

                        zeroObjToInsert["meta." + metaArr] = tmpMetaArr;
                    }
                }
                else {
                    zeroObjToInsert.a = doc._id + "";

                    for (var metaArr in doc.meta) {
                        zeroObjToInsert["meta." + metaArr] = doc.meta[metaArr];
                    }
                }

                if (Object.keys(zeroObjToInsert).length) {
                    targetDB.getCollection(target).update({_id: doc._id + "_" + yearsInDoc[i] + ":0"}, {$set: zeroObjToInsert}, {upsert: true});
                }
            }
        }
    });
}

// Split documents in all event collections
for (var i = 0; i < eventCollNames.length; i++) {
    splitCollections(eventCollNames[i], TEST_PREFIX + eventCollNames[i]);
}
/* ---- END SPLITTING AND MOVING COLLECTIONS */

print("events.js ended " + new Date());