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

    function getSourceName(code, data, separate){
        code = countlyCommon.decode(code+"");
        if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type == "mobile"){
            //ignore incorrect Android values, which are numbers
            if(!isNaN(parseFloat(code)) && isFinite(code))
                return jQuery.i18n.map["common.unknown"];
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
                    return jQuery.i18n.map["sources.organic"]+" ("+code+")";
                return jQuery.i18n.map["sources.direct"];
            }
            else if(separate)
                return code;
            code = code.replace("://www.", "://");
            var matches = code.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
            var domain = matches && matches[1] || code;
            return domain;
        }
    }

    window.countlySources = window.countlySources || {};
    window.countlySources.getSourceName=getSourceName;
    countlySources.initializeKeywords = function(isRefresh){
        var self = this;
        return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r+"/keywords",
            data:{
                "api_key":countlyGlobal.member.api_key,
                "app_id":countlyCommon.ACTIVE_APP_ID,
                "period":countlyCommon.getPeriodForAjax(),
                "display_loader": !isRefresh
            },
            success:function (json) {
                self._keywords = json;
            }
        });
    };
    countlySources.getKeywords = function(){
        var data = JSON.parse(JSON.stringify(this._keywords));
        for(var i = 0; i < this._keywords.length; i++){
            data[i]._id = countlyCommon.decode(data[i]._id.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '').toLowerCase());
        }
        return countlyCommon.mergeMetricsByName(data, "_id");
    };
    
    CountlyHelpers.createMetricModel(window.countlySources, {name: "sources", estOverrideMetric:"sources"}, jQuery, getSourceName);
}());