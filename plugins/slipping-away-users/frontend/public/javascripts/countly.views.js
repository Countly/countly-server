/*global 
    countlyGlobal,
    countlyView,
    countlyCommon,
    jQuery,
    app,
    countlySlippingPlugin,
    slippingView,
    $,
 */
window.slippingView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlySlippingPlugin.initialize()).then(function() {});
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

    renderCommon: function(isRefresh) {
        var slippingData = countlySlippingPlugin.getData();
        var slippingChartData = {
            "chartDP": {
                "dp": [{
                    "data": [
                        [-1, null]
                    ]
                }],
                "ticks": [
                    [-1, ""]
                ]
            }
        };

        window.slippingDataOnClick = function(timeStamp) {
            var data = {
                "lac": {"$lt": timeStamp}
            };
            window.location.hash = '/users/query/' + JSON.stringify(data);
        };

        for (var i = 0; i < slippingData.length; i++) {
            var item = slippingData[i],
                index = i;

            slippingChartData.chartDP.dp[0].data.push([index, item.count]);
            slippingChartData.chartDP.ticks.push([index, item.period + ' days']);
            item.percentage = "<div style='width:90%;  box-sizing:border-box;'><div class='percent-bar' style='width:" + (item.percentage) + "%;'></div><span style='margin-right:-70px;'>" + item.percentage + "%</span></div>";
            if (countlyGlobal.plugins.indexOf("users") >= 0) {
                if (item.count > 0) {
                    item.userList = "<a class='extable-link table-link green'  href='#/users/query/" + JSON.stringify({"lac": {"$lt": item.timeStamp * 1000}}) + "'   target='_blank'>" +
                "<i class='material-icons'>open_in_new</i></a>" +
                '<a class="table-link green external"   data-localize="userdata.list" onclick="slippingDataOnClick(' + item.timeStamp + ')">View User List</a> ' ;
                }
                else {
                    item.userList = '<span style="float: right;float: right;margin-right: 23px;">' + jQuery.i18n.map['slipping.no-user'] + '</span>';
                }
            }
        }

        slippingChartData.chartDP.dp[0].data.push([slippingData.length, null]);

        this.templateData = {
            "page-title": jQuery.i18n.map["slipping.title"],
            "graph-description": jQuery.i18n.map["slipping.graph-description"],
            "font-logo-class": "fa-sign-out",
            "chart-helper": "durations.chart",
            "table-helper": "durations.table"
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            countlyCommon.drawGraph(slippingChartData.chartDP, "#dashboard-graph", "bar");

            var columnsDefine = [
                { "mData": "period", sType: "numeric", "sTitle": jQuery.i18n.map["slipping.period"], "sWidth": "20%" },
                {
                    "mData": "count",
                    "sType": "numeric",
                    "sWidth": "20%",
                    "sTitle": jQuery.i18n.map["slipping.count"],
                    "mRender": function(d) {
                        return countlyCommon.formatNumber(d);
                    }
                },
                { "mData": "percentage", sType: "string", "sTitle": jQuery.i18n.map["slipping.percentage"] },
            ];

            if (countlyGlobal.plugins.indexOf("users") >= 0) {
                columnsDefine.push(
                    { "mData": "userList", sType: "string", "bSortable": false, "sTitle": '' }
                );
            }

            this.dtable = $('#dataTableOne').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": slippingData,
                "aoColumns": columnsDefine
            }));

            $("#date-selector").hide();
            $(".dataTables_length").remove();
        }
    }
});

//register views
app.slippingView = new slippingView();

app.route("/analytics/slipping-away", 'browser', function() {
    this.renderWhenReady(this.slippingView);
});

$(document).ready(function() {
    app.addSubMenu("users", {code: "slipping-away", url: "#/analytics/slipping-away", text: "slipping.title", priority: 30});
    if (app.configurationsView) {
        app.configurationsView.registerLabel("slipping-away-users", "slipping.config-title");
        app.configurationsView.registerLabel("slipping-away-users.p1", "slipping.config-first");
        app.configurationsView.registerLabel("slipping-away-users.p2", "slipping.config-second");
        app.configurationsView.registerLabel("slipping-away-users.p3", "slipping.config-third");
        app.configurationsView.registerLabel("slipping-away-users.p4", "slipping.config-fourth");
        app.configurationsView.registerLabel("slipping-away-users.p5", "slipping.config-fifth");
    }
});