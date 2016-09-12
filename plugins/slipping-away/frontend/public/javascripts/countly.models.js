(function (countlySlippingPlugin, $) {

  //we will store our data here
  var _data = {};

  //Initializing model
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