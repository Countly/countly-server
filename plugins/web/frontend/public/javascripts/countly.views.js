/*global countlyAnalyticsAPI, countlyAuth, CountlyHelpers, countlyView, _, WebDashboardView, countlyLocation, countlyTotalUsers, countlySources, countlyWebDashboard, countlyCommon, countlyGlobal, countlySession, Handlebars, app, $, jQuery*/

window.WebDashboardView = countlyView.extend({
    featureName: 'core',
    selectedView: "#draw-total-sessions",
    selectedMap: "#map-list-sessions",
    initialize: function() {
        if (!countlyAuth.validateRead(this.featureName)) {
            return;
        }
        this.curMap = "map-list-sessions";
        this.template = Handlebars.compile($("#dashboard-template").html());
    },
    beforeRender: function(isRefresh) {
        if (!countlyAuth.validateRead(this.featureName)) {
            return;
        }
        this.maps = {
            "map-list-sessions": {id: 'total', label: jQuery.i18n.map["sidebar.analytics.sessions"], type: 'number', metric: "t"},
            "map-list-users": {id: 'total', label: jQuery.i18n.map["sidebar.analytics.users"], type: 'number', metric: "u"},
            "map-list-new": {id: 'total', label: jQuery.i18n.map["common.table.new-users"], type: 'number', metric: "n"}
        };
        //do not wait on country initialization
        countlyTotalUsers.initialize("countries");
        var defs = [countlyAnalyticsAPI.initialize(["platforms", "sources", "browser"]), countlySession.initialize(), countlyWebDashboard.initialize(isRefresh), countlyTotalUsers.initialize("users"), countlyCommon.getGraphNotes([countlyCommon.ACTIVE_APP_ID])];

        return $.when.apply($, defs).then(function() {});
    },
    afterRender: function() {
        if (countlyGlobal.config.use_google && countlyAuth.validateRead(this.featureName)) {
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
        if (!countlyAuth.validateRead(this.featureName)) {
            return;
        }
        var sessionData = countlySession.getSessionData(),
            locationData = countlyLocation.getLocationData({maxCountries: 7});
        this.locationData = locationData;
        sessionData["page-title"] = jQuery.i18n.map["sidebar.dashboard"];
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
                "title": jQuery.i18n.map["common.bar.top-sources"],
                "data": countlyAnalyticsAPI.getTop('sources'),
                "help": "dashboard.top-sources"
            },
            {
                "title": jQuery.i18n.map["common.bar.top-browsers"],
                "data": countlyAnalyticsAPI.getTop('browser'),
                "help": "dashboard.top-browsers"
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
            $(".map-list").after('<table id="last-visitors" class="d-table help-zone-vb" cellpadding="0" cellspacing="0"></table>');
            var users = countlyWebDashboard.getLatestUsers();
            var sort = 3;
            var columns = [
                {
                    "mData": function(row) {
                        var img = (!row.cc) ? "unknown" : (row.cc + "").toLowerCase();
                        var name = (!row.cc) ? jQuery.i18n.map["common.unknown"] : row.cc + "";
                        var c = '<div class="flag ' + img + '" style="margin-top: 2px; background-image: url(images/flags/' + img + '.png);"></div>' + name;
                        if (row.cty && row.cty !== jQuery.i18n.map["common.unknown"]) {
                            c += " (" + row.cty + ")";
                        }
                        return c;
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["countries.table.country"],
                    "bSortable": false,
                    "sClass": "break web-15"
                },
                {
                    "mData": function(row) {
                        return (!row.p) ? jQuery.i18n.map["common.unknown"] : row.p;
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["platforms.table.platform"],
                    "bSortable": false
                }
            ];

            if (users[0] && users[0].brw) {
                columns.push({
                    "mData": function(row) {
                        return (!row.brw) ? jQuery.i18n.map["common.unknown"] : row.brw;
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["web.browser"],
                    "bSortable": false
                });
                sort++;
            }

            if (users[0] && users[0].lv) {
                columns.push({
                    "mData": function(row) {
                        return (!row.lv) ? jQuery.i18n.map["common.unknown"] : row.lv;
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["web.views.view"],
                    "bSortable": false,
                    "sClass": "trim web-20"
                });
                sort++;
            }

            if (users[0] && users[0].src) {
                columns.push({
                    "mData": function(row) {
                        if (!row.src) {
                            return jQuery.i18n.map["common.unknown"];
                        }
                        else {
                            row.src = row.src.replace(/&#46;/g, ".").replace(/&amp;#46;/g, '.'); if (row.src.indexOf("http") === 0) {
                                return "<a href='" + row.src + "' target='_blank'>" + ((typeof countlySources !== "undefined") ? countlySources.getSourceName(row.src) : row.src) + "</a>";
                            }
                            else {
                                return (typeof countlySources !== "undefined") ? countlySources.getSourceName(row.src) : row.src;
                            }
                        }
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["web.from-source"],
                    "bSortable": false,
                    "sClass": "break web-20"
                });
                sort++;
            }

            columns.push({
                "mData": function(row) {
                    return (!row.sc) ? 0 : row.sc;
                },
                "sType": "numeric",
                "sTitle": jQuery.i18n.map["web.total-sessions"],
                "bSortable": false
            },
            {
                "mData": function(row, type) {
                    if (type === "display") {
                        return (row.ls) ? countlyCommon.formatTimeAgo(row.ls) : jQuery.i18n.map["web.never"];
                    }
                    else {
                        return (row.ls) ? row.ls : 0;
                    }
                },
                "sType": "format-ago",
                "sTitle": jQuery.i18n.map["web.last-seen"],
                "bSortable": false
            },
            {
                "mData": function(row) {
                    return countlyCommon.formatTime((row.tsd) ? parseInt(row.tsd) : 0);
                },
                "sType": "numeric",
                "sTitle": jQuery.i18n.map["web.time-spent"],
                "bSortable": false
            });

            this.latestdtable = $('#last-visitors').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": users,
                "iDisplayLength": 10,
                "aoColumns": columns
            }));
            this.latestdtable.stickyTableHeaders();
            this.latestdtable.fnSort([ [sort, 'desc'] ]);
            $("#last-visitors_wrapper .dataTable-top .search-table-data").hide();
            $("#last-visitors_wrapper .dataTable-top .save-table-data").hide();
            $("#last-visitors_wrapper .dataTable-top").append("<div style='font:15px Ubuntu,Helvetica,sans-serif; color:#636363; margin-left:10px; margin-top: 8px; text-transform: uppercase;'>" + jQuery.i18n.map["web.latest-visitors"] + "</div>");

            $(this.selectedView).parents(".big-numbers").addClass("active");
            this.pageScript();

            if (!isDateChange) {
                this.drawGraph();
            }
            app.graphNotesView.addNotesMenuLink(this);
        }
        if (!countlyGlobal.config.use_google) {
            this.countryTable(isRefresh);
        }
        else {
            countlyLocation.refreshGeoChart(this.maps[this.curMap]);
        }
    },
    restart: function() {
        this.refresh(true);
    },
    refresh: function(isFromIdle) {
        if (!countlyAuth.validateRead(this.featureName)) {
            return;
        }
        var self = this;
        $.when(this.beforeRender(true)).then(function() {
            if (app.activeView !== self) {
                return false;
            }
            self.renderCommon(true);

            CountlyHelpers.refreshTable(self.latestdtable, countlyWebDashboard.getLatestUsers());

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

app.addAppType("web", WebDashboardView);

app.addAppSetting("app_domain", {
    toDisplay: function(appId, elem) {
        $(elem).text(countlyGlobal.apps[appId].app_domain);
    },
    toInput: function(appId, elem) {
        $(elem).val(countlyGlobal.apps[appId].app_domain);
    },
    toSave: function(appId, args, elem) {
        var domainEvent = $(elem).val();
        args.app_domain = domainEvent;
    },
    toInject: function() {
        var addApp = '<tr class="appmng-domain">' +
            '<td>' +
                '<span data-localize="management-applications.app-domain"></span>' +
            '</td>' +
            '<td>' +
                '<input type="text" value="" class="app-write-settings" data-id="app_domain" placeholder="Enter website domain..." data-localize="placeholder.app-domain-key" id="app-add-app-domain"></span>' +
            '</td>' +
        '</tr>';

        var addFirstApp = '<div class="add-app-input-wrapper" id="first-app-domain-setting">' +
            '<label class="add-app-input-label" data-localize="management-applications.app-domain"></label><label class="add-app-input-optional-text">Optional</label>' +
            '<input value="" placeholder="Enter application name..." placeholder="Enter website domain..." class="add-app-input-text" data-localize="placeholder.app-domain-key" id="first-app-add-app-domain">' +
            '</div>';

        $('#add-first-app > div:nth-child(4)').after(addFirstApp);

        $("#add-new-app table .table-add").before(addApp);

        var editApp = '<tr class="appmng-domain">' +
            '<td>' +
                '<span data-localize="management-applications.app-domain"></span>' +
            '</td>' +
            '<td id="app-edit-domain">' +
                '<div class="read app-read-settings" data-id="app_domain"></div>' +
                '<div class="edit">' +
                    '<input type="text" value="" class="app-write-settings" data-id="app_domain" data-localize="placeholder.app-domain-key" id="app-edit-app-domain"></span>' +
                '</div>' +
            '</td>' +
        '</tr>';

        $(".app-details table .table-edit").before(editApp);
    }
});

app.addPageScript("/manage/apps", function() {
    var appId = countlyCommon.ACTIVE_APP_ID;
    if (!countlyGlobal.apps[appId] || countlyGlobal.apps[appId].type === "web") {
        $(".appmng-domain").show();
        $('#first-app-domain-setting').show();
    }
    else {
        $(".appmng-domain").hide();
        $('#first-app-domain-setting').hide();
    }
});

app.addAppManagementSwitchCallback(function(appId, type) {
    if (type === "web") {
        $(".appmng-domain").show();
        $('#first-app-domain-setting').show();
    }
    else {
        $(".appmng-domain").hide();
        $('#first-app-domain-setting').hide();
    }
});

$(document).ready(function() {
    if (countlyAuth.validateRead('web')) {
        app.addSubMenuForType("web", "analytics", {code: "analytics-platforms", url: "#/analytics/platforms", text: "sidebar.analytics.platforms", priority: 80});
        app.addSubMenuForType("web", "analytics", {code: "analytics-versions", url: "#/analytics/versions", text: "sidebar.analytics.app-versions", priority: 60});
        app.addSubMenuForType("web", "analytics", {code: "analytics-resolutions", url: "#/analytics/resolutions", text: "sidebar.analytics.resolutions", priority: 50});
        app.addSubMenuForType("web", "analytics", {code: "analytics-device_type", url: "#/analytics/device_type", text: "device_type.title", priority: 45});
        app.addSubMenuForType("web", "analytics", {code: "analytics-devices", url: "#/analytics/devices", text: "sidebar.analytics.devices", priority: 40});
        app.addSubMenuForType("web", "analytics", {code: "analytics-countries", url: "#/analytics/countries", text: "sidebar.analytics.countries", priority: 30});
        app.addSubMenuForType("web", "analytics", {code: "analytics-sessions", url: "#/analytics/sessions", text: "sidebar.analytics.sessions", priority: 20});
        app.addSubMenuForType("web", "analytics", {code: "analytics-users", url: "#/analytics/users", text: "sidebar.analytics.users", priority: 10});
        app.addSubMenuForType("web", "engagement", {code: "analytics-loyalty", url: "#/analytics/loyalty", text: "sidebar.analytics.user-loyalty", priority: 10});
        app.addSubMenuForType("web", "engagement", {code: "analytics-frequency", url: "#/analytics/frequency", text: "sidebar.analytics.session-frequency", priority: 20});
        app.addSubMenuForType("web", "engagement", {code: "analytics-durations", url: "#/analytics/durations", text: "sidebar.engagement.durations", priority: 30});
    }

    app.addAppSwitchCallback(function(appId) {
        if (countlyGlobal.apps[appId].type === "web") {
            //views = page views
            jQuery.i18n.map["drill.lv"] = jQuery.i18n.map["web.drill.lv"];
            jQuery.i18n.map["views.title"] = jQuery.i18n.map["web.views.title"];
            jQuery.i18n.map["views.view"] = jQuery.i18n.map["web.views.view"];
            //crashes = errors
            jQuery.i18n.map["crashes.title"] = jQuery.i18n.map["web.crashes.title"];
            jQuery.i18n.map["crashes.unresolved-crashes"] = jQuery.i18n.map["web.crashes.unresolved-crashes"];
            jQuery.i18n.map["crashes.groupid"] = jQuery.i18n.map["web.crashes.groupid"];
            jQuery.i18n.map["crashes.crashed"] = jQuery.i18n.map["web.crashes.crashed"];
            jQuery.i18n.map["crashes.last-crash"] = jQuery.i18n.map["web.crashes.last-crash"];
            jQuery.i18n.map["crashes.online"] = jQuery.i18n.map["web.crashes.online"];
            jQuery.i18n.map["crashes.muted"] = jQuery.i18n.map["web.crashes.muted"];
            jQuery.i18n.map["crashes.background"] = jQuery.i18n.map["web.crashes.background"];
            jQuery.i18n.map["crashes.back-to-crashes"] = jQuery.i18n.map["web.crashes.back-to-crashes"];
            jQuery.i18n.map["crashes.back-to-crash"] = jQuery.i18n.map["web.crashes.back-to-crash"];
            jQuery.i18n.map["crashes.crashes-by"] = jQuery.i18n.map["web.crashes.crashes-by"];
            jQuery.i18n.map["crashes.unique"] = jQuery.i18n.map["web.crashes.unique"];
            jQuery.i18n.map["crashes.rate"] = jQuery.i18n.map["web.crashes.rate"];
            jQuery.i18n.map["crashes.top-crash"] = jQuery.i18n.map["web.crashes.top-crash"];
            jQuery.i18n.map["crashes.new-crashes"] = jQuery.i18n.map["web.crashes.new-crashes"];
            jQuery.i18n.map["crashes.fatality"] = jQuery.i18n.map["web.crashes.fatality"];
            jQuery.i18n.map["crashes.nonfatal-crashes"] = jQuery.i18n.map["web.crashes.nonfatal-crashes"];
            jQuery.i18n.map["crashes.confirm-delete"] = jQuery.i18n.map["web.crashes.confirm-delete"];
            jQuery.i18n.map["drill.crash"] = jQuery.i18n.map["web.drill.crash"];
            jQuery.i18n.map["drill.crash-segments"] = jQuery.i18n.map["web.drill.crash-segments"];
            jQuery.i18n.map["userdata.crashes"] = jQuery.i18n.map["web.userdata.crashes"];
            //users = visitors
            jQuery.i18n.map["common.total-users"] = jQuery.i18n.map["web.common.total-users"];
            jQuery.i18n.map["common.new-users"] = jQuery.i18n.map["web.common.new-users"];
            jQuery.i18n.map["common.returning-users"] = jQuery.i18n.map["web.common.returning-users"];
            jQuery.i18n.map["common.number-of-users"] = jQuery.i18n.map["web.common.number-of-users"];
            jQuery.i18n.map["common.table.total-users"] = jQuery.i18n.map["web.common.table.total-users"];
            jQuery.i18n.map["common.table.new-users"] = jQuery.i18n.map["web.common.table.new-users"];
            jQuery.i18n.map["common.table.returning-users"] = jQuery.i18n.map["web.common.table.returning-users"];
            jQuery.i18n.map["common.bar.top-users"] = jQuery.i18n.map["web.common.bar.top-users"];
            jQuery.i18n.map["sidebar.analytics.users"] = jQuery.i18n.map["web.sidebar.analytics.users"];
            jQuery.i18n.map["sidebar.analytics.user-loyalty"] = jQuery.i18n.map["web.sidebar.analytics.user-loyalty"];
            jQuery.i18n.map["users.title"] = jQuery.i18n.map["web.users.title"];
            jQuery.i18n.map["crashes.users"] = jQuery.i18n.map["web.crashes.users"];
            jQuery.i18n.map["crashes.affected-users"] = jQuery.i18n.map["web.crashes.affected-users"];
            jQuery.i18n.map["crashes.public-users"] = jQuery.i18n.map["web.crashes.public-users"];
            jQuery.i18n.map["drill.users"] = jQuery.i18n.map["web.drill.users"];
            jQuery.i18n.map["drill.times-users"] = jQuery.i18n.map["web.drill.times-users"];
            jQuery.i18n.map["drill.sum-users"] = jQuery.i18n.map["web.drill.sum-users"];
            jQuery.i18n.map["funnels.total-users"] = jQuery.i18n.map["web.funnels.total-users"];
            jQuery.i18n.map["funnels.users"] = jQuery.i18n.map["web.funnels.users"];
            jQuery.i18n.map["common.online-users"] = jQuery.i18n.map["web.common.online-users"];
            jQuery.i18n.map["live.new-users"] = jQuery.i18n.map["web.live.new-users"];
            jQuery.i18n.map["populator.amount-users"] = jQuery.i18n.map["web.populator.amount-users"];
            jQuery.i18n.map["sidebar.engagement.retention"] = jQuery.i18n.map["web.sidebar.engagement.retention"];
            jQuery.i18n.map["retention.users-first-session"] = jQuery.i18n.map["web.retention.users-first-session"];
            jQuery.i18n.map["userdata.title"] = jQuery.i18n.map["web.userdata.title"];
            jQuery.i18n.map["userdata.users"] = jQuery.i18n.map["web.userdata.users"];
            jQuery.i18n.map["userdata.user"] = jQuery.i18n.map["web.userdata.user"];
            jQuery.i18n.map["userdata.back-to-list"] = jQuery.i18n.map["web.userdata.back-to-list"];
            jQuery.i18n.map["userdata.no-users"] = jQuery.i18n.map["web.userdata.no-users"];
            jQuery.i18n.map["attribution.per-user"] = jQuery.i18n.map["web.attribution.per-user"];
            jQuery.i18n.map["attribution.user-conversion"] = jQuery.i18n.map["web.attribution.user-conversion"];
            jQuery.i18n.map["attribution.organic"] = jQuery.i18n.map["web.attribution.organic"];
            jQuery.i18n.map["reports.total_users"] = jQuery.i18n.map["web.reports.total_users"];
            jQuery.i18n.map["reports.new_users"] = jQuery.i18n.map["web.reports.new_users"];
            jQuery.i18n.map["reports.paying_users"] = jQuery.i18n.map["web.reports.paying_users"];
            jQuery.i18n.map["reports.messaging_users"] = jQuery.i18n.map["web.reports.messaging_users"];
            jQuery.i18n.map["reports.returning_users"] = jQuery.i18n.map["web.reports.returning_users"];
            jQuery.i18n.map["common.per-user"] = jQuery.i18n.map["web.common.per-user"];
            jQuery.i18n.map["common.per-paying-user"] = jQuery.i18n.map["web.common.per-paying-user"];
            jQuery.i18n.map["common.users"] = jQuery.i18n.map["web.common.users"];
            jQuery.i18n.map["attribution.installs"] = jQuery.i18n.map["web.attribution.installs"];
            jQuery.i18n.map["attribution.cost-install"] = jQuery.i18n.map["web.attribution.cost-install"];
            jQuery.i18n.map["sources.title"] = jQuery.i18n.map["web.sources.title"];
            jQuery.i18n.map["sources.source"] = jQuery.i18n.map["web.sources.source"];

        }
    });
});