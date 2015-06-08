(function () {
    var langmap;
    $.ajax({
        type:"GET",
        url:countlyCommon.API_PARTS.data.r+"/langmap",
        dataType:"json",
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
    CountlyHelpers.createMetricModel(window.countlyLanguage = window.countlyLanguage || {}, "langs", jQuery, getLanguageName);
}());