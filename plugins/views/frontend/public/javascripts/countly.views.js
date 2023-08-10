/*global CountlyHelpers, countlyAuth, countlySegmentation, countlyCommon, countlyGlobal, countlyViews, app, $, jQuery, moment, countlyVue, countlyViewsPerSession, CV,countlyTokenManager, countlyGraphNotesCommon*/

(function() {
    var FEATURE_NAME = "views";

    var EditViewsView = countlyVue.views.create({
        template: CV.T("/views/templates/manageViews.html"),
        mixins: [
            countlyVue.mixins.auth(FEATURE_NAME)
        ],
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
                showDeleteDialog: false,
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
                var self = this;
                this.showDeleteDialog = false;

                if (this.selectedViews && this.selectedViews.length > 0) {
                    var ids = [];
                    for (var k = 0; k < this.selectedViews.length; k++) {
                        ids.push(this.selectedViews[k]._id);
                    }
                    this.$store.dispatch("countlyViews/deleteViews", ids.join(",")).then(function() {
                        if (self.$store.getters["countlyViews/updateError"]) {
                            CountlyHelpers.notify({type: "error", title: jQuery.i18n.map["common.error"], message: self.$store.getters["countlyViews/updateError"], sticky: false, clearAll: true});
                        }
                        else {
                            CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], sticky: false, clearAll: true});
                        }
                    });
                }
            },
            closeDeleteForm: function() {
                this.showDeleteDialog = false;
            },
            updateManyViews: function() {
                var changes = [];
                var self = this;
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
                        if (self.$store.getters["countlyViews/updateError"]) {
                            CountlyHelpers.notify({type: "error", title: jQuery.i18n.map["common.error"], message: self.$store.getters["countlyViews/updateError"], sticky: false, clearAll: true});
                        }
                        else {
                            CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], sticky: false, clearAll: true});
                        }
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
                isGraphLoading: true,
                isTableLoading: false,
                showActionMapColumn: showActionMapColumn, //for action map
                domains: [], //for action map
                persistentSettings: [],
                tablePersistKey: "views_table_" + countlyCommon.ACTIVE_APP_ID,
                tableMode: "all",
                tableModes: [
                    {"key": "all", "label": CV.i18n('common.all')},
                    {"key": "selected", "label": CV.i18n('views.selected-views')}
                ]
            };
        },
        mounted: function() {
            var self = this;
            // var persistentSettings = countlyCommon.getPersistentSettings()["pageViewsItems_" + countlyCommon.ACTIVE_APP_ID] || [];
            self.persistentSettings = countlyCommon.getPersistentSettings()["pageViewsItems_" + countlyCommon.ACTIVE_APP_ID] || [];
            this.$store.dispatch('countlyViews/onSetSelectedViews', self.persistentSettings);
            this.$store.dispatch('countlyViews/fetchData').then(function() {
                self.calculateGraphSeries();
                self.isGraphLoading = false;
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
            refresh: function(force) {
                var self = this;
                if (force) {
                    self.isGraphLoading = true;
                    self.isTableLoading = true;
                }
                this.$store.dispatch('countlyViews/fetchData').then(function() {
                    self.calculateGraphSeries();
                    self.isGraphLoading = false;
                    self.showActionsMapColumn();//for action map
                    self.setUpDomains();//for action map
                });
                this.$store.dispatch('countlyViews/fetchTotals').then(function() {
                    self.totalCards = self.calculateTotalCards();
                });
                this.$store.dispatch('countlyViews/fetchTotalViewsCount').then(function() {
                    self.validateTotalViewCount();
                });

                this.$store.dispatch("countlyViews/fetchViewsMainTable", {"segmentKey": this.$store.state.countlyViews.selectedSegment, "segmentValue": this.$store.state.countlyViews.selectedSegmentValue}).then(function() {
                    self.isTableLoading = false;
                });
            },
            validateTotalViewCount: function() {
                this.totalViewCount = this.$store.state.countlyViews.totalViewsCount;
                if (this.totalViewCount >= countlyGlobal.views_limit) {
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
                var self = this;
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

                if (this.$refs.viewsTable) {
                    for (var k = 0; k < this.$refs.viewsTable.sourceRows.length; k++) {
                        if (selected.indexOf(this.$refs.viewsTable.sourceRows[k]._id) > -1) {
                            this.$refs.viewsTable.sourceRows[k].selected = true;
                        }
                        else {
                            this.$refs.viewsTable.sourceRows[k].selected = false;
                        }
                    }
                }
                this.persistentSettings = selected;
                this.$store.dispatch('countlyViews/onSetSelectedViews', selected).then(function() {
                    self.isGraphLoading = true;
                    self.$store.dispatch('countlyViews/fetchData').then(function() {
                        self.calculateGraphSeries();
                        self.isGraphLoading = false;
                    });
                });
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
                        "value": totals.br + "%",
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
                    self.lineOptions = {
                        series: data2,
                        tooltip: {
                            position: function(point, params, dom, rect, size) {
                                if (size.viewSize[0] <= point[0] + 180) {
                                    return [point[0] - 180, point[1] + 10];
                                }
                                else {
                                    return [point[0], point[1] + 10];
                                }
                            },
                        }
                    };
                    if (self.selectedProperty === "d") {
                        self.lineOptions.yAxis = {
                            axisLabel: {
                                formatter: function(value) {
                                    return countlyCommon.formatSecond(value);
                                }
                            }
                        };
                    }
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
                    type_name: "views",
                    "url": "/o/export/requestQuery"
                };
                return apiQueryData;
            },
            numberFormatter: function(row, col, value) {
                return countlyCommon.formatNumber(value, 0);
            },
            formatChartValue: function(value) {
                if (this.selectedProperty === "br") {
                    return countlyCommon.getShortNumber(value) + '%';
                }
                if (this.selectedProperty === "d") {
                    return countlyCommon.formatSecond(value);
                }
                return countlyCommon.getShortNumber(value);
            }


        },
        computed: {
            data: function() {
                return this.$store.state.countlyViews.appData;
            },
            selectedTableRows: function() {
                return this.$store.getters["countlyViews/selectedTableRows"];
            },
            filterFields: function() {
                return [
                    {
                        label: CV.i18n('views.segment-key'),
                        key: "segment",
                        items: this.chooseSegment,
                        default: "all",
                        searchable: true
                    },
                    {
                        label: CV.i18n('views.segment-value'),
                        key: "segmentKey",
                        items: this.chooseSegmentValue,
                        default: "all",
                        searchable: true
                    }
                ];
            },
            chooseProperties: function() {
                return [
                    {"value": "t", "name": CV.i18n('views.total-visits')},
                    {"value": "u", "name": CV.i18n('common.table.total-users')},
                    {"value": "n", "name": CV.i18n('common.table.new-users')},
                    {"value": "d", "name": CV.i18n('views.avg-duration')},
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
                var sortedKeys = Object.keys(segments).sort(Intl.Collator().compare);
                var listed = [{"value": "all", "label": jQuery.i18n.map["views.all-segments"]}];
                for (var i = 0; i < sortedKeys.length; i++) {
                    listed.push({"value": sortedKeys[i], "label": sortedKeys[i]});
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
            }),
            countlyVue.mixins.auth(FEATURE_NAME)
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
            },
            sortSessionViewsBuckets: function(a, b) {
                return a.weight - b.weight;
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
                isLoading: true,
                headerData: {
                    label: CV.i18n("views.title"),
                    description: CV.i18n("views.title-desc"),
                    linkTo: {"label": CV.i18n('views.go-to-views'), "href": "#/analytics/views"},
                }
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
                        "value": totals.br + "%",
                        "percent": Math.min(totals.br, 100),
                        isPercentage: true,
                        "color": "#F96300"
                    }
                ];
            }
        }
    });

    countlyVue.container.registerTab("/analytics/sessions", {
        priority: 4,
        name: "views-per-session",
        permission: FEATURE_NAME,
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
        permission: FEATURE_NAME,
        enabled: {"default": true}, //object. For each type set if by default enabled
        available: {"default": true}, //object. default - for all app types. For other as specified.
        placeBeforeDatePicker: false,
        width: 6,
        order: 4,
        component: ViewsHomeWidget
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
    }, FEATURE_NAME);

    var GridComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/widgets/analytics/widget.html'),
        mixins: [countlyVue.mixins.customDashboards.global,
            countlyVue.mixins.commonFormatters,
            countlyVue.mixins.zoom,
            countlyVue.mixins.hasDrawers("annotation"),
            countlyVue.mixins.graphNotesCommand
        ],
        components: {
            "drawer": countlyGraphNotesCommon.drawer
        },
        computed: {
            title: function() {
                if (this.data.title) {
                    return this.data.title;
                }

                return this.i18n("views.widget-type");
            },
            showBuckets: function() {
                return false;
            },
            metricLabels: function() {
                return [];
            },
            tableStructure: function() {
                var columns = [{prop: "view", "title": CV.i18n("views.widget-type")}];

                this.data = this.data || {};
                this.data.metrics = this.data.metrics || [];
                for (var k = 0; k < this.data.metrics.length; k++) {
                    if (this.data.metrics[k] === "d" || this.data.metrics[k] === "scr" || this.data.metrics[k] === "br") {
                        columns.push({"prop": this.data.metrics[k], "title": CV.i18n("views." + this.data.metrics[k])});
                    }
                    else {
                        columns.push({"prop": this.data.metrics[k], "title": CV.i18n("views." + this.data.metrics[k]), "type": "number"});
                    }
                }
                return columns;
            },
            getTableData: function() {
                this.data = this.data || {};
                this.data.dashData = this.data.dashData || {};
                this.data.dashData.data = this.data.dashData.data || {};
                this.data.dashData.data.chartData = this.data.dashData.data.chartData || [];

                var tableData = [];
                for (var z = 0; z < this.data.dashData.data.chartData.length; z++) {
                    var ob = {"view": this.data.dashData.data.chartData[z].view};
                    for (var k = 0; k < this.data.metrics.length; k++) {
                        if (this.data.metrics[k] === "d") {
                            if (this.data.dashData.data.chartData[z].t > 0) {
                                ob[this.data.metrics[k]] = countlyCommon.formatSecond(this.data.dashData.data.chartData[z].d / this.data.dashData.data.chartData[z].t);
                            }
                            else {
                                ob[this.data.metrics[k]] = 0;
                            }
                        }
                        else if (this.data.metrics[k] === "scr") {
                            if (this.data.dashData.data.chartData[k].t > 0) {
                                var vv = parseFloat(this.data.dashData.data.chartData[z].scr) / parseFloat(this.data.dashData.data.chartData[z].t);
                                if (vv > 100) {
                                    vv = 100;
                                }
                                ob[this.data.metrics[k]] = countlyCommon.formatNumber(vv) + "%";
                            }
                            else {
                                ob[this.data.metrics[k]] = 0;
                            }
                        }
                        else if (this.data.metrics[k] === "br") {
                            ob[this.data.metrics[k]] = this.data.dashData.data.chartData[z][this.data.metrics[k]] || 0;
                            ob[this.data.metrics[k]] = countlyCommon.formatNumber(ob[this.data.metrics[k]]) + "%";
                        }
                        else {
                            ob[this.data.metrics[k]] = this.data.dashData.data.chartData[z][this.data.metrics[k]];
                        }
                    }
                    tableData.push(ob);

                }
                return tableData;
            }
        },
        methods: {
            refresh: function() {
                this.refreshNotes();
            },
            onWidgetCommand: function(event) {
                if (event === 'zoom') {
                    this.triggerZoom();
                    return;
                }
                else if (event === 'add' || event === 'manage' || event === 'show') {
                    this.graphNotesHandleCommand(event);
                    return;
                }
                else {
                    return this.$emit('command', event);
                }
            },
        }
    });

    var DrawerComponent = countlyVue.views.create({
        template: "#views-drawer",
        data: function() {
            return {
                useCustomTitle: false,
                useCustomPeriod: false
            };
        },
        computed: {
            availableStatsMetric: function() {
                var app = this.scope.editedObject.apps[0];
                var metrics = [
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
                if (app && countlyGlobal.apps[app] && countlyGlobal.apps[app].type === "web") {
                    metrics.push({ label: CV.i18n("views.scr"), value: "scr" });
                }
                return metrics;
            }
        },
        methods: {
            onDataTypeChange: function(v) {
                var widget = this.scope.editedObject;
                this.$emit("reset", {widget_type: widget.widget_type, data_type: v});
            }
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
        permission: FEATURE_NAME,
        label: CV.i18n("views.widget-type"),
        priority: 1,
        primary: false,
        getter: function(widget) {
            return widget.widget_type === "analytics" && widget.data_type === "views";
        },
        templates: [
            {
                namespace: "views",
                mapping: {
                    drawer: '/views/templates/widgetDrawer.html',
                }
            }
        ],
        drawer: {
            component: DrawerComponent,
            getEmpty: function() {
                return {
                    title: "",
                    feature: FEATURE_NAME,
                    widget_type: "analytics",
                    data_type: "views",
                    app_count: 'single',
                    metrics: [],
                    apps: [],
                    custom_period: null,
                    visualization: "table",
                    isPluginWidget: true
                };
            },
            beforeLoadFn: function(/*doc, isEdited*/) {
            },
            beforeSaveFn: function(/*doc*/) {

            }
        },
        grid: {
            component: GridComponent
        }

    });

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
        if (app._isFirstLoad !== true && countlyAuth.validateRead(FEATURE_NAME) && CountlyHelpers.isPluginEnabled(FEATURE_NAME)) {
            countlyViews.loadList(appId);
        }
    });
    app.addSubMenu("analytics", {code: "analytics-views", permission: FEATURE_NAME, url: "#/analytics/views", text: "views.title", priority: 25});

    //check if configuration view exists
    if (app.configurationsView) {
        app.configurationsView.registerLabel("views", "views.title");
        app.configurationsView.registerLabel("views.view_limit", "views.view-limit");
    }
})();