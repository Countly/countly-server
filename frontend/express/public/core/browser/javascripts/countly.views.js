/* global countlyVue,CV,countlyCommon*/
var AppBrowserView = countlyVue.views.create({
    template: CV.T("/core/browser/templates/browser.html"),
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
            description: CV.i18n('browser.description'),
            dynamicTab: "browser-table",
            browserTabs: [
                {
                    title: CV.i18n('browser.title'),
                    name: "browser-table",
                    component: countlyVue.views.create({
                        template: CV.T("/core/browser/templates/browser_table.html"),
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
                        template: CV.T("/core/browser/templates/version_table.html"),
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
                                },
                                dropdownsDisabled: function() {
                                    return "";
                                }
                            },
                            appBrowserVersionRows: function() {
                                var browsers = this.appBrowser.versions;
                                if (!this.selectedBrowser) {
                                    this.selectedBrowser = browsers[0].label;
                                    this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedBrowser', this.selectedBrowser);
                                }
                                for (var k = 0; k < browsers.length; k++) {
                                    if (browsers[k].label === this.selectedBrowser) {
                                        return browsers[k].data || [];
                                    }
                                }

                                return [];
                            },
                            chooseBrowser: function() {
                                var browsers = this.appBrowser.versions;
                                var display = [];
                                for (var k = 0; k < browsers.length; k++) {
                                    display.push({"value": browsers[k].label, "name": browsers[k].label});
                                }
                                if (!this.selectedBrowser) {
                                    this.selectedBrowser = display[0].value;
                                    this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedBrowser', this.selectedBrowser);
                                }
                                return display;
                            }
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
            },
            dropdownsDisabled: function() {
                return "";
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
        }
    }
});

countlyVue.container.registerTab("/analytics/technology", {
    priority: 6,
    name: "browsers",
    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/analytics/technology/browsers",
    title: CV.i18n('browser.title'),
    component: AppBrowserView
});

