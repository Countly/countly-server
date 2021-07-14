/* global countlyVue,CV,countlyCommon*/
var AppResolutionView = countlyVue.views.create({
    template: CV.T("/core/app-resolution/templates/app-resolution.html"),
    data: function() {
        return {
            description: CV.i18n('resolutions.description')
        };
    },
    mounted: function() {
        this.$store.dispatch('countlyDevicesAndTypes/fetchResolution');
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlyDevicesAndTypes/fetchResolution');
        }
    },
    computed: {
        appResolution: function() {
            return this.$store.state.countlyDevicesAndTypes.appResolution;
        },
        pieOptionsNew: function() {
            var self = this;
            return {
                series: [
                    {
                        name: CV.i18n('common.table.new-users'),
                        data: self.appResolution.pie["newUsers"],
                        label: {
                            formatter: function() {
                                return CV.i18n('common.table.new-users') + " " + countlyCommon.getShortNumber(self.appResolution.totals["newUsers"] || 0);
                            }
                        },
                        center: ["25%", "50%"] //Center should be passed as option
                    }
                ]
            };
        },
        pieOptionsTotal: function() {
            var self = this;
            return {
                series: [
                    {
                        name: CV.i18n('common.table.total-sessions'),
                        data: self.appResolution.pie["totalSessions"],
                        label: {
                            formatter: function() {
                                return CV.i18n('common.table.total-sessions') + " " + countlyCommon.getShortNumber(self.appResolution.totals["totalSessions"]);
                            }
                        },
                        center: ["25%", "50%"] //Center should be passed as option
                    }
                ]
            };
        },
        appResolutionRows: function() {
            return this.appResolution.table || [];
        },
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.isLoading;
        }
    }
});



countlyVue.container.registerTab("/analytics/technology", {
    priority: 3,
    name: "resolutions",
    title: "App resolution",
    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/analytics/technology/resolutions",
    component: AppResolutionView
});

