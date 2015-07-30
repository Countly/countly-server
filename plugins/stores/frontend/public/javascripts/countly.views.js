window.StoresView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyStores.initialize()).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var data = countlyStores.getData();
        this.templateData = {
            "page-title":jQuery.i18n.map["stores.title"],
            "font-logo-class":"fa-shopping-cart",
            "graph-type-double-pie":true,
            "pie-titles":{
                "left":jQuery.i18n.map["common.total-users"],
                "right":jQuery.i18n.map["common.new-users"]
            }
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            if(typeof addDrill != "undefined"){
                addDrill("up.str");
            }
            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": data.chartData,
                "aoColumns": [
                    { "mData": "stores", sType:"session-duration", "sTitle": jQuery.i18n.map["stores.store"] },
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
        $.when(countlyStores.refresh()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);

            newPage = $("<div>" + self.template(self.templateData) + "</div>");
        
            $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));

            var data = countlyStores.getData();

            countlyCommon.drawGraph(data.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(data.chartDPNew, "#dashboard-graph2", "pie");
			CountlyHelpers.refreshTable(self.dtable, data.chartData);
        });
    }
});

//register views
app.storesView = new StoresView();

app.route("/analytics/stores", 'stores', function () {
	this.renderWhenReady(this.storesView);
});

$( document ).ready(function() {
	var menu = '<a href="#/analytics/stores" class="item">'+
		'<div class="logo-icon fa fa-shopping-cart"></div>'+
		'<div class="text" data-localize="stores.title"></div>'+
	'</a>';
	$('#analytics-submenu').append(menu);
});