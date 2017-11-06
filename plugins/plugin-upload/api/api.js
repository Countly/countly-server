var plugin = {};
var common = require('../../../api/utils/common.js');
var plugins = require('../../pluginManager.js');
const fs = require('fs'); 
var common = require('../../../api/utils/common.js');
var log = common.log('plugin-upload:api');

(function (plugin) {
    plugins.register("/systemlogs", function(ob){
        if(ob.action && ob.action=="change_plugins")
        {
            var myplugins = [];
            if(ob.data && ob.data.before && ob.data.update)
            {
                for (var k in ob.data.update) {
                    if (typeof ob.data.before[k] == 'undefined' || ob.data.before[k]==false && ob.data.update[k]==true)
                        myplugins.push(k);
                }
            }
            try
            {
                fs.writeFileSync(__dirname + '/../frontend/last_enabled_plugins.json',JSON.stringify(myplugins));
            }
            catch(error){ log.e(error.message);}
        }
    });     
}(plugin));

module.exports = plugin;