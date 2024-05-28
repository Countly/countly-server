/* global countlyVue,CV,countlyCommon*/
var AppVersionView = countlyVue.views.create({
    template: CV.T("/core/app-version/templates/app-version.html"),
    data: function() {
        return {
            description: CV.i18n('app-versions.description'),
            barChartItemsLegends: {
                totalSessions: CV.i18n('common.table.total-sessions'),
                newUsers: CV.i18n('common.table.new-users')
            },
        };
    },

    mounted: function() {
        this.$store.dispatch('countlyDevicesAndTypes/fetchAppVersion', true);
    },
    methods: {
        refresh: function(force) {
            this.$store.dispatch('countlyDevicesAndTypes/fetchAppVersion', force);
        },
        numberFormatter: function(row, col, value) {
            return countlyCommon.formatNumber(value, 0);
        }
    },
    computed: {
        appVersion: function() {
            return this.$store.state.countlyDevicesAndTypes.appVersion;
        },
        seriesTotal: function() {
            return this.$store.state.countlyDevicesAndTypes.seriesTotal;
        },
        appVersionRows: function() {
            return this.appVersion.table;
        },
        appVersionOptions: function() {
            return this.appVersion.chart;
        },
        appVersionStackedOptions: function() {
            return {series: this.appVersion.series, xAxis: this.appVersion.xAxis, yAxis: this.appVersion.yAxis, valFormatter: this.appVersion.valFormatter};
        },
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.versionLoading;
        },
        topDropdown: function() {
            if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                return this.externalLinks;
            }
            else {
                return null;
            }

        },
        chooseProperties: function() {
            return [{"value": "t", "name": CV.i18n('common.table.total-sessions')}, {"value": "u", "name": CV.i18n('common.table.total-users')}, {"value": "n", "name": CV.i18n('common.table.new-users')}];
        },
        chooseDisplay: function() {
            return [{"value": "percentage", "name": "percentage"}, {"value": "value", "name": "values"}];
        },
        selectedProperty: {
            set: function(value) {
                this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedProperty', value);
                this.$store.dispatch('countlyDevicesAndTypes/onRecalcProp');
            },
            get: function() {
                return this.$store.state.countlyDevicesAndTypes.selectedProperty;
            },
            dropdownsDisabled: function() {
                return "";
            }
        },
        selectedDisplay: {
            set: function(value) {
                this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedDisplay', value);
                this.$store.dispatch('countlyDevicesAndTypes/onRecalcProp');
            },
            get: function() {
                return this.$store.state.countlyDevicesAndTypes.selectedDisplay;
            },
            dropdownsDisabled: function() {
                return "";
            }
        },
    },
    mixins: [
        countlyVue.container.dataMixin({
            'externalLinks': '/analytics/versions/links'
        })
    ]
});

countlyVue.container.registerTab("/analytics/technology", {
    priority: 4,
    name: "versions",
    permission: "core",
    title: CV.i18n('app-versions.title'),
    route: "#/analytics/technology/versions",
    dataTestId: "technology-versions",
    component: AppVersionView
});

