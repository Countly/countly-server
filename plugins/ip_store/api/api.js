var plugins = require('../../pluginManager.js');

//write api call
plugins.register("/sdk/user_properties", function(ob) {
    //store is as custom property
    if (ob.params.ip_address) {
        ob.updates.push({$set: {"custom.ip": ob.params.ip_address}});
    }
});