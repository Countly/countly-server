const FEATURE_NAME = 'data_manager';
const plugins = require('../../pluginManager.ts');
const log = require('./../../../api/utils/log.js')(FEATURE_NAME + ':core-ingestor');

try {
    if (plugins.isPluginEnabled('drill')) {
        require('./ingestor.extended');
    }
}
catch (e) {
    log.e(e);
    log.d('running in basic mode');
}