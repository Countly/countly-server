window.SourcesView = countlyView.extend({
    beforeRender: function() {
        this.dataMap = {};
        return $.when(countlySources.initialize(true)).then(function () {});
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
            },
            "chart-helper":"sources.chart"
        };

        if (!isRefresh) {
            var data = countlySources.getData();
            $(this.el).html(this.template(this.templateData));
            if(typeof addDrill != "undefined"){
                $(".widget-header .left .title").after(addDrill("up.src"));
            }
            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": data.chartData,
                "fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
					$(nRow).attr("id", aData.sources.replace(/\./g, '-').replace(/ /g, '_').replace(/[^\w]/g,''));
				},
                "aoColumns": [
                    { "mData": "sources", sType:"string", "sTitle": jQuery.i18n.map["sources.source"], "sClass": "break source-40" },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"], "sClass": "source-20" },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"], "sClass": "source-20" },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"], "sClass": "source-20" }
                ]
            }));

            this.dtable.stickyTableHeaders();
            this.dtable.fnSort( [ [1,'desc'] ] );
            this.dtable.addClass("source-table");
            countlyCommon.drawGraph(data.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(data.chartDPNew, "#dashboard-graph2", "pie");
            
            CountlyHelpers.expandRows(this.dtable, this.expandTable, this);
        }
    },
    refresh:function () {},
    expandTable: function( d, self ) {
		// `d` is the original data object for the row
		var str = '';
		if(d && d.sources && self.dataMap[d.sources]){
			str += '<div class="datatablesubrow">'+
				'<table cellpadding="5" cellspacing="0" border="0" class="subtable">';
                    str += '<tr>';
                    str += '<th class="source-40">' + jQuery.i18n.map["sources.source"] + '</th>';
					str += '<th class="source-20">' + jQuery.i18n.map["common.table.total-sessions"] + '</th>';
					str += '<th class="source-20">' + jQuery.i18n.map["common.table.total-users"] + '</th>';
					str += '<th class="source-20">' + jQuery.i18n.map["common.table.new-users"] + '</th>';
					str += '</tr>';
					for(var i in self.dataMap[d.sources]){
						str += '<tr>';
                            if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type == "mobile" || self.dataMap[d.sources][i].sources.indexOf("://") == -1)
                                str += '<td class="source-40">' + self.dataMap[d.sources][i].sources + '</td>';
                            else
                                str += '<td class="source-40"><a href="' + self.dataMap[d.sources][i].sources + '" target="_blank">' + self.dataMap[d.sources][i].sources + '</a></td>';
							str += '<td class="source-20">' + self.dataMap[d.sources][i].t + '</td>';
							str += '<td class="source-20">' + self.dataMap[d.sources][i].u + '</td>';
							str += '<td class="source-20">' + self.dataMap[d.sources][i].n + '</td>';
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

window.KeywordsView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlySources.initializeKeywords()).then(function () {});
    },
    renderCommon:function (isRefresh) {
        this.templateData = {
            "page-title":jQuery.i18n.map["keywords.title"],
            "font-logo-class":"fa-crosshairs"
        };

        if (!isRefresh) {
            var data = countlySources.getKeywords();
            $(this.el).html(this.template(this.templateData));
            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": data,
                "aoColumns": [
                    { "mData": "_id", sType:"string", "sTitle": jQuery.i18n.map["keywords.title"], "sClass": "break source-40" },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"], "sClass": "source-20" },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"], "sClass": "source-20" },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"], "sClass": "source-20" }
                ]
            }));

            this.dtable.stickyTableHeaders();
            this.dtable.fnSort( [ [1,'desc'] ] );
            $(".widget-content").hide();
            $("#dataTableOne_wrapper").css({"margin-top":"-16px"});
        }
    },
    refresh:function () {}
});

//register views
app.sourcesView = new SourcesView();
app.keywordsView = new KeywordsView();

app.route("/analytics/sources", 'sources', function () {
	this.renderWhenReady(this.sourcesView);
});

app.route("/analytics/keywords", 'keywords', function () {
	this.renderWhenReady(this.keywordsView);
});

$( document ).ready(function() {
	var menu = '<a href="#/analytics/sources" class="item">'+
		'<div class="logo-icon fa fa-crosshairs"></div>'+
		'<div class="text" data-localize="sources.title"></div>'+
	'</a>';
	$('#web-type #analytics-submenu').append(menu);
	$('#mobile-type #analytics-submenu').append(menu);
    
    var menu = '<a href="#/analytics/keywords" class="item">'+
		'<div class="logo-icon fa fa-crosshairs"></div>'+
		'<div class="text" data-localize="keywords.title"></div>'+
	'</a>';
	$('#web-type #analytics-submenu').append(menu);
});