/*global app, countlyVue, countlyVueExample, countlyCommon, CV */

(function() {
    var TableView = countlyVue.views.create({
        template: CV.T('/vue-example/templates/table.html'),
        computed: {
            tableRows: function() {
                return this.$store.getters["countlyVueExample/myRecords/all"];
            },
            rTableData: function() {
                return this.tableStore.getters.tooManyRecords;
            }
        },
        data: function() {
            var tableStore = countlyVue.vuex.getLocalStore(countlyVue.vuex.ServerDataTable("tooManyRecords", {
                columns: ['_id', "name"],
                onRequest: function(context) {
                    return {
                        type: "GET",
                        url: countlyCommon.API_URL + "/o",
                        data: {
                            app_id: countlyCommon.ACTIVE_APP_ID,
                            method: 'large-col',
                            visibleColumns: JSON.stringify(context.state.params.selectedDynamicCols)
                        }
                    };
                },
                onReady: function(context, rows) {
                    return rows;
                }
            }));
            return {
                isTablePaused: true,
                tableStore: tableStore,
                tableDynamicCols: [{
                    value: "name",
                    label: "Name",
                    required: true
                },
                {
                    value: "description",
                    label: "Description",
                    default: true
                }],
                remoteTableDynamicCols: [{
                    value: "number_0",
                    label: "Number 0",
                    required: true
                },
                {
                    value: "number_1",
                    label: "Number 1"
                },
                {
                    value: "number_2",
                    label: "Number 2",
                    default: true
                }],
                localTableTrackedFields: ['status'],
                remoteTableDataSource: countlyVue.vuex.getServerDataSource(tableStore, "tooManyRecords"),
                tablePersistKey: "vueExample_localTable_" + countlyCommon.ACTIVE_APP_ID,
                remoteTablePersistKey: "vueExample_remoteTable_" + countlyCommon.ACTIVE_APP_ID,
            };
        },
        beforeCreate: function() {
            this.$store.dispatch("countlyVueExample/initializeTable");
        },
        methods: {
            refresh: function() {
                this.$store.dispatch("countlyVueExample/myRecords/fetchAll");
            },
            onEditRecord: function(row) {
                var self = this;
                this.$store.dispatch("countlyVueExample/myRecords/fetchSingle", row._id).then(function(doc) {
                    self.$emit("open-drawer", "main", doc);
                });
            },
            onDelete: function(row) {
                this.$store.dispatch("countlyVueExample/myRecords/remove", row._id);
            }
        }
    });

    var FormBasics = countlyVue.views.BaseView.extend({
        template: '#form-basics-template',
        data: function() {
            var manyItems = [];

            for (var i = 0;i <= 50;i++) {
                if (i > 0 && i % 10 === 0) {
                    manyItems.push({name: (i - i % 10) + "s"});
                }
                manyItems.push({name: "Type " + i, value: i});
            }
            return {
                submittedForm: {name: 'John', surname: 'Doe'},
                listBoxOptions: [
                    {"label": "hello0", "value": 0},
                    {"label": "hello1", "value": 1},
                    {"label": "hello2", "value": 2},
                    {"label": "hello3", "value": 3},
                    {"label": "hello4", "value": 4},
                    {"label": "hello5", "value": 5},
                    {"label": "hello6", "value": 6},
                    {"label": "hello7", "value": 7},
                    {"label": "hello8", "value": 8},
                    {"label": "hello9", "value": 9},
                    {"label": "hello10", "value": 10},
                    {"label": "hello11", "value": 11},
                ],
                clistBoxOptions: [
                    {"label": "hello0", "value": 0},
                    {"label": "hello1", "value": 1},
                    {"label": "hello2", "value": 2},
                    {"label": "hello3", "value": 3},
                    {"label": "hello4", "value": 4},
                    {"label": "hello5", "value": 5},
                    {"label": "hello6", "value": 6},
                    {"label": "hello7", "value": 7},
                    {"label": "hello8", "value": 8},
                    {"label": "hello9", "value": 9},
                    {"label": "hello10", "value": 10},
                    {"label": "hello11", "value": 11},
                ],
                selectedLB: 0,
                selectedCLB: [],
                activeTab: null,
                typedText: 'Type sth...',
                selectedRadio: 2,
                availableRadio: [
                    {label: "Type 1", value: 1},
                    {label: "Type 2", value: 2},
                    {label: "Type 3", value: 3, description: "Some description..."},
                ],
                selectedGenericRadio: 2,
                availableGenericRadio: [
                    {label: "Type 1", value: 1, cmp: {'template': '<div>Template</div>'}},
                    {label: "Type 2", value: 2},
                    {label: "Type 3", value: 3},
                ],
                selectedCheckFlag: true,
                selectedCheck: [1, 2],
                availableCheck: [
                    {label: "Type 1", value: 1},
                    {label: "Type 2", value: 2},
                    {label: "Type 3", value: 3},
                ],
                selectWModel: 1,
                selectWItems: manyItems,
                selectDWModel: null,
                selectDWItems: manyItems
            };
        },
        methods: {
            onFormSubmit: function(submitted) {
                this.submittedForm = submitted;
            }
        }
    });

    var FormDropdown = countlyVue.views.BaseView.extend({
        template: '#form-dropdown-template',
        watch: {
            selectXModeBuffer: function(newVal) {
                this.selectX = {
                    mode: newVal,
                    currentVal: newVal === 'single-list' ? null : []
                };
            }
        },
        data: function() {
            var manyItems = [];

            for (var i = 0;i <= 50;i++) {
                if (i > 0 && i % 10 === 0) {
                    manyItems.push({name: (i - i % 10) + "s"});
                }
                manyItems.push({name: "Type " + i, value: i});
            }
            return {
                dropdownsDisabled: false,
                autoCommitDisabled: false,
                allOptionsTabHidden: false,
                selectXOptions: [{
                    "label": "A Items",
                    "name": "type-1",
                    "options": [
                        {"label": "windows 10", "value": 0},
                        {"label": "hello how", "value": 1},
                        {"label": "hello2", "value": 2},
                        {"label": "hello3", "value": 3},
                        {"label": "hello4", "value": 4},
                        {"label": "hello5", "value": 5},
                        {"label": "hello6", "value": 6},
                        {"label": "hello7", "value": 7},
                        {"label": "hello8", "value": 8},
                        {"label": "hello9", "value": 9},
                        {"label": "hello10", "value": 10},
                        {"label": "hello11", "value": 11},
                    ]
                },
                {
                    "label": "B Items",
                    "name": "type-2",
                    "options": [
                        {"label": "user0", "value": 12},
                        {"label": "user1", "value": 13},
                    ]
                }],
                selectXModeBuffer: 'single-list',
                selectX: {
                    currentVal: null,
                    mode: 'single-list',
                },

                selectedLB: 0,
                selectedCLB: [],
                activeTab: null,
                typedText: 'Type sth...',
                selectedRadio: 2,
                availableRadio: [
                    {label: "Type 1", value: 1},
                    {label: "Type 2", value: 2},
                    {label: "Type 3", value: 3, description: "Some description..."},
                ],
                selectedGenericRadio: 2,
                availableGenericRadio: [
                    {label: "Type 1", value: 1, cmp: {'template': '<div>Template</div>'}},
                    {label: "Type 2", value: 2},
                    {label: "Type 3", value: 3},
                ],
                selectedCheckFlag: true,
                selectedCheck: [1, 2],
                availableCheck: [
                    {label: "Type 1", value: 1},
                    {label: "Type 2", value: 2},
                    {label: "Type 3", value: 3},
                ],
                selectWModel: 1, // it would automatically find the record {"name": "Type 1", "value": 1}
                selectWItems: manyItems,
                selectDWModel: null,
                selectDWItems: manyItems
            };
        }
    });

    var TimeGraphView = countlyVue.views.create({
        template: CV.T('/vue-example/templates/tg.html'),
        data: function() {
            return {
                selBucket: "daily",
                largeScaleOptions: {
                    series: [
                        {
                            name: 'Random',
                            data: []
                        }
                    ]
                },
                pieOptions: {
                    series: [
                        {
                            name: "Traffic Sources",
                            data: [
                                { value: 335, name: "Direct" },
                                { value: 310, name: "Email" },
                                { value: 234, name: "Ad Networks" },
                                { value: 135, name: "Video Ads" },
                                { value: 1548, name: "Search Engines" }
                            ],
                            label: {
                                formatter: function() {
                                    return "New users \n 12k";
                                }
                            },
                            center: ["25%", "50%"] //Center should be passed as option
                        }
                    ]
                },
                newPieOptions: {
                    series: [
                        {
                            name: "Traffic Sources",
                            data: [
                                { value: 335, name: "Direct" },
                                { value: 310, name: "Email" },
                                { value: 234, name: "Ad Networks" },
                            ],
                            label: {
                                formatter: function() {
                                    return "Total users \n 12k";
                                }
                            },
                        }
                    ]
                },
                lineOptions: {
                    // xAxis: {
                    //     data: [10, 11, 13, 14, 15, 16, 17]
                    // },
                    series: [
                        {
                            name: 'Series A',
                            color: "pink",
                            data: [{value: [0, 120]}, [1, 132], [2, 101], [3, 134], [4, 90], [5, 230], [6, 210]]
                        },
                        {
                            name: 'Series B',
                            data: [[0, 220], [1, 182], [2, 191], [3, 234], [4, 290], [5, 330], [6, 310]]
                        },
                        {
                            name: 'Series C',
                            data: [[0, 150], [1, 232], [2, 201], [3, 154], [4, 190], [5, 330], [6, 410]]
                        },
                        {
                            name: 'Series D',
                            data: [[0, 320], [1, 332], [2, 301], [3, 334], [4, 390], [5, 330], [6, 320]]
                        },
                        {
                            name: 'Series E',
                            data: [[0, 820], [1, 932], [2, 901], [3, 934], [4, 1290], [5, 1330], [6, 1320]]
                        }
                    ]
                },
                barOptions: {
                    xAxis: {
                        data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                    },
                    series: [
                        {
                            name: "Weekly users",
                            data: [120, 200, 150, 80, 70, 110, 130],
                        },
                        {
                            name: "Weekly new users",
                            data: [12, 90, 100, 50, 88, 110, 130],
                        },
                        {
                            name: "Week old users",
                            data: [2, 90, 77, 50, 44, 110, 10],
                        }
                    ]
                },
                stackedBarOptions: {
                    xAxis: {
                        data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                    },
                    series: [
                        {
                            name: "Weekly users",
                            data: [120, 200, 150, 80, 70, 110, 130],
                            stack: 'A'
                        },
                        {
                            name: "Weekly new users",
                            data: [12, 90, 100, 50, 88, 110, 130],
                            stack: 'A'
                        },
                        {
                            name: "Week old users",
                            data: [12, 90, 100, 50, 88, 110, 130],
                            stack: 'A'
                        }
                    ]
                }
            };
        },
        computed: {
            randomNumbers: function() {
                return this.$store.getters["countlyVueExample/graphPoints"];
            },
            barData: function() {
                return this.$store.getters["countlyVueExample/barData"];
            },
            lineData: function() {
                return this.$store.getters["countlyVueExample/lineData"];
            }
        },
        beforeCreate: function() {
            this.$store.dispatch("countlyVueExample/fetchGraphPoints");
        },
        methods: {
            refresh: function() {
                this.$store.dispatch("countlyVueExample/fetchGraphPoints");
            }
        }
    });

    var ExampleDrawer = countlyVue.views.create({
        template: CV.T("/vue-example/templates/drawer.html"),
        data: function() {
            return {
                title: '',
                saveButtonLabel: '',
                constants: {
                    "visibilityOptions": [
                        {label: "Global", value: "global", description: "Can be seen by everyone."},
                        {label: "Private", value: "private", description: "Can be seen by the creator."}
                    ],
                    "availableProps": [
                        {label: "Type 1", value: 1},
                        {label: "Type 2", value: 2},
                        {label: "Type 3", value: 3}
                    ]
                }
            };
        },
        props: {
            controls: {
                type: Object
            }
        },
        methods: {
            onSubmit: function(doc) {
                this.$store.dispatch("countlyVueExample/myRecords/save", doc);
            },
            onClose: function($event) {
                this.$emit("close", $event);
            },
            onCopy: function(newState) {
                if (newState._id !== null) {
                    this.title = "Edit Record";
                    this.saveButtonLabel = "Save Changes";
                }
                else {
                    this.title = "Create New Record";
                    this.saveButtonLabel = "Create Record";
                }
            }
        }
    });

    var DateView = countlyVue.views.create({
        template: CV.T('/vue-example/templates/date.html'),
        data: function() {
            return {
                selectedDateRange: '10weeks',
                selectedDateRangeWithoutOffsetCorr: '10weeks',
                selectedMonthRange: '10months',
                selectedDynamicRange: '10weeks',
                selectedDynamicType: 'daterange',
            };
        }
    });

    var ProgressBarsView = countlyVue.views.create({
        template: CV.T('/vue-example/templates/progress-bars.html'),
        data: function() {
            return {
                title: "Progress bars",
                stackedProgressBar: [{
                    percentage: 40,
                    color: "lightblue",
                    tooltip: "user session"
                }, {
                    percentage: 30,
                    color: "magenta",
                    tooltip: "second item"
                },
                {
                    percentage: 20,
                    color: "cyan",
                    tooltip: "another session type here"
                }],
                singleProgressBar: [{
                    percentage: 50,
                    color: "#39C0C8",
                }],
                hundredPercentProgressBar: [
                    {
                        percentage: 100,
                        color: "#39C0C8",
                    }
                ],
                zeroPercentProgressBar: [
                    {
                        percentage: 0,
                        color: "yellow"
                    }
                ]
            };
        }
    });

    countlyVue.container.registerMixin("vue/example", {
        data: function() {
            return {
                myname: "itsi"
            };
        },
        beforeCreate: function() {
            // countlyVueExample.service.fetchRandomNumbers().then(function() {
            //     You can now set data in store here
            //     self.$store.dispatch("/set/data/in/store/here", data);
            // });
        }
    });

    countlyVue.container.registerMixin("vue/example", {
        data: function() {
            return {
                myname: "pts"
            };
        },
        beforeCreate: function() {
            // You can now set data in store here
            // self.$store.dispatch("/set/data/in/store/here", data);
        }
    });

    var AllTablesView = countlyVue.views.create({
        template: CV.T('/vue-example/templates/tables.html'),
        mixins: [countlyVue.mixins.hasDrawers("main")],
        data: function() {
            return {
                appId: countlyCommon.ACTIVE_APP_ID,
                dynamicTab: "local-table",
                localTabs: [
                    {
                        title: "Local table",
                        name: "local-table",
                        component: TableView,
                        // route: "#/" + countlyCommon.ACTIVE_APP_ID + "/vue/example/tables/all"
                    },
                    {
                        title: "Dummy table",
                        name: "dummy-table",
                        component: countlyVue.views.create({
                            template: "<div>Hello there</div>"
                        })
                    }
                ]
            };
        },
        components: {
            "drawer": ExampleDrawer
        },
        computed: {
            tabs: function() {
                return this.localTabs;
            }
        },
        methods: {
            add: function() {
                this.openDrawer("main", countlyVueExample.factory.getEmpty());
            }
        }
    });

    var MainView_0 = countlyVue.views.create({
        template: CV.T('/vue-example/templates/main_0.html'),
        mixins: [
            countlyVue.mixins.hasDrawers("main"),
            countlyVue.container.tabsMixin({
                "externalTabs": "vue/example"
            })
        ].concat(countlyVue.container.mixins(["vue/example"])),
        components: {
            "table-view": TableView,
            "form-basics": FormBasics,
            "form-dropdown": FormDropdown,
            "tg-view": TimeGraphView,
            "date-view": DateView,
            "drawer": ExampleDrawer,
            "progress-bars-view": ProgressBarsView
        },
        data: function() {
            return {
                appId: countlyCommon.ACTIVE_APP_ID,
                currentTab: (this.$route.params && this.$route.params.tab) || "tables",
            };
        }
    });

    var MainView_1 = countlyVue.views.create({
        template: CV.T('/vue-example/templates/main.html'),
        mixins: [
            countlyVue.container.tabsMixin({
                "externalTabs": "vue/example"
            })
        ].concat(countlyVue.container.mixins(["vue/example"])),
        data: function() {
            return {
                appId: countlyCommon.ACTIVE_APP_ID,
                dynamicTab: (this.$route.params && this.$route.params.tab) || "tables",
                localTabs: [
                    {
                        title: "Tables",
                        name: "tables",
                        component: AllTablesView,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/vue/example/tables"
                    },
                    {
                        title: "Form: Basic",
                        name: "form-basic",
                        component: FormBasics,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/vue/example/form-basic"
                    },
                    {
                        title: "Form: Dropdown",
                        name: "form-dropdown",
                        component: FormDropdown,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/vue/example/form-dropdown"
                    },
                    {
                        title: "Charts",
                        name: "charts",
                        component: TimeGraphView,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/vue/example/charts"
                    },
                    {
                        title: "Date",
                        name: "date",
                        component: DateView,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/vue/example/date"
                    },
                    {
                        title: "Progress bars",
                        name: "progress-bars",
                        component: ProgressBarsView,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/vue/example/progress-bars"
                    }
                ]
            };
        },
        computed: {
            tabs: function() {
                var allTabs = this.localTabs.concat(this.externalTabs);
                return allTabs;
            }
        }
    });

    var getMainView_0 = function() {
        var vuex = [{
            clyModel: countlyVueExample
        }];

        var tabsVuex = countlyVue.container.tabsVuex(["vue/example"]);

        vuex = vuex.concat(tabsVuex);

        return new countlyVue.views.BackboneWrapper({
            component: MainView_0,
            vuex: vuex,
            templates: [
                "/vue-example/templates/empty.html",
                "/vue-example/templates/form.html"
            ]
        });
    };

    //This is the main view that we use in /vue/example
    var getMainView_1 = function() {
        var vuex = [{
            clyModel: countlyVueExample
        }];

        var tabsVuex = countlyVue.container.tabsVuex(["vue/example"]);

        vuex = vuex.concat(tabsVuex);

        return new countlyVue.views.BackboneWrapper({
            component: MainView_1,
            vuex: vuex,
            templates: [
                "/vue-example/templates/empty.html",
                "/vue-example/templates/form.html"
            ]
        });
    };

    app.route("/vue/example", 'vue-example', function() {
        var exampleView = getMainView_1();
        this.renderWhenReady(exampleView);
    });

    app.route("/vue/example/*tab", 'vue-example-tab', function(tab) {
        var exampleView = getMainView_1();
        var params = {
            tab: tab
        };
        exampleView.params = params;
        this.renderWhenReady(exampleView);
    });

    app.route("/vue-0", 'vue-0', function() {
        var newExampleView = getMainView_0();
        this.renderWhenReady(newExampleView);
    });

    app.route("/vue-0/*tab", 'vue-0-tab', function(tab) {
        var newExampleView = getMainView_0();
        var params = {
            tab: tab
        };
        newExampleView.params = params;
        this.renderWhenReady(newExampleView);
    });

    countlyVue.container.registerTab("vue/example", {
        priority: 1,
        title: 'External tab 1',
        name: 'external1',
        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/vue/example/external1",
        component: countlyVue.components.create({
            data: function() {
                return {
                    localStore: countlyVue.vuex.getLocalStore(window.foo.getVuexModule())
                };
            },
            computed: {
                message: function() {
                    return this.localStore.getters["foo/bar/getName"];
                }
            },
            methods: {
                change: function() {
                    this.localStore.dispatch("foo/bar/modifyName");
                }
            },
            template: CV.T("/vue-example/templates/external-tab.html"),
            beforeDestroy: function() {
                this.localStore.unregisterModule("foo");
            }
        })
    });

    countlyVue.container.registerTab("vue/example", {
        priority: 2,
        title: 'External tab 2',
        name: 'external2',
        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/vue/example/external2",
        vuex: [{
            clyModel: window.foo
        }],
        component: countlyVue.components.create({
            computed: {
                message: function() {
                    return this.$store.getters["foo/getName"];
                }
            },
            methods: {
                change: function() {
                    this.$store.dispatch("foo/modifyName");
                }
            },
            template: CV.T("/vue-example/templates/external-tab.html")
        })
    });

})();