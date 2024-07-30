const plugins = require('../../pluginManager.js');

try {
    if (plugins.isPluginEnabled('ab-testing')) {
        require('./ab_rc-method.js');
    }
    else {
        throw new Error('Plugin ab-testing is not enabled');
    }
}
catch (e) {
    console.log('running remote-config test in basic mode');
}
finally {
    require('./add-remote-config.js');
    require('./fetch_remote_config.js');
    require('./condition-endpoints.js');
    require('./remote-config-endpoint.js');
    require('./parameter-crud/parameter-crud.js');
}