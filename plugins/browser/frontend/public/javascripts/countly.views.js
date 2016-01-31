window.BrowserView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyBrowser.initialize()).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var data = countlyBrowser.getData();

        this.templateData = {
            "page-title":jQuery.i18n.map["browser.title"],
            "font-logo-class":"fa-globe",
            "graph-type-double-pie":true,
            "pie-titles":{
                "left":jQuery.i18n.map["common.total-users"],
                "right":jQuery.i18n.map["common.new-users"]
            },
            "chart-helper":"browser.chart"
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            if(typeof addDrill != "undefined"){
                addDrill("up.brw");
            }

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": data.chartData,
                "aoColumns": [
                    { "mData": "browser", sType:"session-duration", "sTitle": jQuery.i18n.map["browser.table.browser"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"] },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
            countlyCommon.drawGraph(data.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(data.chartDPNew, "#dashboard-graph2", "pie");
        }
    },
    refresh:function () {
        var self = this;
        $.when(countlyBrowser.refresh()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);

            newPage = $("<div>" + self.template(self.templateData) + "</div>");
        
            $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));

            var data = countlyBrowser.getData();

            countlyCommon.drawGraph(data.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(data.chartDPNew, "#dashboard-graph2", "pie");
			CountlyHelpers.refreshTable(self.dtable, data.chartData);
        });
    }
});

//register views
app.browserView = new BrowserView();

app.route("/analytics/browser", 'browser', function () {
	this.renderWhenReady(this.browserView);
});

$( document ).ready(function() {
	var menu = '<a href="#/analytics/browser" class="item">'+
		'<div class="logo-icon fa fa-globe"></div>'+
		'<div class="text" data-localize="browser.title"></div>'+
	'</a>';
	$('#web-type #analytics-submenu').append(menu);
});