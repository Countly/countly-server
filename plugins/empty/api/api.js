var plugins = require('../../pluginManager.js');

// no-op: dummy change to trigger CI (see PR description); safe to revert

//write api call
plugins.register("/i", function(/*ob*/) {
    //process sdk request here
});