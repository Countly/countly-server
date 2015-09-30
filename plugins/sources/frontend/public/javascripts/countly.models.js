(function () {
    var stores;
    $.ajax({
        type:"GET",
        url:countlyCommon.API_PARTS.data.r+"/sources",
        dataType:"json",
        success:function (json) {
            stores = json;
        }
    });
    function getSourceName(code){
        code = code.replace(/&#46;/g, '.');
        if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type == "mobile"){
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
                return "Direct";
            }
            code = code.replace("://www.", "://");
            var matches = code.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
            var domain = matches && matches[1] || code;
            if(domain.indexOf("google.") == 0)
                domain = "Google";
            return domain;
        }
    }
    window.countlySources = window.countlySources || {};
    window.countlySources.getSourceName=getSourceName;
    CountlyHelpers.createMetricModel(window.countlySources, "sources", jQuery, getSourceName);
}());