window.slippingView = countlyView.extend({
  beforeRender: function() {
    return $.when( countlySlippingPlugin.initialize()).then(function () {});
  },
  /**
   * This is for rendering chart and table.
   * especially, in the table, if server contains "users" plugin,
   * will show a column enable to show users list by clicking the button.
   * @namespace countlySlippingPlugin
   * @method initialize
   * @param {}
   * @return {func} ajax func to request data and store in _data
   */

  renderCommon:function (isRefresh) {
    var durationData = countlySession.getDurationData();
    var slippingData =countlySlippingPlugin.getData();
    var slippingChartData = {
      "chartDP": {
        "dp": [{
          "data": [
            [-1, null],
          ]
        }],
        "ticks": [
          [-1, ""],
        ]
      }
    }

    window.slippingDataOnClick = function(timeStamp) {
      const data = {
        "api_key":countlyGlobal.member.api_key,
        "app_id":countlyCommon.ACTIVE_APP_ID,
        "event": "[CLY]_session",
        "method":"segmentation_users",
        "queryObject":JSON.stringify({"up.ls":{"$lt":timeStamp}}),
        "period": [946684800000,timeStamp*1000],
        "bucket": "daily",
        "projectionKey":""
      };
      window.location.hash = `/users/request/${JSON.stringify(data)}`;
    }

    slippingData.forEach((item,index)=>{
      slippingChartData.chartDP.dp[0].data.push([index, item.count]);
      slippingChartData.chartDP.ticks.push([index,  `${item.period} days`]);
      item.percentage = "<div class='percent-bar' style='width:" + (2 * item.percentage) + "px;'></div>" + item.percentage + "%";
      if(countlyGlobal.plugins.indexOf("users") >= 0) {
        if(item.count > 0){
          item.userList = `<a class="icon-button green btn-header btn-user-list" data-localize="userdata.list" onclick="slippingDataOnClick(${item.timeStamp})" style="float:left;">User List</a> `;
        }else{
          item.userList = `No users`;
        }
      }
    });

    slippingChartData.chartDP.dp[0].data.push([slippingData.length,null]);

    this.templateData = {
      "page-title": jQuery.i18n.map["slipping.title"],
      "graph-description": jQuery.i18n.map["slipping.graph-description"],
      "font-logo-class":"fa-sign-out",
      "chart-helper": "durations.chart",
      "table-helper": "durations.table"
    };
    if (!isRefresh) {
      $(this.el).html(this.template(this.templateData));
      countlyCommon.drawGraph(slippingChartData.chartDP, "#dashboard-graph", "bar");

      var columnsDefine = [
        { "mData": "period", sType:"numeric", "sTitle": jQuery.i18n.map["slipping.period"] },
        { "mData": "count", sType:"numeric", "sTitle": jQuery.i18n.map["slipping.count"] },
        { "mData": "percentage", sType:"string",  "sTitle": jQuery.i18n.map["slipping.percentage"] },
      ];

      if(countlyGlobal.plugins.indexOf("users") >= 0) {
        columnsDefine.push(
          { "mData": "userList", sType:"string",  "sTitle": jQuery.i18n.map["slipping.userList"] }
        );
      }

      this.dtable = $('#dataTableOne').dataTable($.extend({}, $.fn.dataTable.defaults, {
        "aaData": slippingData,
        "aoColumns": columnsDefine,
      }));
      $("#date-selector").hide();
      $(".dataTables_length").remove()
    }
  }
});


//register views
app.slippingView = new slippingView();

app.route("/analytics/slipping", 'browser', function () {
  this.renderWhenReady(this.slippingView);
});

$( document ).ready(function() {
  var menu = '<a href="#/analytics/slipping" class="item">'+
    '<div class="logo-icon fa fa-globe"></div>'+
    '<div class="text" data-localize="slipping.title"></div>'+
    '</a>';
  $('#web-type #engagement-submenu').append(menu);
  $('#mobile-type #engagement-submenu').append(menu);

});





