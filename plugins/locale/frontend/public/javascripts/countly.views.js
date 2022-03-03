/* global countlyAuth, countlyVue,CV,countlyCommon,countlyLanguage*/

var FEATURE_NAME = 'locale';
var LanguageView = countlyVue.views.create({
    template: CV.T("/locale/templates/language.html"),
    data: function() {
        return {
            description: CV.i18n('help.languages.chart')
        };
    },
    mounted: function() {
        this.$store.dispatch('countlyLanguage/fetchAll', true);
    },
    methods: {
        refresh: function(force) {
            this.$store.dispatch('countlyLanguage/fetchAll', force);
        }
    },
    computed: {
        data: function() {
            return this.$store.state.countlyLanguage.Language;
        },
        pieOptionsNew: function() {
            var self = this;
            return {
                series: [
                    {
                        name: CV.i18n('common.table.new-users'),
                        data: self.data.pie.newUsers,
                        label: {
                            formatter: "{a|" + CV.i18n('common.table.new-users') + "}\n" + countlyCommon.getShortNumber(self.data.totals.newUsers || 0),
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
            return {
                series: [
                    {
                        name: CV.i18n('common.table.total-sessions'),
                        data: self.data.pie.totalSessions,
                        label: {
                            formatter: "{a|" + CV.i18n('common.table.total-sessions') + "}\n" + countlyCommon.getShortNumber(self.data.totals.totalSessions || 0),
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
        appRows: function() {
            return this.data.table || [];
        },
        isLoading: function() {
            return this.$store.getters["countlyLanguage/isLoading"];
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
            'externalLinks': '/analytics/language/links'
        })
    ]
});
if (countlyAuth.validateRead(FEATURE_NAME)) {
    countlyVue.container.registerTab("/analytics/geo", {
        priority: 10,
        name: "languages",
        title: CV.i18n('sidebar.analytics.languages'),
        route: "#/analytics/geo/languages",
        component: LanguageView,
        vuex: [{
            clyModel: countlyLanguage
        }]
    });
}