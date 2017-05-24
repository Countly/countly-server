var plugin = {},
    useragent = require('useragent'),
	common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');

(function (plugin) {
    plugins.appTypes.push("web");
    plugins.register("/sdk", function(ob){
        var params = ob.params;
        if(params.app.type == "web"){
            if(params.qstring.sdk_version && (!params.app.sdk_version || common.versionCompare(params.qstring.sdk_version, params.app.sdk_version,{delimiter:"."}) === 1)){
                common.db.collection("apps").update({_id:params.app._id}, {$set:{sdk_version:params.qstring.sdk_version}});
            }
            var agent = useragent.parse(params.req.headers['user-agent'], (params.qstring.metrics) ? params.qstring.metrics._ua : undefined);
            var data = getOSFromAgent(agent);
            if(params.qstring.begin_session){
                //try to add metrics based on user agent
                if(!params.qstring.metrics)
                    params.qstring.metrics = {};
    
                //if some metrics are not provided, parse them from user agent                
                if(!params.qstring.metrics._browser)
                    params.qstring.metrics._browser = agent.family;
                
                if(!params.qstring.metrics._browser_version)
                    params.qstring.metrics._browser_version = agent.toVersion();
                
                if(params.qstring.metrics._browser && params.qstring.metrics._browser_version)
                    params.qstring.metrics._browser_version = "["+params.qstring.metrics._browser.toLowerCase()+"]_" + params.qstring.metrics._browser_version;
                
                if(!params.qstring.metrics._os)
                    params.qstring.metrics._os = data.os;
                
                if(!params.qstring.metrics._os_version)
                    params.qstring.metrics._os_version = data.os_version;
                
                if(!params.qstring.metrics._device)
                    params.qstring.metrics._device = (agent.device.family == "Other") ? "Unknown" : agent.device.family;
            }
            
            //check if view events need to have platform segment
            if (params.qstring.events && params.qstring.events.length && Array.isArray(params.qstring.events)) {
                params.qstring.events = params.qstring.events.map(function(currEvent){
                    if (currEvent.key == "[CLY]_view" && currEvent.segmentation && currEvent.segmentation.name && !currEvent.segmentation.segment){
                        currEvent.segmentation.segment = data.os;
                    }
                    return currEvent;
                });
            }
            
            //check of any crash segments can be updated
            if (typeof params.qstring.crash == "string") {
                try {
                    params.qstring.crash = JSON.parse(params.qstring.crash);
                } catch (SyntaxError) {
                    console.log('Parse crash JSON failed');
                    return false;
                }
                if(!params.qstring.crash._os)
                   params.qstring.crash._os = data.os;
               
                if(!params.qstring.crash._os_version)
                   params.qstring.crash._os_version = data.os + " " + data.os_version;
               
                if(!params.qstring.crash._browser)
                   params.qstring.crash._browser = agent.toAgent();
               
               if(!params.qstring.crash._device)
                   params.qstring.crash._device = (agent.device.family == "Other") ? "Unknown" : agent.device.family;
            }
        }
	});
    
    function getOSFromAgent(agent){
        var os = agent.os.family;
        var os_version;
        
        if(agent.os.major != 0 || agent.os.minor != 0 || agent.os.patch != 0)
            os_version = agent.os.toVersion();
        
        if (/Windows /.test(os) && os != "Windows Phone") {
            var match = /Windows (.*)/.exec(os);
            if(match && match[1])
                os_version = match[1];
            os = 'Windows';
        }
        else{
            var osFix = {
                "Mac OS X": "Mac OSX",
                "Mac OS": "MacOS",
                "ATV OS X": "tvOS"
            };
            
            for(var i in osFix){
                if(os == i){
                    os = osFix[i];
                    break;
                }
            }
        }
        return {os:os, os_version:os_version};
    }
    
	plugins.register("/o", function(ob){
		var params = ob.params;
		var validateUserForDataReadAPI = ob.validateUserForDataReadAPI;
		if (params.qstring.method == "latest_users") {
            validateUserForDataReadAPI(params, function(){
                common.db.collection("app_users"+params.app_id).find({_id:{$ne:"uid-sequence"}}).sort({ls:-1}).limit(50).toArray(function(err, users){
                    if(!err)
                        common.returnOutput(params, users);
                    else
                        common.returnMessage(params, 400, 'Error occured');
                });
            });
			return true;
		}
		return false;
	});
}(plugin));

module.exports = plugin;