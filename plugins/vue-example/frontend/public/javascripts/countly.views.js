/*global app, countlyVue, countlyVueExample, countlyCommon, CV, moment */

(function() {
    var TableView = countlyVue.views.create({
        template: CV.T('/vue-example/templates/table.html'),
        computed: {
            tableRows: function() {
                return this.$store.getters["countlyVueExample/myRecords/all"];
            },
            rTableData: function() {
                return this.tableStore.getters.tooManyRecords;
            },
            remoteTableDataSource: function() {
                return countlyVue.vuex.getServerDataSource(this.tableStore, "tooManyRecords");
            },
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
                selectedEvent: null,
                selectedApp: null,
                selectedApps: [],
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
                selectDWItems: manyItems,
                elCities: ['New York', 'Washington', 'London'],
                elInput: 'Hello Element UI!',
                elSelectValue: "",
                elSelectItems: [1, 2, 3, 4, 5],
                elSelectMultiValue: [],
                elSwitchValue: true,
                elCheckboxValue: true,
                elRadioValue: '1',
                elRadioGroup: 'New York',
                elCheckboxGroup: ['New York', 'London'],
                elActiveNames: ""
            };
        },
        methods: {
            onFormSubmit: function(submitted) {
                this.submittedForm = submitted;
            },
            handleCommand: function() {

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
        methods: {
            remoteMethod: function(rawQuery) {
                var self = this;
                var filtered = this.selectXOptions.map(function(group) {
                    return {
                        label: group.label,
                        name: group.name,
                        options: group.options.filter(function(option) {
                            return option.label && option.label.includes(rawQuery);
                        })
                    };
                }).filter(function(group) {
                    return group.options.length > 0;
                });
                return new Promise(function(resolve) {
                    setTimeout(function() {
                        self.selectXRemoteOptions = filtered;
                        resolve(filtered);
                    }, 400);
                });
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
                selectXRemoteOptions: [],
                selectXOptions: [{
                    "label": "A Items",
                    "name": "type-1",
                    "options": [
                        {"label": "windows 10", "value": 0, "image": "I"},
                        {"label": "hello how", "value": 1, "image": "I"},
                        {"label": "hello2", "value": 2, "image": "I"},
                        {"label": "hello3", "value": 3, "image": "I"},
                        {"label": "hello4", "value": 4, "image": "I"},
                        {"label": "hello5", "value": 5, "image": "I"},
                        {"label": "hello6", "value": 6, "image": "I"},
                        {"label": "hello7", "value": 7, "image": "I"},
                        {"label": "hello8", "value": 8, "image": "I"},
                        {"label": "hello9", "value": 9, "image": "I"},
                        {"label": "hello10", "value": 10, "image": "I"},
                        {"label": "hello11", "value": 11, "image": "I"},
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
                    remoteVal: null,
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

    var TIMESERIESOPTIONS = {
        series: [
            {
                name: 'Day 1',
            },
            {
                name: "Day 2",
            }
        ]
    };

    var TimeGraphView = countlyVue.views.create({
        template: CV.T('/vue-example/templates/tg.html'),
        data: function() {
            return {
                selBucket: "daily",
                largeScaleOptions: TIMESERIESOPTIONS,
                pieOptions: {
                    series: [
                        {
                            name: "Traffic Sources",
                            data: [
                                { value: 335, name: "Direct" },
                                { value: 310, name: "Email" },
                                { value: 234, name: "Ad Networks" },
                                { value: 135, name: "Video Ads" },
                                { value: 1548, name: "Search Engines is a long name" },
                                { value: 15, name: "Video Ads2" },
                                { value: 115, name: "Video Ads3" },
                                { value: 5, name: "Video Ads4" },
                                { value: 50, name: "Video Ads5" },
                                { value: 18, name: "Video Ads6" },
                                { value: 15, name: "Video Ads7" },
                            ],
                            // label: {
                            //     formatter: function() {
                            //         return "New users \n 12k";
                            //     }
                            // },
                            label: {
                                formatter: "{a|" + "New Users" + "}\n" + "12K",
                                fontWeight: 500,
                                fontSize: 16,
                                fontFamily: "Inter",
                                lineHeight: 24,
                                rich: {
                                    a: {
                                        fontWeight: "normal",
                                        fontSize: 14,
                                        lineHeight: 16
                                    }
                                }
                            },
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
                                formatter: "{a|" + "Total Users" + "}\n" + "12K",
                                fontWeight: 500,
                                fontSize: 16,
                                fontFamily: "Inter",
                                lineHeight: 24,
                                rich: {
                                    a: {
                                        fontWeight: "normal",
                                        fontSize: 14,
                                        lineHeight: 16
                                    }
                                }
                            },
                        }
                    ]
                },
                lineOpts: {
                    // xAxis: {
                    //     data: [10, 11, 13, 14, 15, 16, 17]
                    // },
                    series: [
                        {
                            name: 'series-A',
                            data: [{value: [0, 120]}, [1, 132], [2, 101], [3, 134], [4, 90], [5, 230], [6, 210]],
                            color: 'pink'
                        },
                        {
                            name: 'Series B',
                            data: [[0, 220], [1, 182], [2, 191], [3, 234], [4, 290], [5, 330], [6, 310]]
                        },
                        {
                            name: 'Series C',
                            data: [[0, 150], [1, 232], [2, 201], [3, 154], [4, 190], [5, 330], [6, 410]],
                            color: "black"
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
                lineLegend: {
                    type: "primary",
                    data: [
                        {
                            name: "series-A",
                            label: "Series A",
                            value: "123",
                            trend: "up",
                            percentage: "3.4%",
                            tooltip: "Total no of series A.",
                        },
                        {
                            name: "Series B",
                            value: "32,231",
                        },
                        {
                            name: "Series C",
                            value: "123",
                            trend: "down",
                            percentage: "3.4%",
                            tooltip: "Total no of series C.",
                        },
                        {
                            name: "Series D",
                            value: "123",
                            trend: "up",
                            percentage: "3.4%",
                        },
                        {
                            name: "Series E",
                            value: "123",
                            trend: "down",
                            percentage: "3.4%",
                        }
                    ]
                },
                overflowOptions: {
                    xAxis: {
                        data: ['crash-analytics', 'rich-push-notifications', 'dashboards', 'remote-config', 'desktop-analytics', 'user-profiles', 'drill-segmentation', 'funnels', 'behavioral-cohorts', 'crash-symbolication', 'surveys', 'ab-testing', 'automated-push-notifications', 'web-analytics', 'web-heatmaps', 'nps', 'user-retention', 'hooks', 'views', 'online-users', 'ratings', 'flows', 'single-sign-on', 'db-viewer', 'email-reports', 'data-manager', 'mobile-analytics', 'performance-monitoring', 'density-metric', 'device-locale', 'filtering-rules', 'event-logs', 'updates', 'enterprise-info', 'compare', 'server-stats', 'iot-analytics', 'revenue-analytics', 'activity-maps', 'slipping-away-users', 'geolocations', 'github', 'white-label', 'ipip-database', 'data-migration', 'plugin-uploader', 'okta', 'formulas', 'consolidate', 'server-logs', 'aws-kinesis-streaming', 'recaptcha', 'alerts', 'data-populator', 'two-factor-auth', 'browsers-metric', 'assistant', 'video-intelligence-monetization', 'config-transfer', 'times-of-day', 'push-approver', 'compliance-hub']
                    },
                    series: [{
                        name: '',
                        data: [ 31, 28, 25, 22, 20, 20, 19, 14, 13, 13, 13, 11, 9, 9, 9, 9, 8, 8, 7, 7, 6, 5, 5, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
                    }]
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
                barLegend: {
                    type: "primary",
                    data: [
                        {
                            name: "Weekly users",
                            value: "123",
                            trend: "up",
                            percentage: "3.4%",
                            tooltip: "Total no of series A.",
                        },
                        {
                            name: "Weekly new users",
                            value: "32,231",
                        },
                        {
                            name: "Week old users",
                            value: "123",
                            trend: "down",
                            percentage: "3.4%",
                            tooltip: "Total no of series C.",
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
                },
                geoChartData: [
                    ['Country', 'Popularity'],
                    ['Germany', 200],
                    ['United States', 300],
                    ['Brazil', 400],
                    ['Canada', 500],
                    ['France', 600],
                    ['RU', 700]
                ],
                geoChartOptions: {},
                countriesData: {
                    'TR': {
                        'value': 250
                    },
                    'DE': {
                        'value': 500
                    },
                    'US': {
                        'value': 1000
                    },
                    'GB': {
                        'value': 1000
                    },
                    'ES': {
                        'value': 1000
                    },
                    'NL': {
                        'value': 1000
                    },
                    'JP': {
                        'value': 1000
                    },
                    'NZ': {
                        'value': 1000
                    },
                    'IN': {
                        'value': 1000
                    },
                    'IL': {
                        'value': 1000
                    }
                },
                regionsData: {
                    'TR': {
                        'TR-34': {
                            'value': 50
                        }
                    }
                },
                citiesData: {
                    'US': {
                        'Los Angeles': {
                            'value': 30
                        },
                    },
                    'TR': {
                        'Istanbul': {
                            'value': 100
                        },
                        'Ankara': {
                            'value': 30
                        },
                        'Antalya': {
                            'value': 200
                        },
                        'Izmir': {
                            'value': 150
                        }
                    }
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
            },
            lineOptions: function() {
                return this.lineOpts;
            }
        },
        beforeCreate: function() {
            this.$store.dispatch("countlyVueExample/fetchGraphPoints");
        },
        methods: {
            onTimeSeriesButtonClick: function() {
                var opt = JSON.parse(JSON.stringify(TIMESERIESOPTIONS));
                var seriesLength = this.largeScaleOptions.series.length;

                if (seriesLength === opt.series.length) {
                    opt.series.splice(1);
                    this.largeScaleOptions = opt;
                }
                else {
                    this.largeScaleOptions = opt;
                }
            },
            refresh: function() {
                this.$store.dispatch("countlyVueExample/fetchGraphPoints");
                var obj = JSON.parse(JSON.stringify(this.lineOpts));
                this.lineOpts = obj;
            }
        }
    });

    var ExampleDrawer = countlyVue.views.create({
        template: CV.T("/vue-example/templates/drawer.html"),
        data: function() {
            return {
                title: '',
                saveButtonLabel: '',
                itemToBeAdded: '',
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
                },
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
                selectedDate: moment.now(),
                selectedDateWTime: moment.now(),
                selectedDateWTimeFuture: moment.now(),
                selectedMonth: moment().startOf("month").valueOf(),
                selectedTime: new Date(2016, 9, 10, 18, 40),
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

    var MetricCardsView = countlyVue.views.create({
        template: CV.T('/vue-example/templates/metric-cards.html'),
        methods: {
            handleCardsScroll: function() {
                if (this.$refs && this.$refs.bottomSlider) {
                    var pos1 = this.$refs.topSlider.getPosition();
                    pos1 = pos1.scrollLeft;
                    this.$refs.bottomSlider.scrollTo({x: pos1}, 0);
                }
            },
            handleBottomScroll: function() {
                if (this.$refs && this.$refs.topSlider) {
                    var pos1 = this.$refs.bottomSlider.getPosition();
                    pos1 = pos1.scrollLeft;
                    this.$refs.topSlider.scrollTo({x: pos1}, 0);
                }
            }
        },
        data: function() {
            var graphColors = ["#017AFF", "#39C0C8", "#F5C900", "#6C47FF"];
            var breakdownItems = [
                {
                    name: "Metric #1 / Simple use",
                    description: "Hello!",
                    values: [
                        {
                            name: "Value #1",
                            percent: 50,
                            description: "10 things"
                        },
                        {
                            name: "Value #2",
                            percent: 40
                        },
                        {
                            name: "Value #3",
                            percent: 10
                        }
                    ]
                },
                {
                    name: "Metric #2 / Custom bars",
                    values: [
                        {
                            name: "Value A",
                            percent: 70,
                            bar: [{color: '#017AFF', percentage: 70}]
                        },
                        {
                            name: "Value B",
                            percent: 10,
                            bar: [{color: '#FF0000', percentage: 10}]
                        },
                        {
                            name: "Value C",
                            percent: 7,
                            bar: [{color: '#00FF00', percentage: 7}]
                        }
                    ]
                },
                {
                    name: "Metric #3 / Icons",
                    values: [
                        {
                            name: "Value A",
                            percent: 50,
                            icon: "images/flags/us.png"
                        },
                        {
                            name: "Value B",
                            percent: 40,
                            icon: "images/flags/de.png"
                        },
                        {
                            name: "Value C",
                            percent: 30,
                            icon: "images/flags/jp.png"
                        }
                    ]
                },
                {
                    name: "Metric #4 / Links",
                    description: "Hello!",
                    values: [
                        {
                            name: "Value #1",
                            percent: 35,
                            description: "10 things",
                            link: "#/users"
                        },
                        {
                            name: "Value #2",
                            percent: 20,
                            link: "#/users"
                        },
                        {
                            name: "Value #3",
                            percent: 10,
                            link: "#/users"
                        }
                    ]
                },
                {
                    name: "Metric #5 / Two items",
                    values: [
                        {
                            name: "Value #1",
                            percent: 50,
                            description: "10 things"
                        },
                        {
                            name: "Value #2",
                            percent: 40
                        }
                    ]
                },
                {
                    name: "Metric #6 / One item",
                    values: [
                        {
                            name: "Value #1",
                            percent: 50
                        }
                    ]
                },
                {
                    name: "Metric #7 / No data",
                    values: []
                },
                {
                    name: "Metric #8 / Overflow",
                    values: [
                        {
                            name: "Value #1",
                            percent: 50,
                            description: "10 things",
                            link: "#/users"
                        },
                        {
                            name: "Value #2",
                            percent: 40
                        },
                        {
                            name: "Value #3",
                            percent: 10
                        },
                        {
                            name: "Value #4",
                            percent: 5
                        },
                        {
                            name: "Value #5",
                            percent: 0
                        },
                    ]
                },
            ];
            var cardItems = [
                {
                    "name": "Card #1",
                    "value": 100,
                    "percent": 100,
                    "percentText": 100 + " % " + CV.i18n('common.of-total'),
                    "info": "some description",
                    "color": graphColors[0]
                },
                {
                    "name": "Card #2",
                    "value": 80,
                    "percent": 80,
                    "percentText": 80 + " % " + CV.i18n('common.of-total'),
                    "info": "some description",
                    "color": graphColors[1]
                },
                {
                    "name": "Card #3",
                    "value": 60,
                    "percent": 60,
                    "percentText": 60 + " % " + CV.i18n('common.of-total'),
                    "info": "some description",
                    "color": graphColors[2]
                },
                {
                    "name": "Card #4",
                    "value": 40,
                    "percent": 40,
                    "percentText": 40 + " % " + CV.i18n('common.of-total'),
                    "info": "some description",
                    "color": graphColors[3]
                },
                {
                    "name": "Card #5",
                    "value": 20,
                    "percent": 20,
                    "percentText": 20 + " % " + CV.i18n('common.of-total'),
                    "info": "some description",
                    "color": graphColors[0]
                }
            ];
            return {
                scrollCards: {
                    vuescroll: {},
                    scrollPanel: {
                        initialScrollX: false,
                    },
                    rail: {
                        gutterOfSide: "0px"
                    },
                    bar: {
                        background: "#A7AEB8",
                        size: "6px",
                        specifyBorderRadius: "3px",
                        keepShow: false
                    }
                },
                breakdownScrollOps: {
                    vuescroll: {},
                    scrollPanel: {
                        initialScrollX: false,
                    },
                    rail: {
                        gutterOfSide: "1px",
                        gutterOfEnds: "15px"
                    },
                    bar: {
                        background: "#A7AEB8",
                        size: "6px",
                        specifyBorderRadius: "3px",
                        keepShow: true
                    }
                },
                cardItems: cardItems,
                breakdownItems: breakdownItems,
                breakdownSyncItems: breakdownItems.slice(0, 5),
                graphColors: graphColors
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

    var MainView = countlyVue.views.create({
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
                        title: "Metric Cards",
                        name: "metric-cards",
                        component: MetricCardsView,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/vue/example/metric-cards"
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

    //This is the main view that we use in /vue/example
    var getMainView = function() {
        var vuex = [{
            clyModel: countlyVueExample
        }];

        var tabsVuex = countlyVue.container.tabsVuex(["vue/example"]);

        vuex = vuex.concat(tabsVuex);

        return new countlyVue.views.BackboneWrapper({
            component: MainView,
            vuex: vuex,
            templates: [
                "/vue-example/templates/empty.html",
                "/vue-example/templates/form.html"
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

    countlyVue.container.registerTab("vue/example", {
        priority: 1,
        title: 'External tab 1',
        name: 'external1',
        permission: "core",
        route: "#/vue/example/external1",
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
        permission: "core",
        route: "#/vue/example/external2",
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