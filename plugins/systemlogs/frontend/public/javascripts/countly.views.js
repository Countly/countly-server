window.SystemLogsView = countlyView.extend({
	initialize:function () {
		
    },
    beforeRender: function() {
		if(this.template)
			return $.when(countlySystemLogs.initialize()).then(function () {});
		else{
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/systemlogs/templates/logs.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlySystemLogs.initialize()).then(function () {});
		}
    },
    renderCommon:function (isRefresh) {
        var data = countlySystemLogs.getData();
        this.templateData = {
            "page-title":jQuery.i18n.map["systemlogs.title"]
        };
		var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

			this.dtable = $('#systemlogs-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": data,
                "aoColumns": [
                    { "mData": function(row, type){
						if(type == "display"){
							return moment(row.ts*1000).format("MMMM Do YYYY, hh:mm:ss");
						}else return row.ts;}, "sType":"string", "sTitle": jQuery.i18n.map["systemlogs.timestamp"] },
					{ "mData": function(row, type){return row.u;}, "sType":"string", "sTitle": jQuery.i18n.map["systemlogs.user"]},
					{ "mData": function(row, type){return row.a;}, "sType":"string", "sTitle": jQuery.i18n.map["systemlogs.action"]},
                    { "mData": function(row, type){return row.ip;}, "sType":"string", "sTitle": jQuery.i18n.map["systemlogs.ip-address"]},
                    { "mData": function(row, type){
						if(typeof row.i == "object")
							return "<pre style='white-space:pre-wrap;'>"+JSON.stringify(row.i, null, 2)+"</pre>";
						else
							return row.i;}, "sType":"string", "sTitle": jQuery.i18n.map["systemlogs.info"], "bSortable": false }
                ]
            }));
			this.dtable.stickyTableHeaders();
			this.dtable.fnSort( [ [0,'desc'] ] );
        }
    },
    refresh:function () {
        var self = this;
        $.when(countlySystemLogs.initialize()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            var data = countlySystemLogs.getData();
			CountlyHelpers.refreshTable(self.dtable, data);
            app.localize();
        });
    }
});

//register views
app.systemLogsView = new SystemLogsView();
if(countlyGlobal["member"].global_admin){
    app.route('/manage/systemlogs', 'systemlogs', function () {
        this.renderWhenReady(this.systemLogsView);
    });
}

$( document ).ready(function() {
    if(countlyGlobal["member"].global_admin){
        var menu = '<a href="#/manage/systemlogs" class="item">'+
            '<div class="logo-icon fa fa-user-secret"></div>'+
            '<div class="text" data-localize="systemlogs.title"></div>'+
        '</a>';
        if($('#management-submenu .help-toggle').length)
            $('#management-submenu .help-toggle').before(menu);
    }
});