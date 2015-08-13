window.ReportingView = countlyView.extend({
	initialize:function () {},
    beforeRender: function() {
		if(this.template)
			return $.when(countlyReporting.initialize()).then(function () {});
		else{
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/reports/templates/reports.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlyReporting.initialize()).then(function () {});
		}
    },
    getDayName: function(day){
        switch(day){
            case 1:
                return jQuery.i18n.map["reports.monday"];
            case 2:
                return jQuery.i18n.map["reports.tuesday"];
            case 3:
                return jQuery.i18n.map["reports.wednesday"];
            case 4:
                return jQuery.i18n.map["reports.thursday"];
            case 5:
                return jQuery.i18n.map["reports.friday"];
            case 6:
                return jQuery.i18n.map["reports.saturday"];
            case 7:
                return jQuery.i18n.map["reports.sunday"];
            default:
                return "";
        }
    },
    getDayNumber: function(day){
        switch(day){
            case jQuery.i18n.map["reports.monday"]:
                return "1";
            case jQuery.i18n.map["reports.tuesday"]:
                return "2";
            case jQuery.i18n.map["reports.wednesday"]:
                return "3";
            case jQuery.i18n.map["reports.thursday"]:
                return "4";
            case jQuery.i18n.map["reports.friday"]:
                return "5";
            case jQuery.i18n.map["reports.saturday"]:
                return "6";
            case jQuery.i18n.map["reports.sunday"]:
                return "7";
            default:
                return "1";
        }
    },
    renderCommon:function (isRefresh) {
        var cnts = app.manageAppsView.getTimeZones();
        var zones = {};
        var zoneNames = [];
        for(var i in cnts){
            for(var j = 0; j < cnts[i].z.length; j++){
                for(var k in cnts[i].z[j]){
                    zoneNames.push(k);
                    zones[cnts[i].z[j][k]] = k;
                }
            }
        }
        
        var data = countlyReporting.getData();
        for(var i = 0; i < data.length; i++){
            if(data[i].apps && data[i].apps.length){
                data[i].appNames = CountlyHelpers.appIdsToNames(data[i].apps).split(", ");
                if(data[i].hour < 10)
                    data[i].hour = "0"+data[i].hour;
                if(data[i].minute < 10)
                    data[i].minute = "0"+data[i].minute;
                
                data[i].dayname = this.getDayName(data[i].day);
                data[i].zoneName = zones[data[i].timezone] || "(GMT+00:00) GMT (no daylight saving)";
            }
        }
        
        zoneNames.sort(function(a, b){
            a = parseFloat(a.split(")")[0].replace(":", ".").substring(4));
            b = parseFloat(b.split(")")[0].replace(":", ".").substring(4));
            if(a < b) return -1;
            if(a > b) return 1;
            return 0;
        });
        this.templateData = {
            "page-title":jQuery.i18n.map["reports.title"],
            "data":data,
            "apps":(countlyGlobal["member"].global_admin) ? countlyGlobal['apps'] : countlyGlobal['admin_apps'],
            "zoneNames":zoneNames,
            "member":countlyGlobal["member"],
            "hasCrash":(typeof countlyCrashes != "undefined"),
            "hasPush":(typeof countlyPush != "undefined"),
            "hasRevenue":(typeof countlyRevenue != "undefined"),
            "useCron":countlyGlobal["use_cron"]
        };
		var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
			
        }
    }
});

//register views
app.reportingView = new ReportingView();

if(countlyGlobal["member"].global_admin || countlyGlobal["member"]["admin_of"].length){
    app.route('/manage/reports', 'reports', function () {
        this.renderWhenReady(this.reportingView);
    });
}

$( document ).ready(function() {
	if(countlyGlobal["member"].global_admin || countlyGlobal["member"]["admin_of"].length){
        var menu = '<a href="#/manage/reports" class="item">'+
            '<div class="logo-icon fa fa-envelope"></div>'+
            '<div class="text" data-localize="reports.title"></div>'+
        '</a>';
        if($('#management-submenu .help-toggle').length)
            $('#management-submenu .help-toggle').before(menu);
    }
    
    //check if configuration view exists
    if(app.configurationsView){
        app.configurationsView.registerLabel("reports", "Reports");
        app.configurationsView.registerLabel("reports-use_cron", "Create cronjobs for reports");
    }
});