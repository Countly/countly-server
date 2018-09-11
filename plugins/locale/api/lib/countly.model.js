var countlyModel = require('../../../../api/lib/countly.model.js'),
    langs = require('../utils/langs.js');

var langmap = langs.languages;

/**
* This module defines default model to handle devices data
* @module "plugins/locale/api/lib/countly.model"
* @extends module:api/lib/countly.model~countlyMetric
*/

/**
* Create model
* @returns {object} new model
*/
function create() {
    var countlyLocales = countlyModel.create(function(code) {
        if (langmap && langmap[code]) {
            return langmap[code].englishName;
        }
        else {
            return code;
        }
    });
    return countlyLocales;
}
module.exports = create;