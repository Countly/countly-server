/* global countlyVue,CV,countlyCommon,countlyGlobal*/
var AppBrowserView = countlyVue.views.create({
    template: CV.T("/browser/templates/browser.html"),
    data: function() {
        return {
            scrollOptions: {
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
                    keepShow: true
                }
            },
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
            description: CV.i18n('browser.page-desc'),
            dynamicTab: "browser-table",
            browserTabs: [
                {
                    title: CV.i18n('browser.title'),
                    name: "browser-table",
                    component: countlyVue.views.create({
                        template: CV.T("/browser/templates/browser_table.html"),
                        computed: {
                            appBrowser: function() {
                                return this.$store.state.countlyDevicesAndTypes.appBrowser;
                            },
                            appBrowserRows: function() {
                                return this.appBrowser.chartData;
                            },
                            isLoading: function() {
                                return this.$store.state.countlyDevicesAndTypes.isLoading;
                            }
                        }
                    })
                },
                {
                    title: CV.i18n('browser.versions'),
                    name: "version-table",
                    component: countlyVue.views.create({
                        template: CV.T("/browser/templates/version_table.html"),
                        data: function() {
                            return {
                                versions: [],
                                versionDetail: []
                            };
                        },
                        computed: {
                            isLoading: function() {
                                return this.$store.state.countlyDevicesAndTypes.isLoading;
                            },
                            appBrowser: function() {
                                return this.$store.state.countlyDevicesAndTypes.appBrowser;
                            },
                            selectedBrowser: {
                                set: function(value) {
                                    this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedBrowser', value);
                                },
                                get: function() {
                                    return this.$store.state.countlyDevicesAndTypes.selectedBrowser;
                                }
                            }
                        },
                        watch: {
                            selectedBrowser: function(newValue) {
                                this.calculateVersions(newValue);
                            },
                            versions: function() {
                                this.calculateVersionsDetail();
                            }
                        },
                        methods: {
                            calculateVersions: function(newValue) {
                                if (newValue) {
                                    this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedBrowser', newValue);
                                }
                                else {
                                    this.selectedBrowser = this.appBrowser.versions[0].label;
                                    this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedBrowser', this.selectedBrowser);
                                }

                                var tempVersions = [];
                                for (var k = 0; k < this.appBrowser.versions.length; k++) {
                                    tempVersions.push({"value": this.appBrowser.versions[k].label, "name": this.appBrowser.versions[k].label});
                                }

                                this.versions = tempVersions;
                            },
                            calculateVersionsDetail: function() {
                                var versionDetail = [];

                                for (var k = 0; k < this.appBrowser.versions.length; k++) {
                                    if (this.appBrowser.versions[k].label === this.selectedBrowser) {
                                        versionDetail = this.appBrowser.versions[k].data || [];
                                    }
                                }
                                this.versionDetail = versionDetail;
                            }
                        },
                        mounted: function() {
                            this.calculateVersions();
                            this.calculateVersionsDetail();
                        }
                    })
                }
            ]
        };
    },
    mounted: function() {
        this.$store.dispatch('countlyDevicesAndTypes/fetchBrowser');
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlyDevicesAndTypes/fetchBrowser');
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
    computed: {
        selectedProperty: {
            set: function(value) {
                this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedProperty', value);
            },
            get: function() {
                return this.$store.state.countlyDevicesAndTypes.selectedProperty;
            }
        },
        graphColors: function() {
            return ["#017AFF", "#39C0C8", "#F5C900", "#6C47FF", "#017AFF"];
        },
        appBrowser: function() {
            return this.$store.state.countlyDevicesAndTypes.appBrowser;
        },
        appResolution: function() {
            return this.$store.state.countlyDevicesAndTypes.appResolution;
        },
        chooseProperties: function() {
            return [{"value": "t", "name": CV.i18n('common.table.total-sessions')}, {"value": "u", "name": CV.i18n('common.table.total-users')}, {"value": "n", "name": CV.i18n('common.table.new-users')}];
        },
        browserItems: function() {
            var display = [];
            var property = this.$store.state.countlyDevicesAndTypes.selectedProperty;
            var data = this.appBrowser.chartData || [];

            for (var k = 0; k < data.length; k++) {
                var percent = Math.round((data[k][property] || 0) * 1000 / (this.appBrowser.totals[property] || 1)) / 10;
                display.push({
                    "name": data[k].browser,
                    "value": countlyCommon.getShortNumber(data[k][property] || 0),
                    "percent": percent,
                    "percentText": percent + " % " + CV.i18n('common.of-total'),
                    "info": CV.i18n('common.info'),
                    "color": this.graphColors[k]
                });
            }
            return display;
        },
        browserVersions: function() {
            var property = this.$store.state.countlyDevicesAndTypes.selectedProperty;
            var returnData = [];
            var browsers = this.appBrowser.versions || [];
            for (var z = 0; z < browsers.length; z++) {
                var display = [];
                var data = browsers[z].data;
                for (var k = 0; k < data.length; k++) {
                    var percent = Math.round((data[k][property] || 0) * 1000 / (browsers[z][property] || 1)) / 10;
                    display.push({
                        "name": data[k].browser_version,
                        "value": countlyCommon.getShortNumber(data[k][property] || 0),
                        "percent": percent,
                        "bar": [{
                            percentage: percent,
                            color: this.graphColors[z]
                        }
                        ]
                    });
                }
                returnData.push({"data": display, "label": browsers[z].label, itemCn: display.length});
            }
            return returnData;
        },
        appBrowserRows: function() {
            return this.appBrowser.chartData;
        },
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.isLoading;
        },
        tabs: function() {
            return this.browserTabs;
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
            'externalLinks': '/analytics/browsers/links'
        })
    ],

});

if (countlyCommon.ACTIVE_APP_ID && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
    countlyVue.container.registerTab("/analytics/technology", {
        priority: 6,
        name: "browsers",
        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/analytics/technology/browsers",
        title: CV.i18n('browser.title'),
        component: AppBrowserView
    });
}