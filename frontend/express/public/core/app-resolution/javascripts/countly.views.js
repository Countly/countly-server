/* global countlyVue,CV,countlyCommon*/
var AppResolutionView = countlyVue.views.create({
    template: CV.T("/core/app-resolution/templates/app-resolution.html"),
    data: function() {
        return {
            description: CV.i18n('resolutions.description')
        };
    },
    mounted: function() {
        this.$store.dispatch('countlyDevicesAndTypes/fetchResolution', true);
    },
    methods: {
        refresh: function(force) {
            this.$store.dispatch('countlyDevicesAndTypes/fetchResolution', force);
        },
        numberFormatter: function(row, col, value) {
            return countlyCommon.formatNumber(value, 0);
        }
    },
    computed: {
        appResolution: function() {
            return this.$store.state.countlyDevicesAndTypes.appResolution;
        },
        pieOptionsNew: function() {
            var self = this;

            self.appResolution.totals = self.appResolution.totals || {};
            return {
                series: [
                    {
                        name: CV.i18n('common.table.new-users'),
                        data: self.appResolution.pie.newUsers,
                        label: {
                            formatter: "{a|" + CV.i18n('common.table.new-users') + "}\n" + countlyCommon.getShortNumber(self.appResolution.totals.newUsers || 0),
                            fontWeight: 500,
                            fontSize: 16,
                            fontFamily: "Inter",
                            lineHeight: 24,
                            rich: {
                                a: {
                                    fontWeight: "normal",
                                    fontSize: 14,
                                    lineHeight: 16
                                }
                            }
                        }
                    }
                ]
            };
        },
        pieOptionsTotal: function() {
            var self = this;
            self.appResolution.totals = self.appResolution.totals || {};
            return {
                series: [
                    {
                        name: CV.i18n('common.table.total-sessions'),
                        data: self.appResolution.pie.totalSessions,
                        label: {
                            formatter: "{a|" + CV.i18n('common.table.total-sessions') + "}\n" + (countlyCommon.getShortNumber(self.appResolution.totals.totalSessions) || 0),
                            fontWeight: 500,
                            fontSize: 16,
                            fontFamily: "Inter",
                            lineHeight: 24,
                            rich: {
                                a: {
                                    fontWeight: "normal",
                                    fontSize: 14,
                                    lineHeight: 16
                                }
                            }
                        }
                    }
                ]
            };
        },
        appResolutionRows: function() {
            return this.appResolution.table || [];
        },
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.resolutionLoading;
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
            'externalLinks': '/analytics/resolutions/links'
        })
    ]
});



countlyVue.container.registerTab("/analytics/technology", {
    priority: 3,
    permission: "core",
    name: "resolutions",
    title: CV.i18n('resolutions.title'),
    route: "#/analytics/technology/resolutions",
    dataTestId: "resolutions",
    component: AppResolutionView
});

