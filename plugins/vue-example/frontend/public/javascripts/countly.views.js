/*global app, countlyVue, countlyVueExample, countlyCommon, echarts */

(function() {
    var TableView = countlyVue.views.BaseView.extend({
        template: '#vue-example-table-template',
        computed: {
            tableRows: function() {
                return this.$store.getters["countlyVueExample/myRecords/all"];
            },
            rTableData: function() {
                return this.$store.getters["countlyVueExample/tooManyRecords"];
            }
        },
        data: function() {
            return {
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
                remoteTableDataSource: countlyVue.vuex.getServerDataSource(this.$store, "countlyVueExample", "tooManyRecords"),
                tablePersistKey: "vueExample_localTable_" + countlyCommon.ACTIVE_APP_ID,
                remoteTablePersistKey: "vueExample_remoteTable_" + countlyCommon.ACTIVE_APP_ID,
            };
        },
        methods: {
            refresh: function() {
                this.$store.dispatch("countlyVueExample/myRecords/fetchAll");
                this.$store.dispatch("countlyVueExample/fetchTooManyRecords");
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

    var TimeGraphView = countlyVue.views.BaseView.extend({
        template: '#vue-example-tg-template',
        data: function() {
            var base = +new Date(1968, 9, 3);
            var oneDay = 24 * 3600 * 1000;
            var date = [];

            var data = [Math.random() * 300];

            for (var i = 1; i < 20000; i++) {
                var now = new Date(base += oneDay);
                date.push([now.getFullYear(), now.getMonth() + 1, now.getDate()].join('/'));
                data.push(Math.round((Math.random() - 0.5) * 20 + data[i - 1]));
            }
            return {
                largeScaleOptions: {
                    tooltip: {
                        trigger: 'axis',
                        position: function(pt) {
                            return [pt[0], '10%'];
                        }
                    },
                    title: {
                        left: 'center',
                        text: 'Some random data',
                    },
                    toolbox: {
                        feature: {
                            dataZoom: {},
                            restore: {},
                            saveAsImage: { show: true }
                        }
                    },
                    xAxis: {
                        type: 'category',
                        boundaryGap: false,
                        data: date
                    },
                    yAxis: {
                        type: 'value',
                        boundaryGap: [0, '100%']
                    },
                    dataZoom: [
                        {
                            type: 'slider',
                            xAxisIndex: 0,
                            filterMode: 'none'
                        },
                        {
                            type: 'slider',
                            yAxisIndex: 0,
                            filterMode: 'none'
                        },
                        {
                            type: 'inside',
                            xAxisIndex: 0,
                            filterMode: 'none'
                        },
                        {
                            type: 'inside',
                            yAxisIndex: 0,
                            filterMode: 'none'
                        }
                    ],
                    series: [
                        {
                            name: 'Random',
                            type: 'line',
                            symbol: 'none',
                            sampling: 'lttb',
                            itemStyle: {
                                color: 'rgb(255, 70, 131)'
                            },
                            areaStyle: {
                                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                                    offset: 0,
                                    color: 'rgb(255, 158, 68)'
                                }, {
                                    offset: 1,
                                    color: 'rgb(255, 70, 131)'
                                }])
                            },
                            data: data
                        }
                    ]
                },
                pieOptions: {
                    toolbox: {
                        feature: {
                            saveAsImage: { show: true }
                        }
                    },
                    title: {
                        text: "Traffic Sources",
                        left: "center"
                    },
                    tooltip: {
                        trigger: "item",
                        formatter: "{a} <br/>{b} : {c} ({d}%)"
                    },
                    legend: {
                        orient: "vertical",
                        left: "left",
                        data: [
                            "Direct",
                            "Email",
                            "Ad Networks",
                            "Video Ads",
                            "Search Engines"
                        ]
                    },
                    series: [
                        {
                            name: "Traffic Sources",
                            type: "pie",
                            radius: "55%",
                            center: ["50%", "60%"],
                            data: [
                                { value: 335, name: "Direct" },
                                { value: 310, name: "Email" },
                                { value: 234, name: "Ad Networks" },
                                { value: 135, name: "Video Ads" },
                                { value: 1548, name: "Search Engines" }
                            ],
                            emphasis: {
                                itemStyle: {
                                    shadowBlur: 10,
                                    shadowOffsetX: 0,
                                    shadowColor: "rgba(0, 0, 0, 0.5)"
                                }
                            }
                        }
                    ]
                },
                lineOptions: {
                    title: {
                        text: 'Lines'
                    },
                    tooltip: {
                        trigger: 'axis'
                    },
                    legend: {
                        data: ['A', 'B', 'C', 'D', 'E']
                    },
                    grid: {
                        left: '3%',
                        right: '4%',
                        bottom: '3%',
                        containLabel: true
                    },
                    toolbox: {
                        feature: {
                            dataZoom: {
                                yAxisIndex: 'none'
                            },
                            restore: {},
                            saveAsImage: { show: true }
                        }
                    },
                    xAxis: {
                        type: 'category',
                        boundaryGap: false,
                        data: [0, 1, 3, 4, 5, 6]
                    },
                    yAxis: {
                        type: 'value'
                    },
                    series: [
                        {
                            name: 'A',
                            type: 'line',
                            stack: 'Value',
                            data: [120, 132, 101, 134, 90, 230, 210]
                        },
                        {
                            name: 'B',
                            type: 'line',
                            stack: 'Value',
                            data: [220, 182, 191, 234, 290, 330, 310]
                        },
                        {
                            name: 'C',
                            type: 'line',
                            stack: 'Value',
                            data: [150, 232, 201, 154, 190, 330, 410]
                        },
                        {
                            name: 'D',
                            type: 'line',
                            stack: 'Value',
                            data: [320, 332, 301, 334, 390, 330, 320]
                        },
                        {
                            name: 'E',
                            type: 'line',
                            stack: 'Value',
                            data: [820, 932, 901, 934, 1290, 1330, 1320]
                        }
                    ]
                },
                barOptions: {
                    toolbox: {
                        feature: {
                            saveAsImage: { show: true }
                        }
                    },
                    xAxis: {
                        type: 'category',
                        data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                    },
                    yAxis: {
                        type: 'value'
                    },
                    series: [{
                        data: [120, {
                            value: 200,
                            itemStyle: {
                                color: '#a90000'
                            }
                        }, 150, 80, 70, 110, 130],
                        type: 'bar'
                    }]
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
        methods: {
            refresh: function() {
                this.$store.dispatch("countlyVueExample/fetchGraphPoints");
            }
        }
    });

    var ExampleDrawer = countlyVue.views.BaseView.extend({
        template: '#drawer-template',
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

    var DateView = countlyVue.views.BaseView.extend({
        template: '#vue-example-date-template',
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

    var MainView = countlyVue.views.BaseView.extend({
        template: '#vue-example-main-template',
        mixins: [countlyVue.mixins.hasDrawers("main")],
        components: {
            "table-view": TableView,
            "form-basics": FormBasics,
            "form-dropdown": FormDropdown,
            "tg-view": TimeGraphView,
            "date-view": DateView,
            "drawer": ExampleDrawer
        },
        beforeCreate: function() {
            this.$store.dispatch("countlyVueExample/initialize");
        },
        data: function() {
            return {
                appId: countlyCommon.ACTIVE_APP_ID,
                currentTab: (this.$route.params && this.$route.params.tab) || "tables"
            };
        },
        methods: {
            add: function() {
                this.openDrawer("main", countlyVueExample.factory.getEmpty());
            }
        }
    });

    var getMainView = function() {
        var vuex = [{
            clyModel: countlyVueExample
        }];

        return new countlyVue.views.BackboneWrapper({
            component: MainView,
            vuex: vuex,
            templates: [
                "/vue-example/templates/empty.html",
                "/vue-example/templates/drawer.html",
                "/vue-example/templates/form.html",
                {
                    namespace: 'vue-example',
                    mapping: {
                        'date-template': '/vue-example/templates/date.html',
                        'table-template': '/vue-example/templates/table.html',
                        'tg-template': '/vue-example/templates/tg.html',
                        'main-template': '/vue-example/templates/main.html'
                    }
                }
            ]
        });
    };

    app.route("/vue/example", 'vue-example', function() {
        var exampleView = getMainView();
        this.renderWhenReady(exampleView);
    });

    app.route("/vue/example/*tab", 'vue-example-tab', function(tab) {
        var exampleView = getMainView();
        var params = {
            tab: tab
        };
        exampleView.params = params;
        this.renderWhenReady(exampleView);
    });

})();