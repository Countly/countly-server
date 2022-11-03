/*global CV, countlyDrill, countlyDrillCommons, countlyVue,countlyDataviews, countlyCommon, countlyGlobal, jQuery, app, moment, _, jsDeepEquals, CountlyHelpers */
(function() {

    var FEATURE_NAME = 'drill';

    var DrillCurrentDocCRUDMixin = {
        methods: {
            handleSaveCommand: function(command) {
                if (command === "save-as") {
                    this.showSaveDialog({name: this.fullDocName});
                }
                else if (command === "save-changes") {
                    this.showSaveDialog({_id: this.currentDoc.id});
                }
            },
            showSaveDialog: function(overrides) {
                this.$refs.queryMan.showSaveDialog(_.extend({
                    name: this.currentDoc.name,
                    desc: this.currentDoc.description,
                    global: this.currentDoc.global
                }, overrides));
            },
            showLoadDialog: function() {
                this.$refs.queryMan.showSimpleLoadDialog();
            },
            newFilter: function() {
                this.setCurrentDocument(countlyDrill.documentFactory.create({
                    event: this.currentDoc.event
                }));
                this.exitTaskMode();
            },
            onLoadFilter: function(savedQuery) {
                this.setCurrentDocument(countlyDrill.documentFactory.fromSaved(savedQuery));
            },
            onSaveFilter: function(evt) {
                var self = this;
                evt.service.save(evt.tag, this.currentDoc.filter, this.currentDoc.event).then(function(resp) {
                    if (resp.result && resp.result.status === "Success" && resp.result.id) {
                        self.currentDoc.id = resp.result.id;
                        self.currentDoc.name = evt.tag.name;
                        self.currentDoc.description = evt.tag.desc;
                        self.currentDoc.global = evt.tag.global;
                        self.currentDoc.creator = countlyGlobal.member._id;
                        self.currentDoc.sign = resp.result.sign;
                        self.lastSavedDoc = self.currentDoc.clone();
                        CountlyHelpers.notify({
                            title: self.i18n("common.success"),
                            message: self.i18n("drill.new-query-saved")
                        });
                    }
                    else if (resp.result && resp.result.status === "Success" && resp.result.sign) {
                        self.currentDoc.name = evt.tag.name;
                        self.currentDoc.description = evt.tag.desc;
                        self.currentDoc.global = evt.tag.global;
                        self.currentDoc.sign = resp.result.sign;
                        self.lastSavedDoc = self.currentDoc.clone();
                        CountlyHelpers.notify({
                            title: self.i18n("common.success"),
                            message: self.i18n("drill.changes-saved")
                        });
                    }
                }).catch(function(resp) {
                    CountlyHelpers.notify({
                        title: self.i18n("common.error"),
                        message: resp.responseJSON.result,
                        type: "error"
                    });
                });
            },
            onDeleteFilter: function(id) {
                if (id === this.currentDoc.id) {
                    this.newFilter();
                }
            }
        }
    };

    var MainView = countlyVue.views.BaseView.extend({
        template: "#drill-main",
        mixins: [
            countlyDrillCommons.views.ExecutionResultViewMixin("countlyDrill"),
            countlyDrillCommons.views.CurrentDocumentWithTasksMixin("countlyDrill"),
            DrillCurrentDocCRUDMixin,
            countlyVue.mixins.auth(FEATURE_NAME),
            countlyVue.mixins.hasDrawersMethods(), // Note: external plugins should not add drawer methods because they might be read before they are added.
            countlyVue.container.dataMixin({
                'drawers': '/drill/external/drawers/data', // Note: key property for external drawers data has to be 'drawers' because that is what hasDrawers mixin uses.
                'externalDrawers': '/drill/external/drawers',
                'externalEvents': '/drill/external/events',
                'externalActionButtons': '/drill/external/actionButtons',
            })]
            .concat(countlyVue.container.templates(['/drill/external/templates'])),
        computed: {
            isStale: function() {
                if (this.executionResult.status !== "ready" || !this.lastExecutedDoc || !this.isMounted) {
                    return false;
                }

                var p = this.lastExecutedDoc.tempHash,
                    q = this.currentDoc.tempHash;

                return !(p.query === (this.currentDoc.useQuery ? q.query : jsDeepEquals.hashUnsorted({})) &&
                        p.byVal === (this.currentDoc.useBreakdown ? q.byVal : jsDeepEquals.hashUnsorted([])) &&
                        this.lastExecutedDoc.event === this.currentDoc.event &&
                        (this.executionResult.isTask || _.isEqual(this.$store.getters["countlyCommon/period"], this.executionResult.requestPayload.period)));
            },
            summaryNumbers: function() {
                var self = this;
                return this.executionResult.availableMetrics.reduce(function(acc, metric) {
                    if (metric.short in self.executionResult.totals) {
                        acc.push({
                            label: metric.label,
                            value: metric.formatter(self.executionResult.totals[metric.short])
                        });
                    }
                    return acc;
                }, []);
            },
            currentTableType: function() {
                var isSegments = ["pie", "heatmap", "bar"].includes(this.selectedChartType);
                if (isSegments) {
                    return this.executionResult.isTask ? "segmentsLocal" : "segmentsRemote";
                }
                return "timeSeries";
            },
            isBucketingAvailable: function() {
                return this.selectedChartType !== "pie" && this.selectedChartType !== "bar";
            },
            userEvents: function() {
                return this.externalEvents;
            },
            selectedSingleMetric: {
                get: function() {
                    return this.selectedResultMetric[0];
                },
                set: function(value) {
                    this.selectedResultMetric = [value];
                }
            },
            externalDrawerQueryFilter: function() {
                return {
                    queryObject: this.currentDoc.filter && this.currentDoc.filter.query || {},
                    event: this.currentDoc.event,
                    projectionKey: this.currentDoc.filter && this.currentDoc.filter.byVal || [],
                    method: "segmentation_users",
                    bucket: this.selectedBucket,
                    app_id: countlyCommon.ACTIVE_APP_ID,
                };
            },
        },
        data: function() {
            var self = this,
                segmentsRemoteStore = countlyVue.vuex.getLocalStore(countlyVue.vuex.ServerDataTable("segmentsRemote", {
                    columns: ["_id"],
                    onRequest: function() {
                        var requestData = Object.assign({list: true}, self.executionResult.requestPayload);
                        delete requestData.queryMeta;
                        if (Object.prototype.toString.call(requestData.period) === '[object Array]') {
                            requestData.period = JSON.stringify(requestData.period);
                        }
                        requestData.queryObject = JSON.stringify(requestData.queryObject);
                        requestData.projectionKey = requestData.projectionKey ? JSON.stringify(requestData.projectionKey) : undefined;
                        requestData.bucket = self.selectedBucket;
                        return {
                            type: "GET",
                            url: countlyCommon.API_URL + "/o",
                            data: requestData
                        };
                    },
                    onOverrideRequest: function(context, request) {
                        request.data.skip = request.data.iDisplayStart;
                        request.data.limit = request.data.iDisplayLength;
                        if (context.state.params.sort.length > 0) {
                            var sorter = context.state.params.sort[0];
                            var sortVal = {};
                            sortVal[sorter.field] = sorter.type === "asc" ? 1 : -1;
                            request.data.sort = JSON.stringify(sortVal);
                            delete request.data.iSortCol_0;
                            delete request.data.sSortDir_0;
                        }
                        delete request.data.iDisplayStart;
                        delete request.data.iDisplayLength;
                    },
                    onOverrideResponse: function(context, response) {
                        response.iTotalDisplayRecords = response.page_data.total;
                        response.iTotalRecords = response.page_data.total;

                        response.aaData = Object.keys(response.segments).map(function(segKey) {
                            var segment = response.segments[segKey];
                            var row = {
                                _id: segKey,
                                label: Object.keys(segment.keys).map(function(subKey) {
                                    // Replace falsy values with NA
                                    var label = self.executionResult.drillMeta.getUserPropertyLongName(subKey, segment.keys[subKey]);
                                    if (!label || label === "null") {
                                        label = CV.i18n('events.overview.unknown');
                                    }
                                    return label;
                                }).join(" | ")
                            };
                            self.executionResult.availableMetrics.forEach(function(metric) {
                                row[metric.short] = metric.getValue(response.segments[segKey]);
                            });
                            return row;
                        });
                        if (context.state.params.sort.length > 0) {
                            // We need to sort current page locally, as the data arrives in object format.
                            var sorter = context.state.params.sort[0];
                            response.aaData.sort(function(a, b) {
                                if (sorter.type === "asc") {
                                    return a[sorter.field] < b[sorter.field] ? -1 : 1;
                                }
                                return b[sorter.field] < a[sorter.field] ? -1 : 1;
                            });
                        }
                    },
                    onReady: function(context, rows) {
                        return rows;
                    }
                }));
            return {
                // Flags
                isSegmentationCollapsed: false,

                // Table state
                segmentsRows: [],
                segmentsRemoteStore: segmentsRemoteStore,
                segmentsRemoteDataSource: countlyVue.vuex.getServerDataSource(segmentsRemoteStore, "segmentsRemote"),
                notes: []
            };
        },
        watch: {
            'currentDoc.useQuery': {
                deep: true,
                handler: function(newVal) {
                    this.isSegmentationCollapsed = !newVal;
                }
            },
            'selectedResultMetric': function(type) {
                if (countlyCommon.getPersistentSettings().drillMetricType !== type[0]) {
                    countlyCommon.setPersistentSettings({ drillMetricType: type[0] });
                }
                this.refreshChartOptions();
            },
        },
        methods: {
            handleExternalAction: function(sender) {
                var period = countlyCommon.getPeriod();
                if (Object.prototype.toString.call(period) === '[object Array]') {
                    period = JSON.stringify(period);
                }
                sender.onClick({
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "event": this.currentDoc.event,
                    "method": "segmentation_users",
                    "queryObject": JSON.stringify(this.currentDoc.filter.query),
                    "period": period,
                    "bucket": "daily",
                    "projectionKey": this.currentDoc.filter.byVal
                });
            },
            updatePath: function(options) {
                if (options && options.task) {
                    app.navigate("#/drill/task/" + options.task._id);
                }
                else {
                    app.navigate("#/drill/" + JSON.stringify({
                        event: this.currentDoc.event,
                        dbFilter: this.currentDoc.filter.query,
                        byVal: this.currentDoc.filter.byVal
                    }));
                }
            },
            getSegmentRemoteExportAPI: function() {
                var event = this.executionResult.requestPayload.event,
                    period = this.executionResult.requestPayload.period,
                    queryObject = this.executionResult.requestPayload.queryObject,
                    projectionKey = this.executionResult.requestPayload.projectionKey;

                var requestPath = countlyCommon.API_PARTS.data.r + "?api_key=" + countlyGlobal.member.api_key +
                    "&app_id=" + countlyCommon.ACTIVE_APP_ID + "&method=segmentation&list=true&iDisplayStart=0&iDisplayLength=10000" +
                    "&event=" + event + "&queryObject=" + JSON.stringify(queryObject) +
                    "&period=" + JSON.stringify(period) + "&bucket=" + this.selectedBucket +
                    "&projectionKey=" + (projectionKey ? JSON.stringify(projectionKey) : undefined) +
                    "&skip=0&limit=10000&sEcho=2&iColumns=6&sColumns=&mDataProp_0=curr_segment&mDataProp_1=u&mDataProp_2=t&mDataProp_3=a&mDataProp_4=dur&mDataProp_5=adur&iSortCol_0=1&sSortDir_0=desc&iSortingCols=1&bSortable_0=true&bSortable_1=true&bSortable_2=true&bSortable_3=false&bSortable_4=true&bSortable_5=false";

                requestPath = requestPath.split('"').join('&quot;');

                var apiQueryData = {
                    api_key: countlyGlobal.member.api_key,
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    path: requestPath,
                    method: "GET",
                    filename: "Drill_on_" + moment().format("DD-MMM-YYYY"),
                    prop: ['segments']
                };
                return apiQueryData;
            },
            refreshTable: function() {
                // overrides ExecutionResultViewMixin.refreshTable
                if (this.currentTableType === "segmentsLocal") {
                    this.refreshSegmentsRows();
                }
                else {
                    this.refreshTimeTableRows();
                }
            },
            refreshSegmentsRows: function() {
                if (this.selectedResultMetric &&
                    this.executionResult.hasProjection &&
                    this.executionResult.segmentValues) {

                    var segmentPairs = this.executionResult.segmentValues;
                    this.segmentsRows = this.executionResult.availableSegments.map(function(segment) {
                        // Replace falsy values with NA
                        var label = segment.label;
                        if (!label || label === "null") {
                            label = CV.i18n('events.overview.unknown');
                        }
                        var row = {segment: label};
                        Object.keys(segmentPairs).forEach(function(metricKey) {
                            row[metricKey] = segmentPairs[metricKey][segment.value];
                        });
                        return row;
                    });
                }
                else {
                    this.segmentsRows = [];
                }
            },
            setCurrentDocument: function(docPayload, noReset) {
                var cf = this.currentDoc;
                if (docPayload.id) {
                    this.lastSavedDoc = docPayload;
                }
                else {
                    this.lastSavedDoc = null;
                }
                this.refreshDocNameTimecode();
                // Active fields
                cf.event = docPayload.event;
                this.$nextTick(function() {
                    cf.filter = docPayload.filter;

                    // Flags
                    cf.useQuery = docPayload.useQuery;
                    cf.useBreakdown = docPayload.useBreakdown;

                    // Identity
                    cf.namespace = docPayload.namespace;
                    cf.id = docPayload.id;
                    cf.name = docPayload.name;
                    cf.description = docPayload.description;
                    cf.sign = docPayload.sign;

                    // Ownership
                    cf.creator = docPayload.creator;
                    cf.global = docPayload.global;
                });
                if (!noReset) {
                    this.resetExecutionResult();
                }
            },
            isExternalEvent: function(command) {
                return this.externalEvents.some(function(externalEvent) {
                    return externalEvent.command === command;
                });
            },
            getExternalEventByCommand: function(command) {
                var isFound = false;
                var index = 0;
                while (!isFound && index < this.externalEvents.length) {
                    if (this.externalEvents[index].command === command) {
                        isFound = true;
                    }
                    else {
                        index += 1;
                    }
                }
                return isFound ? this.externalEvents[index] : null;
            },
            invokeExternalEventListenerIfFound: function(command) {
                var externalEvent = this.getExternalEventByCommand(command);
                if (externalEvent) {
                    externalEvent.click.call(this);
                }
            },
            handleUserEvents: function(command) {
                if (this.isExternalEvent(command)) {
                    this.invokeExternalEventListenerIfFound(command);
                }
            },
        },
        created: function() {
            var self = this;

            if (!this.$route.params.taskId) {
                if (this.$route.params.event) {
                    this.currentDoc.event = this.$route.params.event;
                }
                this.$nextTick(function() {
                    if (self.$route.params.filter) {
                        self.currentDoc.filter = self.$route.params.filter;
                    }
                });

                if (this.$route.params.resultMetric) {
                    this.selectedResultMetric = [this.$route.params.resultMetric];
                }
                else {
                    this.selectedResultMetric = [countlyCommon.getPersistentSettings().drillMetricType || "times"];
                }
            }
            else {
                this.switchToTask(this.$route.params.taskId);
            }
        }
    });


    var timelineViewComponent = countlyVue.views.BaseView.extend({
        template: "#timeline-main",
        data: function() {
            return {
                timelineStatusSource: countlyVue.vuex.getServerDataSource(this.$store, "countlyDataviews", "timelineStatusTable"),
                timelineProcessSource: countlyVue.vuex.getServerDataSource(this.$store, "countlyDataviews", "timelineProcessTable"),

            };
        },
        mounted: function() {},
        methods: {}

    });

    var timelineViewView = new countlyVue.views.BackboneWrapper({
        component: timelineViewComponent,
        vuex: [{clyModel: countlyDataviews}],
        templates: ["/drill/templates/timeline.html"]
    });

    app.timelineView = timelineViewView;

    app.route("/timeline", "timeline", function() {
        var params = {};
        this.timelineView.params = params;
        this.renderWhenReady(this.timelineView);
    });

    var getMainView = function(dto) {
        dto = dto || {};
        var mixinTemplates = countlyVue.container.templates(['/drill/external/templates']);

        var drillMainView = new countlyVue.views.BackboneWrapper({
            component: MainView,
            vuex: [{
                clyModel: countlyDrill
            }],
            templates: [
                "/drill/templates/DrillMain.html",
                "/drill/templates/query.builder.v2.html",
            ].concat(mixinTemplates)
        });

        drillMainView.params = {
            filter: dto.filter,
            event: dto.event || "[CLY]_session",
            taskId: dto.taskId,
            resultMetric: dto.resultMetric
        };

        return drillMainView;
    };

    app.route('/drill/*query', 'drill', function(query) {
        var _task = null,
            parsedQuery = {};

        if (query.substring(0, 5) === "task/") {
            _task = query.replace("task/", "");
        }
        else {
            try {
                parsedQuery = JSON.parse(query);
            }
            catch (ex) {
                parsedQuery = {};
            }
        }
        this.renderWhenReady(getMainView({
            taskId: _task,
            filter: {
                query: parsedQuery.dbFilter,
                byVal: parsedQuery.byVal
            },
            event: parsedQuery.event,
            resultMetric: parsedQuery.setFilter
        }));
    });

    app.route("/drill", "drill", function() {
        this.renderWhenReady(getMainView());
    });

    /**
     *  Add drill button to views title
     *  @param {string} destination - target container where the link be registered at
     *  @param {string} drillId - property to drill down
     *  @param {string} drillVal - filter value
     *  @param {string} drillSection - event to drill
     **/
    function addDrillLink(destination, drillId, drillVal, drillSection) {
        drillSection = drillSection || "[CLY]_session";
        drillId = drillId || "";
        var query = {"event": drillSection};
        if (drillVal) {
            query.dbFilter = {};
            query.dbFilter[drillId] = {"$in": [drillVal]};
            query.byVal = "";
        }
        else {
            query.dbFilter = {};
            if (Array.isArray(drillId)) {
                query.byVal = drillId;
            }
            else {
                query.byVal = [drillId];
            }
        }
        // predefined cases for analytics/users and analytics/sessions
        if (drillId === "u") {
            query.setFilter = "users";
            query.byVal = "";
        }
        else if (drillId === "s") {
            query.setFilter = "times";
            query.byVal = "";
        }

        countlyVue.container.registerData(destination + "/links", {
            label: jQuery.i18n.map["drill.drill-down-button"],
            permission: FEATURE_NAME,
            value: "#/drill/" + JSON.stringify(query),
            icon: "ion-person"
        });
    }

    // check drill read permission before adding drill button to views title
    addDrillLink("/analytics/sessions", "s");
    addDrillLink("/analytics/users", "u");
    addDrillLink("/analytics/countries", "up.cc");
    addDrillLink("/analytics/devices", "up.d");
    addDrillLink("/analytics/platforms", "up.p");
    addDrillLink("/analytics/versions", "up.av");
    addDrillLink("/analytics/carriers", "up.c");
    addDrillLink("/analytics/resolutions", "up.r");
    addDrillLink("/attribution", "cmp.c");
    addDrillLink("/attribution/detail", "cmp.c");
    addDrillLink("/crashes", "sg.crash", null, "[CLY]_crash");
    addDrillLink("/analytics/language", "up.la");
    addDrillLink("/analytics/sources", "up.src");
    addDrillLink("/analytics/views", "sg.name", null, "[CLY]_view");
    addDrillLink("/ias", "u", null, "[CLY]_survey");
    addDrillLink("/nps", "sg.rating", null, "[CLY]_nps");
    addDrillLink("/feedback/ratings", "sg.rating", null, "[CLY]_star_rating");
    addDrillLink("/analytics/browsers", "up.brw");
    addDrillLink("/analytics/densities", "up.dnst");
    /**
            The first one, for instance, can be accessed via using the following mixin in the receiving view:
            
            var AnArbitraryView = countlyVue.views.BaseView.extend({
                ...,
                mixins: [
                    countlyVue.container.dataMixin({
                        'externalLinks': '/analytics/sessions/links' 
                        // now externalLinks field contains a link to drill
                    })
                ],
                ...
            });
         */

    //app.drillView.hideDrillEventMetaProperties = false;

    // check read permission before adding menu item to sidebar
    app.addMenu("explore", {code: "drill", permission: FEATURE_NAME, url: "#/drill", text: "drill.drill", icon: '<div class="logo ion-android-funnel"></div>', priority: 50});

    //check if configuration view exists
    if (app.configurationsView) {
        app.configurationsView.registerLabel("drill", "drill.drill");
        app.configurationsView.registerLabel("drill.list_limit", "drill.item-limit");
        app.configurationsView.registerLabel("drill.big_list_limit", "drill.big_list_limit");
        app.configurationsView.registerLabel("drill.custom_property_limit", "drill.max-custom-properties");
        app.configurationsView.registerLabel("drill.projection_limit", "drill.projection_limit");
        app.configurationsView.registerLabel("drill.record_sessions", "drill.record_sessions");
        app.configurationsView.registerLabel("drill.record_views", "drill.record_views");
        app.configurationsView.registerLabel("drill.record_actions", "drill.record_actions");
        app.configurationsView.registerLabel("drill.record_pushes", "drill.record_pushes");
        app.configurationsView.registerLabel("drill.record_crashes", "drill.record_crashes");
        app.configurationsView.registerLabel("drill.record_star_rating", "drill.record_star_rating");
        app.configurationsView.registerLabel("drill.record_apm", "drill.record_apm");
    }

})();