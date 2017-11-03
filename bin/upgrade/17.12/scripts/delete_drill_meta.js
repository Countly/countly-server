var pluginManager = require("../../../../plugins/pluginManager");
var async = require("async");
    
var db = pluginManager.dbConnection("countly_drill");
var reg = /^drill_events\.*/;

function deleteOldMeta(col, done){
    var c = col.s.name;
    //delete all meta docs
    db.collection(c).remove({"_id": {"$regex": "meta.*"}}, function(err, res){
        done();
    });
}

pluginManager.loadConfigs(db, function(){
    db.collections(function (err, results) {
        if(err){
            throw err;
        }
        else{
            var events = results.filter(function(col){
                return reg.test(col.s.name);
            });
            async.each(events, deleteOldMeta, function(){
                db.close();
            });
        }
    });
});