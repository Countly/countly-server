window.ErrorLogsView = countlyView.extend({
	initialize:function () {
		
	},
    beforeRender: function() {
		if(this.template)
			return $.when(countlyErrorLogs.initialize()).then(function () {});
		else{
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/errorlogs/templates/logs.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlyErrorLogs.initialize()).then(function () {});
		}
    },
    renderCommon:function (isRefresh) {
		var data = countlyErrorLogs.getData();
        var download = countlyGlobal["path"]+"/o/errorlogs?api_key="+countlyGlobal.member.api_key+"&app_id="+countlyCommon.ACTIVE_APP_ID+"&download=true&log=";
        this.templateData = {
            "page-title":jQuery.i18n.map["errorlogs.title"],
            download: download,
            logs: data
        };
        var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            $( "#tabs" ).tabs();
            $(".btn-clear-log").on("click", function(){
				var id = $(this).data("id");
				CountlyHelpers.confirm(jQuery.i18n.map["errorlogs.confirm-delete"], "red", function (result) {
					if (!result) {
						return true;
					}
					$.when(countlyErrorLogs.del(id)).then(function (data) {
						if(data.result == "Success"){
							$.when(countlyErrorLogs.initialize()).then(function () {
                                self.renderCommon();
                                app.localize();
                            });
						}
						else{
							CountlyHelpers.alert(data.result, "red");
						}
					});
				});
			});
        }
    },
    refresh:function () {
    }
});


//register views
app.errorLogsView = new ErrorLogsView();
if(countlyGlobal["member"].global_admin){
    app.route('/manage/errorlogs', 'errorlogs', function () {
        this.renderWhenReady(this.errorLogsView);
    });
}

$( document ).ready(function() {
    if(countlyGlobal["member"].global_admin){
        var menu = '<a href="#/manage/errorlogs" class="item">'+
            '<div class="logo-icon fa fa-exclamation-triangle"></div>'+
            '<div class="text" data-localize="errorlogs.title"></div>'+
        '</a>';
        if($('#management-submenu .help-toggle').length)
            $('#management-submenu .help-toggle').before(menu);
    }
});