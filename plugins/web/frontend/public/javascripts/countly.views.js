window.WebDashboardView = countlyView.extend({
    selectedView:"#draw-total-sessions",
    initialize:function () {
        this.curMap = "map-list-sessions";
        this.template = Handlebars.compile($("#dashboard-template").html());
    },
    beforeRender: function() {
        this.maps = {
            "map-list-sessions": {id:'total', label:jQuery.i18n.map["sidebar.analytics.sessions"], type:'number', metric:"t"},
            "map-list-users": {id:'total', label:jQuery.i18n.map["sidebar.analytics.users"], type:'number', metric:"u"},
            "map-list-new": {id:'total', label:jQuery.i18n.map["common.table.new-users"], type:'number', metric:"n"}
        };
        var defs = [countlyUser.initialize(), countlyDeviceDetails.initialize()];
        if(typeof window.countlyBrowser != "undefined")
            defs.push(countlyBrowser.initialize());
        if(typeof window.countlySources != "undefined")
            defs.push(countlySources.initialize());
        
		return $.when.apply($, defs).then(function () {});
    },
    afterRender: function() {
        var self = this;
        countlyLocation.drawGeoChart({height:290, metric:self.maps[self.curMap]});
    },
    pageScript:function () {
        $("#total-user-estimate-ind").on("click", function() {
            CountlyHelpers.alert($("#total-user-estimate-exp").html(), "black");
        });

        $(".widget-content .inner").click(function () {
            $(".big-numbers").removeClass("active");
            $(".big-numbers .select").removeClass("selected");
            $(this).parent(".big-numbers").addClass("active");
            $(this).find('.select').addClass("selected");
        });

        $(".bar-inner").on({
            mouseenter:function () {
                var number = $(this).parent().next();

                number.text($(this).data("item"));
                number.css({"color":$(this).css("background-color")});
            },
            mouseleave:function () {
                var number = $(this).parent().next();

                number.text(number.data("item"));
                number.css({"color":$(this).parent().find(".bar-inner:first-child").css("background-color")});
            }
        });

        var self = this;
        $(".big-numbers .inner").click(function () {
            var elID = $(this).find('.select').attr("id");

            if (self.selectedView == "#" + elID) {
                return true;
            }

            self.selectedView = "#" + elID;
            self.drawGraph();
        });
        
        this.countryList();
        $(".map-list .cly-button-group .icon-button").click(function(){
            $(".map-list .cly-button-group .icon-button").removeClass("active");
            $(this).addClass("active");
            self.curMap = $(this).attr("id");
            countlyLocation.refreshGeoChart(self.maps[self.curMap]);
            self.countryList();
        });

        app.localize();
    },
    drawGraph:function() {
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

        _.defer(function () {
            countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
        });
    },
    renderCommon:function (isRefresh, isDateChange) {
        var sessionData = countlySession.getSessionData(),
            locationData = countlyLocation.getLocationData({maxCountries:7}),
            sessionDP = countlySession.getSessionDPTotal();

        this.locationData = locationData;
        sessionData["page-title"] = countlyCommon.getDateRange();
        sessionData["usage"] = [
            {
                "title":jQuery.i18n.map["common.total-sessions"],
                "data":sessionData.usage['total-sessions'],
                "id":"draw-total-sessions",
                "help":"dashboard.total-sessions"
            },
            {
                "title":jQuery.i18n.map["common.total-users"],
                "data":sessionData.usage['total-users'],
                "id":"draw-total-users",
                "help":"dashboard.total-users"
            },
            {
                "title":jQuery.i18n.map["common.new-users"],
                "data":sessionData.usage['new-users'],
                "id":"draw-new-users",
                "help":"dashboard.new-users"
            },
            {
                "title":jQuery.i18n.map["dashboard.time-spent"],
                "data":sessionData.usage['total-duration'],
                "id":"draw-total-time-spent",
                "help":"dashboard.total-time-spent"
            },
            {
                "title":jQuery.i18n.map["dashboard.avg-time-spent"],
                "data":sessionData.usage['avg-duration-per-session'],
                "id":"draw-time-spent",
                "help":"dashboard.avg-time-spent2"
            },
            {
                "title":jQuery.i18n.map["dashboard.avg-reqs-received"],
                "data":sessionData.usage['avg-events'],
                "id":"draw-avg-events-served",
                "help":"dashboard.avg-reqs-received"
            }
        ];
        sessionData["bars"] = [
            {
                "title":jQuery.i18n.map["common.bar.top-platform"],
                "data":countlyDeviceDetails.getPlatformBars(),
                "help":"dashboard.top-platforms"
            },
            {
                "title":jQuery.i18n.map["common.bar.top-sources"],
                "data":(typeof countlySources != "undefined") ? countlySources.getBars() : [],
                "help":"dashboard.top-sources"
            },
            {
                "title":jQuery.i18n.map["common.bar.top-browsers"],
                "data":(typeof countlyBrowser != "undefined") ? countlyBrowser.getBars() : [],
                "help":"dashboard.top-browsers"
            },
            {
                "title":jQuery.i18n.map["common.bar.top-users"],
                "data":countlySession.getTopUserBars(),
                "help":"dashboard.top-users"
            }
        ];

        this.templateData = sessionData;

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            $(this.selectedView).parents(".big-numbers").addClass("active");
            this.pageScript();

            if (!isDateChange) {
                this.drawGraph();
            }
        }
    },
    restart:function () {
        this.refresh(true);
    },
    refresh:function (isFromIdle) {

        var self = this;
        $.when(this.beforeRender()).then(function () {
            if (app.activeView != self) {
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
                } else {
                    var currNumberEl = $(el).find(".number .value"),
                        currNumberVal = parseFloat(currNumberEl.text()) || 0,
                        currNumPost = currNumberEl.text().replace(currNumberVal, ''),
                        targetValue = parseFloat(newEl.find(".number .value").text()),
                        targetPost = newEl.find(".number .value").text().replace(targetValue, '');

                    if (targetValue != currNumberVal) {
                        if (targetValue < currNumberVal || (targetPost.length && targetPost != currNumPost)) {
                            $(el).find(".number").replaceWith(newEl.find(".number"));
                        } else {
                            jQuery({someValue: currNumberVal, currEl: currNumberEl}).animate({someValue: targetValue}, {
                                duration: 2000,
                                easing:'easeInOutQuint',
                                step: function() {
                                    if ((targetValue + "").indexOf(".") == -1) {
                                        this.currEl.text(Math.round(this.someValue) + targetPost);
                                    } else {
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

            $(".usparkline").peity("bar", { width:"100%", height:"30", colour:"#6BB96E", strokeColour:"#6BB96E", strokeWidth:2 });
            $(".dsparkline").peity("bar", { width:"100%", height:"30", colour:"#C94C4C", strokeColour:"#C94C4C", strokeWidth:2 });

            if (newPage.find("#map-list-right").length == 0) {
                $("#map-list-right").remove();
            }

            if ($("#map-list-right").length) {
                $("#map-list-right").replaceWith(newPage.find("#map-list-right"));
            } else {
                $(".widget.map-list").prepend(newPage.find("#map-list-right"));
            }

            self.pageScript();
        });
    },
    countryList:function(){
        var self = this;
        $("#map-list-right").empty();
        var country;
        for(var i = 0; i < self.locationData.length; i++){
            country = self.locationData[i];
            $("#map-list-right").append('<div class="map-list-item">'+
                '<div class="flag" style="background-image:url(\''+countlyGlobal["cdn"]+'images/flags/'+country.code+'.png\');"></div>'+
                '<div class="country-name">'+country.country+'</div>'+
                '<div class="total">'+country[self.maps[self.curMap].metric]+'</div>'+
            '</div>');
        }
    },
    destroy:function () {
        $("#content-top").html("");
    }
});

app.addAppType("web", WebDashboardView);

$( document ).ready(function() {
    var menu = '<a href="#/all" id="allapps-menu" class="item analytics active">'+
		'<div class="logo fa fa-list-alt" style="background-image:none; font-size:24px; text-align:center; width:35px; margin-left:14px; line-height:42px;"></div>'+
		'<div class="text" data-localize="web.all-websites"></div>'+
	'</a>';
	$('#web-type a').first().before(menu);
    
    menu = '<a href="#/analytics/platforms" class="item">'+
		'<div class="logo platforms"></div>'+
		'<div class="text" data-localize="sidebar.analytics.platforms"></div>'+
	'</a>';
	$('#web-type #analytics-submenu').prepend(menu);
    
     menu = '<a href="#/analytics/versions" class="item">'+
		'<div class="logo app-versions"></div>'+
		'<div class="text" data-localize="sidebar.analytics.versions"></div>'+
	'</a>';
	$('#web-type #analytics-submenu').prepend(menu);
    
    menu = '<a href="#/analytics/resolutions" class="item">'+
		'<div class="logo resolutions"></div>'+
		'<div class="text" data-localize="sidebar.analytics.resolutions"></div>'+
	'</a>';
	$('#web-type #analytics-submenu').prepend(menu);
    
    menu = '<a href="#/analytics/countries" class="item">'+
		'<div class="logo country"></div>'+
		'<div class="text" data-localize="sidebar.analytics.countries"></div>'+
	'</a>';
	$('#web-type #analytics-submenu').prepend(menu);
    
    menu = '<a href="#/analytics/sessions" class="item">'+
		'<div class="logo sessions"></div>'+
		'<div class="text" data-localize="sidebar.analytics.sessions"></div>'+
	'</a>';
	$('#web-type #analytics-submenu').prepend(menu);
    
	menu = '<a href="#/analytics/users" class="item">'+
		'<div class="logo users"></div>'+
		'<div class="text" data-localize="sidebar.analytics.users"></div>'+
	'</a>';
	$('#web-type #analytics-submenu').prepend(menu);
    
    $("#web-type #engagement-menu").show();
    
    menu =      '<a href="#/analytics/loyalty" class="item">' +
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
                '</a>';
	$('#web-type #engagement-submenu').append(menu);
    
    app.addAppSwitchCallback(function(appId){
        if(countlyGlobal["apps"][appId].type == "web"){
            jQuery.i18n.map["drill.lv"] = jQuery.i18n.map["web.drill.lv"];
            jQuery.i18n.map["views.title"] = jQuery.i18n.map["web.views.title"];
            jQuery.i18n.map["views.view"] = jQuery.i18n.map["web.views.view"];
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
            jQuery.i18n.map["revenue.iap"] = jQuery.i18n.map["web.revenue.iap"];
            jQuery.i18n.map["revenue.tooltip"] = jQuery.i18n.map["web.revenue.tooltip"];
            jQuery.i18n.map["placeholder.iap-event-key"] = jQuery.i18n.map["web.placeholder.iap-event-key"];
            jQuery.i18n.map["placeholder.iap-help"] = jQuery.i18n.map["web.placeholder.iap-help"];
            jQuery.i18n.map["management-applications.iap-event"] = jQuery.i18n.map["web.management-applications.iap-event"];
            jQuery.i18n.map["drill.crash"] = jQuery.i18n.map["web.drill.crash"];
            jQuery.i18n.map["drill.crash-segments"] = jQuery.i18n.map["web.drill.crash-segments"];
            jQuery.i18n.map["userdata.crashes"] = jQuery.i18n.map["web.userdata.crashes"];
            
        }
    });
});