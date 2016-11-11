window.DensityView = countlyView.extend({
    initialize:function () {
		
    },
    activePlatform:{},
    beforeRender: function() {
        if(this.template)
			return $.when(countlyDeviceDetails.initialize(), countlyTotalUsers.initialize("densities"), countlyDensity.initialize()).then(function () {});
		else{
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/density/templates/density.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlyDeviceDetails.initialize(), countlyTotalUsers.initialize("densities"), countlyDensity.initialize()).then(function () {});
		}
    },
    pageScript:function () {
        var self = this;
        $(".density-segmentation .segmentation-option").on("click", function () {
            self.activePlatform[countlyCommon.ACTIVE_APP_ID] = $(this).data("value");
            self.refresh();
		});
        app.localize();
    },
    renderCommon:function (isRefresh) {
        var self = this;
        var platformData = countlyDeviceDetails.getPlatformData();
        platformData.chartData.sort(function(a,b) {return (a.os_ > b.os_) ? 1 : ((b.os_ > a.os_) ? -1 : 0);});

        var chartHTML = "";

        if (platformData && platformData.chartDP && platformData.chartDP.dp && platformData.chartDP.dp.length) {
            for (var i = 0; i < platformData.chartDP.dp.length; i++) {
                chartHTML += '<div class="hsb-container"><div class="label">'+ platformData.chartDP.dp[i].label +'</div><div class="chart"><svg id="hsb-platform'+ i +'"></svg></div></div>';
            }
        }
        if(!this.activePlatform[countlyCommon.ACTIVE_APP_ID])
            this.activePlatform[countlyCommon.ACTIVE_APP_ID] = (platformData.chartData[0]) ? platformData.chartData[0].os_ : "";

        this.templateData = {
            "page-title":jQuery.i18n.map["density.title"],
            "logo-class":"densities",
            "chartHTML": chartHTML,
            "chart-helper":"density.chart",
            "table-helper":"",
            "active-platform": this.activePlatform[countlyCommon.ACTIVE_APP_ID],
            "platforms": platformData.chartData
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            this.pageScript();

            countlyCommon.drawHorizontalStackedBars(platformData.chartDP.dp, "#hsb-platforms");

            if (platformData && platformData.chartDP) {
                for (var i = 0; i < platformData.chartDP.dp.length; i++) {
                    var tmpOsVersion = countlyDensity.getOSSegmentedData(platformData.chartDP.dp[i].label);

                    countlyCommon.drawHorizontalStackedBars(tmpOsVersion.chartDP.dp, "#hsb-platform"+i, i);
                }
            }

            var oSVersionData = countlyDensity.getOSSegmentedData(this.activePlatform[countlyCommon.ACTIVE_APP_ID]);

            this.dtable = $('#dataTableOne').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": oSVersionData.chartData,
                "aoColumns": [
                    { "mData": "density", "sTitle": jQuery.i18n.map["density.table.density"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"] },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] }
                ]
            }));

            $("#dataTableOne").stickyTableHeaders();
        }
    },
    refresh:function () {
        var self = this;
        $.when(this.beforeRender()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);
            var oSVersionData = countlyDensity.getOSSegmentedData(self.activePlatform[countlyCommon.ACTIVE_APP_ID]),
                platformData = countlyDeviceDetails.getPlatformData(),
                newPage = $("<div>" + self.template(self.templateData) + "</div>");

            $(self.el).find(".widget-content").replaceWith(newPage.find(".widget-content"));
            $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));

            if (platformData && platformData.chartDP) {
                for (var i = 0; i < platformData.chartDP.dp.length; i++) {
                    var tmpOsVersion = countlyDensity.getOSSegmentedData(platformData.chartDP.dp[i].label);

                    countlyCommon.drawHorizontalStackedBars(tmpOsVersion.chartDP.dp, "#hsb-platform"+i, i);
                }
            }

            CountlyHelpers.refreshTable(self.dtable, oSVersionData.chartData);

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