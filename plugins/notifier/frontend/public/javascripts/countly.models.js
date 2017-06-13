(function (countlyNotifierPlugin, $) {
  var _data = {};
  /**
   * This is for initializing model
   * @namespace countlySlippingPlugin
   * @method initialize
   * @param {}
   * @return {func} ajax func to request data and store in _data
   */
  countlyNotifierPlugin.initialize = function () {

    //returning promise
    return $.ajax({
      type:"GET",
      url:countlyCommon.API_URL + "/i/daily/non_returning",
      data:{
        api_key:countlyGlobal['member'].api_key,
        app_id:countlyCommon.ACTIVE_APP_ID,
        method: 'non_returning'
      },
      success:function (json) {
        _data = json;
      }
    });
  };


  countlyNotifierPlugin.getData = function () {
    return _data;
  };

}(window.countlyNotifierPlugin = window.countlyNotifierPlugin || {}, jQuery));