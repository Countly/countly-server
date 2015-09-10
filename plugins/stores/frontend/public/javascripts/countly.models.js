(function () {
    var stores;
    $.ajax({
        type:"GET",
        url:countlyCommon.API_PARTS.data.r+"/stores",
        dataType:"json",
        success:function (json) {
            stores = json;
        }
    });
    function getStoreName(code){
        var pack = code.replace(/:/g, '.');
        if(stores && stores[pack]){
            return stores[pack];
        }
        else{
            for(var i in stores){
                if(pack.indexOf(i) == 0){
                    return stores[i];
                }
            }
            return pack;
        }
    }
    CountlyHelpers.createMetricModel(window.countlyStores = window.countlyStores || {getStoreName:getStoreName}, "stores", jQuery, getStoreName);
}());