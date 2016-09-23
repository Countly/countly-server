(function (countlySlippingPlugin, $) {
  var _data = {};
  /**
   * This is for initializing model
   * @namespace countlySlippingPlugin
   * @method initialize
   * @param {}
   * @return {func} ajax func to request data and store in _data
   */
  countlySlippingPlugin.initialize = function () {

    //returning promise
    return $.ajax({
      type:"GET",
      url:countlyCommon.API_URL + "/o/slipping",
      data:{
        api_key:countlyGlobal['member'].api_key,
        app_id:countlyCommon.ACTIVE_APP_ID,
        method: 'slipping'
      },
      success:function (json) {
        _data = json;
      }
    });
  };


  countlySlippingPlugin.getData = function () {
    return _data;
  };

}(window.countlySlippingPlugin = window.countlySlippingPlugin || {}, jQuery));