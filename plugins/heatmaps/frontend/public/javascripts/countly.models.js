/*global countlyVue countlyCommon CV app countlyGlobal*/
(function(countlyHeatmaps) {

    countlyHeatmaps.factory = {
        getEmpty: function() {
            return {
                metrics: {},
                domains: [],
                platforms: [],
                selectedSegment: null,
                selectedSegmentValue: null
            };
        }
    };

    countlyHeatmaps.service = {
        getDomains: function() {
            var data = {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                period: countlyCommon.getPeriodForAjax()
            };
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + '/heatmaps/domains',
                data: data,
                dataType: "json"
            });
        },
        getMetrics: function(selectedSegment, selectedSegmentValue) {
            var data = {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                period: countlyCommon.getPeriodForAjax()
            };
            var selectedKey = selectedSegment || '';
            var selectedValue = selectedSegmentValue || '';
            if (selectedKey !== "" && selectedValue !== "") {
                data.segment = selectedKey;
                data.segmentVal = selectedValue;
            }
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + '/heatmaps/metrics',
                data: data,
                dataType: "json"
            });
        },
    };

    var onRequest = function(context) {
        var data = {
            app_id: countlyCommon.ACTIVE_APP_ID,
            visibleColumns: JSON.stringify(context.state.params.selectedDynamicCols),
            period: countlyCommon.getPeriodForAjax(),
        };
        data = data || {};
        var selectedKey = context.getters.selectedSegment || '';
        var selectedValue = context.getters.selectedSegmentValue || '';
        if (selectedKey !== "" && selectedValue !== "") {
            data.segment = selectedKey;
            data.segmentVal = selectedValue;
        }
        return {
            type: "GET",
            url: countlyCommon.API_URL + countlyCommon.API_PARTS.data.r + '/heatmaps/views',
            data: data
        };
    };
    var onError = function(context, error) {
        if (error) {
            if (error.status !== 0) { //not on canceled ones
                app.activeView.onError(error);
            }
        }
    };

    var heatmapsClickTableResource = countlyVue.vuex.ServerDataTable("heatmapsClickTable", {
        columns: ['name', 'actionLink'],
        onRequest: onRequest,
        onError: onError,
        onReady: function(context, rows) {
            for (var k = 0; k < rows.length; k++) {
                rows[k].view = rows[k].display || rows[k].view || rows[k]._id;
                rows[k].u = rows[k].uvalue || rows[k].u || 0;
                rows[k].actionLink = "unknown";
                rows[k].useDropdown = true;
                var url = "#/analytics/views/action-map/";
                if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].app_domain && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].app_domain.length > 0) {
                    url = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].app_domain;
                    if (url.indexOf("http") !== 0) {
                        url = "http://" + url;
                    }
                    if (url.substr(url.length - 1) === '/') {
                        url = url.substr(0, url.length - 1);
                    }
                    rows[k].useDropdown = false;
                }
                var link = rows[k]._id;
                if (rows[k].url) {
                    link = rows[k].url;
                }
                else if (rows[k].view) {
                    link = rows[k].view;
                }
                rows[k].actionLink = url + link;
            }
            return rows;
        }
    });

    var heatmapsScrollTableResource = countlyVue.vuex.ServerDataTable("heatmapsScrollTable", {
        columns: ['name', 'actionLink'],
        onRequest: onRequest,
        onError: onError,
        onReady: function(context, rows) {
            for (var k = 0; k < rows.length; k++) {
                rows[k].view = rows[k].display || rows[k].view || rows[k]._id;
                rows[k].u = rows[k].uvalue || rows[k].u || 0;

                if (rows[k].t > 0) {
                    var vv = parseFloat(rows[k].scr) / parseFloat(rows[k].t);
                    if (vv > 100) {
                        vv = 100;
                    }
                    rows[k].scrCalc = countlyCommon.formatNumber(vv) + "%";
                    rows[k].scrCalcInt = vv;
                }
                else {
                    rows[k].scrCalc = 0;
                    rows[k].scrCalcInt = 0;
                }
                rows[k].actionLink = "unknown";
                rows[k].useDropdown = true;
                var url = "#/analytics/views/action-map/";
                if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].app_domain && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].app_domain.length > 0) {
                    url = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].app_domain;
                    if (url.indexOf("http") !== 0) {
                        url = "http://" + url;
                    }
                    if (url.substr(url.length - 1) === '/') {
                        url = url.substr(0, url.length - 1);
                    }
                    rows[k].useDropdown = false;
                }
                var link = rows[k]._id;
                if (rows[k].url) {
                    link = rows[k].url;
                }
                else if (rows[k].view) {
                    link = rows[k].view;
                }
                rows[k].actionLink = url + link;
            }
            return rows;
        }
    });

    countlyHeatmaps.getVuexModule = function() {
        var getInitialState = function() {
            return {
                metrics: {},
                domains: [],
                platforms: [],
                selectedSegment: null,
                selectedSegmentValue: null
            };
        };

        var getters = {
            metrics: function(state) {
                return state.metrics;
            },
            domains: function(state) {
                return state.domains;
            },
            platforms: function(state) {
                return state.platforms;
            },
            selectedSegmentValue: function(state) {
                return state.selectedSegmentValue;
            },
            selectedSegment: function(state) {
                return state.selectedSegment;
            }
        };

        var mutations = {
            setMetrics: function(state, val) {
                state.metrics = val;
            },
            setDomains: function(state, val) {
                state.domains = val;
            },
            setPlatforms: function(state, val) {
                state.platforms = val;
            },
            setSelectedSegmentValue: function(state, val) {
                if (!val || val === '') {
                    state.selectedSegment = null;
                    state.selectedSegmentValue = null;
                }
                else {
                    state.selectedSegment = 'platform';
                    state.selectedSegmentValue = val;
                }

            }
        };

        var actions = {
            loadDomains: function(context) {
                return countlyHeatmaps.service.getDomains().then(function(res) {
                    if (res === 'Error') {
                        return res;
                    }
                    context.commit("setDomains", res.domains);
                    if (res.segments && res.segments.platform) {
                        context.commit("setPlatforms", res.segments.platform);
                    }
                    return res;
                });
            },
            loadMetrics: function(context) {
                return countlyHeatmaps.service.getMetrics().then(function(res) {
                    if (res === 'Error') {
                        return res;
                    }
                    context.commit('setMetrics', res);
                    return res;
                });
            },
            setSelectedSegmentValue: function(context, val) {
                context.commit('setSelectedSegmentValue', val);
            }
        };

        return countlyVue.vuex.Module("countlyHeatmaps", {
            state: getInitialState,
            actions: actions,
            mutations: mutations,
            getters: getters,
            submodules: [heatmapsClickTableResource, heatmapsScrollTableResource]
        });
    };
}(window.countlyHeatmaps = window.countlyHeatmaps || {}));