var pluginManager = require('../../../../plugins/pluginManager.js'),
    async = require('async'),
    crypto = require('crypto'),
    Promise = require("bluebird"),
    countlyDb = pluginManager.dbConnection();

countlyDb.collection('long_tasks').update({autoRefresh: true,type:"formulas"},{$set:{"period_desc":"732days",taskgroup:true}},{multi:true},function (err,res){
    countlyDb.collection('long_tasks').find({autoRefresh: true,type:"drill"}).toArray(function(err, tasks) {
        Promise.each(tasks, function(task) {
            return new Promise(function(resolve, reject) {
                if(!task.taskgroup && ! task.subtask){
                    var request = JSON.parse(task.request);
                    var meta = JSON.parse(task.meta);
                    if(!meta.byVal || meta.byVal == "" ) { //just without byval
                        request.json.period = "732days";
                        request.json.period_desc = "732days";
                        request.json.bucket = "";
                        request.method = "createReport";
                        countlyDb.collection("long_tasks").update({_id: task.id}, {
                            $set: {
                                subtasks:{},
                                data: {},
                                taskgroup:true,
                                period_desc:"732days",
                                request:JSON.encode(request)
                            }
                        }, {'upsert': false}, function(err,res){
                            resolve();
                        });
                    }
                    resolve();
                }
                else {
                    resolve();
                }
            }); 
        }).then(function() {
            console.log("Finished upgrading reports");
            countlyDb.close();
        });
    });
});

