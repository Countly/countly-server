/* global countlyVue,CV,countlyCommon*/
var AppDensityView = countlyVue.views.create({
    template: CV.T("/density/templates/density.html"),
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
            description: CV.i18n('density.page-desc'),
            dynamicTab: "density-table",
            densityTabs: [
                {
                    title: CV.i18n('density.title'),
                    name: "density-table",
                    component: countlyVue.views.create({
                        template: CV.T("/density/templates/density_table.html"),
                        computed: {
                            appDensity: function() {
                                return this.$store.state.countlyDevicesAndTypes.appDensity;
                            },
                            appDensityRows: function() {
                                return this.appDensity.chartData;
                            },
                            isLoading: function() {
                                return this.$store.state.countlyDevicesAndTypes.isLoading;
                            }
                        }
                    })
                },
                {
                    title: CV.i18n('density.versions'),
                    name: "version-table",
                    component: countlyVue.views.create({
                        template: CV.T("/density/templates/version_table.html"),
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
                            appDensity: function() {
                                return this.$store.state.countlyDevicesAndTypes.appDensity;
                            },
                            selectedDensity: {
                                set: function(value) {
                                    this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedDensity', value);
                                },
                                get: function() {
                                    return this.$store.state.countlyDevicesAndTypes.selectedDensity;
                                }
                            }
                        },
                        watch: {
                            selectedDensity: function(newValue) {
                                this.calculateVersions(newValue);
                            },
                            versions: function() {
                                this.calculateVersionsDetail();
                            }
                        },
                        methods: {
                            calculateVersions: function(newValue) {
                                if (newValue) {
                                    this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedDensity', newValue);
                                }
                                else {
                                    this.selectedDensity = this.appDensity.versions[0].label;
                                    this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedDensity', this.selectedDensity);
                                }

                                var tempVersions = [];
                                for (var k = 0; k < this.appDensity.versions.length; k++) {
                                    tempVersions.push({"value": this.appDensity.versions[k].label, "name": this.appDensity.versions[k].label});
                                }

                                this.versions = tempVersions;
                            },
                            calculateVersionsDetail: function() {
                                var versionDetail = [];

                                for (var k = 0; k < this.appDensity.versions.length; k++) {
                                    if (this.appDensity.versions[k].label === this.selectedDensity) {
                                        versionDetail = this.appDensity.versions[k].data || [];
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
        this.$store.dispatch('countlyDevicesAndTypes/fetchDensity');
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlyDevicesAndTypes/fetchDensity');
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
            return ["#017AFF", "#39C0C8", "#F5C900", "#6C47FF", "#017AFF", "#39C0C8"];
        },
        appDensity: function() {
            return this.$store.state.countlyDevicesAndTypes.appDensity;
        },
        appResolution: function() {
            return this.$store.state.countlyDevicesAndTypes.appResolution;
        },
        chooseProperties: function() {
            return [{"value": "t", "name": CV.i18n('common.table.total-sessions')}, {"value": "u", "name": CV.i18n('common.table.total-users')}, {"value": "n", "name": CV.i18n('common.table.new-users')}];
        },
        densityItems: function() {
            var display = [];
            var property = this.$store.state.countlyDevicesAndTypes.selectedProperty;
            var data = this.appDensity.chartData || [];

            for (var k = 0; k < data.length; k++) {
                var percent = Math.round((data[k][property] || 0) * 1000 / (this.appDensity.totals[property] || 1)) / 10;
                display.push({
                    "name": data[k].density,
                    "value": countlyCommon.getShortNumber(data[k][property] || 0),
                    "percent": percent,
                    "percentText": percent + " % " + CV.i18n('common.of-total'),
                    "info": CV.i18n('common.info'),
                    "color": this.graphColors[k]
                });
            }
            return display;
        },
        densityVersions: function() {
            var property = this.$store.state.countlyDevicesAndTypes.selectedProperty;
            var returnData = [];
            var densities = this.appDensity.versions || [];
            for (var z = 0; z < densities.length; z++) {
                var display = [];
                var data = densities[z].data;
                for (var k = 0; k < data.length; k++) {
                    var percent = Math.round((data[k][property] || 0) * 1000 / (densities[z][property] || 1)) / 10;
                    display.push({
                        "name": data[k].density,
                        "value": countlyCommon.getShortNumber(data[k][property] || 0),
                        "percent": percent,
                        "bar": [{
                            percentage: percent,
                            color: this.graphColors[z]
                        }
                        ]
                    });
                }
                returnData.push({"data": display, "label": densities[z].label, itemCn: display.length});
            }
            return returnData;
        },
        appDensityRows: function() {
            return this.appDensity.chartData;
        },
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.isLoading;
        },
        tabs: function() {
            return this.densityTabs;
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
            'externalLinks': '/analytics/densities/links'
        })
    ],

});

countlyVue.container.registerTab("/analytics/technology", {
    priority: 7,
    name: "densities",
    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/analytics/technology/densities",
    title: CV.i18n('density.title'),
    component: AppDensityView
});
