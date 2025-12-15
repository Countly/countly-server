const { onTokenSession } = require('./api-push');

const plugins = require('../../pluginManager');
//common = require('../../../api/utils/common');
//log = common.log('ingestor:api');


plugins.register('/sdk/process_request', async ob => {
    let params = ob.params;

    if (params.qstring.token_session) {
        onTokenSession(params.app_user, params);
    }
});