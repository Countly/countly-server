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
        else
            return code;
    }
    CountlyHelpers.createMetricModel(window.countlyStores = window.countlyStores || {getStoreName:getStoreName}, "stores", jQuery, getStoreName);
}());