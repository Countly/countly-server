/*global CountlyHelpers, countlyAuth, countlyView, simpleheat, countlyWidgets, countlySegmentation, ActionMapView, countlyCommon, countlyGlobal, countlyViews, T, app, $, jQuery, moment, countlyVue, countlyViewsPerSession, CV,countlyTokenManager*/

(function() {
    var FEATURE_NAME = "views";

    var EditViewsView = countlyVue.views.create({
        template: CV.T("/views/templates/manageViews.html"),
        data: function() {
            return {
                description: CV.i18n('views.title-desc'),
                remoteTableDataSource: countlyVue.vuex.getServerDataSource(this.$store, "countlyViews", "viewsEditTable"),
                isDeleteButtonDisabled: true,
                isUpdateButtonDisabled: true,
                selectedViews: [],
                deleteDialogTitle: CV.i18n('views.delete-confirm-title'),
                deleteDialogText: "",
                deleteDialogConfirmText: CV.i18n('views.yes-delete-view'),
                showDeleteDialog: false
            };
        },
        mounted: function() {
        },
        methods: {
            handleSelectionChange: function(selectedRows) {
                if (selectedRows.length > 0) {
                    //this.$refs.deleteManyButton.disabled = false;
                    this.isDeleteButtonDisabled = false;
                    this.selectedViews = selectedRows;
                }
                else {
                    this.isDeleteButtonDisabled = true;
                }
            },
            displayNameChanged: function(value, scope, rowscope) {
                var rows = this.$refs.editViewsTable.sourceRows;
                for (var k = 0; k < rows.length; k++) {
                    if (rowscope.row._id === rows[k]._id) {
                        rows[k].editedDisplay = value; //have to change stored value
                        scope.patch(rowscope.row, {display: value});
                    }
                }
            },
            deleteManyViews: function() {
                if (this.selectedViews.length > 0) {
                    if (this.selectedViews.length === 1) {
                        this.deleteDialogTitle = CV.i18n('views.delete-confirm-title');
                        this.deleteDialogText = CV.i18n('views.delete-confirm').replace("{0}", this.selectedViews[0].display);
                        this.deleteDialogConfirmText = CV.i18n('views.yes-delete-view');
                    }
                    else {
                        var names = [];
                        for (var k = 0; k < this.selectedViews.length; k++) {
                            names.push(this.selectedViews[k].display);
                        }
                        this.deleteDialogTitle = CV.i18n('views.delete-many-confirm-title');

                        this.deleteDialogText = CV.i18n('views.delete-confirm-many', names.join(", "));
                        this.deleteDialogConfirmText = CV.i18n('views.yes-delete-many-view');
                    }
                    this.showDeleteDialog = true;
                }
            },
            submitDeleteForm: function() {
                this.showDeleteDialog = false;

                if (this.selectedViews && this.selectedViews.length > 0) {
                    var ids = [];
                    for (var k = 0; k < this.selectedViews.length; k++) {
                        ids.push(this.selectedViews[k]._id);
                    }
                    this.$store.dispatch("countlyViews/deleteViews", ids.join(",")).then(function() {
                        CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], sticky: false, clearAll: true});
                    });
                }
            },
            closeDeleteForm: function() {
                this.showDeleteDialog = false;
            },
            updateManyViews: function() {
                var changes = [];
                var rows = this.$refs.editViewsTable.sourceRows;
                for (var k = 0; k < rows.length; k++) {
                    if (rows[k].editedDisplay !== rows[k].display) {
                        if (rows[k].editedDisplay === rows[k].view) {
                            changes.push({"key": rows[k]._id, "value": ""});
                        }
                        else {
                            changes.push({"key": rows[k]._id, "value": rows[k].editedDisplay});
                        }
                    }
                }
                if (changes.length > 0) {
                    this.$store.dispatch("countlyViews/updateViews", changes).then(function() {
                        CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], sticky: false, clearAll: true});
                    });
                }
            }
        }
    });

    var ViewsView = countlyVue.views.create({
        template: CV.T("/views/templates/views.html"),
        data: function() {
            var showScrollingCol = false;
            var showActionMapColumn = false;

            if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type !== "mobile") {
                showScrollingCol = true;
            }

            var cards = this.calculateTotalCards();
            var series = {"series": []};
            var dynamicCols = [{
                value: "u",
                width: "180",
                label: CV.i18n('common.table.total-users'),
                default: true
            },
            {
                value: "n",
                width: "180",
                label: CV.i18n('common.table.new-users'),
                default: true
            },
            {
                value: "t",
                width: "130",
                label: CV.i18n('views.total-visits'),
                default: true
            },
            {
                value: "s",
                width: "130",
                label: CV.i18n('views.starts'),
                default: true
            },
            {
                value: "e",
                width: "130",
                label: CV.i18n('views.exits'),
                default: true
            },
            {
                value: "d",
                width: "130",
                label: CV.i18n('views.avg-duration'),
                default: true
            },
            {
                value: "b",
                width: "130",
                label: CV.i18n('views.bounces'),
                default: true
            },
            {
                value: "br",
                label: CV.i18n('views.br'),
                width: "140",
                default: true
            }];

            if (showScrollingCol) {
                dynamicCols.push({
                    value: "scr",
                    label: CV.i18n('views.scrolling-avg'),
                    default: true,
                    width: "130"
                });
            }

            dynamicCols.push({
                value: "uvc",
                label: CV.i18n('views.uvc'),
                width: "180",
                default: true
            });

            return {
                description: CV.i18n('views.description'),
                remoteTableDataSource: countlyVue.vuex.getServerDataSource(this.$store, "countlyViews", "viewsMainTable"),
                showScrollingCol: showScrollingCol,
                filter: {segment: "all", segmentKey: "all"},
                "all": jQuery.i18n.map["common.all"],
                totalCards: cards,
                lineOptions: series,
                totalViewCountWarning: "",
                showViewCountWarning: false,
                tableDynamicCols: dynamicCols,
                showActionMapColumn: showActionMapColumn, //for action map
                domains: [] //for action map
            };
        },
        mounted: function() {
            var self = this;
            var persistentSettings = countlyCommon.getPersistentSettings()["pageViewsItems_" + countlyCommon.ACTIVE_APP_ID] || [];
            this.$store.dispatch('countlyViews/onSetSelectedViews', persistentSettings);
            this.$store.dispatch('countlyViews/fetchData').then(function() {
                self.calculateGraphSeries();
                self.showActionsMapColumn(); //for action map
                self.setUpDomains(); //for action map
            });

            this.$store.dispatch('countlyViews/fetchTotalViewsCount').then(function() {
                self.validateTotalViewCount();
            });
            self.$store.dispatch('countlyViews/fetchTotals').then(function() {
                self.totalCards = self.calculateTotalCards();
            });

        },
        methods: {
            refresh: function() {
                var self = this;
                this.$store.dispatch('countlyViews/fetchData').then(function() {
                    self.calculateGraphSeries();
                    self.showActionsMapColumn();//for action map
                    self.setUpDomains();//for action map
                });
                this.$store.dispatch('countlyViews/fetchTotals').then(function() {
                    self.totalCards = self.calculateTotalCards();
                });
                this.$store.dispatch('countlyViews/fetchTotalViewsCount').then(function() {
                    self.validateTotalViewCount();
                });

                this.$store.dispatch("countlyViews/fetchViewsMainTable", {"segmentKey": this.$store.state.countlyViews.selectedSegment, "segmentValue": this.$store.state.countlyViews.selectedSegmentValue});
            },
            validateTotalViewCount: function() {
                this.totalViewCount = this.$store.state.countlyViews.totalViewsCount;
                if (this.totalViewCount > countlyGlobal.views_limit) {
                    this.showViewCountWarning = true;
                    this.totalViewCountWarning = CV.i18n('views.max-views-limit').replace("{0}", countlyGlobal.views_limit);
                }
            },
            showActionsMapColumn: function() {
                //for action map
                var domains = this.$store.state.countlyViews.domains;
                if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web" && (domains.length || countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].app_domain && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].app_domain.length > 0)) {
                    this.showActionMapColumn = true;
                }
            },
            setUpDomains: function() {
                //for action map
                var domains = [];
                var dd = this.$store.state.countlyViews.domains || [];
                for (var k = 0; k < dd.length; k++) {
                    domains.push({"value": countlyCommon.decode(dd[k]), "label": countlyCommon.decode(dd[k])});
                }
                this.domains = domains;
            },
            viewActionMapClick: function(url, viewid, domain) {
                var self = this;
                if (domain) {
                    url = url.replace("#/analytics/views/action-map/", "");
                    url = domain + url;
                }
                var newWindow = window.open("");
                countlyTokenManager.createToken("View heatmap", "/o/actions", true, countlyCommon.ACTIVE_APP_ID, 1800, function(err, token) {
                    self.token = token && token.result;
                    if (self.token) {
                        newWindow.name = "cly:" + JSON.stringify({"token": self.token, "purpose": "heatmap", period: countlyCommon.getPeriodForAjax(), showHeatMap: true, app_key: countlyCommon.ACTIVE_APP_KEY, url: window.location.protocol + "//" + window.location.host});
                        newWindow.location.href = url;
                    }
                });
            },
            handleSelectionChange: function(selectedRows) {
                var selected = countlyCommon.getPersistentSettings()["pageViewsItems_" + countlyCommon.ACTIVE_APP_ID] || [];
                var map = {};
                for (var kz = 0; kz < selected.length; kz++) {
                    map[selected[kz]] = true;
                }
                selected = Object.keys(map); //get distinct
                if (selected.indexOf(selectedRows) === -1) {
                    selected.push(selectedRows);
                }
                else {
                    var index = selected.indexOf(selectedRows);
                    selected.splice(index, 1);
                }
                var persistData = {};
                persistData["pageViewsItems_" + countlyCommon.ACTIVE_APP_ID] = selected;
                countlyCommon.setPersistentSettings(persistData);

                for (var k = 0; k < this.$refs.viewsTable.sourceRows.length; k++) {
                    if (selected.indexOf(this.$refs.viewsTable.sourceRows[k]._id) > -1) {
                        this.$refs.viewsTable.sourceRows[k].selected = true;
                    }
                    else {
                        this.$refs.viewsTable.sourceRows[k].selected = false;
                    }
                }

                this.$store.dispatch('countlyViews/onSetSelectedViews', selected).then();
                this.refresh();
                return true;
            },
            segmentChosen: function(val) {
                var self = this;
                if (val.segment && val.segment !== "all" && val.segmentKey && val.segmentKey !== "all") {
                    this.$store.dispatch('countlyViews/onSetSelectedSegment', val.segment);
                    this.$store.dispatch('countlyViews/onSetSelectedSegmentValue', val.segmentKey);
                }
                else {
                    this.$store.dispatch('countlyViews/onSetSelectedSegment', "");
                    this.$store.dispatch('countlyViews/onSetSelectedSegmentValue', "");
                }
                this.$store.dispatch('countlyViews/fetchData').then(function() {
                    self.calculateGraphSeries();
                });
                this.$store.dispatch("countlyViews/fetchViewsMainTable", {"segmentKey": this.$store.state.countlyViews.selectedSegment, "segmentValue": this.$store.state.countlyViews.selectedSegmentValue});
            },
            calculateTotalCards: function() {
                var totals = this.$store.state.countlyViews.totals || {};
                totals.t = totals.t || 0;
                totals.uvc = totals.uvc || 0;
                totals.s = totals.s || 0;
                totals.b = totals.b || 0;
                if (totals.s) {
                    totals.br = Math.round(totals.b / totals.s * 1000) / 10;
                }
                else {
                    totals.br = 0;
                }

                return [
                    {
                        "name": CV.i18n('views.total_page_views.title'),
                        "description": CV.i18n('views.total_page_views.desc'),
                        "value": countlyCommon.formatNumber(totals.t),
                        "percent": 0,
                        isPercentage: false
                    },
                    {
                        "name": CV.i18n('views.uvc'),
                        "description": CV.i18n('views.unique_page_views.desc'),
                        "value": countlyCommon.formatNumber(totals.uvc),
                        "percent": 0,
                        isPercentage: false
                    },
                    {
                        "name": CV.i18n('views.br'),
                        "description": CV.i18n('views.bounce_rate.desc'),
                        "value": totals.br + " %",
                        "percent": Math.min(totals.br, 100),
                        isPercentage: true,
                        "color": "#F96300"
                    }
                ];
            },
            calculateGraphSeries: function() {
                var self = this;
                this.$store.dispatch("countlyViews/calculateGraphData").then(function(data2) {
                    var have_names = false;
                    var good_ones = [];
                    for (var k = 0; k < data2.length; k++) {
                        if (data2[k].name !== data2[k]._id) {
                            good_ones.push(data2[k]._id);
                            have_names = true;
                        }
                    }
                    if (have_names && good_ones.length !== data2.length) { //If we have loaded names - we can clear out the ones without name. (It means not existing, deleted views)
                        var persistData = {};
                        persistData["pageViewsItems_" + countlyCommon.ACTIVE_APP_ID] = good_ones;
                        countlyCommon.setPersistentSettings(persistData);
                        self.$store.dispatch('countlyViews/onSetSelectedViews', good_ones);
                    }
                    self.lineOptions = {series: data2};
                });
            },
            getExportQuery: function() {

                // var set = this.dtable.fnSettings();
                var requestPath = countlyCommon.API_PARTS.data.r + "?method=views&action=getExportQuery" + "&period=" + countlyCommon.getPeriodForAjax() + "&iDisplayStart=0&app_id=" + countlyCommon.ACTIVE_APP_ID + '&api_key=' + countlyGlobal.member.api_key;


                var segment = this.$store.state.countlyViews.selectedSegment;
                var segmentValue = this.$store.state.countlyViews.selectedSegmentValue;
                if (segment && segment !== "" && segmentValue && segmentValue !== "") {
                    requestPath += "&segment=" + segment;
                    requestPath += "&segmentVal=" + segmentValue;
                }
                /*if (set && set.oPreviousSearch && set.oPreviousSearch.sSearch) {
												requestPath += "&sSearch=" + set.oPreviousSearch.sSearch;
											}
											if (set && set.aaSorting && set.aaSorting[0]) {
												if (set.aaSorting[0][1] === 'asc' || set.aaSorting[0][1] === 'desc') {
													requestPath += "&iSortCol_0=" + set.aaSorting[0][0];
													requestPath += "&sSortDir_0=" + set.aaSorting[0][1];
												}
											}*/
                var apiQueryData = {
                    api_key: countlyGlobal.member.api_key,
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    path: requestPath,
                    method: "GET",
                    filename: "Views" + countlyCommon.ACTIVE_APP_ID + "_on_" + moment().format("DD-MMM-YYYY"),
                    prop: ['aaData'],
                    "url": "/o/export/requestQuery"
                };
                return apiQueryData;
            },
            numberFormatter: function(row, col, value) {
                return countlyCommon.formatNumber(value, 0);
            }
        },
        computed: {
            data: function() {
                return this.$store.state.countlyViews.appData;
            },
            appRows: function() {
                return this.data.table || [];
            },
            filterFields: function() {
                return [
                    {
                        label: CV.i18n('views.segment-key'),
                        key: "segment",
                        items: this.chooseSegment,
                        default: "all"
                    },
                    {
                        label: CV.i18n('views.segment-value'),
                        key: "segmentKey",
                        items: this.chooseSegmentValue,
                        default: "all"
                    }
                ];
            },
            chooseProperties: function() {
                return [
                    {"value": "t", "name": CV.i18n('views.total-visits')},
                    {"value": "u", "name": CV.i18n('common.table.total-users')},
                    {"value": "n", "name": CV.i18n('common.table.new-users')},
                    {"value": "d", "name": CV.i18n('views.duration')},
                    {"value": "s", "name": CV.i18n('views.starts')},
                    {"value": "e", "name": CV.i18n('views.exits')},
                    {"value": "b", "name": CV.i18n('views.bounces')},
                    {"value": "br", "name": CV.i18n('views.br')},
                    {"value": "scr", "name": CV.i18n('views.scrolling-avg')},
                    {"value": "uvc", "name": CV.i18n('views.uvc')},
                ];
            },
            topDropdown: function() {
                var links = [];
                if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                    for (var k = 0; k < this.externalLinks.length; k++) {
                        links.push(this.externalLinks[k]);
                    }
                }
                links.push({"icon": "", "label": CV.i18n('plugins.configs'), "value": "#/manage/configurations/views"}); //to settings
                return links;

            },
            chooseSegment: function() {
                var segments = this.$store.state.countlyViews.segments || {};
                var listed = [{"value": "all", "label": jQuery.i18n.map["views.all-segments"]}];
                for (var key in segments) {
                    listed.push({"value": key, "label": key});
                }
                return listed;

            },
            chooseSegmentValue: function() {
                var segments = this.$store.state.countlyViews.segments || {};

                var key;
                if (this.$refs && this.$refs.selectSegmentValue && this.$refs.selectSegmentValue.unsavedValue && this.$refs.selectSegmentValue.unsavedValue.segment) {
                    key = this.$refs.selectSegmentValue.unsavedValue.segment;
                }
                var listed = [{"value": "all", "label": CV.i18n('common.all')}];

                if (!key) {
                    return listed;
                }
                else {
                    if (segments[key]) {
                        for (var k = 0; k < segments[key].length; k++) {
                            listed.push({"value": segments[key][k], "label": segments[key][k]});
                        }
                        return listed;
                    }
                    else {
                        return listed;
                    }
                }
            },
            selectedProperty: {
                set: function(value) {
                    this.$store.dispatch('countlyViews/onSetSelectedProperty', value);
                    this.calculateGraphSeries();
                },
                get: function() {
                    return this.$store.state.countlyViews.selectedProperty;
                }
            },
            isLoading: function() {
                return this.$store.state.countlyViews.isLoading;
            }
        },
        mixins: [
            countlyVue.container.dataMixin({
                'externalLinks': '/analytics/views/links'
            })
        ]
    });

    var ViewsPerSessionView = countlyVue.views.create({
        template: CV.T("/views/templates/views-per-session.html"),
        mixins: [countlyVue.mixins.commonFormatters],
        data: function() {
            return {
                progressBarColor: "#017AFF"
            };
        },
        computed: {
            viewsPerSession: function() {
                return this.$store.state.countlyViewsPerSession.viewsPerSession;
            },
            isLoading: function() {
                return this.$store.getters['countlyViewsPerSession/isLoading'];
            },
            viewsPerSessionRows: function() {
                return this.$store.state.countlyViewsPerSession.viewsPerSession.rows;
            },
            viewsPerSessionOptions: function() {
                return {
                    xAxis: {
                        data: this.xAxisViewsPerSessionBuckets,
                        axisLabel: {
                            color: "#333C48"
                        }
                    },
                    series: this.yAxisViewsPerSessionCountSerie
                };
            },
            xAxisViewsPerSessionBuckets: function() {
                return this.$store.state.countlyViewsPerSession.viewsPerSession.rows.map(function(tableRow) {
                    return tableRow.viewsBuckets;
                });
            },
            yAxisViewsPerSessionCountSerie: function() {
                return this.viewsPerSession.series.map(function(viewsPerSessionSerie) {
                    return {
                        data: viewsPerSessionSerie.data,
                        name: viewsPerSessionSerie.label,
                    };
                });
            },
        },
        methods: {
            refresh: function() {
                this.$store.dispatch('countlyViewsPerSession/fetchAll', false);
            },
            dateChanged: function() {
                this.$store.dispatch('countlyViewsPerSession/fetchAll', true);
            }
        },
        mounted: function() {
            this.$store.dispatch('countlyViewsPerSession/fetchAll', true);
        },
    });

    var ViewsHomeWidget = countlyVue.views.create({
        template: CV.T("/views/templates/viewsHomeWidget.html"),
        data: function() {
            return {
                dataBlocks: [],
                isLoading: true
            };
        },
        mounted: function() {
            var self = this;
            self.$store.dispatch('countlyViews/fetchTotals').then(function() {
                self.dataBlocks = self.calculateAllData();
                self.isLoading = false;
            });
        },
        beforeCreate: function() {
            this.module = countlyViews.getVuexModule();
            CV.vuex.registerGlobally(this.module);
        },
        beforeDestroy: function() {
            CV.vuex.unregister(this.module.name);
            this.module = null;
        },
        methods: {
            refresh: function(force) {
                var self = this;
                if (force) {
                    self.isLoading = true;
                }
                self.$store.dispatch('countlyViews/fetchTotals').then(function() {
                    self.dataBlocks = self.calculateAllData();
                    self.isLoading = false;
                });
            },
            calculateAllData: function() {
                var totals = {};
                if (this.$store && this.$store.state && this.$store.state.countlyViews) {
                    totals = this.$store.state.countlyViews.totals || {};
                }
                totals.t = totals.t || 0;
                totals.uvc = totals.uvc || 0;
                totals.s = totals.s || 0;
                totals.b = totals.b || 0;
                if (totals.s) {
                    totals.br = Math.round(totals.b / totals.s * 1000) / 10;
                }
                else {
                    totals.br = 0;
                }

                return [
                    {
                        "name": CV.i18n('views.total_page_views.title'),
                        "description": CV.i18n('views.total_page_views.desc'),
                        "value": countlyCommon.formatNumber(totals.t),
                        "percent": 0,
                        isPercentage: false
                    },
                    {
                        "name": CV.i18n('views.uvc'),
                        "description": CV.i18n('views.unique_page_views.desc'),
                        "value": countlyCommon.formatNumber(totals.uvc),
                        "percent": 0,
                        isPercentage: false
                    },
                    {
                        "name": CV.i18n('views.br'),
                        "description": CV.i18n('views.bounce_rate.desc'),
                        "value": totals.br + " %",
                        "percent": Math.min(totals.br, 100),
                        isPercentage: true,
                        "color": "#F96300"
                    }
                ];
            }
        }
    });

    if (countlyAuth.validateRead(FEATURE_NAME)) {
        countlyVue.container.registerTab("/analytics/sessions", {
            priority: 4,
            name: "views-per-session",
            title: CV.i18n('views-per-session.title'),
            route: "#/analytics/sessions/views-per-session",
            component: ViewsPerSessionView,
            vuex: [{
                clyModel: countlyViewsPerSession
            }]
        });

        var viewsHomeView = new countlyVue.views.BackboneWrapper({
            component: ViewsView,
            vuex: [{clyModel: countlyViews}]
        });

        var viewsEditView = new countlyVue.views.BackboneWrapper({
            component: EditViewsView,
            vuex: [{clyModel: countlyViews}]
        });

        app.viewsHomeView = viewsHomeView;
        app.viewsEditView = viewsEditView;


        app.route("/analytics/views", "views-home", function() {
            var params = {};
            this.viewsHomeView.params = params;
            this.renderWhenReady(this.viewsHomeView);
        });

        app.route("/analytics/views/manage", "views", function() {
            var params = {};
            this.viewsEditView.params = params;
            this.renderWhenReady(this.viewsEditView);
        });


        countlyVue.container.registerData("/home/widgets", {
            _id: "views-dashboard-widget",
            label: CV.i18n('views.title'),
            description: CV.i18n('views.title-desc'),
            enabled: {"default": true}, //object. For each type set if by default enabled
            available: {"default": true}, //object. default - for all app types. For other as specified.
            placeBeforeDatePicker: false,
            linkTo: {"label": CV.i18n('views.go-to-views'), "href": "#/analytics/views"},
            width: 6,
            order: 4,
            component: ViewsHomeWidget
        });

    }

    window.ActionMapView = countlyView.extend({
        actionType: "",
        curSegment: 0,
        curRadius: 1,
        curBlur: 1,
        baseRadius: 1,
        baseBlur: 1.6,
        beforeRender: function() {
            var self = this;
            return $.when(T.render('/views/templates/actionmap.html', function(src) {
                self.template = src;
            }), countlyViews.loadActionsData(this.view)).then(function() {});
        },
        getData: function(data) {
            var heat = [];
            var point;
            var width = $("#view-canvas-map").prop('width');
            var height = $("#view-canvas-map").prop('height');
            for (var i = 0; i < data.length; i++) {
                point = data[i].sg;
                if (point.type === this.actionType) {
                    heat.push([parseInt((point.x / point.width) * width), parseInt((point.y / point.height) * height), data[i].c]);
                }
            }
            return heat;
        },
        getMaxHeight: function(data) {
            var width = $("#view-map").width();
            var lowest = {w: 0, h: 0};
            var highest = {w: 100000, h: 5000};
            var i;
            for (i = 0; i < data.length; i++) {
                if (width === data[i].sg.width) {
                    return data[i].sg.height;
                }
                else if (width > data[i].sg.width && lowest.w < data[i].sg.width) {
                    lowest.w = data[i].sg.width;
                    lowest.h = data[i].sg.height;
                }
            }

            if (lowest.h > 0) {
                return lowest.h;
            }

            for (i = 0; i < data.length; i++) {
                if (width < data[i].sg.width && highest.w > data[i].sg.width) {
                    highest.w = data[i].sg.width;
                    highest.h = data[i].sg.height;
                }
            }

            return highest.h;
        },
        getResolutions: function() {
            var res = ["Normal", "Fullscreen", "320x480", "480x800"];
            return res;
        },
        resize: function() {
            $('#view-canvas-map').prop('width', $("#view-map").width());
            $('#view-canvas-map').prop('height', $("#view-map").height());
            if (this.map) {
                this.map.resize();
            }
        },
        loadIframe: function() {
            var self = this;
            var segments = countlyViews.getActionsData().domains;
            var url = "http://" + segments[self.curSegment] + self.view;
            if ($("#view_loaded_url").val().length === 0) {
                $("#view_loaded_url").val(url);
            }
            countlyViews.testUrl(url, function(result) {
                if (result) {
                    $("#view-map iframe").attr("src", url);
                    $("#view_loaded_url").val(url);
                }
                else {
                    self.curSegment++;
                    if (segments[self.curSegment]) {
                        self.loadIframe();
                    }
                    else {
                        $("#view_loaded_url").show();
                        CountlyHelpers.alert(jQuery.i18n.map["views.cannot-load"], "red");
                    }
                }
            });
        },
        renderCommon: function(isRefresh) {
            var data = countlyViews.getActionsData();
            this.actionType = data.types[0] || jQuery.i18n.map["views.select-action-type"];
            var segments = countlyViews.getSegments();
            var self = this;
            this.templateData = {
                "page-title": jQuery.i18n.map["views.action-map"],
                "font-logo-class": "fa-eye",
                "first-type": this.actionType,
                "active-segmentation": jQuery.i18n.map["views.all-segments"],
                "segmentations": segments,
                "resolutions": this.getResolutions(),
                "data": data
            };

            if (!isRefresh) {
                $(this.el).html(this.template(this.templateData));
                $("#view-map").height(this.getMaxHeight(data.data));
                this.resize();
                this.loadIframe();
                this.map = simpleheat("view-canvas-map");
                this.map.data(this.getData(data.data));
                this.baseRadius = Math.max((48500 - 35 * data.data.length) / 900, 5);
                this.drawMap();

                app.localize();

                $("#view_reload_url").on("click", function() {
                    $("#view-map iframe").attr("src", "/o/urlload?url=" + encodeURIComponent($("#view_loaded_url").val()));
                });

                $("#view_loaded_url").keyup(function(event) {
                    if (event.keyCode === 13) {
                        $("#view_reload_url").click();
                    }
                });

                $("#radius").on("change", function() {
                    self.curRadius = parseInt($("#radius").val()) / 10;
                    self.drawMap();
                });

                $("#blur").on("change", function() {
                    self.curBlur = parseInt($("#blur").val()) / 10;
                    self.drawMap();
                });

                $("#action-map-type .segmentation-option").on("click", function() {
                    self.actionType = $(this).data("value");
                    self.refresh();
                });

                $("#action-map-resolution .segmentation-option").on("click", function() {
                    switch ($(this).data("value")) {
                    case "Normal":
                        $("#view-map").width("100%");
                        $("#view-map").prependTo("#view-map-container");
                        break;
                    case "Fullscreen":
                        $("#view-map").width("100%");
                        $("#view-map").prependTo(document.body);
                        break;
                    default:
                        var parts = $(this).data("value").split("x");
                        $("#view-map").width(parts[0] + "px");
                        $("#view-map").prependTo("#view-map-container");
                    }
                    self.resize();
                    self.refresh();
                });

                $("#view-segments .segmentation-option").on("click", function() {
                    countlyViews.reset();
                    countlyViews.setSegment($(this).data("value"));
                    self.refresh();
                });
            }
        },
        drawMap: function() {
            this.map.radius(this.baseRadius * this.curRadius, this.baseRadius * this.baseBlur * this.curBlur);
            this.map.draw();
        },
        refresh: function() {
            var self = this;
            $.when(countlyViews.loadActionsData(this.view)).then(function() {
                if (app.activeView !== self) {
                    return false;
                }
                self.renderCommon(true);
                var data = countlyViews.getActionsData();
                if (self.map) {
                    self.map.clear();
                    self.map.data(self.getData(data.data));
                    self.baseRadius = Math.max((48500 - 35 * data.data.length) / 900, 5);
                    self.drawMap();
                }
            });
        }
    });
    //register views
    app.actionMapView = new ActionMapView();

    if (countlyAuth.validateRead(FEATURE_NAME)) {
        //Action map
        app.route("/analytics/views/action-map/*view", 'views', function(view) {
            this.actionMapView.view = view;
            this.renderWhenReady(this.actionMapView);
        });

        //Views type button in drill
        app.addPageScript("/drill#", function() {
            var drillClone;
            var self = app.drillView;
            var record_views = countlyGlobal.record_views;
            if (countlyGlobal.apps && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill && typeof countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill.record_views !== "undefined") {
                record_views = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill.record_views;
            }
            if (record_views) {

                $("#drill-types").append('<div id="drill-type-views" class="item"><div class="inner"><span class="icon views"></span><span class="text">' + jQuery.i18n.map["views.title"] + '</span></div></div>');
                $("#drill-type-views").on("click", function() {
                    if ($(this).hasClass("active")) {
                        return true;
                    }

                    $("#drill-types").find(".item").removeClass("active");
                    $(this).addClass("active");
                    $("#event-selector").hide();

                    $("#drill-no-event").fadeOut();
                    $("#segmentation-start").fadeOut().remove();

                    var currEvent = "[CLY]_view";

                    self.graphType = "line";
                    self.graphVal = "times";
                    self.filterObj = {};
                    self.byVal = "";
                    self.drillChartDP = {};
                    self.drillChartData = {};
                    self.activeSegmentForTable = "";
                    countlySegmentation.reset();

                    $("#drill-navigation").find(".menu[data-open=table-view]").hide();

                    $.when(countlySegmentation.initialize(currEvent)).then(function() {
                        $("#drill-filter-view").replaceWith(drillClone.clone(true));
                        self.adjustFilters();
                        if (!self.keepQueryTillExec) {
                            self.draw(true, false);
                        }
                    });
                });
                setTimeout(function() {
                    drillClone = $("#drill-filter-view").clone(true);
                }, 0);
            }
        });

        var GridComponent = countlyVue.views.create({
            template: CV.T('/views/templates/widget.html'),
            props: {
                data: {
                    type: Object,
                    default: function() {
                        return {};
                    }
                }
            },
            mounted: function() {
            },
            methods: {
                refresh: function() {
                }
            },
            computed: {
                title: function() {
                    if (this.data.title) {
                        return this.data.title;
                    }
                    if (this.data.dashData) {
                        return CV.i18n("views.widget-type");
                    }
                    return "";
                },
                period: function() {
                    var pp = countlyWidgets.formatPeriod(this.data.custom_period);
                    pp = pp || {};
                    return pp.longName || "";
                },
                maxTableHeight: function() {
                    return 200;
                },
                tableStructure: function() {
                    var columns = [{prop: "view", "title": CV.i18n("views.widget-type")}];

                    this.data = this.data || {};
                    this.data.metrics = this.data.metrics || [];
                    for (var k = 0; k < this.data.metrics.length; k++) {
                        columns.push({"prop": this.data.metrics[k], "title": CV.i18n("views." + this.data.metrics[k])});
                    }
                    return columns;
                },
                getTableData: function() {
                    this.data = this.data || {};
                    this.data.dashData = this.data.dashData || {};
                    this.data.dashData.data = this.data.dashData.data || {};
                    return this.data.dashData.data.chartData;

                }
            }

        });

        var DrawerComponent = countlyVue.views.create({
            template: CV.T('/views/templates/widgetDrawer.html'),
            data: function() {
                return {
                    useCustomTitle: false,
                    useCustomPeriod: false,
                    availableStatsMetric: [
                        { label: CV.i18n("views.u"), value: "u" },
                        { label: CV.i18n("views.n"), value: "n" },
                        { label: CV.i18n("views.t"), value: "t" },
                        { label: CV.i18n("views.d"), value: "d" },
                        { label: CV.i18n("views.s"), value: "s" },
                        { label: CV.i18n("views.e"), value: "e" },
                        { label: CV.i18n("views.b"), value: "b" },
                        { label: CV.i18n("views.br"), value: "br" },
                        { label: CV.i18n("views.uvc"), value: "uvc" }
                    ]
                };
            },
            computed: {
            },
            mounted: function() {
            },
            methods: {
            },
            watch: {
                'scope.editedObject.selectedApp': function(newVal) {
                    if (countlyGlobal.apps[newVal] && countlyGlobal.apps[newVal].type === "web") {
                        this.availableStatsMetric = [
                            { label: CV.i18n("web.common.table.total-users"), value: "u" },
                            { label: CV.i18n("web.common.table.new-users"), value: "n" },
                            { label: CV.i18n("views.t"), value: "t" },
                            { label: CV.i18n("views.d"), value: "d" },
                            { label: CV.i18n("views.s"), value: "s" },
                            { label: CV.i18n("views.e"), value: "e" },
                            { label: CV.i18n("views.b"), value: "b" },
                            { label: CV.i18n("views.br"), value: "br" },
                            { label: CV.i18n("views.uvc"), value: "uvc" },
                            { label: CV.i18n("views.scr"), value: "scr" }
                        ];
                    }
                    else {
                        this.availableStatsMetric = [
                            { label: CV.i18n("views.u"), value: "u" },
                            { label: CV.i18n("views.n"), value: "n" },
                            { label: CV.i18n("views.t"), value: "t" },
                            { label: CV.i18n("views.d"), value: "d" },
                            { label: CV.i18n("views.s"), value: "s" },
                            { label: CV.i18n("views.e"), value: "e" },
                            { label: CV.i18n("views.b"), value: "b" },
                            { label: CV.i18n("views.br"), value: "br" },
                            { label: CV.i18n("views.uvc"), value: "uvc" }
                        ];
                    }
                },
            },
            props: {
                scope: {
                    type: Object,
                    default: function() {
                        return {};
                    }
                }
            }
        });

        countlyVue.container.registerData("/custom/dashboards/widget", {
            type: "analytics",
            label: CV.i18n("views.widget-type"),
            priority: 1,
            primary: false,
            getter: function(widget) {
                return widget.widget_type === "analytics" && widget.data_type === "views";
            },
            drawer: {
                component: DrawerComponent,
                getEmpty: function() {
                    return {
                        title: "",
                        widget_type: "analytics",
                        data_type: "views",
                        app_count: 'single',
                        metrics: [],
                        apps: [],
                        custom_period: "30days",
                        visualization: "",
                        breakdowns: []
                    };
                },
                beforeLoadFn: function(/*doc, isEdited*/) {
                },
                beforeSaveFn: function(/*doc*/) {

                }
            },
            grid: {
                component: GridComponent,
                dimensions: function() {
                    return {
                        minWidth: 6,
                        minHeight: 6,
                        width: 6,
                        height: 4
                    };
                }
            }

        });
    }

    $(document).ready(function() {
        jQuery.fn.dataTableExt.oSort['view-frequency-asc'] = function(x, y) {
            x = countlyViews.getFrequencyIndex(x);
            y = countlyViews.getFrequencyIndex(y);

            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['view-frequency-desc'] = function(x, y) {
            x = countlyViews.getFrequencyIndex(x);
            y = countlyViews.getFrequencyIndex(y);

            return ((x < y) ? 1 : ((x > y) ? -1 : 0));
        };

        app.addAppSwitchCallback(function(appId) {
            if (app._isFirstLoad !== true) {
                countlyViews.loadList(appId);
            }
        });
        if (countlyAuth.validateRead(FEATURE_NAME)) {
            app.addSubMenu("analytics", {code: "analytics-views", url: "#/analytics/views", text: "views.title", priority: 25});
        }

        //check if configuration view exists
        if (app.configurationsView) {
            app.configurationsView.registerLabel("views", "views.title");
            app.configurationsView.registerLabel("views.view_limit", "views.view-limit");
        }
    });
})();