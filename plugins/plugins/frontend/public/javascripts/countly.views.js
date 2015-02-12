window.PluginsView = countlyView.extend({
	initialize:function () {
		this.filter = (store.get("countly_pluginsfilter")) ? store.get("countly_pluginsfilter") : "plugins-all";
    },
    beforeRender: function() {
		if(this.template)
			return $.when(countlyPlugins.initialize()).then(function () {});
		else{
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/plugins/templates/plugins.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlyPlugins.initialize()).then(function () {});
		}
    },
    renderCommon:function (isRefresh) {
		
        var pluginsData = countlyPlugins.getData();
        this.templateData = {
            "page-title":jQuery.i18n.map["plugins.title"],
            "logo-class":"frequency"
        };
		var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
			$("#"+this.filter).addClass("selected").addClass("active");
			$.fn.dataTableExt.afnFiltering.push(function( oSettings, aData, iDataIndex ) {
				if(!$(oSettings.nTable).hasClass("plugins-filter"))
					return true;
				if((self.filter == "plugins-enabled" && !aData[3]) || (self.filter == "plugins-disabled" && aData[3])){
					return false
				}
				return true;
			});

			this.dtable = $('#plugins-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": pluginsData,
                "aoColumns": [
                    { "mData": function(row, type){return row.title;}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.name"]},
                    { "mData": function(row, type){return row.description;}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.description"] },
                    { "mData": function(row, type){return row.version;}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.version"], "sClass":"center" },
                    { "mData": function(row, type){if(type == "display"){ if(!row.enabled) return '<a class="icon-button green btn-header btn-plugins" id="plugin-'+row.code+'">'+jQuery.i18n.map["plugins.enable"]+'</a>'; else return '<a class="icon-button red btn-header btn-plugins" id="plugin-'+row.code+'">'+jQuery.i18n.map["plugins.disable"]+'</a>';}else return row.enabled;}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.action"], "sClass":"shrink center"},
					{ "mData": function(row, type){if(row.homepage != "") return '<a class="icon-button btn-header light" href="'+ row.homepage + '" target="_blank">'+jQuery.i18n.map["plugins.homepage"]+'</a>'; else return "";}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.homepage"], "sClass":"shrink center"}
                ]
            }));
			this.dtable.stickyTableHeaders();
			this.dtable.fnSort( [ [0,'asc'] ] );
        }
    },
    refresh:function () {
        var self = this;
        $.when(countlyPlugins.initialize()).then(function () {
            if (app.activeView != self) {
                return false;
            }
             var pluginsData = countlyPlugins.getData();
			CountlyHelpers.refreshTable(self.dtable, pluginsData);
            app.localize();
        });
    },
	togglePlugin: function(plugin, state){
		var self = this;
		if(state)
			$("#plugin-install").text(jQuery.i18n.map["plugins.install"]);
		else
			$("#plugin-install").text(jQuery.i18n.map["plugins.uninstall"]);
		$("#plugin-name").text(plugin);
		$("#plugins-message").fadeIn();
		countlyPlugins.toggle(plugin, state, function(){
			var seconds = 10;
			$("#plugin-restart").text(seconds);
			$("#plugin-restarting").show();
			setInterval(function(){
				seconds--;
				$("#plugin-restart").text(seconds);
			}, 1000);
			setTimeout(function(){
				window.location.reload(true);
			}, seconds*1000);
		});
	},
	filterPlugins: function(filter){
		this.filter = filter;
		store.set("countly_pluginsfilter", filter);
		$("#"+this.filter).addClass("selected").addClass("active");
		this.dtable.fnDraw();
	}
});

//register views
app.pluginsView = new PluginsView();

app.route('/manage/plugins', 'plugins', function () {
	this.renderWhenReady(this.pluginsView);
});
app.addPageScript("/manage/plugins", function(){
   $("#plugins-selector").find(">.button").click(function () {
        if ($(this).hasClass("selected")) {
            return true;
        }

        $(".plugins-selector").removeClass("selected").removeClass("active");
		var filter = $(this).attr("id");
		app.activeView.filterPlugins(filter);
    });
	$("#plugins-table").on("click", ".btn-plugins", function () {
			var plugin = this.id.toString().replace(/^plugin-/, '');
			var state = ($(this).hasClass("green")) ? true : false;
			var text;
		if(state)
			text = jQuery.i18n.map["plugins.enable-confirm"];
		else
			text = jQuery.i18n.map["plugins.disable-confirm"];
		CountlyHelpers.confirm(text, "red", function (result) {
			if (!result) {
				return true;
			}
			app.activeView.togglePlugin(plugin, state);
		});
	});
});

app.addPageScript("#", function(){
	if (Backbone.history.fragment == '/manage/plugins') {
        $("#sidebar-app-select").addClass("disabled");
        $("#sidebar-app-select").removeClass("active");
    }
});

$( document ).ready(function() {
	if(countlyGlobal["member"] && countlyGlobal["member"]["global_admin"]){
		var menu = '<a href="#/manage/plugins" class="item">'+
			'<div class="logo-icon icon-gears"></div>'+
			'<div class="text" data-localize="plugins.title"></div>'+
		'</a>';
		if($('#management-submenu .help-toggle').length)
			$('#management-submenu .help-toggle').before(menu);
	}
});