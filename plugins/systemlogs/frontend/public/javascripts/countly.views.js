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
        var meta = countlySystemLogs.getMetaData();
        var activeAction = jQuery.i18n.map["systemlogs.all-actions"];
        var activeUser = jQuery.i18n.map["systemlogs.all-users"];

        if(this._query){
            if(this._query.a){
                activeAction = jQuery.i18n.prop("systemlogs.action."+this._query.a);
            }

            if(this._query.user_id){
                for(var i = 0; i < meta.users.length; i++){
                    if(meta.users[i]._id == this._query.user_id){
                        activeUser = meta.users[i].full_name;
                        break;
                    }
                }
            }
        }

        this.templateData = {
            "page-title":jQuery.i18n.map["systemlogs.title"],
            "active-action": activeAction,
            "actions": meta.a,
            "active-user": activeUser,
            "users": meta.users,
            query: this._query
        };

		var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            $("#systemlogs-back").click(function(){
                window.history.back();
            });

			this.dtable = $('#systemlogs-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "bServerSide": true,
                "sAjaxSource": countlyCommon.API_PARTS.data.r + "?api_key="+countlyGlobal.member.api_key+"&app_id="+countlyCommon.ACTIVE_APP_ID+"&method=systemlogs",
                "fnServerData": function ( sSource, aoData, fnCallback ) {
                    $.ajax({
                        "dataType": 'json',
                        "type": "POST",
                        "url": sSource,
                        "data": aoData,
                        "success": function(data){
                                fnCallback(data);
                        }
                    });
                },
                "fnServerParams": function ( aoData ) {
                    if(self._query){
                        aoData.push({ "name": "query", "value": JSON.stringify(self._query) });
                    }
                },
                "aoColumns": [
                    { "mData": function(row, type){
						if(type == "display"){
							return moment(row.ts*1000).format("D MMM YYYY, hh:mm:ss");
						}else return row.ts;}, "sType":"string", "sTitle": jQuery.i18n.map["systemlogs.timestamp"] },
					{ "mData": function(row, type){return row.u;}, "sType":"string", "sTitle": jQuery.i18n.map["systemlogs.user"]},
					{ "mData": function(row, type){return (jQuery.i18n.map["systemlogs.action."+row.a]) ? jQuery.i18n.map["systemlogs.action."+row.a] : row.a;}, "sType":"string", "sTitle": jQuery.i18n.map["systemlogs.action"]},
                    { "mData": function(row, type){return row.ip;}, "sType":"string", "sTitle": jQuery.i18n.map["systemlogs.ip-address"]},
                    { "mData": function(row, type){
						if(typeof row.i == "object")
							return "<pre>"+JSON.stringify(row.i, null, 2)+"</pre>";
						else
							return row.i;}, "sType":"string", "sTitle": jQuery.i18n.map["systemlogs.info"], "bSortable": false }
                ],
                "fnDrawCallback": function(settings) {
                    $('#systemlogs-table').find("pre").each(function(i, block) {
                        if(typeof hljs != "undefined") {
                            hljs.highlightBlock(block);
                        }
                    });
                }
            }));

			this.dtable.stickyTableHeaders();
			this.dtable.fnSort( [ [0,'desc'] ] );

            $(".action-segmentation .segmentation-option").on("click", function () {
                if(!self._query)
                    self._query = {};
                self._query.a = $(this).data("value");
                if(self._query.a === "")
                    delete self._query.a;
                app.navigate("#/manage/systemlogs/"+JSON.stringify(self._query));
                self.refresh();
			});

            $(".user-segmentation .segmentation-option").on("click", function () {
                if(!self._query)
                    self._query = {};
                self._query.user_id = $(this).data("value");
                if(self._query.user_id === "")
                    delete self._query.user_id;
                app.navigate("#/manage/systemlogs/"+JSON.stringify(self._query));
                self.refresh();
			});
        }
    },
    refresh:function () {
		this.dtable.fnDraw(false);
    }
});

//register views
app.systemLogsView = new SystemLogsView();
if(countlyGlobal["member"].global_admin){
    app.route('/manage/systemlogs', 'systemlogs', function () {
        this.systemLogsView._query = null;
        this.renderWhenReady(this.systemLogsView);
    });
    
    app.route('/manage/systemlogs/*query', 'systemlogs_query', function (query) {
        try{
            query = JSON.parse(query);
        }
        catch(ex){
            query = null;
        }
        this.systemLogsView._query = query;
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
    
    app.addPageScript("/manage/users", function(){
        setTimeout(function(){
            $("#user-table").on("click", "tr", function(){
                var container = $(this);
                if(container.find("td.details").length == 0){
                    setTimeout(function(){
                        container = container.next("tr");
                        var id = container.find(".user_id").val();
                        container.find(".button-container").append("<a class='icon-button light' data-localize='systemlogs.view-user-actions' href='#/manage/systemlogs/{\"user_id\":\""+id+"\"}'>"+jQuery.i18n.map["systemlogs.view-user-actions"]+"</a>");
                    }, 0);
                }
            });
        }, 1000);
    });
});