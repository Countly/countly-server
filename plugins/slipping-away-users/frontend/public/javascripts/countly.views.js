/*global 
    countlyGlobal,
    countlyView,
    countlyCommon,
    jQuery,
    app,
    countlySlippingPlugin,
    slippingView,
    extendViewWithFilter,
    CountlyHelpers
    $,
 */
window.slippingView = countlyView.extend({
    beforeRender: function() {
        var query = this._query || {}
        return $.when(countlySlippingPlugin.initialize(query)).then(function() {});
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
            "font-logo-class": "fa-sign-out",
            "chart-helper": "durations.chart",
            "table-helper": "durations.table",
            "drill-filter": countlyGlobal.plugins.indexOf('drill') >= 0,
        };
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            countlyCommon.drawGraph(slippingChartData.chartDP, "#dashboard-graph", "bar");
            $(" <div class='graph-description'>" + jQuery.i18n.map["slipping.graph-description"] + "</div>").insertAfter("#view-filter");

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

            this.byDisabled = true;
            if (typeof extendViewWithFilter === "function") {
                extendViewWithFilter(this);
                this.initDrill();
                var self = this;
                setTimeout(function() {
                    self.filterBlockClone = $("#filter-view").clone(true);
                    if (self._query) {
                        if ($(".filter-view-container").is(":visible")) {
                            $("#filter-view").hide();
                            $(".filter-view-container").hide();
                        }
                        else {
                            $("#filter-view").show();
                            $(".filter-view-container").show();
                            self.adjustFilters();
                        }

                        $(".flot-text").hide().show(0);
                        var filter = self._query;
                        var inputs = [];
                        var subs = {};
                        for (var i in filter) {
                            inputs.push(i);
                            subs[i] = [];
                            for (var j in filter[i]) {
                                if (filter[i][j].length) {
                                    for (var k = 0; k < filter[i][j].length; k++) {
                                        subs[i].push([j, filter[i][j][k]]);
                                    }
                                }
                                else {
                                    subs[i].push([j, filter[i][j]]);
                                }
                            }
                        }
                        self.setInput(inputs, subs, 0, 0, 1);
                    }
                }, 500);
            }
        }
        else {
            countlyCommon.drawGraph(slippingChartData.chartDP, "#dashboard-graph", "bar", { legend: { show: false }});
            CountlyHelpers.refreshTable(this.dtable, slippingData);
        }
    },
    setInput: function(inputs, subs, cur, sub, total) {
        var self = this;
        sub = sub || 0;
        if (inputs[cur]) {
            var filterType = subs[inputs[cur]][sub][0];

            if (filterType === "$in") {
                filterType = "=";
            }
            else if (filterType === "$nin") {
                filterType = "!=";
            }
            var val = subs[inputs[cur]][sub][1];
            var el = $(".query:nth-child(" + (total) + ")");
            $(el).data("query_value", val + ""); //saves value as attribute for selected query
            el.find(".filter-name").trigger("click");
            el.find(".filter-type").trigger("click");


            if (inputs[cur].indexOf("chr.") === 0) {
                el.find(".filter-name").find(".select-items .item[data-value='chr']").trigger("click");
                if (val === "t") {
                    el.find(".filter-type").find(".select-items .item[data-value='=']").trigger("click");
                }
                else {
                    el.find(".filter-type").find(".select-items .item[data-value='!=']").trigger("click");
                }
                val = inputs[cur].split(".")[1];
                subs[inputs[cur]] = ["true"];
            }
            else if (inputs[cur] === "did" || inputs[cur] === "chr" || inputs[cur].indexOf(".") > -1) {
                el.find(".filter-name").find(".select-items .item[data-value='" + inputs[cur] + "']").trigger("click");
            }
            else {
                el.find(".filter-name").find(".select-items .item[data-value='up." + inputs[cur] + "']").trigger("click");
            }

            el.find(".filter-type").find(".select-items .item[data-value='" + filterType + "']").trigger("click");
            setTimeout(function() {
                el.find(".filter-value").not(".hidden").trigger("click");
                if (el.find(".filter-value").not(".hidden").find(".select-items .item[data-value='" + val + "']").length) {
                    el.find(".filter-value").not(".hidden").find(".select-items .item[data-value='" + val + "']").trigger("click");
                }
                else if (_.isNumber(val) && (val + "").length === 10) {
                    el.find(".filter-value.date").find("input").val(countlyCommon.formatDate(moment(val * 1000), "DD MMMM, YYYY"));
                    el.find(".filter-value.date").find("input").data("timestamp", val);
                }
                else {
                    el.find(".filter-value").not(".hidden").find("input").val(val);
                }

                if (subs[inputs[cur]].length === sub + 1) {
                    cur++;
                    sub = 0;
                }
                else {
                    sub++;
                }
                total++;
                if (inputs[cur]) {
                    $("#filter-add-container").trigger("click");
                    if (sub > 0) {
                        setTimeout(function() {
                            var elChild = $(".query:nth-child(" + (total) + ")");
                            elChild.find(".and-or").find(".select-items .item[data-value='OR']").trigger("click");
                            self.setInput(inputs, subs, cur, sub, total);
                        }, 500);
                    }
                    else {
                        self.setInput(inputs, subs, cur, sub, total);
                    }
                }
                else {
                    setTimeout(function() {
                        $("#apply-filter").removeClass("disabled");
                        $("#no-filter").hide();
                        var filterData = self.getFilterObjAndByVal();
                        $("#current-filter").show().find(".text").text(filterData.bookmarkText);
                        $("#connector-container").show();
                    }, 500);
                }
            }, 500);
        }
    },
    loadAndRefresh: function() {
        var filter = {};
        for (var i in this.filterObj) {
            filter[i.replace("up.", "")] = this.filterObj[i];
        }
        this._query = filter;
        app.navigate("/analytics/slipping-away/" + JSON.stringify(filter), false);
        this.refresh();
    },
    refresh: function() {
        var self = this;
        $.when(countlySlippingPlugin.initialize(self._query)).then(function() {
            if (app.activeView !== self) {
                return false;
            }
            self.renderCommon(true);
        });
    },
});

//register views
app.slippingView = new slippingView();

app.route("/analytics/slipping-away", 'slipping-away', function() {
    this.slippingView._query = undefined;
    this.renderWhenReady(this.slippingView);
});
app.route("/analytics/slipping-away/*query", "slipping-away", function(query) {
    this.slippingView._query = query && CountlyHelpers.isJSON(query) ? JSON.parse(query) : undefined;
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