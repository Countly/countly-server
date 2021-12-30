/* global countlyVue, $, CV, countlyAuth, app, countlyHeatmaps countlyGlobal countlyCommon countlyTokenManager moment */
(function() {
    var FEATURE_NAME = "heatmaps";

    var displayDomains = function() {
        var domains = [];
        var dd = this.$store.getters["countlyHeatmaps/domains"] || [];
        for (var k = 0; k < dd.length; k++) {
            domains.push({"value": countlyCommon.decode(dd[k]), "label": countlyCommon.decode(dd[k])});
        }
        return domains;
    };

    var getExportQuery = function() {
        var requestPath = countlyCommon.API_PARTS.data.r + "/heatmaps/export?period=" + countlyCommon.getPeriodForAjax() + "&iDisplayStart=0&app_id=" + countlyCommon.ACTIVE_APP_ID + '&api_key=' + countlyGlobal.member.api_key;
        var segment = this.$store.getters['countlyHeatmaps/selectedSegment'];
        var segmentValue = this.$store.getters['countlyHeatmaps/selectedSegmentValue'];
        if (segment && segment !== "" && segmentValue && segmentValue !== "") {
            requestPath += "&segment=" + segment;
            requestPath += "&segmentVal=" + segmentValue;
        }
        var apiQueryData = {
            api_key: countlyGlobal.member.api_key,
            app_id: countlyCommon.ACTIVE_APP_ID,
            path: requestPath,
            method: "GET",
            filename: "Views" + countlyCommon.ACTIVE_APP_ID + "_on_" + moment().format("DD-MMM-YYYY"),
            prop: ['aaData'],
            "url": "/o/export/requestQuery"
        };
        return apiQueryData;
    };

    var viewActionMapClick = function(url, viewid, domain) {
        var self = this;
        if (domain) {
            url = url.replace("#/analytics/views/action-map/", "");
            url = domain + url;
        }
        var newWindow = window.open("");
        countlyTokenManager.createToken("View heatmap", "/o/actions", true, countlyCommon.ACTIVE_APP_ID, 1800, function(err, token) {
            self.token = token && token.result;
            if (self.token) {
                newWindow.name = "cly:" + JSON.stringify({"token": self.token, "purpose": "heatmap", period: countlyCommon.getPeriodForAjax(), showHeatMap: true, app_key: countlyCommon.ACTIVE_APP_KEY, url: window.location.protocol + "//" + window.location.host});
            }
        });
    };

    var showActionsMapColumn = function() {
        var domains = this.$store.getters["countlyHeatmaps/domains"];
        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web" && (domains.length || countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].app_domain && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].app_domain.length > 0)) {
            this.showActionMapColumn = true;
        }
    };

    var ClicksTable = countlyVue.views.create({
        template: CV.T("/heatmaps/templates/clicks-table.html"),
        data: function() {
            return {
                remoteTableDataSource: countlyVue.vuex.getServerDataSource(this.$store, "countlyHeatmaps", "heatmapsClickTable"),
                showActionMapColumn: false,
                heatmapsClicksPersistKey: "heatmaps_clicks_table_" + countlyCommon.ACTIVE_APP_ID,
            };
        },
        mounted: function() {
            var self = this;
            this.$store.dispatch("countlyHeatmaps/loadDomains").then(function() {
                self.showActionsMapColumn();
            });
        },
        methods: {
            showActionsMapColumn: showActionsMapColumn,
            viewActionMapClick: viewActionMapClick,
            getExportQuery: getExportQuery
        },
        computed: {
            domains: displayDomains
        },
    });

    var ScrollsTable = countlyVue.views.create({
        template: CV.T("/heatmaps/templates/scroll-table.html"),
        data: function() {
            return {
                remoteTableDataSource: countlyVue.vuex.getServerDataSource(this.$store, "countlyHeatmaps", "heatmapsScrollTable"),
                showActionMapColumn: false,
                heatmapsScrollsPersistKey: "heatmaps_scrolls_table_" + countlyCommon.ACTIVE_APP_ID,
            };
        },
        mounted: function() {
            var self = this;
            this.$store.dispatch("countlyHeatmaps/loadDomains").then(function() {
                self.showActionsMapColumn();
            });
        },
        methods: {
            showActionsMapColumn: showActionsMapColumn,
            viewActionMapClick: viewActionMapClick,
            getExportQuery: getExportQuery
        },
        computed: {
            domains: displayDomains
        },
    });

    var Heatmaps = countlyVue.views.create({
        template: CV.T("/heatmaps/templates/index.html"),
        data: function() {
            return {
                currentTab: 'clicks',
                platform: ''
            };
        },
        mounted: function() {
            this.$store.dispatch("countlyHeatmaps/loadMetrics");
        },
        methods: {
        },
        computed: {
            selectedPlatform: {
                get: function() {
                    return this.platform;
                },
                set: function(val) {
                    this.platform = val;
                    this.$store.dispatch("countlyHeatmaps/setSelectedSegmentValue", val);
                    if (this.currentTab === 'clicks') {
                        this.$store.dispatch("countlyHeatmaps/fetchHeatmapsClickTable");
                    }
                    else if (this.currentTab === 'scrolls') {
                        this.$store.dispatch("countlyHeatmaps/fetchHeatmapsScrollTable");
                    }
                },
                cache: false
            },
            metrics: function() {
                var metrics = this.$store.getters["countlyHeatmaps/metrics"];
                return metrics;
            },
            platforms: function() {
                return [{
                    name: "All",
                    value: ''
                }].concat(this.$store.getters["countlyHeatmaps/platforms"].map(function(p) {
                    return {
                        name: p,
                        value: p
                    };
                }));
            },
            tabs: function() {
                return [
                    {
                        title: this.i18n('heatmaps.clicks'),
                        name: "clicks",
                        component: ClicksTable
                    },
                    {
                        title: this.i18n('heatmaps.scrolls'),
                        name: "scrolls",
                        component: ScrollsTable
                    }
                ];
            }
        },
    });

    var getMainView = function() {
        var templates = [];
        return new countlyVue.views.BackboneWrapper({
            component: Heatmaps,
            vuex: [{
                clyModel: countlyHeatmaps
            }],
            templates: templates
        });
    };
    if (countlyAuth.validateRead(FEATURE_NAME)) {
        app.route("/analytics/heatmaps", "heatmaps", function() {
            var view = getMainView();
            this.renderWhenReady(view);
        });
        $(document).ready(function() {
            app.addSubMenu("analytics", { code: "heatmaps", url: "#/analytics/heatmaps", text: "heatmaps.title", priority: 80 });
        });
    }
})();