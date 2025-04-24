var exported = {},
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');

(function() {
    plugins.register("/sdk/process_user", function(ob) {
        var params = ob.params;
        if (params.qstring.metrics) {
            if (params.qstring.metrics._density && common.isNumber(params.qstring.metrics._density)) {
                params.qstring.metrics._density = parseFloat(params.qstring.metrics._density).toFixed(2);
            }

            if (params.qstring.metrics._os && params.qstring.metrics._density) {
                var custom_os = "[" + params.qstring.metrics._os + "]";
                if (common.os_mapping[params.qstring.metrics._os.toLowerCase()]) {
                //for whatewer reason we go there twice. And on second time _density is already modified. Nested if to prevent error.
                    if (!params.qstring.metrics._density.startsWith(common.os_mapping[params.qstring.metrics._os.toLowerCase()])) {
                        params.qstring.metrics._density = common.os_mapping[params.qstring.metrics._os.toLowerCase()] + params.qstring.metrics._density;
                    }
                }
                else if (!params.qstring.metrics._density.startsWith(custom_os)) {
                    params.qstring.metrics._density = custom_os + params.qstring.metrics._density;
                }
            }


            if (!params.app_user.dnst || params.qstring.metrics._density !== params.app_user.dnst) {
                ob.updates.push({$set: {dnst: params.qstring.metrics._density}});
            }
        }
    });
}(exported));

module.exports = exported;