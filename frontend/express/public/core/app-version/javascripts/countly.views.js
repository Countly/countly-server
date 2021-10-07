/* global countlyVue,CV,countlyCommon*/
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
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.isLoading;
        },
        topDropdown: function() {
            if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                return this.externalLinks;
            }
            else {
                return null;
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
    title: CV.i18n('app-versions.title'),
    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/analytics/technology/versions",
    component: AppVersionView
});

