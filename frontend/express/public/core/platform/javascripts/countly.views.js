/* global countlyVue,CV,countlyCommon*/
var AppPlatformView = countlyVue.views.create({
    template: CV.T("/core/platform/templates/platform.html"),
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
            description: CV.i18n('platforms.description'),
            dynamicTab: "platform-table",
            platformTabs: [
                {
                    title: CV.i18n('platforms.title'),
                    name: "platform-table",
                    component: countlyVue.views.create({
                        template: CV.T("/core/platform/templates/platform_table.html"),
                        computed: {
                            appPlatform: function() {
                                return this.$store.state.countlyDevicesAndTypes.appPlatform;
                            },
                            appPlatformRows: function() {
                                return this.appPlatform.chartData;
                            },
                            isLoading: function() {
                                return this.$store.state.countlyDevicesAndTypes.platformLoading;
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
                    title: CV.i18n('platforms.versions'),
                    name: "version-table",
                    component: countlyVue.views.create({
                        template: CV.T("/core/platform/templates/version_table.html"),
                        computed: {
                            isLoading: function() {
                                return this.$store.state.countlyDevicesAndTypes.isLoading;
                            },
                            appPlatform: function() {
                                return this.$store.state.countlyDevicesAndTypes.appPlatform;
                            },
                            selectedPlatform: {
                                set: function(value) {
                                    this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedPlatform', value);
                                },
                                get: function() {
                                    return this.$store.state.countlyDevicesAndTypes.selectedPlatform;
                                }
                            },
                            appPlatformVersionRows: function() {
                                var platforms = this.appPlatform.versions;

                                if (!this.selectedPlatform && platforms.length) {
                                    this.selectedPlatform = platforms[0].label;
                                    this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedPlatform', this.selectedPlatform);
                                }
                                for (var k = 0; k < platforms.length; k++) {
                                    if (platforms[k].label === this.selectedPlatform) {

                                        return platforms[k].data || [];
                                    }
                                }

                                return [];
                            },
                            choosePlatform: function() {
                                var platforms = this.appPlatform.versions;
                                var display = [];
                                for (var k = 0; k < platforms.length; k++) {
                                    display.push({"value": platforms[k].label, "name": platforms[k].label});
                                }
                                if (!this.selectedPlatform && display.length) {
                                    this.selectedPlatform = display[0].value;
                                    this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedPlatform', this.selectedPlatform);
                                }
                                return display;
                            }
                        },
                        methods: {
                            numberFormatter: function(row, col, value) {
                                return countlyCommon.formatNumber(value, 0);
                            }
                        }
                    })
                }
            ]
        };
    },
    mounted: function() {
        this.$store.dispatch('countlyDevicesAndTypes/fetchPlatform');
    },
    methods: {
        refresh: function(force) {
            if (force) {
                this.$store.dispatch('countlyDevicesAndTypes/fetchPlatform', true);
            }
            else {
                this.$store.dispatch('countlyDevicesAndTypes/fetchPlatform', false);
            }
        },
        dateChange: function() {
            this.refresh(true);
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
            return ["#017AFF", "#39C0C8", "#F5C900", "#6C47FF"];
        },
        appPlatform: function() {
            return this.$store.state.countlyDevicesAndTypes.appPlatform;
        },
        appResolution: function() {
            return this.$store.state.countlyDevicesAndTypes.appResolution;
        },
        chooseProperties: function() {
            return [{"value": "t", "name": CV.i18n('common.table.total-sessions')}, {"value": "u", "name": CV.i18n('common.table.total-users')}, {"value": "n", "name": CV.i18n('common.table.new-users')}];
        },
        platformItems: function() {
            var display = [];
            var property = this.$store.state.countlyDevicesAndTypes.selectedProperty;

            var data = this.appPlatform.chartData || [];
            for (var k = 0; k < data.length; k++) {
                var percent = Math.round((data[k][property] || 0) * 1000 / (this.appPlatform.totals[property] || 1)) / 10;
                display.push({
                    "name": data[k].origos_,
                    "value": countlyCommon.getShortNumber(data[k][property] || 0),
                    "percent": percent,
                    "percentText": percent + "% " + CV.i18n('common.of-total'),
                    "info": "some description",
                    "color": this.graphColors[k % this.graphColors.length]
                });
            }
            return display;
        },
        topDropdown: function() {

            if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                return this.externalLinks;
            }
            else {
                return null;
            }

        },
        platformVersions: function() {
            var property = this.$store.state.countlyDevicesAndTypes.selectedProperty;
            var returnData = [];
            var platforms = this.appPlatform.versions || [];
            for (var z = 0; z < platforms.length; z++) {

                var display = [];
                var data = platforms[z].data;
                for (var k = 0; k < data.length; k++) {
                    var percent = Math.round((data[k][property] || 0) * 1000 / (platforms[z][property] || 1)) / 10;
                    display.push({
                        "name": data[k].os_versions,
                        "description": countlyCommon.getShortNumber(data[k][property] || 0),
                        "percent": percent,
                        "bar": [{
                            percentage: percent,
                            color: this.graphColors[z % this.graphColors.length]
                        }
                        ]
                    });
                }
                returnData.push({"values": display, "label": platforms[z].label, itemCn: display.length});
            }
            for (var i = 0; i < returnData.length; i++) {
                returnData[i].values.sort(function(a, b) {
                    return parseFloat(b.percent) - parseFloat(a.percent);
                });
                returnData[i].values = returnData[i].values.slice(0, 12);
            }
            return returnData;
        },
        appPlatformRows: function() {
            return this.appPlatform.chartData;
        },
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.platformLoading;
        },
        tabs: function() {
            return this.platformTabs;
        }
    },

    mixins: [
        countlyVue.container.dataMixin({
            'externalLinks': '/analytics/platforms/links'
        })
    ]
});


countlyVue.container.registerTab("/analytics/technology", {
    priority: 1,
    name: "platforms",
    permission: "core",
    route: "#/analytics/technology/platforms",
    title: CV.i18n('platforms.title'),
    dataTestId: "platforms",
    component: AppPlatformView
});

