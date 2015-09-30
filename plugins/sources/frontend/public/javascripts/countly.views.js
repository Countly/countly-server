window.SourcesView = countlyView.extend({
    beforeRender: function() {
        this.dataMap = {};
        return $.when(countlySources.initialize()).then(function () {});
    },
    renderCommon:function (isRefresh) {
        this.updateDataMap();
        this.templateData = {
            "page-title":jQuery.i18n.map["sources.title"],
            "font-logo-class":"fa-crosshairs",
            "graph-type-double-pie":true,
            "pie-titles":{
                "left":jQuery.i18n.map["common.total-users"],
                "right":jQuery.i18n.map["common.new-users"]
            }
        };

        if (!isRefresh) {
            var data = countlySources.getData();
            $(this.el).html(this.template(this.templateData));
            if(typeof addDrill != "undefined"){
                addDrill("up.src");
            }
            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": data.chartData,
                "fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
					$(nRow).attr("id", aData.sources.replace(/\./g, '-').replace(/ /g, '_').replace(/[^\w]/g,''));
				},
                "aoColumns": [
                    { "mData": "sources", sType:"string", "sTitle": jQuery.i18n.map["sources.source"], "sClass": "break" },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"] },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] }
                ]
            }));

            this.dtable.stickyTableHeaders();
            this.dtable.fnSort( [ [1,'desc'] ] );
            countlyCommon.drawGraph(data.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(data.chartDPNew, "#dashboard-graph2", "pie");
            
            CountlyHelpers.expandRows(this.dtable, this.expandTable, this);
        }
    },
    refresh:function () {
        var self = this;
        $.when(countlySources.refresh()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);

            newPage = $("<div>" + self.template(self.templateData) + "</div>");
        
            $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));

            var data = countlySources.getData();

            countlyCommon.drawGraph(data.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(data.chartDPNew, "#dashboard-graph2", "pie");
			CountlyHelpers.refreshTable(self.dtable, data.chartData);
            CountlyHelpers.reopenRows(self.dtable, self.expandTable, self);
        });
    },
    expandTable: function( d, self ) {
		// `d` is the original data object for the row
		var str = '';
		if(d && d.sources && self.dataMap[d.sources]){
			str += '<div class="datatablesubrow">'+
				'<table cellpadding="5" cellspacing="0" border="0" class="subtable">';
					for(var i in self.dataMap[d.sources]){
						str += '<tr>';
                            if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type == "mobile" || self.dataMap[d.sources][i].sources.indexOf("://") == -1)
                                str += '<td>' + self.dataMap[d.sources][i].sources + '</td>';
                            else
                                str += '<td><a href="' + self.dataMap[d.sources][i].sources + '" target="_blank">' + self.dataMap[d.sources][i].sources + '</a></td>';
							str += '<td>' + self.dataMap[d.sources][i].t + '</td>';
							str += '<td>' + self.dataMap[d.sources][i].u + '</td>';
							str += '<td>' + self.dataMap[d.sources][i].n + '</td>';
						str += '</tr>';
					}
				str += '</table>'+
			'</div>';
		}
		return str;
	},
    updateDataMap: function(){
        var cleanData = countlySources.getData(true).chartData;
        var source;
        for(var i in cleanData){
            source = countlySources.getSourceName(cleanData[i].sources);
            if(!this.dataMap[source])
                this.dataMap[source] = {};
            this.dataMap[source][cleanData[i].sources] = cleanData[i];
        }
    }
});

//register views
app.sourcesView = new SourcesView();

app.route("/analytics/sources", 'sources', function () {
	this.renderWhenReady(this.sourcesView);
});

$( document ).ready(function() {
	var menu = '<a href="#/analytics/sources" class="item">'+
		'<div class="logo-icon fa fa-crosshairs"></div>'+
		'<div class="text" data-localize="sources.title"></div>'+
	'</a>';
	$('#web-type #analytics-submenu').append(menu);
	$('#mobile-type #analytics-submenu').append(menu);
});