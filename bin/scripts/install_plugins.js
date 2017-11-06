var manager = require('../../plugins/pluginManager.js');
var plugins = manager.getPlugins();
require('../../api/utils/log').setLevel('db:write', 'mute');

if(plugins.length > 0){
	//run install files
	for(var i = 0, l = plugins.length; i < l; i++){
		manager.installPlugin(plugins[i]);
	}
	
	//processing plugin files for production mode
	console.log("Processing plugin files for production mode");
	manager.prepareProduction();
}