const { onTokenSession } = require('./api-push');

const plugins = require('../../pluginManager');
//common = require('../../../api/utils/common');
//log = common.log('ingestor:api');

plugins.internalDrillEvents.push('[CLY]_push_action');
plugins.internalDrillEvents.push('[CLY]_push_sent');


plugins.register('/sdk/process_request', async ob => {
    let params = ob.params;

    if (params.qstring.token_session) {
        onTokenSession(params.app_user, params);
    }
});