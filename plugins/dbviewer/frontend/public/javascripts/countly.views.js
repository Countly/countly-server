window.DBViewerView = countlyView.extend({
	initialize:function () {
		this.filter = (store.get("countly_collectionfilter")) ? store.get("countly_collectionfilter") : "{}";
		this.limit = (store.get("countly_limitfilter")) ? store.get("countly_limitfilter") : 20;
		this.selected_projection = (store.get('dbviewer_projection_values') ? store.get('dbviewer_projection_values'): "");
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
		var self = this;
		var dbs = countlyDBviewer.getData();
		this.templateData["dbs"] = dbs;
		$(this.el).html(this.template(this.templateData));
		this.accordion();
		// handle when input value changed
		$('.collection-filter-input').on("change paste keyup", function() {
			self.renderSearchResults($(this));				
		});
	},
	renderDb:function(){
		var dbs = countlyDBviewer.getData();
		this.templateData["dbs"] = dbs;
		this.templateData["db"] = this.db;
		$(this.el).html(this.template(this.templateData));
		this.accordion();
	},
	renderSearchResults: function(el) {
		var searchText = new RegExp(el.val().toLowerCase().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')),
            searchInside = el.parent().next().find(".searchable");
		searchInside.filter(function () {
            return !(searchText.test($(this).text().toLowerCase()));
        }).css('display', 'none');
	    searchInside.filter(function () {
            return searchText.test($(this).text().toLowerCase());
        }).css('display', 'block');
    },
	renderCollections:function(){
		var self = this;
		$.when(countlyDBviewer.loadCollections(this.db, this.collection, this.page, this.filter, this.limit, this.sort, this.projection, this.isSort)).then(function () {
			var dbs = countlyDBviewer.getData();
			var data = countlyDBviewer.getCollections();
			// sorting option is active?
			self.isSort = false;
			self.templateData["dbs"] = dbs;
			self.templateData["db"] = self.db;
			self.templateData["collection"] = self.collection;
			self.templateData["placeholder"] = {"_id":"some_id"};
			self.templateData["data"] = data;
			self.templateData["prev"] = Math.max(1, data.curPage-1);
			self.templateData["next"] = Math.min(data.pages, data.curPage+1);
			self.templateData["start"] = Math.max(1, data.curPage-5);
			self.templateData["end"] = Math.min(data.pages, data.curPage+5);
			// save selected projection values for next render
			$('#dbviewer-projection').val(self.selected_projection);
			$(self.el).html(self.template(self.templateData));
			self.accordion();
			if(self.filter != "{}"){
				$(".dbviewer-collection-filter").val(self.filter);
			}
			var qstring = {
                    api_key: countlyGlobal["member"].api_key,
                    db: self.db,
                    collection: self.collection,
                    query:self.filter,
                    sort: self.sort,
                    projection: self.projection
                };
            new CountlyDrop({
                target: document.querySelector('#dbviewer-export-button'),
                content: CountlyHelpers.export(data.total, qstring).removeClass("dialog")[0],
                position: 'right middle',
                remove:true,
                openOn: 'click'
			});
			// options array for sorting & projection inputs
			var options = [];
			
			// try to convert array properties of current collection
			try {
				Object.keys(data.collections[1]).forEach(function(d) {
					options.push({"key":d});
				})	
				store.set('countly_collectionoptions', JSON.stringify(options));
				self.isSort = true;
			} catch (NoData) {
				console.info("Schema couldn't created.")
				// if there is no result for current query
				// hide sorting options
				// and set isSort option as false
				$('#dbviewer-sort-area').css({"display":"none"});
				$('#dbviewer-show-sort-wrapper').css({"display":"none"});
				self.isSort = false;
			}
			// jQuery selectize handler for projection input
			$('#dbviewer-projection').selectize({
			    persist: false,
			    maxItems: null,
			    valueField: 'key',
			    labelField: 'key',
			    searchField: ['key'],
			    options: options,
			    render: {
			        item: function(item, escape) {
			            return '<div>' +
			                item.key +
			            '</div>';
			        },
			        option: function(item, escape) {
			            var label = item.key;
			            var caption = item.key;
			            return '<div>' +
			                '<span class="label">' + label + '</span>' +
			            '</div>';
			        }
				},
				createFilter: function(input) {
			        return true;
			    },
			    create: function(input) {
			        return {
			        	"key":input
			        }
			    }
			});
			// add previous values to projection input
			self.selected_projection.split(",").forEach((p) =>  $(".selectize-input").prepend("<div data-value='"+p+"'>"+p+"</div>"));
			// render sort options
            options.forEach((o) => $('#dbviewer-sort_param').append('<option value="'+o.key+'">'+o.key+'</option>'));
			// collection name filter at the left side
			// also called as collection search
            $(".dbviewer-collection-filter").on("change paste keyup", function() {
				var jsonlint = false;
				try {
					var o = window.jsonlite.parse($(this).val());
					jsonlint = o && typeof o === 'object';
				} catch(e){
					jsonlint = false;
				}
				if (jsonlint) {
					$(this).val(JSON.stringify(o));
					$('.dbviewer-correct-json').css({"display":'block'});
					$('.dbviewer-incorrect-json').css({"display":'none'});
					$("#dbviewer-collection-filter").css({'padding':'3px','border':'1px solid #2FA732','background-color':'#2FA732','color':'white'});
				}
				else {
					$('.dbviewer-correct-json').css({"display":'none'});
					$('.dbviewer-incorrect-json').css({"display":'block'});
					$("#dbviewer-collection-filter").css({'padding':'3px','border':'1px solid #D63E40','background-color':'#D63E40','color':'white'});	
				} 
			});
			/*jQuery Show-Hide Event Handlers*/
			$('.dbviewer-filter-show').on('click', function() {
				$('.dbviewer-filter-area').css({"display":"block"});
				$('.dbviewer-filter-hide').css({"display":"inline-block"});
				$('.dbviewer-filter-show').css({"display":"none"});
			})
			$('.dbviewer-filter-hide').on('click', function() {
				$('.dbviewer-filter-area').css({"display":"none"});
				$('.dbviewer-filter-hide').css({"display":"none"});
				$('.dbviewer-filter-show').css({"display":"inline-block"});
			})
			$('#dbviewer-show-projection').change(function() {
		        if($(this).is(":checked")) {
		            $("#dbviewer-projection-area").css({"display":"block"});
		        } else {
		        	$("#dbviewer-projection-area").css({"display":"none"});
		        }
		    });
			$('#dbviewer-show-manuel-projection-input').change(function() {
		    	if($(this).is(":checked")) {
		            $("#dbviewer-manuel-projection-input").css({"display":"block"});
		        } else {
		        	$("#dbviewer-manuel-projection-input").css({"display":"none"});
		        }
		    })
			// sorting type event listener
			$('#dbviewer-show-sort').change(function() {
		        if($(this).is(":checked")) {
		            $("#dbviewer-sort-area").css({"display":"block"});
		        } else {
		        	$("#dbviewer-sort-area").css({"display":"none"});
		        }
		    });
			// when the filter button fired
			$("#dbviewer-apply-filter-button").on('click', function() {
				var projection = {};
				$('.dbviewer-filter-status').css({"display":"block"});
				if ($('#dbviewer-projection').val() !== "") {
					store.set('dbviewer_projection_values', $('#dbviewer-projection').val());
					self.selected_projection = $('#dbviewer-projection').val();
					$('#dbviewer-projection').val().split(",").forEach((p) =>  projection[p] = 1)
				}
				self.projection = JSON.stringify(projection);
				var filter = $(".dbviewer-collection-filter").val() == "" ? JSON.stringify({}) : JSON.stringify($(".collection-filter").val());
				self.filter = filter;
				var sort = {};
				if ($('#dbviewer-sort_param').val() !== "") {
					sort[$("#dbviewer-sort_param").val()] = parseInt($('#dbviewer-sort_type').val());	
				}
				self.sort = JSON.stringify(sort);
				store.set("countly_collectionfilter", self.filter);
				store.set("countly_collectionsort", self.sort);
				store.set("countly_collecitonprojection", self.projection)
				if(Backbone.history.fragment === "/manage/db/"+self.db+"/"+self.collection)
                    self.renderCollections();
                else
                    app.navigate("#/manage/db/"+self.db+"/"+self.collection, true);
            });
			$(".result-limit").val(self.limit);
			$(".result-limit").change(function(){
				self.limit = this.value;
				store.set("countly_limitfilter", self.limit);
				window.location.reload(true);
			});
			// handle when input value changed
			$('.dbviewer-collection-filter-input').on("change paste keyup", function() {
				self.renderSearchResults($(this));				
			});
			$('.dbviewer-gray-area').css({"display":"block"});
			$('.dbviewer-back-button').css({"display":"block"});
			$('.dbviewer-documents-area').css({"border-right":"1px solid #DBDBDB","border-left":"1px solid #DBDBDB","border-bottom":"1px solid #DBDBDB"});
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

$( document ).ready(function() {
    if(!production){
        CountlyHelpers.loadJS("dbviewer/javascripts/json.human.js");
    }
    var menu = '<a href="#/manage/db" class="item">'+
        '<div class="logo-icon fa fa-database"></div>'+
        '<div class="text" data-localize="dbviewer.title"></div>'+
    '</a>';
    if($('#management-submenu .help-toggle').length)
        $('#management-submenu .help-toggle').before(menu);
});