print("sessions.js started " + new Date());

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

/* ++++ START MARKING OLD DOCUMENTS */
currDB.getCollection("users").update({}, {$set: {old: true}}, {multi: true});
currDB.getCollection("devices").update({}, {$set: {old: true}}, {multi: true});
currDB.getCollection("device_details").update({}, {$set: {old: true}}, {multi: true});
currDB.getCollection("carriers").update({}, {$set: {old: true}}, {multi: true});
/* ---- END MARKING OLD COLLECTIONS */

/* ++++ START SPLITTING AND MOVING COLLECTIONS */
var months = [];
var days = [];
var weeks = [];

for (var i = 1; i < 13; i++) {
    months.push(i + "");
}
for (var i = 1; i < 32; i++) {
    days.push(i + "");
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
                    toReturn[i + '.' + x] = NumberInt(flatObject[x]);
                }
                else {
                    toReturn[i + '.' + x] = flatObject[x];
                }
            }
        }
        else {
            if (!isNaN(parseFloat(ob[i])) && isFinite(ob[i])) {
                toReturn[i] = NumberInt(ob[i]);
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

/* Split documents in users collection */
currDB.getCollection("users").find({}).forEach(function(doc) {
    var yearsInDoc = [];

    for (var year in doc) {
        if (skipProperty(year)) {
            continue;
        }

        yearsInDoc.push(year);

        var zeroObjToInsert = {
            a: doc._id + "",
            m: year + ":0",
            d: {}
        };

        for (var month in doc[year]) {
            if (months.indexOf(month) === -1) {
                continue;
            }

            if (doc[year][month].f) {
                if (!zeroObjToInsert.d[month]) {
                    zeroObjToInsert.d[month] = {};
                }
                zeroObjToInsert.d[month].f = doc[year][month].f;
            }

            if (doc[year][month].l) {
                if (!zeroObjToInsert.d[month]) {
                    zeroObjToInsert.d[month] = {};
                }
                zeroObjToInsert.d[month].l = doc[year][month].l;
            }

            var monthObjToInsert = {
                a: doc._id + "",
                m: year + ":" + month,
                d: {}
            };

            for (var day in doc[year][month]) {
                if (days.indexOf(day) === -1) {
                    continue;
                }

                monthObjToInsert.d[day] = doc[year][month][day];
            }

            targetDB.getCollection(TEST_PREFIX + "users").update({_id: doc._id + "_" + year + ":" + month}, {$set: flattenObject(monthObjToInsert)}, {upsert: true});
        }

        for (var week in doc[year]) {
            if (weeks.indexOf(week) === -1) {
                continue;
            }

            if (doc[year][week].f) {
                if (!zeroObjToInsert.d[week]) {
                    zeroObjToInsert.d[week] = {};
                }
                zeroObjToInsert.d[week].f = doc[year][week].f;
            }

            if (doc[year][week].l) {
                if (!zeroObjToInsert.d[week]) {
                    zeroObjToInsert.d[week] = {};
                }
                zeroObjToInsert.d[week].l = doc[year][week].l;
            }
        }

        if (doc[year].f) {
            zeroObjToInsert.d.f = doc[year].f;
        }

        if (doc[year].l) {
            zeroObjToInsert.d.l = doc[year].l;
        }

        targetDB.getCollection(TEST_PREFIX + "users").update({_id: doc._id + "_" + year + ":0"}, {$set: flattenObject(zeroObjToInsert)}, {upsert: true});
    }

    if (doc.meta) {
        for (var i = 0; i < yearsInDoc.length; i++) {
            var zeroObjToInsert = {
                a: doc._id + "",
                m: yearsInDoc[i] + ":0"
            };

            for (var metaArr in doc.meta) {
                zeroObjToInsert["meta." + metaArr] = doc.meta[metaArr];
            }

            targetDB.getCollection(TEST_PREFIX + "users").update({_id: doc._id + "_" + yearsInDoc[i] + ":0"}, {$set: zeroObjToInsert}, {upsert: true});
        }
    }
});

/* Split and move documents in sessions collection to users collection */
currDB.getCollection("sessions").find({}).forEach(function(doc) {
    var yearsInDoc = [];

    for (var year in doc) {
        if (skipProperty(year)) {
            continue;
        }

        yearsInDoc.push(year);

        var zeroObjToInsert = {
            a: doc._id + "",
            m: year + ":0",
            d: {}
        };

        for (var month in doc[year]) {
            if (months.indexOf(month) === -1) {
                continue;
            }

            if (doc[year][month].u) {
                if (!zeroObjToInsert.d[month]) {
                    zeroObjToInsert.d[month] = {};
                }
                zeroObjToInsert.d[month].u = doc[year][month].u;
            }

            if (doc[year][month].ds) {
                if (!zeroObjToInsert.d[month]) {
                    zeroObjToInsert.d[month] = {};
                }
                zeroObjToInsert.d[month].ds = doc[year][month].ds;
            }

            if (doc[year][month].p) {
                if (!zeroObjToInsert.d[month]) {
                    zeroObjToInsert.d[month] = {};
                }
                zeroObjToInsert.d[month].p = doc[year][month].p;
            }

            if (doc[year][month].m) {
                if (!zeroObjToInsert.d[month]) {
                    zeroObjToInsert.d[month] = {};
                }
                zeroObjToInsert.d[month].m = doc[year][month].m;
            }

            var monthObjToInsert = {
                a: doc._id + "",
                m: year + ":" + month,
                d: {}
            };

            for (var day in doc[year][month]) {
                if (days.indexOf(day) === -1) {
                    continue;
                }

                monthObjToInsert.d[day] = doc[year][month][day];
            }

            targetDB.getCollection(TEST_PREFIX + "users").update({_id: doc._id + "_" + year + ":" + month}, {$set: flattenObject(monthObjToInsert)}, {upsert: true});
        }

        for (var week in doc[year]) {
            if (weeks.indexOf(week) === -1) {
                continue;
            }

            if (doc[year][week].u) {
                if (!zeroObjToInsert.d[week]) {
                    zeroObjToInsert.d[week] = {};
                }
                zeroObjToInsert.d[week].u = doc[year][week].u;
            }

            if (doc[year][week].ds) {
                if (!zeroObjToInsert.d[week]) {
                    zeroObjToInsert.d[week] = {};
                }
                zeroObjToInsert.d[week].ds = doc[year][week].ds;
            }

            if (doc[year][week].p) {
                if (!zeroObjToInsert.d[week]) {
                    zeroObjToInsert.d[week] = {};
                }
                zeroObjToInsert.d[week].p = doc[year][week].p;
            }

            if (doc[year][week].m) {
                if (!zeroObjToInsert.d[week]) {
                    zeroObjToInsert.d[week] = {};
                }
                zeroObjToInsert.d[week].m = doc[year][week].m;
            }
        }

        if (doc[year].u) {
            zeroObjToInsert.d.u = doc[year].u;
        }

        if (doc[year].ds) {
            zeroObjToInsert.d.ds = doc[year].ds;
        }

        if (doc[year].p) {
            zeroObjToInsert.d.p = doc[year].p;
        }

        if (doc[year].m) {
            zeroObjToInsert.d.m = doc[year].m;
        }

        targetDB.getCollection(TEST_PREFIX + "users").update({_id: doc._id + "_" + year + ":0"}, {$set: flattenObject(zeroObjToInsert)}, {upsert: true});
    }

    if (doc.meta) {
        for (var i = 0; i < yearsInDoc.length; i++) {
            var zeroObjToInsert = {
                a: doc._id + "",
                m: yearsInDoc[i] + ":0"
            };

            for (var metaArr in doc.meta) {
                zeroObjToInsert["meta." + metaArr] = doc.meta[metaArr];
            }

            targetDB.getCollection(TEST_PREFIX + "users").update({_id: doc._id + "_" + yearsInDoc[i] + ":0"}, {$set: zeroObjToInsert}, {upsert: true});
        }
    }
});

function splitStandart(doc, curr, target) {
    var yearsInDoc = [];

    for (var year in doc) {
        if (skipProperty(year)) {
            continue;
        }

        yearsInDoc.push(year);

        var zeroObjToInsert = {
            a: doc._id + "",
            m: year + ":0",
            d: {}
        };

        for (var month in doc[year]) {
            if (months.indexOf(month) === -1) {
                continue;
            }

            var monthObjToInsert = {
                a: doc._id + "",
                m: year + ":" + month,
                d: {}
            };

            for (var day in doc[year][month]) {
                if (days.indexOf(day) === -1) {
                    continue;
                }

                monthObjToInsert.d[day] = doc[year][month][day];
            }

            for (var segment in doc[year][month]) {
                if (days.indexOf(segment) !== -1) {
                    continue;
                }

                if (doc[year][month][segment].u) {
                    if (!zeroObjToInsert.d[month]) {
                        zeroObjToInsert.d[month] = {};
                    }
                    if (!zeroObjToInsert.d[month][segment]) {
                        zeroObjToInsert.d[month][segment] = {};
                    }

                    zeroObjToInsert.d[month][segment].u = doc[year][month][segment].u;
                }
            }

            targetDB.getCollection(target).update({_id: doc._id + "_" + year + ":" + month}, {$set: flattenObject(monthObjToInsert)}, {upsert: true});
        }

        for (var week in doc[year]) {
            if (weeks.indexOf(week) === -1) {
                continue;
            }

            for (var segment in doc[year][week]) {
                if (doc[year][week] && doc[year][week][segment] && doc[year][week][segment].u) {
                    if (!zeroObjToInsert.d[week]) {
                        zeroObjToInsert.d[week] = {};
                    }
                    if (!zeroObjToInsert.d[week][segment]) {
                        zeroObjToInsert.d[week][segment] = {};
                    }

                    zeroObjToInsert.d[week][segment].u = doc[year][week][segment].u;
                }
            }
        }

        for (var segment in doc[year]) {
            if (doc[year] && doc[year][segment].u) {
                if (!zeroObjToInsert.d[segment]) {
                    zeroObjToInsert.d[segment] = {};
                };
                zeroObjToInsert.d[segment].u = doc[year][segment].u;
            }
        }

        if (Object.keys(zeroObjToInsert.d).length) {
            targetDB.getCollection(target).update({_id: doc._id + "_" + year + ":0"}, {$set: flattenObject(zeroObjToInsert)}, {upsert: true});
        }
    }

    return yearsInDoc;
}

function splitCollections(curr, target) {
    currDB.getCollection(curr).find({}).forEach(function(doc) {
        var yearsInDoc = splitStandart(doc, curr, target);

        if (doc.meta) {
            for (var i = 0; i < yearsInDoc.length; i++) {
                var zeroObjToInsert = {
                    a: doc._id + "",
                    m: yearsInDoc[i] + ":0"
                };

                for (var metaArr in doc.meta) {
                    zeroObjToInsert["meta." + metaArr] = doc.meta[metaArr];
                }

                if (Object.keys(zeroObjToInsert).length) {
                    targetDB.getCollection(target).update({_id: doc._id + "_" + yearsInDoc[i] + ":0"}, {$set: zeroObjToInsert}, {upsert: true});
                }
            }
        }
    });
}

var splits = [
    {curr: "locations", target: TEST_PREFIX + "users"},
    {curr: "app_versions", target: TEST_PREFIX + "device_details"},
    {curr: "device_details", target: TEST_PREFIX + "device_details"},
    {curr: "carriers", target: TEST_PREFIX + "carriers"},
    {curr: "devices", target: TEST_PREFIX + "devices"}
];

for (var i = 0 ; i < splits.length; i++) {
    splitCollections(splits[i].curr, splits[i].target);
}
/* ---- END SPLITTING AND MOVING COLLECTIONS */

print("sessions.js ended " + new Date());