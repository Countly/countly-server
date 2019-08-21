/*globals countlyAnalyticsAPI, MobileDashboardView,_,CountlyHelpers, countlyTotalUsers,Handlebars,countlyView,jQuery,$,app,countlyGlobal,countlySession,countlyCommon,countlyLocation */
window.MobileDashboardView = countlyView.extend({
    selectedView: "#draw-total-sessions",
    selectedMap: "#map-list-sessions",
    origLangs: {},
    initialize: function() {
        this.curMap = "map-list-sessions";
        this.template = Handlebars.compile($("#dashboard-template").html());
    },
    beforeRender: function() {
        this.maps = {
            "map-list-sessions": {id: 'total', label: jQuery.i18n.map["sidebar.analytics.sessions"], type: 'number', metric: "t"},
            "map-list-users": {id: 'total', label: jQuery.i18n.map["sidebar.analytics.users"], type: 'number', metric: "u"},
            "map-list-new": {id: 'total', label: jQuery.i18n.map["common.table.new-users"], type: 'number', metric: "n"}
        };
        return $.when(countlyAnalyticsAPI.initialize(["platforms", "devices", "carriers"]), countlySession.initialize(), countlyTotalUsers.initialize("users"), countlyTotalUsers.initialize("countries"), countlyCommon.getGraphNotes([countlyCommon.ACTIVE_APP_ID])).then(function() {});
    },
    afterRender: function() {
        if (countlyGlobal.config.use_google) {
            var self = this;
            countlyLocation.drawGeoChart({height: 330, metric: self.maps[self.curMap]});
        }
    },
    pageScript: function() {
        $("#total-user-estimate-ind").on("click", function() {
            CountlyHelpers.alert($("#total-user-estimate-exp").html(), "black");
        });

        var self = this;
        $("#big-numbers-container").find(".big-numbers .inner").click(function() {
            $("#big-numbers-container").find(".big-numbers").removeClass("active");
            $(this).parent(".big-numbers").addClass("active");

            var elID = $(this).find('.select').attr("id");

            if (self.selectedView === "#" + elID) {
                return true;
            }

            self.selectedView = "#" + elID;
            self.drawGraph();
        });

        if (countlyGlobal.config.use_google) {
            this.countryList();
            $(".map-list").find(".data-type-selector-group .selector").click(function() {
                $(".map-list").find(".data-type-selector-group .selector").removeClass("active");
                $(this).addClass("active");
                self.curMap = $(this).attr("id");
                self.selectedMap = "#" + self.curMap;

                countlyLocation.refreshGeoChart(self.maps[self.curMap]);
                self.countryList();
            });
        }

        app.localize();
    },
    drawGraph: function() {
        var sessionDP = {};

        switch (this.selectedView) {
        case "#draw-total-users":
            sessionDP = countlySession.getUserDPActive();
            break;
        case "#draw-new-users":
            sessionDP = countlySession.getUserDPNew();
            break;
        case "#draw-total-sessions":
            sessionDP = countlySession.getSessionDPTotal();
            break;
        case "#draw-time-spent":
            sessionDP = countlySession.getDurationDPAvg();
            break;
        case "#draw-total-time-spent":
            sessionDP = countlySession.getDurationDP();
            break;
        case "#draw-avg-events-served":
            sessionDP = countlySession.getEventsDPAvg();
            break;
        }

        _.defer(function() {
            countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph", null, null, null, [countlyCommon.ACTIVE_APP_ID]);
        });
    },
    renderCommon: function(isRefresh, isDateChange) {
        var sessionData = countlySession.getSessionData(),
            locationData = countlyLocation.getLocationData({maxCountries: 10});

        this.locationData = locationData;
        sessionData["page-title"] = countlyCommon.getDateRange();
        sessionData.usage = [
            {
                "title": jQuery.i18n.map["common.total-sessions"],
                "material-icon": "timeline",
                "data": sessionData.usage['total-sessions'],
                "id": "draw-total-sessions",
                "help": "dashboard.total-sessions"
            },
            {
                "title": jQuery.i18n.map["common.total-users"],
                "ion-icon": "ion-person-stalker",
                "data": sessionData.usage['total-users'],
                "id": "draw-total-users",
                "help": "dashboard.total-users"
            },
            {
                "title": jQuery.i18n.map["common.new-users"],
                "ion-icon": "ion-person-add",
                "data": sessionData.usage['new-users'],
                "id": "draw-new-users",
                "help": "dashboard.new-users"
            },
            {
                "title": jQuery.i18n.map["dashboard.time-spent"],
                "ion-icon": "ion-android-time",
                "data": sessionData.usage['total-duration'],
                "id": "draw-total-time-spent",
                "help": "dashboard.total-time-spent"
            },
            {
                "title": jQuery.i18n.map["dashboard.avg-time-spent"],
                "material-icon": "timelapse",
                "data": sessionData.usage['avg-duration-per-session'],
                "id": "draw-time-spent",
                "help": "dashboard.avg-time-spent2"
            },
            {
                "title": jQuery.i18n.map["dashboard.avg-reqs-received"],
                "material-icon": "compare_arrows",
                "data": sessionData.usage['avg-events'],
                "id": "draw-avg-events-served",
                "help": "dashboard.avg-reqs-received"
            }
        ];
        sessionData.bars = [
            {
                "title": jQuery.i18n.map["common.bar.top-platform"],
                "data": countlyAnalyticsAPI.getTop('platforms'),
                "help": "dashboard.top-platforms"
            },
            {
                "title": jQuery.i18n.map["common.bar.top-devices"],
                "data": countlyAnalyticsAPI.getTop('devices'),
                "help": "dashboard.top-devices"
            },
            {
                "title": jQuery.i18n.map["common.bar.top-carrier"],
                "data": countlyAnalyticsAPI.getTop('carriers'),
                "help": "dashboard.top-carriers"
            },
            {
                "title": jQuery.i18n.map["common.bar.top-users"],
                "data": countlySession.getTopUserBars(),
                "help": "dashboard.top-users"
            }
        ];

        this.templateData = sessionData;

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            CountlyHelpers.applyColors();
            $('.data-type-selector-group').find('div').removeClass('active');
            $(this.selectedMap).addClass('active');

            if (!countlyGlobal.config.use_google) {
                $(".map-list.geo-switch").hide();
            }
            $(this.selectedView).parents(".big-numbers").addClass("active");
            this.pageScript();

            if (!isDateChange) {
                this.drawGraph();
            }
        }
        if (!countlyGlobal.config.use_google) {
            this.countryTable(isRefresh);
        }
        else {
            countlyLocation.refreshGeoChart(this.maps[this.curMap]);
        }
        app.graphNotesView.addNotesMenuLink(this);
    },
    restart: function() {
        this.refresh(true);
    },
    refresh: function(isFromIdle) {

        var self = this;
        $.when(this.beforeRender()).then(function() {
            if (app.activeView !== self) {
                return false;
            }
            self.renderCommon(true);

            var newPage = $("<div>" + self.template(self.templateData) + "</div>");
            $(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));
            $(".widget-header .title").replaceWith(newPage.find(".widget-header .title"));

            $("#big-numbers-container").find(".big-numbers").each(function(i, el) {
                var newEl = $(newPage.find("#big-numbers-container .big-numbers")[i]);

                if (isFromIdle) {
                    $(el).find(".number").replaceWith(newEl.find(".number"));
                }
                else {
                    var currNumberEl = $(el).find(".number .value"),
                        currNumberVal = parseFloat(currNumberEl.text()) || 0,
                        currNumPost = currNumberEl.text().replace(currNumberVal, ''),
                        targetValue = parseFloat(newEl.find(".number .value").text()),
                        targetPost = newEl.find(".number .value").text().replace(targetValue, '');

                    if (targetValue !== currNumberVal) {
                        if (targetValue < currNumberVal || (targetPost.length && targetPost !== currNumPost)) {
                            $(el).find(".number").replaceWith(newEl.find(".number"));
                        }
                        else {
                            jQuery({someValue: currNumberVal, currEl: currNumberEl}).animate({someValue: targetValue}, {
                                duration: 2000,
                                easing: 'easeInOutQuint',
                                step: function() {
                                    if ((targetValue + "").indexOf(".") === -1) {
                                        this.currEl.text(Math.round(this.someValue) + targetPost);
                                    }
                                    else {
                                        this.currEl.text(parseFloat((this.someValue).toFixed(1)) + targetPost);
                                    }
                                }
                            });
                        }
                    }
                }

                $(el).find(".trend").replaceWith(newEl.find(".trend"));
                $(el).find(".spark").replaceWith(newEl.find(".spark"));
            });

            self.drawGraph();

            $(".usparkline").peity("bar", { width: "100%", height: "30", colour: "#83C986", strokeColour: "#83C986", strokeWidth: 2 });
            $(".dsparkline").peity("bar", { width: "100%", height: "30", colour: "#DB6E6E", strokeColour: "#DB6E6E", strokeWidth: 2 });

            if (newPage.find("#map-list-right").length === 0) {
                $("#map-list-right").remove();
            }

            if ($("#map-list-right").length) {
                $("#map-list-right").replaceWith(newPage.find("#map-list-right"));
            }
            else {
                $(".widget.map-list").prepend(newPage.find("#map-list-right"));
            }

            self.pageScript();
        });
    },
    countryList: function() {
        var self = this;
        $("#map-list-right").empty();
        var country;

        var type = self.curMap === "map-list-sessions" ? "t" : self.curMap === "map-list-users" ? "u" : self.curMap === "map-list-new" ? "n" : "";
        self.locationData = countlyLocation.orderByType(type, self.locationData);

        for (var i = 0; i < self.locationData.length; i++) {
            country = self.locationData[i];
            $("#map-list-right").append('<div class="map-list-item">' +
                '<div class="flag ' + country.code + '" style="background-image:url(\'' + countlyGlobal.cdn + 'images/flags/' + country.code + '.png\');"></div>' +
                '<div class="country-name">' + country.country + '</div>' +
                '<div class="total">' + country[self.maps[self.curMap].metric] + '</div>' +
            '</div>');
        }

        if (self.locationData.length === 0) {
            $("#geo-chart-outer").addClass("empty");
        }
        else {
            $("#geo-chart-outer").removeClass("empty");
        }
    },
    countryTable: function(refresh) {
        var self = this;
        if (!refresh) {
            $(".map-list").after('<table id="countries-alternative" class="d-table help-zone-vb" cellpadding="0" cellspacing="0"></table>');
            this.country_dtable = $('#countries-alternative').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": self.locationData,
                "iDisplayLength": 10,
                "aoColumns": [
                    { "mData": "country_flag", "sType": "string", "sTitle": jQuery.i18n.map["countries.table.country"]},
                    { "mData": "t", "sType": "numeric", "sTitle": jQuery.i18n.map["common.table.total-sessions"]},
                    { "mData": "u", "sType": "numeric", "sTitle": jQuery.i18n.map["common.table.total-users"]},
                    { "mData": "n", "sType": "numeric", "sTitle": jQuery.i18n.map["common.table.new-users"]}
                ]
            }));
            this.country_dtable.stickyTableHeaders();
            this.country_dtable.fnSort([ [1, 'desc'] ]);
            $("#countries-alternative_wrapper .dataTable-top .search-table-data").hide();
            $("#countries-alternative_wrapper .dataTable-top .save-table-data").hide();
            $("#countries-alternative_wrapper .dataTable-top .dataTables_paginate").hide();
            $("#countries-alternative_wrapper .dataTable-top .DTTT_container").hide();
            $("#countries-alternative_wrapper .dataTable-top").append("<div style='font:13px Ubuntu,Helvetica,sans-serif; color:#636363; margin-right:10px; padding: 10px; float: right;'><a href='#/analytics/countries'>" + jQuery.i18n.map["common.go-to-countries"] + "&nbsp;&nbsp;&nbsp;<i class='fa fa-chevron-right' aria-hidden='true'></i></a></div>");
            $("#countries-alternative_wrapper .dataTable-top").append("<div style='font:15px Ubuntu,Helvetica,sans-serif; color:#636363; margin-left:10px; margin-top: 8px; text-transform: uppercase;'>" + jQuery.i18n.map["sidebar.analytics.countries"] + "</div>");
        }
        else {
            CountlyHelpers.refreshTable(self.country_dtable, countlyLocation.getLocationData({maxCountries: 10}));
        }
    },
    destroy: function() {
        $("#content-top").html("");
    }
});

app.addAppType("mobile", MobileDashboardView);

app.addAppManagementSwitchCallback(function(appId, type) {
    if (type === "mobile") {
        jQuery.i18n.map["revenue.tooltip"] = jQuery.i18n.map["mobile.revenue.tooltip"];
        jQuery.i18n.map["placeholder.iap-event-key"] = jQuery.i18n.map["mobile.placeholder.iap-event-key"];
        jQuery.i18n.map["placeholder.iap-help"] = jQuery.i18n.map["mobile.placeholder.iap-help"];
        jQuery.i18n.map["management-applications.iap-event"] = jQuery.i18n.map["mobile.management-applications.iap-event"];
    }
    else if (app.appTypes.mobile.origLangs["revenue.tooltip"]) {
        jQuery.i18n.map["revenue.tooltip"] = app.appTypes.mobile.origLangs["revenue.tooltip"];
        jQuery.i18n.map["placeholder.iap-event-key"] = app.appTypes.mobile.origLangs["placeholder.iap-event-key"];
        jQuery.i18n.map["placeholder.iap-help"] = app.appTypes.mobile.origLangs["placeholder.iap-help"];
        jQuery.i18n.map["management-applications.iap-event"] = app.appTypes.mobile.origLangs["management-applications.iap-event"];
    }
});

$(document).ready(function() {
    app.addSubMenuForType("mobile", "analytics", {code: "analytics-platforms", url: "#/analytics/platforms", text: "sidebar.analytics.platforms", priority: 80});
    app.addSubMenuForType("mobile", "analytics", {code: "analytics-carriers", url: "#/analytics/carriers", text: "sidebar.analytics.carriers", priority: 70});
    app.addSubMenuForType("mobile", "analytics", {code: "analytics-versions", url: "#/analytics/versions", text: "sidebar.analytics.app-versions", priority: 60});
    app.addSubMenuForType("mobile", "analytics", {code: "analytics-resolutions", url: "#/analytics/resolutions", text: "sidebar.analytics.resolutions", priority: 50});
    app.addSubMenuForType("mobile", "analytics", {code: "analytics-devices", url: "#/analytics/devices", text: "sidebar.analytics.devices", priority: 40});
    app.addSubMenuForType("mobile", "analytics", {code: "analytics-countries", url: "#/analytics/countries", text: "sidebar.analytics.countries", priority: 30});
    app.addSubMenuForType("mobile", "analytics", {code: "analytics-sessions", url: "#/analytics/sessions", text: "sidebar.analytics.sessions", priority: 20});
    app.addSubMenuForType("mobile", "analytics", {code: "analytics-users", url: "#/analytics/users", text: "sidebar.analytics.users", priority: 10});

    app.addSubMenuForType("mobile", "engagement", {code: "analytics-loyalty", url: "#/analytics/loyalty", text: "sidebar.analytics.user-loyalty", priority: 10});
    app.addSubMenuForType("mobile", "engagement", {code: "analytics-frequency", url: "#/analytics/frequency", text: "sidebar.analytics.session-frequency", priority: 20});
    app.addSubMenuForType("mobile", "engagement", {code: "analytics-durations", url: "#/analytics/durations", text: "sidebar.engagement.durations", priority: 30});

    app.addAppSwitchCallback(function(appId) {
        if (countlyGlobal.apps[appId].type === "mobile") {
            //revenue = IAP
            jQuery.i18n.map["revenue.iap"] = jQuery.i18n.map["mobile.revenue.iap"];
            jQuery.i18n.map["systemlogs.action.iap_updated"] = jQuery.i18n.map["mobile.systemlogs.action.iap_updated"];
        }
        app.appTypes.mobile.origLangs = {
            "revenue.tooltip": jQuery.i18n.map["revenue.tooltip"],
            "placeholder.iap-event-key": jQuery.i18n.map["placeholder.iap-event-key"],
            "placeholder.iap-help": jQuery.i18n.map["placeholder.iap-help"],
            "management-applications.iap-event": jQuery.i18n.map["management-applications.iap-event"]
        };
    });
});