window.DensityView = countlyView.extend({
    activePlatform:null,
    beforeRender: function() {
        return $.when(countlyDeviceDetails.initialize(), countlyTotalUsers.initialize("densities"), countlyDensity.initialize()).then(function () {});
    },
    pageScript:function () {
        var self = this;

        app.localize();
    },
    renderCommon:function (isRefresh) {
        var self = this;
        var platformData = countlyDeviceDetails.getPlatformData();

        var chartHTML = "";

        if (platformData && platformData.chartDP && platformData.chartDP.dp && platformData.chartDP.dp.length) {
            chartHTML += '<div class="hsb-container top"><div class="label">Platforms</div><div class="chart"><svg id="hsb-platforms"></svg></div></div>';

            for (var i = 0; i < platformData.chartDP.dp.length; i++) {
                chartHTML += '<div class="hsb-container"><div class="label">'+ platformData.chartDP.dp[i].label +'</div><div class="chart"><svg id="hsb-platform'+ i +'"></svg></div></div>';
            }
        }

        this.templateData = {
            "page-title":jQuery.i18n.map["density.title"],
            "logo-class":"densities",
            "chartHTML": chartHTML,
            "chart-helper":"density.chart",
            "table-helper":"",
            "two-tables": true
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            this.pageScript();

            this.dtable = $('#dataTableOne').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": platformData.chartData,
                "fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
                    $(nRow).data("name", aData.origos_);
                    $(nRow).addClass("os-rows");
                    if (self.activePlatform && self.activePlatform == aData.origos_) {
                        $(nRow).addClass("active");
                    }
                    else if(!self.activePlatform){
                        self.activePlatform = aData.origos_;
                        $(nRow).addClass("active");
                    }
                },
                "aoColumns": [
                    { "mData": "os_", "sTitle": jQuery.i18n.map["platforms.table.platform"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"] },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] }
                ]
            }));

            $('#dataTableOne tbody').on("click", "tr", function (){
                self.activePlatform = $(this).data("name");
                $(".os-rows").removeClass("active");
                $(this).addClass("active");

                self.refresh();
            });

            countlyCommon.drawHorizontalStackedBars(platformData.chartDP.dp, "#hsb-platforms");

            if (platformData && platformData.chartDP) {
                for (var i = 0; i < platformData.chartDP.dp.length; i++) {
                    var tmpOsVersion = countlyDensity.getOSSegmentedData(platformData.chartDP.dp[i].label);

                    countlyCommon.drawHorizontalStackedBars(tmpOsVersion.chartDP.dp, "#hsb-platform"+i, i);
                }
            }

            var oSVersionData = countlyDensity.getOSSegmentedData(this.activePlatform);

            this.dtableTwo = $('#dataTableTwo').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": oSVersionData.chartData,
                "aoColumns": [
                    { "mData": "density", "sTitle": jQuery.i18n.map["density.table.density"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"] },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] }
                ]
            }));

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

            var oSVersionData = countlyDensity.getOSSegmentedData(self.activePlatform),
                platformData = countlyDeviceDetails.getPlatformData(),
                newPage = $("<div>" + self.template(self.templateData) + "</div>");

            $(self.el).find(".widget-content").replaceWith(newPage.find(".widget-content"));
            $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));

            countlyCommon.drawHorizontalStackedBars(platformData.chartDP.dp, "#hsb-platforms");

            if (platformData && platformData.chartDP) {
                for (var i = 0; i < platformData.chartDP.dp.length; i++) {
                    var tmpOsVersion = countlyDensity.getOSSegmentedData(platformData.chartDP.dp[i].label);

                    countlyCommon.drawHorizontalStackedBars(tmpOsVersion.chartDP.dp, "#hsb-platform"+i, i);
                }
            }

            CountlyHelpers.refreshTable(self.dtable, platformData.chartData);
            CountlyHelpers.refreshTable(self.dtableTwo, oSVersionData.chartData);

            self.pageScript();
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
	$('#mobile-type #analytics-submenu').append(menu);
	$('#web-type #analytics-submenu').append(menu);
});