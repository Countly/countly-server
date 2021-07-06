/* global countlyVue,CV,countlyDevicesAndTypes,*/
var AppVersionView = countlyVue.views.create({
    template: CV.T("/core/app-version/templates/app-version.html"),
    data: function() {
        return {
            description: CV.i18n('app-versions.description'),
            barChartItemsLegends: {
                totalSessions: CV.i18n('common.table.total-sessions'),
                newUsers: CV.i18n('common.table.new-users')
            }
        };
    },
    mounted: function() {
        this.$store.dispatch('countlyDevicesAndTypes/fetchAppVersion');
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlyDevicesAndTypes/fetchAppVersion');
        },
    },
    computed: {
        selectedDatePeriod: {
            get: function() {
                return this.$store.state.countlyDevicesAndTypes.selectedDatePeriod;
            },
            set: function(value) {
                this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedDatePeriod', value);
                this.$store.dispatch('countlyDevicesAndTypes/fetchAppVersion');
            }
        },
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
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.isLoading;
        }
    }
});

countlyVue.container.registerTab("/analytics/technology", {
    priority: 4,
    name: "versions",
    title: "App versions",
    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/analytics/technology/versions",
    component: AppVersionView
});

