var plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js');

//write api call
plugins.register("/i", function(ob) {
    //store is as custom property
    if (ob.params.ip_address) {
        common.updateAppUser(ob.params, {$set: {"custom.ip": ob.params.ip_address}});
    }
});