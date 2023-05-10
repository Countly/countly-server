/*global app, countlyVue, countlySDK, CV, countlyCommon*/
(function() {
    var FEATURE_NAME = "sdk";
    var SDK = countlyVue.views.create({
        template: CV.T('/sdk/templates/sdk-main.html'),
        mixins: [
            countlyVue.container.tabsMixin({
                "sdkTabs": "/manage/sdk"
            })
        ].concat(countlyVue.container.mixins(["/manage/sdk"])),
        data: function() {
            return {
                selectedTab: (this.$route.params && this.$route.params.tab) || "stats"
            };
        },
        computed: {
            tabs: function() {
                return this.sdkTabs;
            }
        }
    });
    var getSDKMainView = function() {
        var tabsVuex = countlyVue.container.tabsVuex(["/manage/sdk"]);
        return new countlyVue.views.BackboneWrapper({
            component: SDK,
            vuex: tabsVuex,
            templates: []
        });
    };

    app.route("/manage/sdk", "sdk-tab", function() {
        var ViewWrapper = getSDKMainView();
        var params = {};
        ViewWrapper.params = params;
        this.renderWhenReady(ViewWrapper);
    });

    app.route("/manage/sdk/*tab", "sdk-tab", function(tab) {
        var ViewWrapper = getSDKMainView();
        var params = {
            tab: tab
        };
        ViewWrapper.params = params;
        this.renderWhenReady(ViewWrapper);
    });
    app.addSubMenu("management", {code: "sdk", permission: FEATURE_NAME, url: "#/manage/sdk", text: "SDK Manager", priority: 50, tabsPath: "/manage/sdk"});

    var SDKConfigurationView = countlyVue.views.create({
        template: CV.T('/sdk/templates/config.html'),
        created: function() {
            var self = this;
            this.$store.dispatch("countlySDK/initialize").then(function() {
                self.$store.dispatch("countlySDK/sdk/setTableLoading", false);
            });
        },
        computed: {
            getData: function() {
                var params = this.$store.getters["countlySDK/sdk/all"];
                var data = params || {};
                for (var key in this.configs) {
                    if (this.diff.indexOf(key) === -1) {
                        this.configs[key].value = typeof data[key] !== "undefined" ? data[key] : this.configs[key].default;
                    }
                }
                return this.configs;
            },
            isTableLoading: function() {
                return this.$store.getters["countlySDK/sdk/isTableLoading"];
            }
        },
        data: function() {
            return {
                groups: {
                    global: {
                        label: "SDK control",
                        list: ["tracking", "networking"]
                    },
                    /*features: {
                        label: "SDK features",
                        list: ["crashes", "views"]
                    },
                    settings: {
                        label: "SDK settings",
                        list: ["heartbeat", "event_queue","request_queue"]
                    }*/
                },
                configs: {
                    tracking: {
                        type: "switch",
                        name: "SDK Tracking",
                        description: "Enable or disable tracking any data in the SDK. If disabled, tracking new data will stop, but already collected data will be sent as long as networking is enabled",
                        default: true,
                        value: null
                    },
                    networking: {
                        type: "switch",
                        name: "SDK Networking",
                        description: "Enable or disable networking calls within SDK. If disabled no network requests will come from SDK (except SDK config call), but data would still be recorded and preserved on device up to the SDK limits",
                        default: true,
                        value: null
                    },
                    /*crashes: {
                        type: "switch",
                        name: "Crashes",
                        description: "Enable or disable automatic tracking of unhandled crashes",
                        default: true,
                        value: null
                    },
                    views: {
                        type: "switch",
                        name: "Views",
                        description: "Enable or disable automatic tracking of views",
                        default: true,
                        value: null
                    },
                    heartbeat: {
                        type: "number",
                        name: "Heartbeat",
                        description: "How often to send heartbeat to server in seconds",
                        default: 60,
                        value: null
                    },
                    request_queue: {
                        type: "number",
                        name: "Request Queue Size",
                        description: "How many requests to store in queue, if SDK cannot connect to server",
                        default: 1000,
                        value: null
                    },
                    event_queue: {
                        type: "number",
                        name: "Event Queue Size",
                        description: "How many events to store in queue before they would be batched and sent to server",
                        default: 10,
                        value: null
                    }*/
                },
                diff: [],
                description: "This is experimental feature and not all SDKs and SDK versions yet support it. Refer to the SDK documentation for more information"
            };
        },
        methods: {
            onChange: function(key, value) {
                this.configs[key].value = value;
                if (this.diff.indexOf(key) === -1) {
                    this.diff.push(key);
                }
                else {
                    var params = this.$store.getters["countlySDK/sdk/all"];
                    var data = params || {};
                    if (typeof data[key] !== "undefined") {
                        if (data[key] === value) {
                            this.diff.splice(this.diff.indexOf(key), 1);
                        }
                    }
                    else if (this.configs[key].default === value) {
                        this.diff.splice(this.diff.indexOf(key), 1);
                    }
                }
            },
            save: function() {
                var params = this.$store.getters["countlySDK/sdk/all"];
                var data = params || {};
                for (var i = 0; i < this.diff.length; i++) {
                    data[this.diff[i]] = this.configs[this.diff[i]].value;
                }
                this.diff = [];
                var self = this;
                this.$store.dispatch("countlySDK/sdk/update", data).then(function() {
                    self.$store.dispatch("countlySDK/initialize");
                });
            },
            unpatch: function() {
                this.diff = [];
                var params = this.$store.getters["countlySDK/sdk/all"];
                var data = params || {};
                for (var key in this.configs) {
                    this.configs[key].value = typeof data[key] !== "undefined" ? data[key] : this.configs[key].default;
                }
            }
        }
    });
    countlyVue.container.registerTab("/manage/sdk", {
        priority: 2,
        route: "#/manage/sdk/configurations",
        component: SDKConfigurationView,
        title: "SDK Configuration",
        name: "configurations",
        permission: FEATURE_NAME,
        vuex: [
            {
                clyModel: countlySDK
            }
        ]
    });

    var SDKStatsView = countlyVue.views.create({
        template: CV.T("/sdk/templates/stats.html"),
        data: function() {
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
                dynamicTab: "sdk-table",
                sdkTabs: [
                    {
                        title: "SDKs",
                        name: "sdk-table",
                        component: countlyVue.views.create({
                            template: CV.T("/sdk/templates/sdk_table.html"),
                            computed: {
                                sdk: function() {
                                    return this.$store.state.countlySDK.stats.sdk;
                                },
                                sdkRows: function() {
                                    return this.sdk.chartData;
                                },
                                isLoading: function() {
                                    return this.$store.state.countlySDK.stats.isLoading;
                                }
                            },
                            methods: {
                                numberFormatter: function(row, col, value) {
                                    return countlyCommon.formatNumber(value, 0);
                                }
                            }
                        })
                    },
                    {
                        title: "SDK Versions",
                        name: "version-table",
                        component: countlyVue.views.create({
                            template: CV.T("/sdk/templates/version_table.html"),
                            data: function() {
                                return {
                                    versions: [],
                                    versionDetail: []
                                };
                            },
                            computed: {
                                isLoading: function() {
                                    return this.$store.state.countlySDK.stats.isLoading;
                                },
                                sdk: function() {
                                    return this.$store.state.countlySDK.stats.sdk;
                                },
                                selectedSDK: {
                                    set: function(value) {
                                        this.$store.dispatch('countlySDK/onSetSelectedSDK', value);
                                    },
                                    get: function() {
                                        return this.$store.state.countlySDK.stats.selectedSDK;
                                    }
                                }
                            },
                            watch: {
                                selectedSDK: function(newValue) {
                                    this.calculateVersions(newValue);
                                },
                                versions: function() {
                                    this.calculateVersionsDetail();
                                }
                            },
                            methods: {
                                calculateVersions: function(newValue) {
                                    if (newValue) {
                                        this.$store.dispatch('countlySDK/onSetSelectedSDK', newValue);
                                    }
                                    else {
                                        this.selectedSDK = this.sdk.versions[0].label;
                                        this.$store.dispatch('countlySDK/onSetSelectedSDK', this.selectedSDK);
                                    }

                                    var tempVersions = [];
                                    for (var k = 0; k < this.sdk.versions.length; k++) {
                                        tempVersions.push({"value": this.sdk.versions[k].label, "name": this.sdk.versions[k].label});
                                    }

                                    this.versions = tempVersions;
                                },
                                calculateVersionsDetail: function() {
                                    var versionDetail = [];

                                    for (var k = 0; k < this.sdk.versions.length; k++) {
                                        if (this.sdk.versions[k].label === this.selectedSDK) {
                                            versionDetail = this.sdk.versions[k].data || [];
                                        }
                                    }
                                    this.versionDetail = versionDetail;
                                },
                                numberFormatter: function(row, col, value) {
                                    return countlyCommon.formatNumber(value, 0);
                                }
                            },
                            mounted: function() {
                                this.calculateVersions();
                                this.calculateVersionsDetail();
                            }
                        })
                    }
                ],
                versions: []
            };
        },
        mounted: function() {
            this.$store.dispatch('countlySDK/fetchSDKStats');
        },
        methods: {
            refresh: function() {
                this.$store.dispatch('countlySDK/fetchSDKStats');
            },
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
        watch: {
            selectedSDK: function(newValue) {
                if (newValue) {
                    this.$store.dispatch('countlySDK/onSetSelectedSDK', newValue);
                }
                else {
                    this.selectedSDK = this.$store.state.countlySDK.stats.sdk.versions[0].label;
                    this.$store.dispatch('countlySDK/onSetSelectedSDK', this.selectedSDK);
                }
                var tempVersions = [];
                for (var k = 0; k < this.$store.state.countlySDK.stats.sdk.versions.length; k++) {
                    tempVersions.push({"value": this.$store.state.countlySDK.stats.sdk.versions[k].label, "name": this.$store.state.countlySDK.stats.sdk.versions[k].label});
                }
                this.versions = tempVersions;
            }
        },
        computed: {
            selectedProperty: {
                set: function(value) {
                    this.$store.dispatch('countlySDK/onSetSelectedProperty', value);
                },
                get: function() {
                    return this.$store.state.countlySDK.stats.selectedProperty;
                }
            },
            selectedSDK: {
                set: function(value) {
                    this.$store.dispatch('countlySDK/onSetSelectedSDK', value);
                },
                get: function() {
                    return this.$store.state.countlySDK.stats.selectedSDK;
                }
            },
            graphColors: function() {
                return ["#017AFF", "#39C0C8", "#F5C900", "#6C47FF", "#017AFF"];
            },
            stats: function() {
                return this.$store.state.countlySDK.stats;
            },
            sdk: function() {
                return this.stats.sdk;
            },
            lineOptions: function() {
                return this.stats.chartData;
            },
            lineLegend: function() {
                return this.stats.legendData;
            },
            chooseProperties: function() {
                return [{"value": "t", "name": CV.i18n('common.table.total-sessions')}, {"value": "u", "name": CV.i18n('common.table.total-users')}, {"value": "n", "name": CV.i18n('common.table.new-users')}];
            },
            sdkItems: function() {
                var display = [];
                var property = this.$store.state.countlySDK.stats.selectedProperty;
                var data = this.sdk.chartData || [];

                for (var k = 0; k < data.length; k++) {
                    var percent = Math.round((data[k][property] || 0) * 1000 / (this.sdk.totals[property] || 1)) / 10;
                    display.push({
                        "name": data[k].sdks,
                        "value": countlyCommon.getShortNumber(data[k][property] || 0),
                        "percent": percent,
                        "percentText": percent + "% " + CV.i18n('common.of-total'),
                        "info": CV.i18n('common.info'),
                        "color": this.graphColors[k]
                    });
                }

                display.sort(function(a, b) {
                    return parseFloat(b.percent) - parseFloat(a.percent);
                });

                display = display.slice(0, 12);

                return display;
            },
            sdkVersions: function() {
                var property = this.$store.state.countlySDK.stats.selectedProperty;
                var returnData = [];
                var sdks = this.sdk.versions || [];

                for (var z = 0; z < sdks.length; z++) {
                    var display = [];
                    var data = sdks[z].data;
                    for (var k = 0; k < data.length; k++) {
                        var percent = Math.round((data[k][property] || 0) * 1000 / (sdks[z][property] || 1)) / 10;
                        display.push({
                            "name": data[k].sdk_version,
                            "description": countlyCommon.getShortNumber(data[k][property] || 0),
                            "percent": percent,
                            "bar": [{
                                percentage: percent,
                                color: this.graphColors[z]
                            }]
                        });
                    }
                    returnData.push({"values": display, "label": sdks[z].label, itemCn: display.length});
                }

                var orderedDataArray = [];

                for (var i = 0; i < this.sdkItems.length; i++) {
                    for (var j = 0; j < returnData.length; j++) {
                        if (this.sdkItems[i].name === returnData[j].label) {
                            orderedDataArray.push(returnData[j]);
                        }
                    }
                }

                return orderedDataArray;
            },
            sdkRows: function() {
                return this.sdk.chartData;
            },
            isLoading: function() {
                return this.$store.state.countlySDK.stats.isLoading;
            },
            tabs: function() {
                return this.sdkTabs;
            },
            topDropdown: function() {
                if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                    return this.externalLinks;
                }
                else {
                    return null;
                }
            }
        },
        mixins: [
            countlyVue.container.dataMixin({
                'externalLinks': '/analytics/sdk/links'
            })
        ],

    });
    countlyVue.container.registerTab("/manage/sdk", {
        priority: 1,
        route: "#/manage/sdk/stats",
        component: SDKStatsView,
        title: "SDK Stats",
        name: "stats",
        permission: FEATURE_NAME,
        vuex: []
    });
})();