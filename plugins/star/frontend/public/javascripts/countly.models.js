(function (starRatingPlugin, $) {

  var _pv = {};
  var _rating = {};
  var _period = {};
  /**
   * This is for  platform  and version info request
   * @namespace starRatingPlugin
   * @method requestPlatformVersion
   * @param {}
   * @return {func} ajax func to request data and store in _pv
   */
  starRatingPlugin.requestPlatformVersion = function () {
    var period = countlyCommon.getPeriod();
    var periodString = typeof period  === "object" ?  "[" + period.toString() + "]" : period;
    //returning promise
    return $.ajax({
      type:"GET",
      url:countlyCommon.API_URL + "/o",
      data:{
        api_key:countlyGlobal['member'].api_key,
        app_id:countlyCommon.ACTIVE_APP_ID,
        method: 'star',
        period: periodString,
      },
      success:function (json) {
        _pv = json;
      }
    });
  };

  /**
   * This is for fetching star rating data in a period
   * @namespace starRatingPlugin
   * @method requestRatingInPeriod
   * @param {}
   * @return {func} ajax func to request data and store in _rating
   */
  starRatingPlugin.requestRatingInPeriod = function () {
    var period = countlyCommon.getPeriod();
    var periodString = typeof period  === "object" ?  "[" + period.toString() + "]" : period;
    console.log("period:", periodString);
    //returning promise
    return $.ajax({
      type:"GET",
      url:countlyCommon.API_URL + "/o",
      data:{
        api_key:countlyGlobal['member'].api_key,
        app_id:countlyCommon.ACTIVE_APP_ID,
        method: 'events',
        period: periodString,
        event: '[CLY]_star_rating',
        segmentation: 'platform_version_rate',
      },
      success:function (json) {
        _rating = json;
      }
    });
  };

  /**
   * This is for fetching period object from server side when selected period is 'month' in frontend
   * @namespace starRatingPlugin
   * @method requesPeriod
   * @param {}
   * @return {func} ajax func to request data and store in _period
   */
  starRatingPlugin.requesPeriod = function(){
    var period = countlyCommon.getPeriod();
    var periodString = typeof period  === "object" ?  "[" + period.toString() + "]" : period;
    console.log("period:", periodString);
    //returning promise
    return $.ajax({
      type:"GET",
      url:countlyCommon.API_URL + "/o",
      data:{
        api_key:countlyGlobal['member'].api_key,
        app_id:countlyCommon.ACTIVE_APP_ID,
        method: 'get_period_obj',
        period: periodString,
      },
      success:function (json) {
        _period = json;
      }
    });
  }

  starRatingPlugin.getPlatformVersion = function () {
    return _pv;
  };

  starRatingPlugin.getRatingInPeriod = function(){
    return _rating;
  };
  starRatingPlugin.getPeriod = function(){
    return _period;
  }

}(window.starRatingPlugin = window.starRatingPlugin || {}, jQuery));