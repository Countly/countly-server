(function () {
    var langmap;
    $.ajax({
        type:"GET",
        url:countlyCommon.API_PARTS.data.r+"/langmap",
        dataType:"json",
        data:{"preventRequestAbort":true},
        success:function (json) {
            langmap = json;
        }
    });

    function getLanguageName(code){
        if(langmap && langmap[code]){
            return langmap[code].englishName
        }
        else
            return code;
    }

    CountlyHelpers.createMetricModel(window.countlyLanguage = window.countlyLanguage || {getLanguageName:getLanguageName}, {name: "langs", estOverrideMetric:"languages"}, jQuery, getLanguageName);
}());