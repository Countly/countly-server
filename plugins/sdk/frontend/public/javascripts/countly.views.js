/*global app, countlyVue, countlySDK, CV, countlyCommon*/
(function() {
    var SC_VER = 1; // check/update sdk/api/api.js for this
    var v0_android = "22.09.4";
    var v0_ios = "23.02.2";
    var v1_android = "25.4.0";
    var v1_ios = "25.4.0";
    var v1_web = "25.4.0";
    // Supporting SDK Versions for the SC options
    var supportedSDKVersion = {
        tracking: { android: v0_android, ios: v0_ios, web: v1_web },
        networking: { android: v0_android, ios: v0_ios, web: v1_web },
        crt: { android: v1_android, ios: v1_ios, web: v1_web },
        vt: { android: v1_android, ios: v1_ios, web: v1_web },
        st: { android: v1_android, ios: v1_ios, web: v1_web },
        cet: { android: v1_android, ios: v1_ios, web: v1_web },
        ecz: { android: v1_android, ios: v1_ios, web: v1_web },
        cr: { android: v1_android, ios: v1_ios, web: v1_web },
        sui: { android: v1_android, ios: v1_ios, web: v1_web },
        eqs: { android: v1_android, ios: v1_ios, web: v1_web },
        rqs: { android: v1_android, ios: v1_ios, web: v1_web },
        czi: { android: v1_android, ios: v1_ios, web: v1_web },
        dort: { android: v1_android, ios: v1_ios, web: v1_web },
        scui: { android: v1_android, ios: v1_ios, web: v1_web },
        lkl: { android: v1_android, ios: v1_ios, web: v1_web },
        lvs: { android: v1_android, ios: v1_ios, web: v1_web },
        lsv: { android: v1_android, ios: v1_ios, web: v1_web },
        lbc: { android: v1_android, ios: v1_ios, web: v1_web },
        ltlpt: { android: v1_android, ios: v1_ios, web: v1_web },
        ltl: { android: v1_android, ios: v1_ios, web: v1_web },
        lt: { android: v1_android, ios: v1_ios, web: v1_web }
    };

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
            Promise.all([
                this.$store.dispatch("countlySDK/initialize"),
                this.$store.dispatch("countlySDK/fetchSDKStats") // fetch sdk version data for tooltips
            ]).then(function () {
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
                        label: "Global Controls",
                        list: ["tracking", "networking"]
                    },
                    features: {
                        label: "SDK Features",
                        list: ["crt", "vt", "st", "cet", "lt", "ecz", "cr"]
                    },
                    settings: {
                        label: "SDK Settings",
                        list: ["sui", "eqs", "rqs", "czi", "dort", "scui"]
                    },
                    limits: {
                        label: "SDK Limits",
                        list: ["lkl", "lvs", "lsv", "lbc", "ltlpt", "ltl"]
                    },
                },
                configs: {
                    tracking: {
                        type: "switch",
                        name: "Allow Tracking",
                        description: "Enable or disable any tracking (gathering) of data in the SDK (default: enabled)",
                        default: true,
                        value: null
                    },
                    networking: {
                        type: "switch",
                        name: "Allow Networking",
                        description: "Enable or disable all networking calls from SDK except SDK config call. Does not effect tracking of data (default: enabled)",
                        default: true,
                        value: null
                    },
                    crt: {
                        type: "switch",
                        name: "Allow Crash Tracking",
                        description: "Enable or disable tracking of crashes (default: enabled)",
                        default: true,
                        value: null
                    },
                    vt: {
                        type: "switch",
                        name: "Allow View Tracking",
                        description: "Enable or disable tracking of views (default: enabled)",
                        default: true,
                        value: null
                    },
                    st: {
                        type: "switch",
                        name: "Allow Session Tracking",
                        description: "Enable or disable tracking of sessions (default: enabled)",
                        default: true,
                        value: null
                    },
                    sui: {
                        type: "number",
                        name: "Session Update Interval",
                        description: "How often to send session update information to server in seconds (default: 60)",
                        default: 60,
                        value: null
                    },
                    cet: {
                        type: "switch",
                        name: "Allow Custom Event Tracking",
                        description: "Enable or disable tracking of custom events (default: enabled)",
                        default: true,
                        value: null
                    },
                    lt: {
                        type: "switch",
                        name: "Allow Location Tracking",
                        description: "Enable or disable tracking of location (default: enabled)",
                        default: true,
                        value: null
                    },
                    ecz: {
                        type: "switch",
                        name: "Enable Content Zone",
                        description: "Enable or disable listening to Journey related contents (default: disabled)",
                        default: false,
                        value: null
                    },
                    cr: {
                        type: "switch",
                        name: "Require Consent",
                        description: "Enable or disable requiring consent for tracking (default: disabled)",
                        default: false,
                        value: null
                    },
                    rqs: {
                        type: "number",
                        name: "Request Queue Size",
                        description: "How many requests to store in queue, if SDK cannot connect to server (default: 1000)",
                        default: 1000,
                        value: null
                    },
                    eqs: {
                        type: "number",
                        name: "Event Queue Size",
                        description: "How many events to store in queue before they would be batched and sent to server (default: 100)",
                        default: 100,
                        value: null
                    },
                    czi: {
                        type: "number",
                        name: "Content Zone Interval",
                        description: "How often to check for new Journey content in seconds (default: 30, min: 15)",
                        default: 30,
                        value: null
                    },
                    dort: {
                        type: "number",
                        name: "Request Drop Age",
                        description: "Provide time in hours after which an old request should be dropped if they are not sent to server (default: 0 = disabled)",
                        default: 0,
                        value: null
                    },
                    lkl: {
                        type: "number",
                        name: "Max Key Length",
                        description: "Maximum length of an Event's key (including name) (default: 128)",
                        default: 128,
                        value: null
                    },
                    lvs: {
                        type: "number",
                        name: "Max Value Size",
                        description: "Maximum length of an Event's segment value (default: 256)",
                        default: 256,
                        value: null
                    },
                    lsv: {
                        type: "number",
                        name: "Max Number of Segments",
                        description: "Maximum amount of segmentation key/value pairs per Event (default: 100)",
                        default: 100,
                        value: null
                    },
                    lbc: {
                        type: "number",
                        name: "Max Breadcrumb Count",
                        description: "Maximum breadcrumb count that can be provided by the developer (default: 100)",
                        default: 100,
                        value: null
                    },
                    ltlpt: {
                        type: "number",
                        name: "Max Trace Line Per Thread",
                        description: "Maximum stack trace lines that would be recorded per thread (default: 30)",
                        default: 30,
                        value: null
                    },
                    ltl: {
                        type: "number",
                        name: "Max Trace Length Per Line",
                        description: "Maximum length of a stack trace line to be recorded (default: 200)",
                        default: 200,
                        value: null
                    },
                    scui: {
                        type: "number",
                        name: "Server Config Update Interval",
                        description: "How often to check for new server config in hours (default: 4)",
                        default: 4,
                        value: null
                    }
                },
                diff: [],
                description: "This is experimental feature and not all SDKs and SDK versions yet support it. Refer to the SDK documentation for more information"
            };
        },
        mounted: function() {
            var self = this;
            this.$nextTick(function () {
                self.checkSdkSupport();
            });
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
            downloadConfig: function() {
                var params = this.$store.getters["countlySDK/sdk/all"];
                var data = {};
                data.v = SC_VER;
                data.t = Date.now();
                data.c = params || {};
                var configData = JSON.stringify(data, null, 2);
                var blob = new Blob([configData], { type: 'application/json' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'sdk-config.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            },
            resetSDKConfiguration: function() {
                var helper_msg = "You are about to reset your SDK configuration to default state. Do you want to continue?";
                var helper_title = "Reset configuration?";
                var self = this;

                CountlyHelpers.confirm(helper_msg, "red", function(result) {
                    if (!result) {
                        return true;
                    }

                    var params = self.$store.getters["countlySDK/sdk/all"];
                    var data = params || {};
                    for (var key in self.configs) {
                        self.configs[key].value = self.configs[key].default;
                        data[key] = self.configs[key].value;
                    }
                    self.$store.dispatch("countlySDK/sdk/update", data).then(function() {
                        self.$store.dispatch("countlySDK/initialize");
                    });
                }, ["No, don't reset", "Yes, reset"], {title: helper_title});
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
            },
            semverToNumber: function(version) {
                if (typeof version !== 'string') {
                    return -1;
                }
                
                version = version.split("-")[0];
                var letterIndex = version.search(/[a-zA-Z]/);
                if (letterIndex !== -1) {
                    version = version.substring(0, letterIndex);
                }

                const semverRegex = /^(\d+)\.(\d+)\.(\d+)$/;
                const match = version.match(semverRegex);
                
                if (!match) {
                    return -1;
                }
                
                const major = parseInt(match[1], 10);
                const minor = parseInt(match[2], 10);
                const patch = parseInt(match[3], 10);
                
                return major * 1_000_000 + minor * 1_000 + patch;
            },
            compareVersions: function(context, a, b, text) {
                if (!a) {
                    return;
                }
                
                const aValue = this.semverToNumber(a);
                const bValue = this.semverToNumber(b);
                
                if (aValue === -1 || bValue === -1) {
                    context.unsupportedList.push(text);
                    return;
                }
                
                if (aValue >= bValue) {
                    context.supportLevel += 1;
                } else {
                    context.unsupportedList.push(text);
                }
            },
            checkSdkSupport: function() {
                for (var key in this.configs) {
                    this.configs[key].tooltipMessage = "No SDK data present. Please use the latest versions of Android, Web, iOS, Flutter or RN SDKs to use this Server Config option.";
                    this.configs[key].tooltipClass = 'tooltip-neutral';
                }

                if (!this.$store.state.countlySDK ||
                    !this.$store.state.countlySDK.stats ||
                    !this.$store.state.countlySDK.stats.sdk ||
                    !this.$store.state.countlySDK.stats.sdk.versions ||
                    this.$store.state.countlySDK.stats.sdk.versions.length === 0) {
                    setTimeout(() => {
                        this.checkSdkSupport();
                    }, 500);
                    return;
                }
                
                const availableData = this.$store.state.countlySDK.stats.sdk.versions;
                const latestVersions = availableData.reduce((acc, sdk) => {
                    if (!sdk.data || sdk.data.length === 0) {
                        return acc;
                    }
                    acc[sdk.label] = sdk.data[0].sdk_version;
                    for (var i = 1; i < sdk.data.length; i++) {
                        if (this.semverToNumber(acc[sdk.label]) < this.semverToNumber(sdk.data[i].sdk_version)) {
                            acc[sdk.label] = sdk.data[i].sdk_version;
                        }
                    }
                    return acc;
                }, {});

                var viableSDKCount = 0;
                if (latestVersions["javascript_native_web"]) {
                    viableSDKCount++;
                }
                if (latestVersions["java-native-android"]) {
                    viableSDKCount++;
                }
                if (latestVersions["objc-native-ios"]) {
                    viableSDKCount++;
                }

                const configKeyList = Object.keys(this.configs);
                configKeyList.forEach(configKey => {
                    const configSupportedVersions = supportedSDKVersion[configKey];
                    if (!configSupportedVersions) {
                        return;
                    }

                    var context = { supportLevel: 0, unsupportedList: [] };
                    this.compareVersions(context, latestVersions["javascript_native_web"], configSupportedVersions.web, "Web SDK");
                    this.compareVersions(context, latestVersions["java-native-android"], configSupportedVersions.android, "Android SDK");
                    this.compareVersions(context, latestVersions["objc-native-ios"], configSupportedVersions.ios, "iOS SDK");

                    if (viableSDKCount > 0 && context.supportLevel === viableSDKCount) { // all correct version
                        this.configs[configKey].tooltipMessage = 'You are using SDKs that support this option.';
                        this.configs[configKey].tooltipClass = 'tooltip-success';
                    } else if (context.unsupportedList.length > 0) { // some/all wrong version
                        this.configs[configKey].tooltipMessage = 'Some SDKs you use do not support this option: ' + context.unsupportedList.join(', ') + '. Try upgrading to the latest version.';
                        this.configs[configKey].tooltipClass = 'tooltip-warning';
                    } else { // none supported
                        this.configs[configKey].tooltipMessage = 'None of the SDKs you use support this option. Please use the latest versions of Android, Web, iOS, Flutter or RN SDKs to use this Server Config option.';
                        this.configs[configKey].tooltipClass = 'tooltip-danger';
                    }

                });    
                this.$forceUpdate();
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
            chooseDisplay: function() {
                return [{"value": "percentage", "name": "percentage"}, {"value": "value", "name": "values"}];
            },
            selectedProperty: {
                set: function(value) {
                    this.$store.dispatch('countlySDK/onSetSelectedProperty', value);
                },
                get: function() {
                    return this.$store.state.countlySDK.stats.selectedProperty;
                }
            },
            selectedDisplay: {
                set: function(value) {
                    this.$store.dispatch('countlySDK/onSetSelectedDisplay', value);
                },
                get: function() {
                    return this.$store.state.countlySDK.stats.selectedDisplay;
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

    var SDKReqStatsView = countlyVue.views.create({
        template: CV.T("/sdk/templates/request_stats.html"),
        data: function() {
            return {

            };
        },
        mounted: function() {
            this.$store.dispatch('countlySDK/fetchSDKStats');
        },
        methods: {
            refresh: function() {
                this.$store.dispatch('countlySDK/fetchSDKStats');
            },
        },
        computed: {
            chooseDisplay: function() {
                return [{"value": "percentage", "name": "percentage"}, {"value": "value", "name": "values"}];
            },
            selectedDisplay: {
                set: function(value) {
                    this.$store.dispatch('countlySDK/onSetSelectedDisplay', value);
                },
                get: function() {
                    return this.$store.state.countlySDK.stats.selectedDisplay;
                }
            },
            graphColors: function() {
                return ["#017AFF", "#39C0C8", "#F5C900", "#6C47FF", "#017AFF"];
            },
            stats: function() {
                return this.$store.state.countlySDK.stats;
            },
            lineOptionsRequests: function() {
                return this.stats.requestChartData;
            },
            lineOptionsDelays: function() {
                return this.stats.delayChartData;
            },
            lineOptionsReceived: function() {
                return this.stats.receivedChartData;
            },
            lineOptionsCanceled: function() {
                return this.stats.canceledChartData;
            },
            totals: function() {
                return this.stats.requestTotals;
            },
            delays: function() {
                return this.stats.delayTotals;
            },
            isLoading: function() {
                return this.$store.state.countlySDK.stats.isLoading;
            }
        }
    });
    countlyVue.container.registerTab("/manage/sdk", {
        priority: 1,
        route: "#/manage/sdk/request_stats",
        component: SDKReqStatsView,
        title: "Request Stats",
        name: "request_stats",
        permission: FEATURE_NAME,
        vuex: []
    });

    var SDKHealthCheckView = countlyVue.views.create({
        template: CV.T("/sdk/templates/health_checks.html"),
        data: function() {
            return {

            };
        },
        mounted: function() {
            this.$store.dispatch('countlySDK/fetchSDKStats');
        },
        methods: {
            refresh: function() {
                this.$store.dispatch('countlySDK/fetchSDKStats');
            },
        },
        computed: {
            chooseDisplay: function() {
                return [{"value": "percentage", "name": "percentage"}, {"value": "value", "name": "values"}];
            },
            selectedDisplay: {
                set: function(value) {
                    this.$store.dispatch('countlySDK/onSetSelectedDisplay', value);
                },
                get: function() {
                    return this.$store.state.countlySDK.stats.selectedDisplay;
                }
            },
            graphColors: function() {
                return ["#017AFF", "#39C0C8", "#F5C900", "#6C47FF", "#017AFF"];
            },
            stats: function() {
                return this.$store.state.countlySDK.stats;
            },
            lineOptionsHCs: function() {
                return this.stats.healthCheckChartData;
            },
            lineOptionsStatusCodes: function() {
                return this.stats.statusCodesChartData;
            },
            lineOptionsErrorMessages: function() {
                return this.stats.errorMessagesChartData;
            },
            totals: function() {
                return this.stats.HCTotals;
            },
            isLoading: function() {
                return this.$store.state.countlySDK.stats.isLoading;
            }
        }
    });
    countlyVue.container.registerTab("/manage/sdk", {
        priority: 1,
        route: "#/manage/sdk/health_check",
        component: SDKHealthCheckView,
        title: "Health Check",
        name: "health_check",
        permission: FEATURE_NAME,
        vuex: []
    });

})();