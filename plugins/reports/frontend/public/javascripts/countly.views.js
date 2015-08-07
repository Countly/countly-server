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
    renderCommon:function (isRefresh) {
        var data = countlyReporting.getData();
        for(var i = 0; i < data.length; i++){
            if(data[i].apps && data[i].apps.length){
                data[i].appNames = CountlyHelpers.appIdsToNames(data[i].apps).split(", ");
                if(data[i].hour < 10)
                    data[i].hour = "0"+data[i].hour;
                if(data[i].minute < 10)
                    data[i].minute = "0"+data[i].minute;
                
                data[i].dayname = this.getDayName(data[i].day);
            }
        }

        this.templateData = {
            "page-title":jQuery.i18n.map["reports.title"],
            "data":data,
            "apps":countlyGlobal['apps'],
            "member":countlyGlobal["member"]
        };
		var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
			
        }
    }
});

//register views
app.reportingView = new ReportingView();

app.route('/manage/reports', 'reports', function () {
	this.renderWhenReady(this.reportingView);
});

$( document ).ready(function() {
	if(countlyGlobal["member"].global_admin){
        var menu = '<a href="#/manage/reports" class="item">'+
            '<div class="logo-icon fa fa-envelope"></div>'+
            '<div class="text" data-localize="reports.title"></div>'+
        '</a>';
        if($('#management-submenu .help-toggle').length)
            $('#management-submenu .help-toggle').before(menu);
    }
});