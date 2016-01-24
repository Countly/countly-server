var plugin = {},
	common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');

(function (plugin) {
	plugins.register("/o", function(ob){
		var params = ob.params;
		var validateUserForDataReadAPI = ob.validateUserForDataReadAPI;
		if (params.qstring.method == "latest_users") {
            validateUserForDataReadAPI(params, function(){
                common.db.collection("app_users"+params.app_id).find({}).sort({ls:-1}).limit(50).toArray(function(err, users){
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