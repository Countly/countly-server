var plugin = {},
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    systemUtility = require('./system.utility');

(function(plugin) {
    //write api call
    /*
	plugins.register("/i", function(ob){
		
	});
	*/

    plugins.register("/o/system", function(ob) {

        var params = ob.params,
            path = ob.paths[3].toLowerCase(),
            qstring = ob.params.qstring,
            validate = ob.validateUserForGlobalAdmin;

        switch (path) {
        case 'memory':
        case 'disks':
        case 'cpu':
        case 'database':
        case 'overall':
        case "healthcheck":
        case "dbcheck":
            validate(params, () => {
                systemUtility[path](qstring)
                    .then(
                        res => common.returnMessage(params, 200, res),
                        res => common.returnMessage(params, 500, res)
                    );
            });
            return true;
        default:
            return false;
        }


    });
}(plugin));

module.exports = plugin;