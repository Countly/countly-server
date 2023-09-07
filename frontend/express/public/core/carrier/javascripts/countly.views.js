/* global countlyVue,CV,countlyCommon,countlyAppCarrier*/
var AppCarrierView = countlyVue.views.create({
    template: CV.T("/core/carrier/templates/carrier.html"),
    data: function() {
        return {
            description: CV.i18n('carriers.description')
        };
    },
    mounted: function() {
        this.$store.dispatch('countlyAppCarrier/fetchAll', true);
    },
    methods: {
        refresh: function(force) {
            if (force) {
                this.$store.dispatch('countlyAppCarrier/fetchAll', true);
            }
            else {
                this.$store.dispatch('countlyAppCarrier/fetchAll', false);
            }
        },
        dateChanged: function() {
            this.refresh(true);
        },
        numberFormatter: function(row, col, value) {
            return countlyCommon.formatNumber(value, 0);
        }
    },
    computed: {
        appCarrier: function() {
            return this.$store.state.countlyAppCarrier.appCarrier;
        },
        pieOptionsNew: function() {
            var self = this;
            self.appCarrier.totals = self.appCarrier.totals || {};
            return {
                series: [
                    {
                        name: CV.i18n('common.table.new-users'),
                        data: self.appCarrier.pie.newUsers,
                        label: {
                            formatter: "{a|" + CV.i18n('common.table.new-users') + "}\n" + countlyCommon.getShortNumber(self.appCarrier.totals.newUsers || 0),
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
            self.appCarrier.totals = self.appCarrier.totals || {};
            return {
                series: [
                    {
                        name: CV.i18n('common.table.total-sessions'),
                        data: self.appCarrier.pie.totalSessions,
                        label: {
                            formatter: "{a|" + CV.i18n('common.table.total-sessions') + "}\n" + countlyCommon.getShortNumber(self.appCarrier.totals.totalSessions || 0),
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
        appCarrierRows: function() {
            if (this.appCarrier && this.appCarrier.table) {
                this.appCarrier.table.forEach(function(row) {
                    row.carriers = countlyCommon.unescapeHtml(row.carriers);
                });
                return this.appCarrier.table;
            }
            return [];
        },
        topDropdown: function() {
            if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                return this.externalLinks;
            }
            else {
                return null;
            }

        },
        isLoading: function() {
            return this.$store.state.countlyAppCarrier.isLoading;
        }
    },
    mixins: [
        countlyVue.container.dataMixin({
            'externalLinks': '/analytics/carriers/links'
        })
    ]
});

countlyVue.container.registerTab("/analytics/technology", {
    type: "mobile",
    priority: 5,
    name: "carriers",
    permission: "core",
    title: CV.i18n('carriers.title'),
    route: "#/analytics/technology/carriers",
    component: AppCarrierView,
    vuex: [{
        clyModel: countlyAppCarrier
    }]
});