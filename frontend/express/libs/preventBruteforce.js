var prevent = {};

(function (prevent) {
    //countly database connection
    prevent.collection = null;
    //allowed fails
    prevent.fails = 3;
    //first wait time after reaching fail amount
    prevent.wait = 5*60;
    //paths to prevent
    prevent.paths = [];
    
    prevent.prevent = function(req, res, next){
        console.log("checking")
        if(req.method.toLowerCase() == 'post' && prevent.paths.indexOf(req.path) !== -1){
            var username = req.body.username;
            prevent.collection.findOne({_id:req.body.username}, function(err, result){
                result = result || {fails:0};
                if(result.fails > 0 && result.fails % prevent.fails == 0 && getTimestamp() < (((result.fails/prevent.fails)*prevent.wait)+result.lastFail)){
                    //blocking user
                    res.redirect(req.path+'?message=login.blocked');
                }
                else{
                    next();
                }
            });
        }
        else{
            next();
        }
    };
    
    prevent.reset = function(id, callback){
        callback = callback || function(){};
        prevent.collection.remove({_id:id}, callback);
    };
    
    prevent.fail = function(id, callback){
        callback = callback || function(){};
        prevent.collection.update({_id:id}, {$inc:{fails:1}, $set:{lastFail:getTimestamp()}},{upsert:true}, callback);
    };
    
    //helpers
    
    function getTimestamp(){
        return Math.floor(new Date().getTime()/1000);
    }
}(prevent));

module.exports = prevent;