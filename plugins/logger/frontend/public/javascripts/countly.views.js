window.LoggerView = countlyView.extend({
	initialize:function () {
		this.filter = (store.get("countly_loggerfilter")) ? store.get("countly_loggerfilter") : "logger-all";
    },
    beforeRender: function() {
		if(this.template)
			return $.when(countlyLogger.initialize()).then(function () {});
		else{
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/logger/templates/logger.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlyLogger.initialize()).then(function () {});
		}
    },
    renderCommon:function (isRefresh) {
        var data = countlyLogger.getData();
        this.templateData = {
            "page-title":jQuery.i18n.map["logger.title"]
        };
		var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
			$("#"+this.filter).addClass("selected").addClass("active");
			$.fn.dataTableExt.afnFiltering.push(function( oSettings, aData, iDataIndex ) {
				if(!$(oSettings.nTable).hasClass("logger-filter"))
					return true;
				if((self.filter == "logger-event" && aData[0] != "Event") || (self.filter == "logger-session" && aData[0] != "Session") || (self.filter == "logger-metric" && aData[0] != "Metrics") || (self.filter == "logger-user" && aData[0] != "User details") || (self.filter == "logger-crash" && aData[0] != "Crash")){
					return false
				}
				return true;
			});

			this.dtable = $('#logger-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": data,
                "aoColumns": [
                    { "mData": function(row, type){return row.t.charAt(0).toUpperCase() + row.t.slice(1).replace(/_/g, " ");}, "sType":"string", "sTitle": jQuery.i18n.map["logger.type"]},
                    { "mData": function(row, type){
						if(type == "display"){
							return moment(row.ts*1000).format("MMMM Do YYYY, hh:mm:ss");
						}else return row.ts;}, "sType":"string", "sTitle": jQuery.i18n.map["logger.timestamp"] },
                    { "mData": function(row, type){
						if(type == "display"){
							return moment(row.reqts*1000).format("MMMM Do YYYY, hh:mm:ss");
						}else return row.reqts;}, "sType":"string", "sTitle": jQuery.i18n.map["logger.requestts"]},
                    { "mData": function(row, type){if(row.v)return row.v.replace(new RegExp(":", 'g'),"."); else return "";}, "sType":"string", "sTitle": jQuery.i18n.map["logger.version"]},
                    { "mData": function(row, type){
						var ret = "Device ID: " + row.d.id;
						if(row.d.d){
							ret += "<br/>"+row.d.d;
							if(row.d.p){
								ret += " ("+row.d.p;
								if(row.d.pv){
									ret += " "+row.d.pv.substring(1).replace(new RegExp(":", 'g'),".");
								}
								ret += ")";
							}
						}
						return ret;}, "sType":"string", "sTitle": jQuery.i18n.map["logger.device"]},
                    { "mData": function(row, type){if(row.s)return (row.s.name || "")+" "+(row.s.version || ""); else return "";}, "sType":"string", "sTitle": jQuery.i18n.map["logger.sdk"]},
                    { "mData": function(row, type){
						var ret = "";
						if(row.l.cc){
							ret += '<div class="flag" style="background-image: url(images/flags/'+ row.l.cc.toLowerCase() + '.png);"></div>'+row.l.cc;
							if(row.l.cty){
								ret += " ("+row.l.cty+")";
							}
						}
						if(row.l.ip){
							ret += "<br/>"+row.l.ip;
						}
						return ret;}, "sType":"string", "sTitle": jQuery.i18n.map["logger.location"]},
                    { "mData": function(row, type){
						if(typeof row.i == "object")
							return "<pre style='white-space:pre-wrap;'>"+JSON.stringify(row.i, null, 2)+"</pre>";
						else
							return row.i;}, "sType":"string", "sTitle": jQuery.i18n.map["logger.info"]}
                ]
            }));
			this.dtable.stickyTableHeaders();
			this.dtable.fnSort( [ [1,'desc'] ] );
        }
    },
    refresh:function () {
        var self = this;
        $.when(countlyLogger.initialize()).then(function () {
            if (app.activeView != self) {
                return false;
            }
             var data = countlyLogger.getData();
			CountlyHelpers.refreshTable(self.dtable, data);
            app.localize();
        });
    },
	filterLog: function(filter){
		this.filter = filter;
		store.set("countly_loggerfilter", filter);
		$("#"+this.filter).addClass("selected").addClass("active");
		this.dtable.fnDraw();
	}
});

//register views
app.loggerView = new LoggerView();

app.route('/manage/logger', 'logger', function () {
	this.renderWhenReady(this.loggerView);
});
app.addPageScript("/manage/logger", function(){
   $("#logger-selector").find(">.button").click(function () {
        if ($(this).hasClass("selected")) {
            return true;
        }

        $(".logger-selector").removeClass("selected").removeClass("active");
		var filter = $(this).attr("id");
		app.activeView.filterLog(filter);
    });
});

$( document ).ready(function() {
	var menu = '<a href="#/manage/logger" class="item">'+
		'<div class="logo-icon fa fa-bars"></div>'+
		'<div class="text" data-localize="logger.title"></div>'+
	'</a>';
	if($('#management-submenu .help-toggle').length)
		$('#management-submenu .help-toggle').before(menu);
});