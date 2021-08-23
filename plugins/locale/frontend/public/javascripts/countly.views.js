/* global countlyVue,CV,countlyCommon,countlyLanguage*/
var LanguageView = countlyVue.views.create({
    template: CV.T("/locale/templates/language.html"),
    data: function() {
        return {
            description: CV.i18n('help.languages.chart')
        };
    },
    mounted: function() {
        this.$store.dispatch('countlyLanguage/fetchAll');
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlyLanguage/fetchAll');
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
                            formatter: function() {
                                return CV.i18n('common.table.new-users') + " " + countlyCommon.getShortNumber(self.data.totals.newUsers || 0);
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
                            formatter: function() {
                                return CV.i18n('common.table.total-sessions') + " " + countlyCommon.getShortNumber(self.data.totals.totalSessions);
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
            return this.$store.state.countlyLanguage.isLoading;
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

countlyVue.container.registerTab("/analytics/geo", {
    priority: 5,
    name: "languages",
    title: CV.i18n('sidebar.analytics.languages'),
    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/analytics/geo/languages",
    component: LanguageView,
    vuex: [{
        clyModel: countlyLanguage
    }]
});