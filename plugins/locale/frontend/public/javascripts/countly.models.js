/*global $, jQuery, CountlyHelpers, countlyCommon*/
(function() {
    var langmap;
    $.ajax({
        type: "GET",
        url: countlyCommon.API_PARTS.data.r + "/langmap",
        dataType: "json",
        data: {"preventRequestAbort": true},
        success: function(json) {
            langmap = json;
        }
    });

    /**
    * Get language name from language code
    * @param {string} code - language code
    * @returns {string} language name
    */
    function getLanguageName(code) {
        if (langmap && langmap[code]) {
            return langmap[code].englishName;
        }
        else {
            return code;
        }
    }

    CountlyHelpers.createMetricModel(window.countlyLanguage = window.countlyLanguage || {getLanguageName: getLanguageName}, {name: "langs", estOverrideMetric: "languages"}, jQuery, getLanguageName);
}());