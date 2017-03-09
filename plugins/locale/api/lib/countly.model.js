var countlyModel = require('../../../../api/lib/countly.model.js'),
    countlyCommon = require('../../../../api/lib/countly.common.js'),
    langs = require('../utils/langs.js'),
    underscore = require('underscore');
    
 var langmap = langs.languages;

/**
* This module defines default model to handle devices data
* @module "plugins/locale/api/lib/countly.model"
* @extends module:api/lib/countly.model~countlyMetric
*/

var countlyLocales = countlyModel.create(function(code){
        if(langmap && langmap[code]){
            return langmap[code].englishName
        }
        else
            return code;
    });
module.exports = countlyLocales;