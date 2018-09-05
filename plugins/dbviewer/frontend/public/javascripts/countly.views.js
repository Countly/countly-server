window.DBViewerView = countlyView.extend({
    initialize: function() {
        this.dbviewer_selected_app = "all";
        this.filter = (store.get("countly_collectionfilter")) ? store.get("countly_collectionfilter") : "{}";
        this.limit = (store.get("countly_limitfilter")) ? store.get("countly_limitfilter") : 20;
        this.selected_projection = (store.get('dbviewer_projection_values') ? store.get('dbviewer_projection_values') : "");
    },
    beforeRender: function() {
        if (this.template) {
            return $.when(countlyDBviewer.initialize(this.dbviewer_selected_app)).then(function() { });
        }
        else {
            var self = this;
            return $.when($.get(countlyGlobal.path + '/dbviewer/templates/dbviewer.html', function(src) {
                self.template = Handlebars.compile(src);
            }), countlyDBviewer.initialize(self.dbviewer_selected_app)).then(function() { });
        }
    },
    renderCommon: function(isRefresh) {
        var self = this;
        this.templateData = {
            "page-title": jQuery.i18n.map["dbviewer.title"],
            "back": jQuery.i18n.map["dbviewer.back"]
        };
        if (this.document) {
            this.renderDocument();
        }
        else if (this.collection) {
            this.page = this.page || 1;
            this.renderCollections();
        }
        else if (this.db) {
            this.renderDb();
        }
        else {
            this.renderMain();
        }

        var prepareSwitch = function() {
            // check is not exist dbviewer_selected_app in localStorage
            if (!store.get('dbviewer_selected_app')) {
                var app_name = $.i18n.map["common.all"];
            }
            // clear app-list
            $('#app-list').html("");
            // prepend "all apps" link to list
            $('#app-list').prepend('<div data-value="all" class="app-option item" data-localize=""><span class="app-title-in-dropdown">' + $.i18n.map["common.all"] + '</span></div>');
            // append list items
            for (var key in countlyGlobal.apps) {
                $('#app-list').append('<div data-value="' + countlyGlobal.apps[key]._id + '" class="app-option item" data-localize=""><span class="app-title-in-dropdown">' + countlyGlobal.apps[key].name + '</span></div>');
            }
            // set height 
            if ($('#dbviewer').height() < (window.innerHeight - 150)) {
                $('#dbviewer').css({"height": (window.innerHeight - 150) + "px"});
                $('#accordion > div').css({"height": (window.innerHeight - 150) + "px"});
            }

            if (store.get('dbviewer_selected_app')) {
                $('#app-selector').html(store.get('dbviewer_selected_app').name);
            }
            else {
                $('#app-selector').html((self.dbviewer_selected_app == "all") ? $.i18n.map["common.all"] : self.dbviewer_selected_app.name);
            }

        };

        // wait until render completed
        setTimeout(function() {
            prepareSwitch();
            // handle app select event
            $("body").off("click", ".app-option").on("click", ".app-option", function() {
                self.dbviewer_selected_app = "all";
                store.remove('dbviewer_selected_app');
                for (var key in countlyGlobal.apps) {
                    if (countlyGlobal.apps[key]._id == $(this).data('value')) {
                        self.dbviewer_selected_app = countlyGlobal.apps[key];
                        store.set('dbviewer_selected_app', self.dbviewer_selected_app);
                    }
                }
                prepareSwitch();
                countlyDBviewer.initialize(self.dbviewer_selected_app._id)
                    .then(function(response) {
                        var filteredData = countlyDBviewer.getData();
                        filteredData.forEach(function(db) {
                            $('.dbviewer-collection-list-' + db.name).css({"height": (window.innerHeight - 150) + "px"});
                            var filteredCollectionListKeys = Object.keys(filteredData[0].collections);
                            var filteredCollectionListValues = Object.values(filteredData[0].collections);

                            filteredCollectionListValues.sort(function(a, b) {
                        	if (a < b) {
                                    return -1;
                                }
						    if (a > b) {
                                    return 1;
                                }
						    return 0;
                            });

                            filteredCollectionListKeys.sort(function(a, b) {
                        	if (a < b) {
                                    return -1;
                                }
						    if (a > b) {
                                    return 1;
                                }
						    return 0;
                            });

                            $('.dbviewer-collection-list-' + db.name).html("");
                            filteredCollectionListValues.forEach(function(collection, index) {
                                $('.dbviewer-collection-list-' + db.name).append('<li class="searchable"><a class="dbviewer-link-in-collection-list" href="#/manage/db/' + db.name + '/' + collection + '">' + filteredCollectionListKeys[index] + '</a></li>');
                            });
                        });
                    });
            });
        }, 300);

        // handle when input value changed
        $('.dbviewer-collection-filter-input').on("change paste keyup", function() {
            self.renderSearchResults($(this));
        });
    },
    refresh: function() { },
    renderMain: function() {
        var self = this;
        var dbs = countlyDBviewer.getData();
        this.templateData.dbs = dbs;
        $(this.el).html(this.template(this.templateData));
        this.accordion();
        // handle when input value changed
        $('.dbviewer-collection-filter-input').on("change paste keyup", function() {
            self.renderSearchResults($(this));
        });
    },
    renderDb: function() {
        var dbs = countlyDBviewer.getData();
        this.templateData.dbs = dbs;
        this.templateData.db = this.db;
        $(this.el).html(this.template(this.templateData));
        this.accordion();
    },
    renderSearchResults: function(el) {
        var searchText = new RegExp(el.val().toLowerCase().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')),
            searchInside = el.parent().next().find(".searchable");
        searchInside.filter(function() {
            return !(searchText.test($(this).text().toLowerCase()));
        }).css('display', 'none');
        searchInside.filter(function() {
            return searchText.test($(this).text().toLowerCase());
        }).css('display', 'block');
    },
    renderCollections: function() {
        var self = this;
        // r we have cache query properties for this collection?
        // if collection properties is exist load them from localStorage
        if ((store.get('dbviewer_current_collection') && store.get('dbviewer_current_collection') == self.collection)) {
            // prepare projection values if it's exist on localStorage
            if (store.get('dbviewer_projection_values')) {
                self.projection = {};
                try {
                    self.selected_projection.split(",").forEach(function(p) {
                        self.projection[p] = 1;
                    });
                    self.projection = JSON.stringify(self.projection);
                }
                catch (isEmpty) {
                    self.projection = "{}";
                }
            }
            // set empty object as default if not exist on localStorage
            else {
                self.projection = "{}";
            }
            // prepare sort values if it's exist on localStorage
            if (store.get('dbviewer_sort_value') && store.get('dbviewer_sort_show')) {
                self.sort = {};
                self.sort[store.get('dbviewer_sort_value')] = parseInt(store.get('dbviewer_sort_type'));
                self.sort = JSON.stringify(self.sort);
                self.isSort = true;
            }
            // set empty object as default if not exist on localStorage
            else {
                self.sort = "{}";
            }
        }
        // set empty object both properties if different collection which on render progress 
        else {
            self.projection = "{}";
            self.sort = "{}";
        }

        $.when(countlyDBviewer.loadCollections(this.db, this.collection, this.page, this.filter, this.limit, this.sort, this.projection, this.isSort)).then(function() {
            var dbs = countlyDBviewer.getData();
            var data = countlyDBviewer.getCollections();
            // sorting option is active?
            self.isSort = true;
            self.templateData.dbs = dbs;
            self.templateData.db = self.db;
            self.templateData.collection = self.collection;
            self.templateData.placeholder = { "_id": "some_id" };
            self.templateData.data = data;
            self.templateData.prev = Math.max(1, data.curPage - 1);
            self.templateData.next = Math.min(data.pages, data.curPage + 1);
            self.templateData.start = Math.max(1, data.curPage - 5);
            self.templateData.end = Math.min(data.pages, data.curPage + 5);

            $(self.el).html(self.template(self.templateData));
            //trigger for render localizations manually
            app.localize();
            self.accordion();
            if (store.get('dbviewer_selected_app') == "all") {
                $('#app-selector').html($.i18n.map["common.all"]);
            }
            else {
                $('#app-selector').html((self.dbviewer_selected_app == "all") ? $.i18n.map["common.all"] : self.dbviewer_selected_app.name);
            }

            if (self.filter != "{}") {
                $(".dbviewer-collection-filter").val(self.filter);
            }

            /*
			Set dbviewer configurations variables
			by the state of current collection
			is that same collection before refresh? or not?
			*/
            if (!(store.get('dbviewer_current_collection') && store.get('dbviewer_current_collection') == self.collection)) {
                self.selected_projection = {};
                self.sort = {};
                store.set('dbviewer_current_collection', self.collection);
                store.set('dbviewer_projection_show', false);
                store.set('dbviewer_sort_show', false);
                store.remove('dbviewer_sort_value');
                store.remove('dbviewer_projection_values');
                store.remove('countly_collectionoptions');
            }
            else {
                // projection area is open?
                if (store.get('dbviewer_projection_show')) {
                    $('.dbviewer-return-checkbox').removeClass('fa-square-o').addClass('fa-check-square');
                    $("#dbviewer-projection-area").css({ "display": "block" });
                }
                // sort option is active?
                if (store.get('dbviewer_sort_show') && self.isSort) {
                    $('.dbviewer-sort-checkbox').removeClass('fa-square-o').addClass('fa-check-square');
                    $("#dbviewer-sort-area").css({ "display": "block" });
                }
                // configure div states dynamically
                $('.dbviewer-filter-area').css({ "display": "block" });
                $('.dbviewer-filter-hide').css({ "display": "inline-block" });
                $('.dbviewer-filter-show').css({ "display": "none" });
                $('.dbviewer-filter-status').css({ "display": "block" });
            }

            // define qstring for export
            var qstring = {
                api_key: countlyGlobal.member.api_key,
                db: self.db,
                collection: self.collection,
                query: self.filter,
                sort: self.isSort ? self.sort : {},
                projection: self.projection
            };
            // export dropdown configuration
            new CountlyDrop({
                target: document.querySelector('#dbviewer-export-button'),
                content: CountlyHelpers.export(data.total, qstring).removeClass("dialog")[0],
                position: 'bottom right',
                remove: true,
                openOn: 'click'
            });
            // options array for sorting & projection inputs
            var options = [];
            // if options are exist and rendering in same collection 
            // load options from localStorage
            if ((store.get('dbviewer_current_collection') && store.get('dbviewer_current_collection') == self.collection) && store.get('countly_collectionoptions')) {
                options = JSON.parse(store.get('countly_collectionoptions'));
            }
            // generate new options array
            else {
                // try to convert array properties of current collection
                try {
                    Object.keys(data.collections[1]).forEach(function(d) {
                        options.push({ "key": d });
                    });
                    store.set('countly_collectionoptions', JSON.stringify(options));
                    self.isSort = true;
                }
                catch (NoData) {
                    // if there is no result for current query
                    // hide sorting options
                    // and set isSort option as false
                    $('#dbviewer-sort-area').css({ "display": "none" });
                    $('#dbviewer-show-sort-wrapper').css({ "display": "none" });
                    self.isSort = false;
                }
            }

            // jQuery selectize handler for projection input
            $('#dbviewer-projection').selectize({
                persist: true,
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
                        "key": input
                    };
                }
            });
            // render sort options
            options.forEach(function(o) {
                $('.dbviewer-sort-options-list').append('<div data-value="' + o.key + '" class="dbviewer-sort-param-selector item sort-field-select-item">' + o.key + '</div>');
            });
            // set first value as default
            if (store.get('dbviewer_sort_value') === null || store.get('dbviewer_sort_value') === undefined) {
                if (options.length > 0) {
                    store.set('dbviewer_sort_value', options[0].key);
                    store.set('dbviewer_sort_type', 1);
                    $('.dbviewer-default-sort-param').append('<div class="text">' + options[0].key + '</div>');
                }
            }
            else {
                $('.dbviewer-default-sort-param').append('<div class="text">' + store.get('dbviewer_sort_value') + '</div>');
            }

            // on click handler for select field changer
            $('.sort-field-select-item').on('click', function() {
                self.sort = {};
                self.sort[$(this).data('value')] = store.get('dbviewer_sort_type');
                store.set('dbviewer_sort_value', $(this).data('value'));
            });

            // fill inputs with projection and sort values if in the same collection 
            if (store.get('dbviewer_current_collection') && store.get('dbviewer_current_collection') == self.collection) {
                if (typeof self.selected_projection !== "object" && self.selected_projection !== "") {
                    self.selected_projection.split(",").forEach(function(tag) {
                        $('#dbviewer-projection')[0].selectize.addOption({ "key": tag });
                        $('#dbviewer-projection')[0].selectize.addItem(tag);
                    });
                }
                if (store.get('dbviewer_sort_value')) {
                    $('#dbviewer-sort_param').val(store.get('dbviewer_sort_value')).change();
                    $('#dbviewer-sort_type').val(store.get('dbviewer_sort_type')).change();
                }
            }

            // collection name filter at the left side
            // also called as collection search
            $(".dbviewer-collection-filter").on("change paste keyup", function() {
                var jsonlint = false;
                try {
                    var o = window.jsonlite.parse($(this).val());
                    jsonlint = o && typeof o === 'object';
                }
                catch (e) {
                    jsonlint = false;
                }
                // show and hide json status indicator by conditions
                if (jsonlint || ($(this).val() == "" && !jsonlint)) {
                    if (!($(this).val() == "")) {
                        $(this).val(JSON.stringify(o));
                    }
                    $('.dbviewer-correct-json').css({ "display": 'block' });
                    $('.dbviewer-incorrect-json').css({ "display": 'none' });
                    $("#dbviewer-collection-filter").css({ 'padding': '3px', 'border': '1px solid #2FA732', 'background-color': '#2FA732', 'color': 'white' });
                }
                else {
                    $('.dbviewer-correct-json').css({ "display": 'none' });
                    $('.dbviewer-incorrect-json').css({ "display": 'block' });
                    $("#dbviewer-collection-filter").css({ 'padding': '3px', 'border': '1px solid #D63E40', 'background-color': '#D63E40', 'color': 'white' });
                }
            });

            /*
				Event Listeners
			*/
            $('.dbviewer-filter-show').on('click', function() {
                $('.dbviewer-filter-area').css({ "display": "block" });
                $('.dbviewer-filter-hide').css({ "display": "inline-block" });
                $('.dbviewer-filter-show').css({ "display": "none" });
            });

            $('.dbviewer-filter-hide').on('click', function() {
                $('.dbviewer-filter-area').css({ "display": "none" });
                $('.dbviewer-filter-hide').css({ "display": "none" });
                $('.dbviewer-filter-show').css({ "display": "inline-block" });
            });

            // decide which button is active?
            // and set it active
            if (store.get('dbviewer_sort_type') != null) {
                if (store.get('dbviewer_sort_type') === -1) {
                    $('#dbviewer-sort-descend').addClass('dbviewer-sort-active');
                    $('#dbviewer-sort-ascend').removeClass('dbviewer-sort-active');
                }
                else {
                    $('#dbviewer-sort-ascend').addClass('dbviewer-sort-active');
                    $('#dbviewer-sort-descend').removeClass('dbviewer-sort-active');
                }
            }

            // on click handlers for sort type changer
            // asc
            $('#dbviewer-sort-ascend').on('click', function() {
                self.sort[store.get('dbviewer_sort_value')] = 1;
                store.set('dbviewer_sort_type', 1);
                $('#dbviewer-sort-descend').removeClass('dbviewer-sort-active');
                $(this).addClass('dbviewer-sort-active');
                $('#dbviewer-sort-descend').css({"border-left": "0px"});
                $('#dbviewer-sort-ascend').css({"border-right": "1px solid #2eb52b"});
            });
            // on click handlers for sort type changer
            // desc
            $('#dbviewer-sort-descend').on('click', function() {
                self.sort[store.get('dbviewer_sort_value')] = -1;
                store.set('dbviewer_sort_type', -1);
                $('#dbviewer-sort-ascend').removeClass('dbviewer-sort-active');
                $(this).addClass('dbviewer-sort-active');
                $('#dbviewer-sort-ascend').css({"border-right": "0px"});
                $('#dbviewer-sort-descend').css({"border-left": "1px solid #2eb52b"});
            });

            $('#dbviewer-show-projection').change(function() {
                if (!store.get('dbviewer_projection_show')) {
                    $("#dbviewer-projection-area").css({ "display": "block" });
                    store.set('dbviewer_projection_show', true);
                    $('.dbviewer-return-checkbox').removeClass('fa-square-o').addClass('fa-check-square');
                }
                else {
                    $("#dbviewer-projection-area").css({ "display": "none" });
                    store.set('dbviewer_projection_show', false);
                    $('.dbviewer-return-checkbox').removeClass('fa-check-square').addClass('fa-square-o');
                }
            });

            $('#dbviewer-show-sort').change(function() {
                if (!store.get('dbviewer_sort_show')) {
                    $("#dbviewer-sort-area").css({ "display": "block" });
                    $('.dbviewer-sort-checkbox').removeClass('fa-square-o').addClass('fa-check-square');
                    store.set('dbviewer_sort_show', true);
                    self.isSort = true;
                }
                else {
                    $("#dbviewer-sort-area").css({ "display": "none" });
                    $('.dbviewer-sort-checkbox').addClass('fa-square-o').removeClass('fa-check-square');
                    store.set('dbviewer_sort_show', false);
                    self.isSort = false;
                }
            });

            // when the filter button fired
            $("#dbviewer-apply-filter-button").on('click', function() {
                $('.dbviewer-filter-status').css({ "display": "block" });
                // prepare projection by input values
                var projection = {};
                if (store.get('dbviewer_projection_show') && $('#dbviewer-projection').val() !== "") {
                    store.set('dbviewer_projection_values', $('#dbviewer-projection').val());
                    self.selected_projection = $('#dbviewer-projection').val();
                    $('#dbviewer-projection').val().split(",").forEach(function(p) {
                        projection[p] = 1;
                    });
                }
                else {
                    self.selected_projection = {};
                    self.projection = {};
                    store.remove('dbviewer_projection_values');
                }
                // prepare filter by input values
                var filter = $(".dbviewer-collection-filter").val() == "" ? JSON.stringify({}) : $(".dbviewer-collection-filter").val();
                // prepare sort by input values
                self.filter = filter;
                self.projection = projection;
                // save into localstorage current parameters
                store.set("countly_collectionfilter", self.filter);
                // go go go!
                if (Backbone.history.fragment === "/manage/db/" + self.db + "/" + self.collection) {
                    self.renderCollections();
                }
                else {
                    app.navigate("#/manage/db/" + self.db + "/" + self.collection, true);
                }
            });

            $(".result-limit").val(self.limit);
            $(".result-limit").change(function() {
                self.limit = this.value;
                store.set("countly_limitfilter", self.limit);
                window.location.reload(true);
            });
            // handle when input value changed
            $('.dbviewer-collection-filter-input').on("change paste keyup", function() {
                self.renderSearchResults($(this));
            });
            $('.dbviewer-gray-area').css({ "display": "block" });
            $('.dbviewer-back-button').css({ "display": "block" });
            $('.dbviewer-documents-area').css({ "border-right": "1px solid #DBDBDB", "border-left": "1px solid #DBDBDB", "border-bottom": "1px solid #DBDBDB" });
        });

    },
    renderDocument: function() {
        var self = this;
        $.when(countlyDBviewer.loadDocument(this.db, this.collection, this.document)).then(function() {
            var dbs = countlyDBviewer.getData();
            var data = countlyDBviewer.getDocument();
            self.templateData.dbs = dbs;
            self.templateData.db = self.db;
            self.templateData.collection = self.collection;
            self.templateData.document = self.document;
            self.templateData.data = data;
            self.templateData.page = self.page || 1;
            $(self.el).html(self.template(self.templateData));
            $('.dbviewer-doc-back-button').css({ "display": "block" });
            $('#json-renderer').jsonViewer(data);
            self.accordion();
        });
    },
    accordion: function() {
        var self = this;
        $("#accordion").accordion({
            collapsible: true,
            active: (self.db == "countly_drill") ? 1 : 0
        });
        $("#accordion a").removeClass("selected");
        $("#accordion a[href='#" + Backbone.history.fragment + "']").addClass("selected");
    }
});

//register views
app.dbviewerView = new DBViewerView();

app.route('/manage/db', 'db', function() {
    this.dbviewerView.db = null;
    this.dbviewerView.collection = null;
    this.dbviewerView.document = null;
    this.dbviewerView.page = null;
    this.renderWhenReady(this.dbviewerView);
});

app.route('/manage/db/:dbs', 'dbs', function(db) {
    this.dbviewerView.db = db;
    this.dbviewerView.collection = null;
    this.dbviewerView.document = null;
    this.dbviewerView.page = null;
    this.renderWhenReady(this.dbviewerView);
});

app.route('/manage/db/:dbs/:collection', 'dbs', function(db, collection) {
    this.dbviewerView.db = db;
    this.dbviewerView.collection = collection;
    this.dbviewerView.document = null;
    this.dbviewerView.page = null;
    if (store.get("countly_collection") != collection) {
        store.set("countly_collectionfilter", "{}");
        store.set("countly_collection", collection);
        this.dbviewerView.filter = "{}";
    }
    this.renderWhenReady(this.dbviewerView);
});

app.route('/manage/db/:dbs/:collection/*document', 'dbs', function(db, collection, document) {
    this.dbviewerView.db = db;
    this.dbviewerView.collection = collection;
    this.dbviewerView.document = document;
    this.renderWhenReady(this.dbviewerView);
});

app.route('/manage/db/:dbs/:collection/page/:page', 'dbs', function(db, collection, page) {
    this.dbviewerView.db = db;
    this.dbviewerView.collection = collection;
    this.dbviewerView.document = null;
    this.dbviewerView.page = parseInt(page);
    if (store.get("countly_collection") != collection) {
        store.set("countly_collectionfilter", "{}");
        this.dbviewerView.filter = "{}";
        store.set("countly_collection", collection);
    }
    this.renderWhenReady(this.dbviewerView);
});

$(document).ready(function() {
    if (!production) {
        CountlyHelpers.loadJS("dbviewer/javascripts/json.human.js");
        CountlyHelpers.loadJS("dbviewer/javascripts/jquery.json-viewer.js");
    }
    var menu = '<a href="#/manage/db" class="item">' +
		'<div class="logo-icon fa fa-database"></div>' +
		'<div class="text" data-localize="dbviewer.title"></div>' +
		'</a>';
    if ($('#management-submenu .help-toggle').length) {
        $('#management-submenu .help-toggle').before(menu);
    }
});