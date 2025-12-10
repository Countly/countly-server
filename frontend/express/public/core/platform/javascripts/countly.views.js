/* global countlyVue,CV,countlyCommon*/

const PlatformTableView = countlyVue.views.create({
    computed: {
        appPlatform() {
            return this.$store.state.countlyDevicesAndTypes.appPlatform;
        },

        appPlatformRows() {
            return this.appPlatform.chartData;
        },

        isLoading() {
            return this.$store.state.countlyDevicesAndTypes.platformLoading;
        }
    },

    methods: {
        numberFormatter(row, col, value) {
            return countlyCommon.formatNumber(value, 0);
        }
    },

    template: CV.T('/core/platform/templates/platform_table.html')
});

const VersionsTableView = countlyVue.views.create({
    computed: {
        appPlatform() {
            return this.$store.state.countlyDevicesAndTypes.appPlatform;
        },

        appPlatformVersionRows() {
            const platforms = this.appPlatform.versions;

            if (!this.selectedPlatform && platforms.length) {
                this.selectedPlatform = platforms[0].label;
                this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedPlatform', this.selectedPlatform);
            }

            for (let k = 0; k < platforms.length; k++) {
                if (platforms[k].label === this.selectedPlatform) {
                    return platforms[k].data || [];
                }
            }

            return [];
        },

        choosePlatform() {
            const display = [];
            const platforms = this.appPlatform.versions;

            for (let k = 0; k < platforms.length; k++) {
                display.push({
                    name: platforms[k].label,
                    value: platforms[k].label
                });
            }

            if (!this.selectedPlatform && display.length) {
                this.selectedPlatform = display[0].value;
                this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedPlatform', this.selectedPlatform);
            }

            return display;
        },

        isLoading() {
            return this.$store.state.countlyDevicesAndTypes.isLoading;
        },

        selectedPlatform: {
            get() {
                return this.$store.state.countlyDevicesAndTypes.selectedPlatform;
            },

            set(value) {
                this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedPlatform', value);
            },
        }
    },

    methods: {
        numberFormatter(row, col, value) {
            return countlyCommon.formatNumber(value, 0);
        }
    },

    template: CV.T('/core/platform/templates/version_table.html')
});

var AppPlatformView = countlyVue.views.create({
    mixins: [countlyVue.container.dataMixin({ externalLinks: '/analytics/platforms/links' })],

    data() {
        return {
            breakdownScrollOps: {
                bar: {
                    background: '#A7AEB8',
                    keepShow: true,
                    size: '6px',
                    specifyBorderRadius: '3px'
                },

                rail: {
                    gutterOfEnds: '15px',
                    gutterOfSide: '1px',
                },

                scrollPanel: { initialScrollX: false },

                vuescroll: {}
            },

            chooseProperties: [
                {
                    name: CV.i18n('common.table.total-sessions'),
                    value: 't'
                },
                {
                    name: CV.i18n('common.table.total-users'),
                    value: 'u'
                },
                {
                    name: CV.i18n('common.table.new-users'),
                    value: 'n'
                }
            ],

            description: CV.i18n('platforms.description'),

            dynamicTab: 'platform-table',

            graphColors: [
                '#017AFF',
                '#39C0C8',
                '#F5C900',
                '#6C47FF'
            ],

            tabs: [
                {
                    component: PlatformTableView,

                    dataTestId: 'platforms-table',

                    name: 'platform-table',

                    title: CV.i18n('platforms.title'),
                },
                {
                    component: VersionsTableView,

                    dataTestId: 'versions-table',

                    name: 'version-table',

                    title: CV.i18n('platforms.versions')
                }
            ],

            scrollCards: {
                bar: {
                    background: '#A7AEB8',
                    keepShow: false,
                    size: '6px',
                    specifyBorderRadius: '3px'
                },

                rail: { gutterOfSide: '0px' },

                scrollPanel: { initialScrollX: false },

                vuescroll: {},
            }
        };
    },

    computed: {
        appPlatform() {
            return this.$store.state.countlyDevicesAndTypes.appPlatform;
        },

        appPlatformRows() {
            return this.appPlatform.chartData || [];
        },

        appResolution() {
            return this.$store.state.countlyDevicesAndTypes.appResolution;
        },

        isLoading() {
            return this.$store.state.countlyDevicesAndTypes.platformLoading;
        },

        platformItems() {
            const data = JSON.parse(JSON.stringify(this.appPlatformRows));
            const display = [];
            const property = this.$store.state.countlyDevicesAndTypes.selectedProperty;

            data.sort((a, b) => {
                const totalDiff = b[property] - a[property];

                if (totalDiff === 0) {
                    return a.os_.localeCompare(b.os_);
                }

                return totalDiff;
            });

            for (var k = 0; k < data.length; k++) {
                const percent = Math.round((data[k][property] || 0) * 1000 / (this.appPlatform.totals[property] || 1)) / 10;

                display.push({
                    color: this.graphColors[k % this.graphColors.length],
                    info: 'some description',
                    name: data[k].origos_,
                    percent,
                    percentText: `${percent}% ${CV.i18n('common.of-total')}`,
                    value: countlyCommon.getShortNumber(data[k][property] || 0)
                });
            }

            return display;
        },

        platformVersions() {
            const platforms = JSON.parse(JSON.stringify(this.appPlatform.versions || []));
            const property = this.$store.state.countlyDevicesAndTypes.selectedProperty;
            const returnData = [];

            for (var z = 0; z < platforms.length; z++) {
                var display = [];
                var data = platforms[z].data;

                for (var k = 0; k < data.length; k++) {
                    var percent = Math.round((data[k][property] || 0) * 1000 / (platforms[z][property] || 1)) / 10;

                    display.push({
                        bar: [{
                            color: this.graphColors[z % this.graphColors.length],
                            percentage: percent
                        }],
                        description: countlyCommon.getShortNumber(data[k][property] || 0),
                        name: data[k].os_versions,
                        percent
                    });
                }

                returnData.push({
                    itemCn: display.length,
                    label: platforms[z].label,
                    values: display
                });
            }

            const indexMap = {};

            this.platformItems.forEach((element, index) => {
                indexMap[element.name] = index;
            });

            returnData.sort((a, b) => {
                const nameA = a.label;
                const nameB = b.label;
                const indexA = indexMap[nameA];
                const indexB = indexMap[nameB];

                return indexA - indexB;
            });

            for (var i = 0; i < returnData.length; i++) {
                returnData[i].values.sort((a, b) => parseFloat(b.percent) - parseFloat(a.percent));
                returnData[i].values = returnData[i].values.slice(0, 12);

                // color adjustments after sorting platformVersions to match platformItems
                for (let index = 0; index < returnData[i].values.length; index++) {
                    returnData[i].values[index].bar[0].color = this.platformItems[i].color;
                }
            }

            return returnData;
        },

        selectedProperty: {
            dropdownsDisabled() {
                return '';
            },

            get() {
                return this.$store.state.countlyDevicesAndTypes.selectedProperty;
            },

            set(value) {
                this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedProperty', value);
            }
        },

        topDropdown() {
            if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                return this.externalLinks;
            }

            return null;
        }
    },

    mounted() {
        this.$store.dispatch('countlyDevicesAndTypes/fetchPlatform');
    },

    methods: {
        dateChange() {
            this.refresh(true);
        },

        handleBottomScroll() {
            if (this.$refs && this.$refs.topSlider) {
                const x = this.$refs.bottomSlider.getPosition()?.scrollLeft;

                this.$refs.topSlider.scrollTo({ x }, 0);
            }
        },

        handleCardsScroll() {
            if (this.$refs && this.$refs.bottomSlider) {
                const x = this.$refs.topSlider.getPosition()?.scrollLeft;

                this.$refs.bottomSlider.scrollTo({ x }, 0);
            }
        },

        refresh(force = false) {
            this.$store.dispatch('countlyDevicesAndTypes/fetchPlatform', force);
        }
    },

    template: CV.T('/core/platform/templates/platform.html')
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
