window.LoyaltyView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyUser.initialize()).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var loyaltyData = countlyUser.getLoyaltyData();

        this.templateData = {
            "page-title":jQuery.i18n.map["user-loyalty.title"],
            "logo-class":"loyalty",
            "chart-helper":"loyalty.chart",
            "table-helper":"loyalty.table"
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            countlyCommon.drawGraph(loyaltyData.chartDP, "#dashboard-graph", "bar");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": loyaltyData.chartData,
                "aoColumns": [
                    { "mData": "l", sType:"loyalty", "sTitle": jQuery.i18n.map["user-loyalty.table.session-count"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.number-of-users"] },
                    { "mData": "percent", "sType":"percent", "sTitle": jQuery.i18n.map["common.percent"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh:function () {
        var self = this;
        $.when(countlyUser.initialize()).then(function () {
            if (app.activeView != self) {
                return false;
            }

            var loyaltyData = countlyUser.getLoyaltyData();
            countlyCommon.drawGraph(loyaltyData.chartDP, "#dashboard-graph", "bar");
            CountlyHelpers.refreshTable(self.dtable, loyaltyData.chartData);
        });
    }
});

window.FrequencyView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyUser.initialize()).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var frequencyData = countlyUser.getFrequencyData();

        this.templateData = {
            "page-title":jQuery.i18n.map["session-frequency.title"],
            "logo-class":"frequency",
            "chart-helper":"frequency.chart",
            "table-helper":"frequency.table"
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            countlyCommon.drawGraph(frequencyData.chartDP, "#dashboard-graph", "bar");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": frequencyData.chartData,
                "aoColumns": [
                    { "mData": "f", sType:"frequency", "sTitle": jQuery.i18n.map["session-frequency.table.time-after"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.number-of-users"] },
                    { "mData": "percent", "sType":"percent", "sTitle": jQuery.i18n.map["common.percent"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh:function () {
        var self = this;
        $.when(countlyUser.initialize()).then(function () {
            if (app.activeView != self) {
                return false;
            }

            var frequencyData = countlyUser.getFrequencyData();
            countlyCommon.drawGraph(frequencyData.chartDP, "#dashboard-graph", "bar");
            CountlyHelpers.refreshTable(self.dtable, frequencyData.chartData);
        });
    }
});

window.DurationView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyUser.initialize()).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var durationData = countlySession.getDurationData();

        this.templateData = {
            "page-title":jQuery.i18n.map["session-duration.title"],
            "logo-class":"durations",
            "chart-helper":"durations.chart",
            "table-helper":"durations.table"
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            countlyCommon.drawGraph(durationData.chartDP, "#dashboard-graph", "bar");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": durationData.chartData,
                "aoColumns": [
                    { "mData": "ds", sType:"session-duration", "sTitle": jQuery.i18n.map["session-duration.table.duration"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.number-of-users"] },
                    { "mData": "percent", "sType":"percent", "sTitle": jQuery.i18n.map["common.percent"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh:function () {
        var self = this;
        $.when(countlyUser.initialize()).then(function () {
            if (app.activeView != self) {
                return false;
            }

            var durationData = countlySession.getDurationData();
            countlyCommon.drawGraph(durationData.chartDP, "#dashboard-graph", "bar");
            CountlyHelpers.refreshTable(self.dtable, durationData.chartData);
        });
    }
});

//register views
app.loyaltyView = new LoyaltyView();
app.frequencyView = new FrequencyView();
app.durationsView = new DurationView();

app.route("/analytics/loyalty","loyalty", function () {
    if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type == "mobile"){
        this.renderWhenReady(this.loyaltyView);
    }
    else{
        app.navigate("/", true);
    }
});
app.route("/analytics/frequency","frequency", function () {
    if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type == "mobile"){
        this.renderWhenReady(this.frequencyView);
    }
    else{
        app.navigate("/", true);
    }
});
app.route("/analytics/durations","durations", function () {
    if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type == "mobile"){
        this.renderWhenReady(this.durationsView);
    }
    else{
        app.navigate("/", true);
    }
});
$( document ).ready(function() {
	var menu = '<a class="item analytics" id="engagement-menu">' +
                '<div class="logo fa fa-magnet" style="background-image:none; font-size:28px; text-align:center; width:35px; margin-left:14px; line-height:42px;"></div>' +
                '<div class="text" data-localize="sidebar.engagement"></div>' +
            '</a>' +
            '<div class="sidebar-submenu" id="engagement-submenu">' +
                '<a href="#/analytics/loyalty" class="item">' +
                    '<div class="logo loyalty"></div>' +
                    '<div class="text" data-localize="sidebar.analytics.user-loyalty"></div>' +
                '</a>' +
                '<a href="#/analytics/frequency" class="item">' +
                    '<div class="logo frequency"></div>' +
                    '<div class="text" data-localize="sidebar.analytics.session-frequency"></div>' +
                '</a>' +
                '<a href="#/analytics/durations" class="item">' +
                    '<div class="logo durations"></div>' +
                    '<div class="text" data-localize="sidebar.engagement.durations"></div>' +
                '</a>' +
            '</div>';
	if($('#analytics-submenu').length)
		$('#analytics-submenu').after(menu);
	else
		$('#sidebar-menu a:nth-child(3)').append(menu);
    
    //listen for UI app change
    app.addAppSwitchCallback(function(appId){
        if(countlyGlobal["apps"][appId].type == "mobile"){
            $("#engagement-menu").show();
        }
        else{
            $("#engagement-menu").hide();
            $("#engagement-submenu").hide();
        }
    });
});