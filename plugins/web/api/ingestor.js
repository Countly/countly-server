var pluginOb = {},
    plugins = require('../../pluginManager.ts'),
    registerWebSdkValidateRequest = require('./parts/sdk-validate-request.js');

registerWebSdkValidateRequest(plugins);

module.exports = pluginOb;
