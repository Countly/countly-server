var plugins = require('../../pluginManager.js');
const countlyConfig = require('../../../api/config', 'dont-enclose');

//write api call
plugins.register("/i", function(/*ob*/) {
    //process sdk request here
});

plugins.setConfigs("guides", {
    enabled: countlyConfig.enableGuides || false,
});
