/*global store, countlyCommon, moment, countlyView, $, countlyGlobal, production, Handlebars, jQuery, app, CountlyHelpers, Backbone, DBViewerView, CountlyDrop, countlyDBviewer*/
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
    syntaxHighlight: function(json) {
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, function(match) {
            var cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                }
                else {
                    cls = 'string';
                }
            }
            else if (/true|false/.test(match)) {
                cls = 'boolean';
            }
            else if (/null/.test(match)) {
                cls = 'null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    },
    appendCollectionList: function(data) {
        data.forEach(function(db) {
            $('.dbviewer-collection-list-' + db.name).css({"height": (window.innerHeight - 150) + "px"});
            var filteredCollectionListKeys = [];
            var filteredCollectionListValues = [];

            for (var key in data[data.indexOf(db)].collections) {
                filteredCollectionListKeys.push(key);
                filteredCollectionListValues.push(data[data.indexOf(db)].collections[key]);
            }

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
    },
    prepareSwitch: function() {
        var self = this;
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
            var matchedApp = false;
            for (var app in countlyGlobal.admin_apps) {
                if (app === store.get('dbviewer_selected_app')._id) {
                    $('#app-selector').html(store.get('dbviewer_selected_app').name);
                    matchedApp = true;
                }
            }
            if (!matchedApp) {
                store.remove('dbviewer_selected_app');
                self.dbviewer_selected_app = "all";
                $('#app-selector').html((self.dbviewer_selected_app === "all") ? $.i18n.map["common.all"] : 'All');
                countlyDBviewer.initialize(self.dbviewer_selected_app)
                    .then(function() {
                        var filteredData = countlyDBviewer.getData();
                        self.appendCollectionList(filteredData);
                    });
            }
        }
        else {
            $('#app-selector').html((self.dbviewer_selected_app === "all") ? $.i18n.map["common.all"] : 'All');
        }
    },
    renderCommon: function() {
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

        $('body').off('click', '.collection-list-item').on('click', '.collection-list-item', function() {
            if (store.get('countly_collection') !== $(this).data('collection')) {
                store.set('countly_collectionfilter', '');
                store.set('countly_collection', $(this).data('collection'));
                self.filter = '{}';
            }
            app.navigate('#/manage/db/' + $(this).data('db') + '/' + $(this).data('collection'), false);
            self.db = $(this).data('db');
            self.collection = $(this).data('collection');
            $('.dbviewer-documents-area').html("");
            $('.dbviewer-documents-area').show();
            $('.dbviewer-gray-area').show();
            $('.dbviewer-left-side-1').html('<a href="javascript:void(0)" class="dbviewer-db-link-item dbviewer-gray" data-db="' + self.db + '">/ <strong>' + self.db + '</strong></a>');
            $('.dbviewer-left-side-1').append('<a href="javascript:void(0)" class="dbviewer-collection-link-item dbviewer-gray" data-collection="' + self.collection + '"> /' + self.collection + '</a>');
            self.executeQuery();
        });

        $('body').on('click', '.db-detail', function() {
            self.db = $(this).data('db');
            self.renderCollectionList();
        });

        if (Backbone.history.getFragment().split('/').length === 3) {
            $('.dbviewer-go-back').hide();
        }

        $('body').on('click', '.dbviewer-go-back', function() {
            var state = Backbone.history.getFragment().split('/').length;
            if (state === 4) {
                self.renderDbList();
            }
            else if (state === 5 || Backbone.history.getFragment().split('/')[5] === 'page') {
                self.renderCollectionList();
            }
            else if (state === 6) {
                app.navigate("#/manage/db/" + self.db + "/" + self.collection, false);
                countlyDBviewer.loadCollections(self.db, self.collection, self.page, self.filter, self.limit, self.sort, self.projection, self.isSort)
                    .then(function(response) {
                        if (response.pages !== 0 && response.curPage > response.pages) {
                            self.page = 1;
                            self.executeQuery();
                        }
                        else {
                            self.renderQueryResults(response);
                        }
                    });
            }
        });

        // wait until render completed
        setTimeout(function() {
            self.prepareSwitch();
            // handle app select event
            $("body").off("click", ".app-option").on("click", ".app-option", function() {
                self.dbviewer_selected_app = "all";
                store.remove('dbviewer_selected_app');
                for (var key in countlyGlobal.apps) {
                    if (countlyGlobal.apps[key]._id === $(this).data('value')) {
                        self.dbviewer_selected_app = countlyGlobal.apps[key];
                        store.set('dbviewer_selected_app', self.dbviewer_selected_app);
                    }
                }
                self.prepareSwitch();
                countlyDBviewer.initialize(self.dbviewer_selected_app._id)
                    .then(function() {
                        var filteredData = countlyDBviewer.getData();
                        self.appendCollectionList(filteredData);
                    });
            });
        }, 100);

        // handle when input value changed
        $('.dbviewer-collection-filter-input').on("change paste keyup", function() {
            self.renderSearchResults($(this));
        });

        $('body').off('click', '.dbviewer-aggregate').on('click', '.dbviewer-aggregate', function() {
            app.navigate('#/manage/db/aggregate/' + self.db + '/' + self.collection, false);
            self.dbviewer_aggregation = true;
            $('#dbviewer').hide();
            $('#aggregate-view').show();
            $('#aggregate-header').show();
            $('#dbviewer-header').hide();
            $('#generate_aggregate_report').text($.i18n.map["dbviewer.generate-aggregate-report"]);
            $('#back_to_dbviewer').css('display', 'block');
        });

        $('body').off('click', '#back_to_dbviewer').on('click', '#back_to_dbviewer', function() {
            app.navigate('#/manage/db/' + self.db + '/' + self.collection, true);
            self.dbviewer_aggregation = false;
            $('#dbviewer').show();
            $('#aggregate-view').hide();
            $('#aggregate-header').hide();
            $('#dbviewer-header').show();
            $('#back_to_dbviewer').hide();
        });

        $('body').off('click', '#show-aggregation-input').on('click', '#show-aggregation-input', function() {
            $('#show-aggregation-input').hide();
            $('.aggregate-prepare-area').show();
        });

        $('body').off('click', '#generate_aggregate_report').on('click', '#generate_aggregate_report', function() {
            var aggregation = $('#aggregation_pipeline').val();
            try {
                aggregation = JSON.stringify(JSON.parse(aggregation));
            }
            catch (e) {
                CountlyHelpers.notify({
                    type: 'error',
                    title: 'Error',
                    delay: 3000,
                    message: jQuery.i18n.map['dbviewer.invalid-pipeline']
                });
                return;
            }
            $('#aggregate-result-table > thead').html("");
            $('#show-aggregation-input').show();
            $('.aggregate-prepare-area').hide();
            countlyDBviewer.executeAggregation(self.db, self.collection, aggregation, function(data) {
                var columns = self.generateColumnArray(data.aaData[0]);
                var dTableConfig = self.generateDTableObject(aggregation, columns, data);
                this.dtable = $('#aggregate-result-table').dataTable($.extend({}, $.fn.dataTable.defaults, dTableConfig));
            });
            $('#aggregate-result-table').stickyTableHeaders();
        });
    },
    generateColumnArray: function(obj) {
        var aoColumns = [];
        for (var key in obj) {
            (function(label) {
                aoColumns.push({
                    "mData": function(row) {
                        if (typeof row[label] !== "undefined") {
                            if (typeof row[label] === "object") {
                                return JSON.stringify(row[label]);
                            }
                            else {
                                return row[label];
                            }
                        }
                        else {
                            return '';
                        }
                    },
                    "sTitle": label,
                    "sType": "string",
                    "bSortable": false
                });
            })(key);
        }
        return aoColumns;
    },
    generateDTableObject: function(aggregation, aoColumns, data) {
        var self = this;
        return {
            "bServerSide": true,
            "bFilter": false,
            "sAjaxSource": countlyCommon.API_PARTS.data.r + "/db?dbs=" + self.db + "&collection=" + self.collection + "&aggregation=" + aggregation,
            "fnServerData": function(sSource, aoData, fnCallback) {
                if (data) {
                    fnCallback(data);
                    data = null;
                }
                else {
                    $.ajax({
                        "type": "POST",
                        "url": sSource,
                        "data": aoData,
                        "success": function(responseData) {
                            fnCallback(responseData);
                        }
                    });
                }
            },
            "aoColumns": aoColumns
        };
    },
    refresh: function() { },
    getExportAPI: function(tableID) {
        var self = this;
        var aggregation = $('#aggregation_pipeline').val();
        if (tableID === 'aggregate-result-table') {
            var requestPath = '/o/db';
            var apiQueryData = {
                api_key: countlyGlobal.member.api_key,
                path: requestPath,
                data: JSON.stringify({
                    api_key: countlyGlobal.member.api_key,
                    dbs: self.db,
                    collection: self.collection,
                    iDisplayStart: 0,
                    aggregation: aggregation
                }),
                filename: self.collection + "_on" + moment().format("DD-MMM-YYYY"),
                prop: ['aaData'],
                method: "POST"
            };
            return apiQueryData;
        }
        return null;
    },
    renderMain: function() {
        var self = this;
        var dbs = countlyDBviewer.getData();
        self.dbviewer_aggregation = false;
        this.templateData.dbs = dbs;
        $(this.el).html(this.template(this.templateData));
        this.accordion();
        // handle when input value changed
        $('.dbviewer-collection-filter-input').on("change paste keyup", function() {
            self.renderSearchResults($(this));
        });
    },
    renderDb: function() {
        $('.dbviewer-back-button').show();
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
    paginate: function(data) {
        $('.pagination').html("");
        var prev = Math.max(1, data.curPage - 1);
        var next = Math.min(data.pages, data.curPage + 1);
        var start = Math.max(1, data.curPage - 5);
        var end = Math.min(data.pages, data.curPage + 5);
        if (data.pages > 1) {
            $('.pagination').append('&nbsp;<a class="dbviewer-pagination-item" data-page="1" href="javascript:void(0)">First</a>');
            $('.pagination').append('&nbsp;<a class="dbviewer-pagination-item" data-page="' + prev + '" href="javascript:void(0)">Prev</a>&nbsp;');
            if (start > 1) {
                $('.pagination').append('&nbsp; ... &nbsp;&nbsp;');
            }
            else {
                $('.pagination').append('&nbsp;&nbsp;');
            }
            for (var i = start; i < end; i++) {
                if (i === data.curPage) {
                    $('.pagination').append('<a class="current dbviewer-pagination-item" data-page="' + i + '" href="javascript:void(0)">' + i + '</a>&nbsp;');
                }
                else {
                    $('.pagination').append('<a class="dbviewer-pagination-item" data-page="' + i + '" href="javascript:void(0)">' + i + '</a>&nbsp;');
                }
            }
            if (end < data.pages) {
                $('.pagination').append('&nbsp; ... &nbsp;&nbsp;');
            }
            else {
                $('.pagination').append('&nbsp;&nbsp;');
            }
            $('.pagination').append('<a class="dbviewer-pagination-item" data-page="' + next + '" href="javascript:void(0)">Next</a>&nbsp;');
            $('.pagination').append('<a class="dbviewer-pagination-item" data-page="' + data.pages + '" href="javascript:void()">Last</a>&nbsp;');
        }
    },
    renderQueryResults: function(data) {
        var self = this;
        $('.dbviewer-go-back').show();
        if ($('#dbviewer-collections').length > 0) {
            $('#dbviewer-collections').html("");
        }
        else {
            $('.dbviewer-documents-area').append('<div id="dbviewer-collections"></div>');
        }
        data.collections.forEach(function(item) {
            var template = '<tr>' +
            '<th class="jh-key jh-object-key"><p><strong>_id: </strong>' + item._id + '<span class="dbviewer-view-link" class="jh-type-string"><a class="dbviewer-document-detail" data-db="' + self.db + '" data-id="' + item._id + '" data-collection="' + self.collection + '" href="javascript:void(0)">View</a></span></p></th>' +
            '</tr>' +
            '<tr>' +
            '<td class="jh-value jh-object-value">' + self.syntaxHighlight(JSON.stringify(item, undefined, 4)) + '</td>' +
            '</tr>';
            $('#dbviewer-collections').append(template);
        });
        if ($('.dbviewer-inline').length > 0) {
            $('.dbviewer-inline').html('Showing ' + data.start + ' - ' + data.end + ' from ' + data.total + ' documents.');
        }
        else {
            $('#dbviewer-collections').before('<p class="dbviewer-inline">Showing ' + data.start + ' - ' + data.end + ' from ' + data.total + ' documents.</p>');
            $('#dbviewer-collections').after('<p class="dbviewer-inline">Showing ' + data.start + ' - ' + data.end + ' from ' + data.total + ' documents.</p>');
        }
        if ($('#dbviewer-result-count-selector').length < 1) {
            var paginaterTemplate = "<p id='dbviewer-result-count-selector'>Show results: <select class='result-limit'>" +
                "<option value='20'>20</option><option value='30'>30</option>" +
                "<option value='40'>40</option><option value='50'>50</option></select></p>";
            $('.dbviewer-inline').after(paginaterTemplate);
        }
        if ($('.pagination').length < 1) {
            $('#dbviewer-result-count-selector').after('<p class="pagination"></p>');
            self.paginate(data);
        }
        else {
            self.paginate(data);
        }
        this.renderCollections();
    },
    renderCollectionList: function() {
        $('.dbviewer-go-back').show();
        var self = this;
        var dbs = countlyDBviewer.getData();
        var currentDbIndex = 1;
        dbs.forEach(function(db) {
            if (db.name === self.db) {
                currentDbIndex = dbs.indexOf(db);
            }
        });
        $('.dbviewer-gray-area').hide();
        $('.dbviewer-documents-area').html("");
        $('.dbviewer-documents-area').css({"padding-left": "0px", "padding-right": "0px"});
        $('.dbviewer-documents-area').append('<div class="dbviewer-collections"></div>');
        $('.dbviewer-collections').append('<div class="dbviewer-db-area-title">' + this.db + '</div>');
        $('.dbviewer-collections').append('<div class="dbviewer-collection-list">');
        for (var collection in dbs[currentDbIndex].collections) {
            $('.dbviewer-collection-list').append('<div class="dbviewer-collection-list-item"><a class="collection-list-item" data-db="' + this.db + '" data-collection="' + dbs[currentDbIndex].collections[collection] + '" href="javascript:void(0)">' + collection + '</a></div>');
        }
        $('.dbviewer-collections').append('</div>');
        $('.dbviewer-aggregate').hide();
        app.navigate('#/manage/db/' + this.db, false);
    },
    renderSingleDocument: function(data) {
        $('.dbviewer-gray-area').hide();
        $('.dbviewer-documents-area').html("");
        $('.dbviewer-documents-area').append('<div id="json-wrapper"><pre id="json-renderer">' + this.syntaxHighlight(JSON.stringify(data, undefined, 4)) + '</pre></div>');
    },
    executeQuery: function() {
        var self = this;
        if (!self.page) {
            self.page = 1;
        }
        countlyDBviewer.loadCollections(self.db, self.collection, self.page, self.filter, self.limit, self.sort, self.projection, self.isSort)
            .then(function(response) {
                if (response.pages !== 0 && response.curPage > response.pages) {
                    self.page = 1;
                    app.navigate("#/manage/db/" + self.db + "/" + self.collection + "/page/1", false);
                    self.executeQuery();
                }
                else {
                    self.renderQueryResults(response);
                }
            });
    },
    renderDbList: function() {
        app.navigate('#/manage/db', false);
        $('.dbviewer-aggregate').hide();
        var dbs = countlyDBviewer.getData();
        $('.dbviewer-gray-area').hide();
        $('.dbviewer-documents-area').html("");
        $('.dbviewer-go-back').hide();
        dbs.forEach(function(db) {
            var template = '<div id="' + db.name + '-box" class="dbviewer-db-square db-detail" data-db="' + db.name + '">' +
                '<img src="./dbviewer/images/dbviewer/' + db.name + '.svg">' +
                '<h3 class="dbviewer-db-title">' + $.i18n.map['dbviewer.' + db.name + '-database'] + '</h3>' +
                '<p class="dbviewer-db-description">' + $.i18n.map['dbviewer.' + db.name + '-database-description'] + '</p>' +
            '</div>';
            $('.dbviewer-documents-area').append(template);
        });
    },
    renderCollections: function() {
        var self = this;

        // we've cache query properties for this collection?
        // if collection properties is exist load them from localStorage
        if ((store.get('dbviewer_current_collection') && store.get('dbviewer_current_collection') === self.collection)) {
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
            var filterInputVal = $('.dbviewer-collection-filter-input').val();
            $(self.el).html(self.template(self.templateData));
            $('.dbviewer-collection-filter-input').val(filterInputVal);
            self.renderSearchResults($('.dbviewer-collection-filter-input'));
            if (self.dbviewer_aggregation) {
                $('#dbviewer').hide();
                $('#aggregate-view').show();
                $('#aggregate-header').show();
                $('#dbviewer-header').hide();
                $('#generate_aggregate_report').text($.i18n.map["dbviewer.generate-aggregate-report"]);
                $('#back_to_dbviewer').text($.i18n.map["dbviewer.back-to-dbviewer"]);
                $('#back_to_dbviewer').css('display', 'block');
            }
            $('.dbviewer-aggregate-button > span').html($.i18n.map['dbviewer.aggregate']);
            $('.dbviewer-aggregate').show();
            //trigger for render localizations manually
            app.localize();
            self.accordion();
            if (store.get('dbviewer_selected_app') === "all") {
                $('#app-selector').html($.i18n.map["common.all"]);
            }
            else {
                $('#app-selector').html((self.dbviewer_selected_app === "all") ? $.i18n.map["common.all"] : self.dbviewer_selected_app);
            }

            if (self.filter !== "{}") {
                $(".dbviewer-collection-filter").val(self.filter);
            }

            /*
			Set dbviewer configurations variables
			by the state of current collection
			is that same collection before refresh? or not?
			*/
            if (!(store.get('dbviewer_current_collection') && store.get('dbviewer_current_collection') === self.collection)) {
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

            $('body').on('click', '.dbviewer-document-detail', function() {
                app.navigate('#/manage/db/' + $(this).data('db') + '/' + $(this).data('collection') + '/' + $(this).data('id'));
                countlyDBviewer.loadDocument($(this).data('db'), $(this).data('collection'), $(this).data('id'))
                    .then(function(response) {
                        self.renderSingleDocument(response);
                    });
            });

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
            if ((store.get('dbviewer_current_collection') && store.get('dbviewer_current_collection') === self.collection) && store.get('countly_collectionoptions')) {
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
                    item: function(item) {
                        return '<div>' +
							item.key +
							'</div>';
                    },
                    option: function(item) {
                        var label = item.key;
                        return '<div>' +
							'<span class="label">' + label + '</span>' +
							'</div>';
                    }
                },
                createFilter: function() {
                    return true;
                },
                create: function(input) {
                    return {
                        "key": input
                    };
                }
            });

            // jQuery selectize handler for projection input
            $('#dbviewer-sort-select').selectize({
                persist: true,
                maxItems: 1,
                valueField: 'key',
                labelField: 'key',
                searchField: ['key'],
                options: options,
                render: {
                    item: function(item) {
                        return '<div>' +
                            item.key +
                            '</div>';
                    },
                    option: function(item) {
                        var label = item.key;
                        return '<div>' +
                            '<span class="label">' + label + '</span>' +
                            '</div>';
                    }
                },
                createFilter: function() {
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
            if (store.get('dbviewer_current_collection') && store.get('dbviewer_current_collection') === self.collection) {
                if (typeof self.selected_projection !== "object" && self.selected_projection !== "") {
                    self.selected_projection.split(",").forEach(function(tag) {
                        $('#dbviewer-projection')[0].selectize.addOption({ "key": tag });
                        $('#dbviewer-projection')[0].selectize.addItem(tag);
                    });
                }
                if (store.get('dbviewer_sort_value')) {
                    $('#dbviewer-sort-select')[0].selectize.addOption(store.get('dbviewer_sort_value'));
                    $('#dbviewer-sort-select')[0].selectize.addItem(store.get('dbviewer_sort_value'));
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
                if (jsonlint || ($(this).val() === "" && !jsonlint)) {
                    if (!($(this).val() === "")) {
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
            if (store.get('dbviewer_sort_type') !== null) {
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

            $('body').on('click', '.dbviewer-pagination-item', function() {
                $('.dbviewer-pagination-item').removeClass('current');
                $(this).addClass('current');
                self.page = $(this).data('page');
                app.navigate("#/manage/db/" + self.db + "/" + self.collection + "/page/" + $(this).data('page'), false);
                self.executeQuery();
            });

            // when the filter button fired
            $('body').off('click', '#dbviewer-apply-filter-button').on('click', "#dbviewer-apply-filter-button", function() {
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
                if (store.get('dbviewer_sort_show') && $('#dbviewer-sort-select').val() !== "") {
                    store.set('dbviewer_sort_value', $('#dbviewer-sort-select').val());
                    self.sort[$('#dbviewer-sort-select')] = store.get('dbviewer_sort_type');
                    $('#dbviewer-sort-select')[0].selectize.addOption(store.get('dbviewer_sort_value'));
                    $('#dbviewer-sort-select')[0].selectize.addItem(store.get('dbviewer_sort_value'));
                }
                else {
                    self.sort = {};
                    store.remove('dbviewer_sort_value');
                    store.remove('dbviewer_sort_type');
                }
                // prepare filter by input values
                var filter = $(".dbviewer-collection-filter").val() === "" ? JSON.stringify({}) : $(".dbviewer-collection-filter").val();
                // prepare sort by input values
                self.filter = filter;
                self.projection = projection;
                // save into localstorage current parameters
                store.set("countly_collectionfilter", self.filter);
                self.executeQuery();
            });

            $(".result-limit").val(self.limit);
            $(".result-limit").change(function() {
                self.limit = this.value;
                store.set("countly_limitfilter", self.limit);
                countlyDBviewer.loadCollections(self.db, self.collection, self.page, self.filter, self.limit, self.sort, self.projection, self.isSort)
                    .then(function(response) {
                        $('#dbviewer-collections').html("");
                        $('.pagination').html("");
                        $('.dbviewer-inline').html('Showing ' + response.start + ' - ' + response.end + ' from ' + response.total + ' documents.');
                        if (response.pages > 1) {
                            $('.pagination').append('<a class="dbviewer-pagination-item" data-page="1" href="javascript:void(0)">First</a>');
                            $('.pagination').append('<a class="dbviewer-pagination-item" data-page="' + ((self.page > 1) ? self.page - 1 : self.page) + '" href="javascript:void()">Prev</a>&nbsp;');
                            if (response.start > 1) {
                                $('.pagination').append('... &nbsp;');
                            }
                            for (var i = response.start; i < response.end; i++) {
                                if (i === response.curPage) {
                                    $('.pagination').append('<a class="current dbviewer-pagination-item" data-page="' + i + '" href="javascript:void(0)">' + i + '</a>');
                                }
                                else {
                                    $('.pagination').append('<a class="dbviewer-pagination-item" data-page="' + i + '" href="javascript:void(0)">' + i + '</a>');
                                }
                            }
                            if (response.end < response.pages) {
                                $('.pagination').append('&nbsp; ...');
                            }
                            $('.pagination').append('<a class="dbviewer-pagination-item" data-page="' + ((self.page < response.pages) ? self.page + 1 : self.page) + '" href="javascript:void(0)">Next</a>');
                            $('.pagination').append('<a class="dbviewer-pagination-item" data-page="' + response.pages + '" href="javascript:void()">Last</a>&nbsp;');
                        }
                        response.collections.forEach(function(item) {
                            var template = '<tr>' +
                            '<th class="jh-key jh-object-key"><p><strong>_id: </strong>' + item._id + '<span class="dbviewer-view-link" data-db="' + self.db + '" data-id="' + item._id + '" data-collection="' + self.collection + '" class="jh-type-string"><a href="javascript:void(0)">View</a></span></p></th>' +
                            '</tr>' +
                            '<tr>' +
                            '<td class="jh-value jh-object-value">' + self.syntaxHighlight(JSON.stringify(item, undefined, 4)) + '</td>' +
                            '</tr>';
                            $('#dbviewer-collections').append(template);
                        });
                    });
            });
            // handle when input value changed
            $('.dbviewer-collection-filter-input').on("change paste keyup", function() {
                self.renderSearchResults($(this));
            });
            $('.dbviewer-gray-area').css({ "display": "block" });
            $('.dbviewer-back-button').css({ "display": "block" });

            setTimeout(function() {
                self.prepareSwitch();
            }, 100);
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
            setTimeout(function() {
                self.prepareSwitch();
            }, 100);
        });
    },
    accordion: function() {
        var self = this;
        var dbs = {
            countly: 0,
            countly_drill: 1,
            countly_out: 2,
            countly_fs: 3
        };
        $("#accordion").accordion({
            collapsible: true,
            active: dbs[self.db]
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
    if (store.get("countly_collection") !== collection) {
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
    if (store.get("countly_collection") !== collection) {
        store.set("countly_collectionfilter", "{}");
        this.dbviewerView.filter = "{}";
        store.set("countly_collection", collection);
    }
    this.renderWhenReady(this.dbviewerView);
});

app.route('/manage/db/aggregate/:dbs/:collection', 'dbs', function(db, collection) {
    if (typeof db === 'undefined' || typeof collection === 'undefined') {
        app.navigate('#/manage/db', true);
    }
    else {
        this.dbviewerView.db = db;
        this.dbviewerView.collection = collection;
        this.dbviewerView.document = null;
        this.dbviewerView.page = null;
        this.dbviewerView.dbviewer_aggregation = true;
        if (store.get("countly_collection") !== collection) {
            store.set("countly_collectionfilter", "{}");
            store.set("countly_collection", collection);
            this.dbviewerView.filter = "{}";
        }
        this.renderWhenReady(this.dbviewerView);
    }
});

$(document).ready(function() {
    if (!production) {
        CountlyHelpers.loadJS("dbviewer/javascripts/json.human.js");
        CountlyHelpers.loadJS("dbviewer/javascripts/jquery.json-viewer.js");
    }

    app.addSubMenu("management", {code: "db", url: "#/manage/db", text: "dbviewer.title", priority: 50});
});