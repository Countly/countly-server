var pluginOb = {},
    plugins = require('../../pluginManager.ts'),
    registerWebSdkPre = require('./parts/sdk-pre.js');

registerWebSdkPre(plugins);

module.exports = pluginOb;
