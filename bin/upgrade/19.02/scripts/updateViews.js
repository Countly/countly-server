var pluginManager = require('../../../../plugins/pluginManager.js'),
    async = require('async'),
    crypto = require('crypto'),
    Promise = require("bluebird");

console.log("Updating views");

var dates = [];
for (var i = 0; i < 31; i++) {
    dates.push((i + 1) + "");
}
var weeks = [];
for (var i = 0; i < 53; i++) {
    weeks.push("w" + (i + 1));
}

var hours = [];
for (var i = 0; i < 24; i++) {
    hours.push((i) + "");
}
var bufferSize = 5000;
pluginManager.dbConnection().then((countlyDb) => {
    async function flushData(viewsMap,count1, count2, appID, newObj, newObj2, summedZero, monthObject, msplit, force) {
        var flush_zero = false;
        var colName = "";
        if (count1 >= bufferSize || force) {
            colName = "app_viewdata" + crypto.createHash('sha1').update(appID).digest('hex');
            var bulk = countlyDb.collection(colName).initializeUnorderedBulkOp();
            for (var d in newObj['no-segment']) {
                if (viewsMap[d]) {
                    var iid = viewsMap[d] + "";
                    bulk.find({'_id': iid + '_' + monthObject._id}).upsert().update({$set: {'_id': iid + '_' + monthObject._id, 'vw': countlyDb.ObjectID(iid), 's': 'no-segment', 'm': monthObject._id}, $inc: newObj['no-segment'][d] });
                }
            }
            for (var d in newObj2['no-segment']) {
                if (viewsMap[d]) {
                    var iid = viewsMap[d] + "";
                    bulk.find({'_id': iid + '_' + monthObject._id + "_m"}).upsert().update({$set: {'_id': iid + '_' + monthObject._id + "_m", 'vw': countlyDb.ObjectID(iid), 's': 'no-segment', 'm': monthObject._id}, $inc: newObj2['no-segment'][d] });
                }
            }
            if ( bulk.length > 0 ) {
                await bulk.execute().catch(function(err){});
            }
            for (var d in newObj['no-segment']) {
                delete newObj['no-segment'][d];
            }
            for (var d in newObj2['no-segment']) {
                delete newObj2['no-segment'][d];
            }
            flush_zero = true;
        }
        if (count2 >= bufferSize || force) {
            colName = "app_viewdata" + crypto.createHash('sha1').update("platform" + appID).digest('hex');
            var bulk = countlyDb.collection(colName).initializeUnorderedBulkOp();
            for (var d in newObj.platform) {
                if (viewsMap[d]) {
                    let iid = viewsMap[d] + "";
                    bulk.find({'_id': iid + '_' + monthObject._id}).upsert().updateOne({ $inc: newObj.platform[d], $set: {'_id': iid + '_' + monthObject._id, 'vw': countlyDb.ObjectID(iid), 's': 'platform', 'm': monthObject._id} });
                }
            }
    
            for (var d in newObj2.platform) {
                if (viewsMap[d]) {
                    let iid = viewsMap[d] + "";
                    bulk.find({'_id': iid + '_' + monthObject._id + "_m"}).upsert().updateOne({ $inc: newObj2.platform[d], $set: {'_id': iid + '_' + monthObject._id + "_m", 'vw': countlyDb.ObjectID(iid), 's': 'platform', 'm': monthObject._id} });
                }
            }
            if ( bulk.length > 0 ) {
                await bulk.execute().catch(function(err){});
            }
    
    
            for (var d in newObj.platform) {
                delete newObj.platform[d];
            }
            for (var d in newObj2.platform) {
                delete newObj2.platform[d];
            }
            flush_zero = true;
        }
        if (flush_zero === true) {
            colName = "app_viewdata" + crypto.createHash('sha1').update(appID).digest('hex');
            var bulk = countlyDb.collection(colName).initializeUnorderedBulkOp();
            for (var d in summedZero['no-segment']) {
                if (viewsMap[d]) {
                    let iid = viewsMap[d] + "";
                    bulk.find({'_id': iid + '_' + msplit[0] + ":0"}).upsert().updateOne({ $inc: summedZero['no-segment'][d], $set: {'_id': iid + '_' + msplit[0] + ":0", 'vw': countlyDb.ObjectID(iid), 's': 'no-segment', 'm': msplit[0] + ":0"} });
                }
            }
            if ( bulk.length > 0 ) {
            await bulk.execute().catch(function(err){});
            }
    
            colName = "app_viewdata" + crypto.createHash('sha1').update("platform" + appID).digest('hex');
            bulk = countlyDb.collection(colName).initializeUnorderedBulkOp();
            for (var d in summedZero.platform) {
                if (viewsMap[d]) {
                let iid = viewsMap[d] + "";
                bulk.find({'_id': iid + '_' + msplit[0] + ":0"}).upsert().updateOne({ $inc: summedZero.platform[d], $set: {'_id': iid + '_' + msplit[0] + ":0", 'vw': countlyDb.ObjectID(iid), 's': 'platform', 'm': msplit[0] + ":0"} });
                }
            }
            if ( bulk.length > 0 ) {
            await bulk.execute().catch(function(err){});
            }
    
            for (var d in summedZero['no-segment']) {
                delete summedZero['no-segment'][d];
            }
            for (var d in summedZero.platform) {
                delete summedZero.platform[d];
            }
    
        }
    }
    
    function fixDocuments(viewsMap,retry, appID, done) {
        console.log("Transforming views info");
        var segments = {};
    
        countlyDb.collection('app_viewdata' + appID).aggregate([{$group: {_id: "$m", "cc": {$sum: 1}}}], {allowDiskUse: true}, function(err1, res) {
            var month_docs = [];
            var year_docs = [];
    
            var rightNow = Date.now();
            var viewsCount = Object.keys(viewsMap).length;
            console.log(viewsCount + " views found");
            for (var i = 0; i < res.length; i++) {
                if (res[i]._id) {
                    var spli = res[i]._id.split(':');
                    if (spli[1] !== '0') {
                        month_docs.push(res[i]);
                    }
                    else {
                        year_docs.push(res[i]);
                    }
                }
            }
            Promise.each(year_docs, function(monthObject) {
                console.log("processing" + monthObject._id);
                var msplit = monthObject._id.split(':');
                return new Promise(function(resolve, reject) {
                    let newObj = {};
                    newObj['no-segment'] = {};
                    newObj.platform = {};
    
                    if (!monthObject._id) {
                        resolve();
                    }
                    var cursor2 = countlyDb.collection('app_viewdata' + appID).find({"m": monthObject._id, 'dataMoved': {$ne: true}});
    
                    cursor2.forEach(function(dataObj) {
    
                        if (!dataObj.d) {
                            return;
                        }
                        //console.log(dataObj);
                        var segment = dataObj._id.split('_');
                        segment = segment[0]; //segment value
                        var escapeProp = "";
                        var ss = 'no-segment';
                        if (segment !== 'no-segment') {
                            ss = 'platform';
                            escapeProp = segment; //saved 
                            if (!segments.platform) {
                                segments.platform = [];
                            }
                            if (segments.platform.indexOf(segment) == -1) {
                                segments.platform.push(segment);
                            }
                        }
                        if (msplit[1] === '0') { //zero doc
                            for (var key in dataObj.d) { //each month or week
                                if (dates.indexOf(key) !== -1 || weeks.indexOf(key) !== -1) {
                                    //each key in this is viewName
                                    for (let viewName in dataObj.d[key]) {
                                        if (!newObj[ss][viewName]) {
                                            newObj[ss][viewName] = {};
    
                                        }
                                        newObj[ss][viewName][key] = newObj[ss][viewName][key] || {};
                                        if (dataObj.d[key][viewName].u) {
                                            if (escapeProp) {
                                                newObj[ss][viewName][key][escapeProp] = {"u": dataObj.d[key][viewName].u};
                                            }
                                            else {
                                                newObj[ss][viewName][key].u = dataObj.d[key][viewName].u;
                                            }
                                        }
                                    }
                                }
                                else {
                                    var viewName = key;
                                    if (!newObj[ss][viewName]) {
                                        newObj[ss][viewName] = {};
                                    }
                                    if (dataObj.d[key].u) {
                                        if (escapeProp) {
                                            newObj[ss][viewName][escapeProp] = {"u": dataObj.d[key].u};
                                        }
                                        else {
                                            newObj[ss][viewName].u = dataObj.d[key].u;
                                        }
                                    }
                                }
                            }
                        }
                    }, function(err) {
                        var allSegments = Object.keys(newObj);
                        Promise.each(allSegments, function(ss) {
                            return new Promise(async function(resolve1, reject1) {
                                var colName = "app_viewdata" + crypto.createHash('sha1').update(appID).digest('hex');
                                if (ss !== 'no-segment') {
                                    colName = "app_viewdata" + crypto.createHash('sha1').update(ss + appID).digest('hex');
                                }
                                var bulk = countlyDb.collection(colName).initializeUnorderedBulkOp();
                                for (var d in newObj[ss]) {
                                    if( viewsMap[d] ) {
                                        var iid = viewsMap[d] + "";
                                        bulk.find({'_id': iid + '_' + monthObject._id}).upsert().updateOne({$set: {'_id': iid + '_' + monthObject._id, 'vw': countlyDb.ObjectID(iid), 's': ss, 'm': monthObject._id, 'd': newObj[ss][d] }});
                                    }
                                }
                                if (bulk.length > 0) {
                                    try {
                                        await bulk.execute();
                                    }
                                    catch (e) {
                                        console.log(e);
                                    }
                                }
                                resolve1();
                            });
                        }).then(function() {
                            countlyDb.collection('app_viewdata' + appID).update({"m": monthObject._id}, {$set: {'dataMoved': true}}, {"multi": true}, function(err, res) {
                                resolve();
                            });
                        });
    
                    });
                });
            }).then(function() {
                Promise.each(month_docs, function(monthObject) {
                    console.log("processing" + monthObject._id);
                    return new Promise(async function(resolve, reject) {
                        var newObj = {};
                        var newObj2 = {};
    
    
                        var count1 = 0;
                        var count2 = 0;
                        newObj['no-segment'] = {};
                        newObj.platform = {};
                        newObj2['no-segment'] = {};
                        newObj2.platform = {};
    
                        var summedZero = {};
                        summedZero['no-segment'] = {};
                        summedZero.platform = {};
    
                        var cursor = countlyDb.collection('app_viewdata' + appID).find({"m": monthObject._id, 'dataMoved': {$ne: true}});
                        for (let dataObj = await cursor.next(); dataObj !== null; dataObj = await cursor.next()) {
                            if (dataObj.d) {
                                var segment = dataObj._id.split('_');
                                segment = segment[0]; //segment value
                                var msplit = dataObj.m.split(':');
                                var escapeProp = "";
                                var ss = 'no-segment';
                                if (segment !== 'no-segment') {
                                    ss = 'platform';
                                    escapeProp = "." + segment; //saved 
                                    if (!segments.platform) {
                                        segments.platform = [];
                                    }
                                    if (segments.platform.indexOf(segment) === -1) {
                                        segments.platform.push(segment);
                                    }
                                }
                                if (msplit[1] !== '0') {
                                    if (ss === 'no-segment') {
                                        for (var day in dataObj.d) { //each day
                                            for (var hour in dataObj.d[day]) { //day object has hour objects and summed objects
                                                if (hours.indexOf(hour) !== -1) { //it is hour object;
                                                    //each key in this is viewName
                                                    if (ss === 'no-segment') {
                                                        for (let viewName in dataObj.d[day][hour]) {
                                                            if (!newObj[ss][viewName]) {
                                                                newObj[ss][viewName] = {};
                                                                count1++;
                                                            }
                                                            for (var prop in dataObj.d[day][hour][viewName]) {
                                                                newObj[ss][viewName]["d" + "." + day + "." + hour + "." + prop] = dataObj.d[day][hour][viewName][prop];
                                                            }
    
                                                        }
                                                    }
                                                }
                                                else {
                                                    var viewName = hour;
                                                    if (!newObj[ss][viewName]) {
                                                        newObj[ss][viewName] = {};
                                                        count1++;
                                                    }
                                                    if (!newObj2[ss][viewName]) {
                                                        newObj2[ss][viewName] = {};
                                                    }
                                                    if (!summedZero[ss][viewName]) {
                                                        summedZero[ss][viewName] = {};
                                                    }
    
                                                    for (var prop in dataObj.d[day][hour]) {
                                                        newObj[ss][viewName]["d." + day + "." + prop] = dataObj.d[day][hour][prop];
                                                        newObj2[ss][viewName]["d." + day + "." + prop] = dataObj.d[day][hour][prop];
                                                        if (prop !== 'u') {
                                                            if (summedZero[ss][viewName]["d." + msplit[1] + "." + prop]) {
                                                                summedZero[ss][viewName]["d." + msplit[1] + "." + prop] += dataObj.d[day][hour][prop];
                                                            }
                                                            else {
                                                                summedZero[ss][viewName]["d." + msplit[1] + "." + prop] = dataObj.d[day][hour][prop];
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    else {
                                        for (var day in dataObj.d) { //each day
                                            for (var hour in dataObj.d[day]) { //day object has hour objects and summed objects
                                                if (hours.indexOf(hour) !== -1) { //it is hour object;
                                                    for (viewName in dataObj.d[day][hour]) {
                                                        if (!newObj[ss][viewName]) {
                                                            newObj[ss][viewName] = {};
                                                            count2++;
                                                        }
                                                        for (var prop in dataObj.d[day][hour][viewName]) {
                                                            newObj[ss][viewName]["d." + day + "." + hour + escapeProp + "." + prop] = dataObj.d[day][hour][viewName][prop];
                                                        }
                                                    }
                                                }
                                                else {
                                                    var viewName = hour;
                                                    if (!newObj[ss][viewName]) {
                                                        newObj[ss][viewName] = {};
                                                        count2++;
                                                    }
    
                                                    if (!newObj2[ss][viewName]) {
                                                        newObj2[ss][viewName] = {};
                                                    }
    
                                                    if (!summedZero[ss][viewName]) {
                                                        summedZero[ss][viewName] = {};
                                                    }
    
                                                    for (var prop in dataObj.d[day][hour]) {
                                                        newObj[ss][hour]["d." + day + escapeProp + "." + prop] = dataObj.d[day][hour][prop];
                                                        newObj2[ss][hour]["d." + day + escapeProp + "." + prop] = dataObj.d[day][hour][prop];
                                                        if (summedZero[ss][hour]["d." + msplit[1] + escapeProp + "." + prop]) {
                                                            summedZero[ss][hour]["d." + msplit[1] + escapeProp + "." + prop] += dataObj.d[day][hour][prop];
                                                        }
                                                        else {
                                                            summedZero[ss][hour]["d." + msplit[1] + escapeProp + "." + prop] = dataObj.d[day][hour][prop];
                                                        }
    
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
    
                                await flushData(viewsMap,count1, count2, appID, newObj, newObj2, summedZero, monthObject, msplit, false);
                                if (count1 >= bufferSize || count2 >= bufferSize) {
                                    count1 = 0;
                                }
                                if (count2 >= bufferSize) {
                                    count2 = 0;
                                }
                            }
                        }
                        await flushData(viewsMap,count1, count2, appID, newObj, newObj2, summedZero, monthObject, msplit, true);
                        countlyDb.collection('app_viewdata' + appID).update({"m": monthObject._id}, {$set: {'dataMoved': true}}, {"multi": true}, function(err, res) {
                            resolve();
                        });
                    });
                }).then(function() {
                    console.log("Finished in:" + (Date.now() - rightNow) / 1000);
                    var segmUpdate = {};
                    var updateSegments = false;
                    for (var k in segments) {
                        for (var l = 0; l < segments[k].length; l++) {
                            segmUpdate["segments." + k + "." + segments[k][l]] = true;
                            updateSegments = true;
                        }
                    }
                    for (var i in viewsMap) {
                        delete viewsMap[i];
                    }
                    if (updateSegments) {
                        countlyDb.collection('views').update({_id: countlyDb.ObjectID(appID)}, {$set: segmUpdate}, {'upsert': true}, function(err, res) {
                            done();
                        });
                    }
                    else {
                        done();
                    }
                });
            });
        });
    }
    
    async function processingUsers(viewsMap,appID, done) {
        var batch = 50000;
        var rightNow = Date.now();
        var ids = [];
        countlyDb.collection('app_views' + appID).count({dataMoved: {$ne: true}}, async function(err, total) {
            if (total === 0) {
                console.log("Users processed in " + (Date.now() - rightNow) / 1000 + " seconds");
                done();
            }
            else {
                var wraps = Math.ceil(total / batch);
                var runval = 0;
                var batchFilled = 0;
                var query = [{$project: {"_idO": "$_id" + "", 'uid': true}}, {$lookup: {from: "app_views" + appID, localField: "_idO", foreignField: "_id", as: "uinfo"}}, {$match: {"uinfo": {$ne: []}}}];
                var cursor = countlyDb.collection('app_users' + appID).aggregate(query).batchSize(batch);
                var bulk = countlyDb.collection('app_userviews' + appID).initializeUnorderedBulkOp();
                for (let doc = await cursor.next(); doc !== null; doc = await cursor.next()) {
                    if (doc.uinfo && doc.uinfo[0] && doc.uinfo[0].dataMoved !== true) {
                        let data = doc.uinfo[0];
                        ids.push(data._id);
                        let insertMe = {'_id': doc.uid};
                        for (var z in data) {
                            if (z !== '_id') {
                                if (!viewsMap[z]) {}
                                else {
                                    insertMe[viewsMap[z]] = {"ts": data[z]};
                                }
                            }
                        }
                        bulk.find({'_id': doc.uid}).upsert().updateOne({ $set: insertMe});
                        batchFilled++;
                    }
                    if (batchFilled === batch) {
                        runval++;
                        await bulk.execute().catch(function(err){});
                        await countlyDb.collection("app_views" + appID).updateOne({_id: {$in: ids}}, {$set: {"dataMoved": true}}, {multi: true});
    
                        ids.splice(0, ids.length);
                        bulk = countlyDb.collection('app_userviews' + appID).initializeUnorderedBulkOp();
                        console.log("Processed :" + runval + "/" + wraps);
                        batchFilled = 0;
                    }
                }
                if( batchFilled>0 ) {
                    await bulk.execute();
                    await countlyDb.collection("app_views" + appID).updateMany({_id: {$in: ids}}, {$set: {"dataMoved": true}}, {multi: true}).catch(function(err){ console.log(err);});
                }
                
                console.log("Users processed in " + (Date.now() - rightNow) / 1000 + " seconds");
                done();
            }
        });
    }
    
    //Fixing data about users
    function check_and_fix_data(appID, done) {
        var viewsMap = {};
        console.log("Updating for  view: " + appID);
        console.log("Getting all view names");
        countlyDb.collection('app_viewdata' + appID).aggregate([{$group: {_id: false, views: {$mergeObjects: "$meta_v2.views"}}}], function(err, res) {
            if (err) {
                console.log(err);
            }
            res = res || [];
            res[0] = res[0] || {};
            res[0].views = res[0].views || [];
            var keys = Object.keys(res[0].views);
    
            var insertObj = [];
            for (var p = 0; p < keys.length; p++) {
                insertObj.push({'view': keys[p], 'url': keys[p]});
            }
            console.log("View names fetched");
            countlyDb.collection('app_viewsmeta' + appID).ensureIndex({"view": 1}, {'unique': 1}, function() {
                if (insertObj.length > 0) {
                    countlyDb.collection('app_viewsmeta' + appID).insertMany(insertObj, {"ordered": false, ignore_errors: [11000]}, function(err1, ress) {
                        console.log("View names inserted");
                        countlyDb.collection('app_viewsmeta' + appID).find({}).toArray(function(err2, views) {
                            for (var k = 0; k < views.length; k++) {
                                viewsMap[views[k].view] = views[k]._id;
                            }
                            console.log("Processing users");
                            processingUsers(viewsMap,appID, function() {
                                fixDocuments(viewsMap,0, appID, done);
                            });
                        });
                    });
                }
                else {
                    done();
                }
            });
        });
    }
    
    countlyDb.collection('apps').find({}).toArray(function(err, apps) {
        var appIds = [];
        for (var z = 0; z < apps.length; z++) {
            appIds.push(apps[z]._id + "");
        }
        Promise.each(appIds, function(appID) {
            return new Promise(function(resolve, reject) {
                check_and_fix_data(appID, function() {
                    resolve();
                });
            });
        }).then(function() {
            console.log("Finished transforming data");
            countlyDb.close();
        });
    
    });

});