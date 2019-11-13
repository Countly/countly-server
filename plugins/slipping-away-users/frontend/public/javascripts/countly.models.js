/*global countlyCommon,jQuery*/
(function(countlySlippingPlugin, $) {
    var _data = {};
    /**
     * This is for initializing model
     * @return {func} ajax func to request data and store in _data
    */
    countlySlippingPlugin.initialize = function(query) {

        //returning promise
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/slipping",
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID,
                method: 'slipping',
                query: JSON.stringify(query),
            },
            success: function(json) {
                _data = json;
            }
        });
    };

    countlySlippingPlugin.getData = function() {
        return _data;
    };

}(window.countlySlippingPlugin = window.countlySlippingPlugin || {}, jQuery));