var countlyModel = require('../../../../api/lib/countly.model.js'),
    countlyCommon = require('../../../../api/lib/countly.common.js'),
    stores = require("../../stores.json"),
    underscore = require('underscore');

/**
* This module defines default model to handle devices data
* @module "plugins/sources/api/lib/countly.model"
* @extends module:api/lib/countly.model~countlyMetric
*/
function create(){
    var countlySources = countlyModel.create(function(code, data, separate){
        code = countlyCommon.decode(code+"");
        if(!code.startsWith("http") && code.indexOf("://") === -1){
            //ignore incorrect Android values, which are numbers
            if(!isNaN(parseFloat(code)) && isFinite(code))
                return "Unknown";
            if(separate)
                return code;
            if(stores && stores[code]){
                return stores[code];
            }
            else{
                for(var i in stores){
                    if(code.indexOf(i) == 0){
                        return stores[i];
                    }
                }
                return code;
            }
        }
        else{
            if(code.indexOf("://") == -1){
                if(separate)
                    return "Organic ("+code+")";
                return "Direct";
            }
            else if(separate)
                return code;
            code = code.replace("://www.", "://");
            var matches = code.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
            var domain = matches && matches[1] || code;
            return domain;
        }
    });
    return countlySources;
}
module.exports = create;