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
            "page-title":jQuery.i18n.map["plugins.title"]
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
                    { "mData": function(row, type){if(type == "display"){ if(!row.enabled) return '<a class="icon-button green btn-header btn-plugins" id="plugin-'+row.code+'">'+jQuery.i18n.map["plugins.enable"]+'</a>'; else return '<a class="icon-button red btn-header btn-plugins" id="plugin-'+row.code+'">'+jQuery.i18n.map["plugins.disable"]+'</a>';}else return row.enabled;}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.state"], "sClass":"shrink center"},
					{ "mData": function(row, type){if(row.homepage != "") return '<a class="icon-button btn-header light" href="'+ row.homepage + '" target="_blank">'+jQuery.i18n.map["plugins.homepage"]+'</a>'; else return "";}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.homepage"], "sClass":"shrink center"}
                ]
            }));
			this.dtable.stickyTableHeaders();
			this.dtable.fnSort( [ [0,'asc'] ] );
        }
    },
    refresh:function (){
    },
	togglePlugin: function(plugins){
		var self = this;
		var overlay = $("#overlay").clone();
		$("body").append(overlay);
		overlay.show();
		var loader = $(this.el).find("#content-loader");
		loader.show();
		countlyPlugins.toggle(plugins, function(res){
			var msg = {clearAll:true};
			if(res == "Success" || res == "Errors"){
				var seconds = 10;
				if(res == "Success"){
					msg.title = jQuery.i18n.map["plugins.success"];
					msg.message = jQuery.i18n.map["plugins.restart"]+" "+seconds+" "+jQuery.i18n.map["plugins.seconds"];
					msg.info = jQuery.i18n.map["plugins.finish"];
					msg.delay = seconds*1000;
				}
				else if(res == "Errors"){
					msg.title = jQuery.i18n.map["plugins.errors"];
					msg.message = jQuery.i18n.map["plugins.errors-msg"];
					msg.info = jQuery.i18n.map["plugins.restart"]+" "+seconds+" "+jQuery.i18n.map["plugins.seconds"];
					msg.sticky = true;
					msg.type = "error";
				}
				setTimeout(function(){
					window.location.reload(true);
				}, seconds*1000);
			}
			else{
				overlay.hide();
				loader.hide();
				msg.title = jQuery.i18n.map["plugins.error"];
				msg.message = res;
				msg.info = jQuery.i18n.map["plugins.retry"];
				msg.sticky = true;
				msg.type = "error";
			}
			CountlyHelpers.notify(msg);
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
	var plugins = countlyGlobal["plugins"].slice();
	$("#plugins-table").on("click", ".btn-plugins", function () {
		var show = false;
		var plugin = this.id.toString().replace(/^plugin-/, '');
		if($(this).hasClass("green")){
			$(this).removeClass("green").addClass("red");
			$(this).text(jQuery.i18n.map["plugins.disable"]);
			plugins.push(plugin);
		}
		else if($(this).hasClass("red")){
			$(this).removeClass("red").addClass("green");
			$(this).text(jQuery.i18n.map["plugins.enable"]);
			var index = $.inArray(plugin, plugins);
			plugins.splice(index, 1);
		}
		if(plugins.length != countlyGlobal["plugins"].length)
			show = true;
		else{
			for(var i = 0; i < plugins.length; i++){
				if($.inArray(plugins[i], countlyGlobal["plugins"]) == -1){
					show = true;
					break;
				}
			}
		}
		if(show)
			$(".btn-plugin-enabler").show();
		else
			$(".btn-plugin-enabler").hide();
	});
	$("#plugins-selector").on("click", ".btn-plugin-enabler", function () {
		var plugins = {};
		$(".btn-plugins").each(function(){
			var plugin = this.id.toString().replace(/^plugin-/, '');
			var state = ($(this).hasClass("green")) ? false : true;
			plugins[plugin] = state;
		})
		var text = jQuery.i18n.map["plugins.confirm"];
		var msg = {title:jQuery.i18n.map["plugins.processing"], message: jQuery.i18n.map["plugins.wait"], info:jQuery.i18n.map["plugins.hold-on"], sticky:true};
		CountlyHelpers.confirm(text, "red", function (result) {
			if (!result) {
				return true;
			}
			CountlyHelpers.notify(msg);
			app.activeView.togglePlugin(plugins);
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
			'<div class="logo-icon fa fa-puzzle-piece"></div>'+
			'<div class="text" data-localize="plugins.title"></div>'+
		'</a>';
		if($('#management-submenu .help-toggle').length)
			$('#management-submenu .help-toggle').before(menu);
	}
});