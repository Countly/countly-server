var pluginManager = require('../../../../plugins/pluginManager.js');


console.log("Script clears old and unused system created tokens.");
console.log("Clearing 'LoginAuthToken' tokens"); //They are single use. Should have been consumed right after.

pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection("auth_tokens").remove({purpose: "LoginAuthToken", multi: false}, function(err, res) {
        if (err) {
            console.log(err);
        }
        console.log(res.result);
    
        console.log("Renaming purpose 'LoggedInAuthToken' to 'LoggedInAuth'");//obsolete naming
        countlyDb.collection("auth_tokens").update({purpose: "LoggedInAuthToken"}, {$set: {purpose: "LoggedInAuth"}}, {multi: true}, function(err, res) {
            if (err) {
                console.log(err);
            }
            console.log(res.result);
            console.log("Clearing expired tokens");
            var ends = Math.round(Date.now() / 1000);
            countlyDb.collection("auth_tokens").remove({ttl: {$gt: 0}, ends: {$lt: ends}}, function(err, res) {
                if (err) {
                    console.log(err);
                }
                console.log(res.result);
    
                console.log("Clearing tokens without owner");
                countlyDb.collection("members").find({}).toArray(function(err_members, members) {
                    var id = [];
                    if (members) {
                        for (var z = 0; z < members.length; z++) {
                            id.push(members[z]._id + "");
                        }
                    }
                    countlyDb.collection("auth_tokens").remove({owner: {$nin: id}}, function(err, res) {
                        if (err) {
                            console.log(err);
                        }
                        console.log(res.result);
    
                        console.log("Looking for duplicate tokens");
                        //countlyDb.collection("auth_tokens").aggregate([{$match:{purpose:{"$in":purposeToReuse}}},{ $project: {_id: {owner:"$owner", multi:"$multi",purpose:"$purpose", app:"$app", "endpoint":"$endpoint", ttl:{ $cond: { if: {$eq:[ "$ttl",0]}, then: 0, else: 1 } }}, data:{id:"$_id","ttl":"$ttl", ends:"$ends"}}},{$group:{_id:"$_id", data:{$addToSet:"$data"}}}], function(err,res){
    
                        countlyDb.collection("auth_tokens").aggregate([{$match: {purpose: "LoggedInAuth"}}, { $project: {_id: {owner: "$owner", multi: "$multi", purpose: "$purpose", app: "$app", "endpoint": "$endpoint"}, data: {id: "$_id", "ttl": "$ttl", ends: "$ends"}}}, {$group: {_id: "$_id", data: {$addToSet: "$data"}}}], function(err, res) {
                            var remove_ids = [];
                            for (var k = 0; k < res.length; k++) { //leaving just one with largest ends value. If there has been switch between session timeout values - ttl might be different.
                                if (res[k].data.length > 0) {
                                    var maxends = 0;
                                    for (var p = 1; p < res[k].data.length; p++) {
                                        if (res[k].data[p].ends > res[k].data[maxends].ends) {
                                            maxends = p;
                                        }
                                    }
    
                                    for (var m = 0; m < res[k].data.length; m++) {
                                        if (m !== maxends) {
                                            remove_ids.push(res[k].data[m].id);
                                        }
                                    }
                                }
                            }
                            if (remove_ids.length > 0) {
                                console.log("Removing " + remove_ids.length + " token ");
                                countlyDb.collection("auth_tokens").remove({"_id": {$in: remove_ids}}, function(err_remove_dup, res_remove_dup) {
                                    if (err_remove_dup) {
                                        console.log(err_remove_dup);
                                    }
                                    console.log(res_remove_dup.result);
                                    countlyDb.close();
                                });
                            }
                            else {
                                console.log("no duplicate tokens found");
                                countlyDb.close();
                            }
                        });
                    });
                });
            });
        });
    });
});