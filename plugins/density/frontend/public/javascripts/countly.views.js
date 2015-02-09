window.DensityView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyDensity.initialize()).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var densityData = countlyDensity.getData();

        this.templateData = {
            "page-title":jQuery.i18n.map["density.title"],
            "logo-class":"densities",
            "graph-type-double-pie":true,
            "pie-titles":{
                "left":jQuery.i18n.map["common.total-users"],
                "right":jQuery.i18n.map["common.new-users"]
            },
            "chart-helper":"resolutions.chart"
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": densityData.chartData,
                "aoColumns": [
                    { "mData": "density", sType:"session-duration", "sTitle": jQuery.i18n.map["density.table.density"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"] },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
            countlyCommon.drawGraph(densityData.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(densityData.chartDPNew, "#dashboard-graph2", "pie");
        }
    },
    refresh:function () {
        var self = this;
        $.when(countlyDensity.refresh()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);

            newPage = $("<div>" + self.template(self.templateData) + "</div>");
        
            $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));

            var densityData = countlyDensity.getData();

            countlyCommon.drawGraph(densityData.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(densityData.chartDPNew, "#dashboard-graph2", "pie");
			CountlyHelpers.refreshTable(self.dtable, densityData.chartData);
        });
    }
});

//register views
app.densityView = new DensityView();

app.route("/analytics/density", 'desity', function () {
	this.renderWhenReady(this.densityView);
});

$( document ).ready(function() {
	var menu = '<a href="#/analytics/density" class="item">'+
		'<div class="logo densities"></div>'+
		'<div class="text" data-localize="sidebar.analytics.densities"></div>'+
	'</a>';
	$('#analytics-submenu').append(menu);
});