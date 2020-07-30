var common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');

(function() {

    plugins.register('/o', function(ob) {
        if (ob.params.qstring.method === 'get-random-numbers') {
            var params = ob.params;
            var validateUserForDataReadAPI = ob.validateUserForDataReadAPI;
            validateUserForDataReadAPI(params, function() {
                common.returnOutput(params, [...Array(10)].map(() => Math.floor(Math.random() * 9)));
            });
            return true;
        }
        return false;
    });
}());

module.exports = {};