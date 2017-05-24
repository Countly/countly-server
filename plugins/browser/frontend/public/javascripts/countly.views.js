window.BrowserView = countlyView.extend({
    activeSegment:{},
    beforeRender: function() {
        return $.when(countlyBrowser.initialize(), countlyTotalUsers.initialize("browsers")).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var self = this;
        var data = countlyBrowser.getBrowserData();
        
        var chartHTML = "";
        var versionData = {};
        if (data && data.chartDP && data.chartDP.dp && data.chartDP.dp.length) {
            chartHTML += '<div class="hsb-container top"><div class="label">Platforms</div><div class="chart"><svg id="hsb-platforms"></svg></div></div>';

            for (var i = 0; i < data.chartDP.dp.length; i++) {
                var tmpVersion = countlyBrowser.getSegmentedData(data.chartDP.dp[i].label);
                    if(tmpVersion.chartData.length){
                        versionData[data.chartDP.dp[i].label] = tmpVersion;
                        chartHTML += '<div class="hsb-container"><div class="label">'+ data.chartDP.dp[i].label +'</div><div class="chart"><svg id="hsb-platform'+ i +'"></svg></div></div>';
                    }
            }
        }
        
        if(!this.activeSegment[countlyCommon.ACTIVE_APP_ID])
            this.activeSegment[countlyCommon.ACTIVE_APP_ID] = (data.chartData[0]) ? data.chartData[0].browser : "";
        
        var segments = [];
        for(var i = 0; i < data.chartData.length; i++){
            segments.push({name:data.chartData[i].browser, value:data.chartData[i].browser.toLowerCase()})
        }

        this.templateData = {
            "page-title":jQuery.i18n.map["browser.title"],
            "segment-title":jQuery.i18n.map["browser.table.browser-version"],
            "font-logo-class":"fa-globe",
            "chartHTML": chartHTML,
            "isChartEmpty": (chartHTML)? false : true,
            "chart-helper":"browser.chart",
            "table-helper":"",
            "two-tables": true,
            "active-segment": this.activeSegment[countlyCommon.ACTIVE_APP_ID],
            "segmentation": segments
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            if(typeof addDrill != "undefined"){
                $("#content .widget:first .widget-header .left .title").after(addDrill("up.brw"));
            }

            this.dtable = $('#dataTableOne').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": data.chartData,
                "aoColumns": [
                    { "mData": "browser", sType:"session-duration", "sTitle": jQuery.i18n.map["browser.table.browser"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"] },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] }
                ]
            }));
            this.dtable.fnSort( [ [1,'desc'] ] );
            $("#dataTableOne").stickyTableHeaders();
            
            $(".segmentation-widget .segmentation-option").on("click", function () {
                self.activeSegment[countlyCommon.ACTIVE_APP_ID] = $(this).data("value");
                self.refresh();
            });
            
            countlyCommon.drawHorizontalStackedBars(data.chartDP.dp, "#hsb-platforms");
            
            if (data && data.chartDP) {
                for (var i = 0; i < data.chartDP.dp.length; i++) {
                    if(versionData[data.chartDP.dp[i].label])
                        countlyCommon.drawHorizontalStackedBars(versionData[data.chartDP.dp[i].label].chartDP.dp, "#hsb-platform"+i, i);
                }
            }
            
            this.dtableTwo = $('#dataTableTwo').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": countlyBrowser.getBrowserVersionData(self.activeSegment[countlyCommon.ACTIVE_APP_ID]),
                "aoColumns": [
                    { "mData": "browser_version", "sTitle": jQuery.i18n.map["platforms.table.platform-version"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"] },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] }
                ]
            }));
            this.dtableTwo.fnSort( [ [1,'desc'] ] );
            $("#dataTableTwo").stickyTableHeaders();
        }
    },
    refresh:function () {
        var self = this;
        $.when(this.beforeRender()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);
            var data = countlyBrowser.getBrowserData();

            newPage = $("<div>" + self.template(self.templateData) + "</div>");
        
            $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));
            
            countlyCommon.drawHorizontalStackedBars(data.chartDP.dp, "#hsb-platforms");
            
            if (data && data.chartDP) {
                for (var i = 0; i < data.chartDP.dp.length; i++) {
                    var tmpVersion = countlyBrowser.getSegmentedData(data.chartDP.dp[i].label);
                    if(tmpVersion.chartData.length)
                        countlyCommon.drawHorizontalStackedBars(tmpVersion.chartDP.dp, "#hsb-platform"+i, i);
                }
            }

            CountlyHelpers.refreshTable(self.dtable, data.chartData);
            CountlyHelpers.refreshTable(self.dtableTwo, countlyBrowser.getBrowserVersionData(self.activeSegment[countlyCommon.ACTIVE_APP_ID]));
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