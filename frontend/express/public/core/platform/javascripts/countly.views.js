/* global countlyVue,CV,countlyCommon*/
var AppPlatformView = countlyVue.views.create({
    template: CV.T("/core/platform/templates/platform.html"),
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
                                return this.$store.state.countlyDevicesAndTypes.isLoading;
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
                                },
                                dropdownsDisabled: function() {
                                    return "";
                                }
                            },
                            appPlatformVersionRows: function() {
                                var platforms = this.appPlatform.versions;

                                if (!this.selectedPlatform) {
                                    this.selectedPlatform = platforms[0]["label"];
                                    this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedPlatform', this.selectedPlatform);
                                }
                                for (var k = 0; k < platforms.length; k++) {
                                    if (platforms[k]["label"] === this.selectedPlatform) {
                                        return platforms[k].data || [];
                                    }
                                }

                                return [];
                            },
                            choosePlatform: function() {
                                var platforms = this.appPlatform.versions;
                                var display = [];
                                for (var k = 0; k < platforms.length; k++) {
                                    display.push({"value": platforms[k]["label"], "name": platforms[k]["label"]});
                                }
                                if (!this.selectedPlatform) {
                                    this.selectedPlatform = display[0]["value"];
                                    this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedPlatform', this.selectedPlatform);
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
        this.$store.dispatch('countlyDevicesAndTypes/fetchPlatform');
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlyDevicesAndTypes/fetchPlatform');
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
                var percent = Math.round((data[k][property] || 0) * 1000 / (this.appPlatform["totals"][property] || 1)) / 10;
                display.push({
                    "name": data[k]["origos_"],
                    "value": countlyCommon.getShortNumber(data[k][property] || 0),
                    "percent": percent,
                    "percentText": percent + " % " + CV.i18n('common.of-total'),
                    "info": "some description",
                    "color": this.graphColors[k]
                });
            }
            return display;
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
                        "name": data[k]["os_versions"],
                        "value": countlyCommon.getShortNumber(data[k][property] || 0),
                        "percent": percent,
                        "bar": [{
                            percentage: percent,
                            color: this.graphColors[z]
                        }
                        ]
                    });
                }
                returnData.push({"data": display, "label": platforms[z].label, itemCn: display.length});
            }
            return returnData;
        },
        appPlatformRows: function() {
            return this.appPlatform.chartData;
        },
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.isLoading;
        },
        tabs: function() {
            return this.platformTabs;
        }
    }
});


countlyVue.container.registerTab("/analytics/technology", {
    priority: 1,
    name: "platforms",
    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/analytics/technology/platforms",
    title: CV.i18n('platforms.title'),
    component: AppPlatformView
});

