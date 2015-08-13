var plugin = {};

(function (plugin) {
	plugin.init = function(app, countlyDb){
		
	};
    
    plugin.renderDashboard = function(ob){
        ob.data.countlyGlobal.use_cron = plugins.getConfig("reports").use_cron;
    };
}(plugin));

module.exports = plugin;