var plugins = require('../../pluginManager.js');
const FEATURE_NAME = 'push';
plugins.internalEvents.push('[CLY]_push_sent');
plugins.internalEvents.push('[CLY]_push_action');
plugins.internalDrillEvents.push('[CLY]_push_sent');
plugins.internalDrillEvents.push('[CLY]_push_action');
plugins.register("/permissions/features", function(ob) {
    ob.features.push(FEATURE_NAME);
});
plugins.setConfigs(FEATURE_NAME, {
    proxyhost: '',
    proxyport: '',
    proxyuser: '',
    proxypass: '',
    proxyunauthorized: false,
    test: {
        uids: '', // comma separated list of app_users.uid
        cohorts: '', // comma separated list of cohorts._id
    },
    // TODO: rate limiting needs to be implemented on kafka consumer side. also
    // it needs to be configurable per app not as a global setting.
    // rate: {
    //     rate: '',
    //     period: ''
    // },
    message_timeout: 3600000, // timeout for a message not sent yet (for TooLateToSend error)
    default_content_available: false, // sets content-available: 1 by default for ios
    save_results_by_default: true,
    message_results_ttl: 90, // 90 days
});