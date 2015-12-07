window.DBViewerView = countlyView.extend({
	initialize:function () {
		this.filter = (store.get("countly_collectionfilter")) ? store.get("countly_collectionfilter") : "{}";
		this.limit = (store.get("countly_limitfilter")) ? store.get("countly_limitfilter") : 20;
	},
    beforeRender: function() {
		if(this.template)
			return $.when(countlyDBviewer.initialize()).then(function () {});
		else{
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/dbviewer/templates/dbviewer.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlyDBviewer.initialize()).then(function () {});
		}
    },
    renderCommon:function (isRefresh) {
		this.templateData = {
			"page-title":jQuery.i18n.map["dbviewer.title"],
			"back":jQuery.i18n.map["dbviewer.back"]
		};
		if(this.document){
			this.renderDocument();
		}
		else if(this.collection){
			this.page = this.page || 1;
			this.renderCollections();
		}
		else if(this.db){
			this.renderDb();
		}
		else{
			this.renderMain();
		}
    },
    refresh:function () {},
	renderMain:function(){
		var dbs = countlyDBviewer.getData();
		this.templateData["dbs"] = dbs;
		$(this.el).html(this.template(this.templateData));
		this.accordion();
	},
	renderDb:function(){
		var dbs = countlyDBviewer.getData();
		this.templateData["dbs"] = dbs;
		this.templateData["db"] = this.db;
		$(this.el).html(this.template(this.templateData));
		this.accordion();
	},
	renderCollections:function(){
		var self = this;
		$.when(countlyDBviewer.loadCollections(this.db, this.collection, this.page, this.filter, this.limit)).then(function () {
			var dbs = countlyDBviewer.getData();
			var data = countlyDBviewer.getCollections();
			self.templateData["dbs"] = dbs;
			self.templateData["db"] = self.db;
			self.templateData["collection"] = self.collection;
			self.templateData["placeholder"] = {"_id":"some_id"};
			self.templateData["data"] = data;
			self.templateData["prev"] = Math.max(1, data.curPage-1);
			self.templateData["next"] = Math.min(data.pages, data.curPage+1);
			self.templateData["start"] = Math.max(1, data.curPage-5);
			self.templateData["end"] = Math.min(data.pages, data.curPage+5);
			$(self.el).html(self.template(self.templateData));
			self.accordion();
			if(self.filter != "{}"){
				$(".collection-filter").val(self.filter);
			}
			$("#collection-filter").on('click', function() {
				var filter = $(".collection-filter").val();
				//if()
				self.filter = filter;
				store.set("countly_collectionfilter", self.filter);
				window.location.reload(true);
			});
			$(".result-limit").val(self.limit);
			$(".result-limit").change(function(){
				self.limit = this.value;
				store.set("countly_limitfilter", self.limit);
				window.location.reload(true);
			});
		});
	},
	renderDocument:function(){
		var self = this;
		$.when(countlyDBviewer.loadDocument(this.db, this.collection, this.document)).then(function () {
			var dbs = countlyDBviewer.getData();
			var data = countlyDBviewer.getDocument();
			self.templateData["dbs"] = dbs;
			self.templateData["db"] = self.db;
			self.templateData["collection"] = self.collection;
			self.templateData["document"] = self.document;
			self.templateData["data"] = data;
			self.templateData["page"] = self.page || 1;
			$(self.el).html(self.template(self.templateData));
			var node = JsonHuman.format(data);
			$("#mongodocument").append(node);
			self.accordion();
		});
	},
	accordion:function(){
		var self = this;
		$( "#accordion" ).accordion({
			collapsible: true,
			active: (self.db == "countly_drill") ? 1 : 0
		});
		$("#accordion a").removeClass("selected");
		$("#accordion a[href='#" + Backbone.history.fragment + "']").addClass("selected");
	}
});

//register views
app.dbviewerView = new DBViewerView();

if(countlyGlobal["member"].global_admin){
app.route('/manage/db', 'db', function () {
	this.dbviewerView.db = null;
	this.dbviewerView.collection = null;
	this.dbviewerView.document = null;
	this.dbviewerView.page = null;
	this.renderWhenReady(this.dbviewerView);
});

app.route('/manage/db/:dbs', 'dbs', function (db) {
	this.dbviewerView.db = db;
	this.dbviewerView.collection = null;
	this.dbviewerView.document = null;
	this.dbviewerView.page = null;
	this.renderWhenReady(this.dbviewerView);
});

app.route('/manage/db/:dbs/:collection', 'dbs', function (db, collection) {
	this.dbviewerView.db = db;
	this.dbviewerView.collection = collection;
	this.dbviewerView.document = null;
	this.dbviewerView.page = null;
	if(store.get("countly_collection") != collection){
		store.set("countly_collectionfilter", "{}");
		store.set("countly_collection", collection);
		this.dbviewerView.filter = "{}";
	}
	this.renderWhenReady(this.dbviewerView);
});

app.route('/manage/db/:dbs/:collection/:document', 'dbs', function (db, collection, document) {
	this.dbviewerView.db = db;
	this.dbviewerView.collection = collection;
	this.dbviewerView.document = document;
	this.renderWhenReady(this.dbviewerView);
});

app.route('/manage/db/:dbs/:collection/page/:page', 'dbs', function (db, collection, page) {
	this.dbviewerView.db = db;
	this.dbviewerView.collection = collection;
	this.dbviewerView.document = null;
	this.dbviewerView.page = parseInt(page);
	if(store.get("countly_collection") != collection){
		store.set("countly_collectionfilter", "{}");
		this.dbviewerView.filter = "{}";
		store.set("countly_collection", collection);
	}
	this.renderWhenReady(this.dbviewerView);
});
}

$( document ).ready(function() {
    Handlebars.registerHelper('withItem', function(object, options) {
        return options.fn(object[options.hash.key]);
    });
    if(!production){
        CountlyHelpers.loadJS("dbviewer/javascripts/json.human.js");
    }
    if(countlyGlobal["member"].global_admin){
        var menu = '<a href="#/manage/db" class="item">'+
            '<div class="logo-icon fa fa-database"></div>'+
            '<div class="text" data-localize="dbviewer.title"></div>'+
        '</a>';
        if($('#management-submenu .help-toggle').length)
            $('#management-submenu .help-toggle').before(menu);
    }
});