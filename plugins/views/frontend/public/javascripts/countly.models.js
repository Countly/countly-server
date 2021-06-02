/*global CountlyHelpers, countlyCommon, $, countlySession, jQuery, countlyGlobal, Promise, CV, countlyVue*/

(function() {
    window.countlyViews = window.countlyViews || {};
    CountlyHelpers.createMetricModel(window.countlyViews, {name: "views"}, jQuery);
    var countlyViews = window.countlyViews;
    //Private Properties
    var _actionData = {},
        _activeAppKey = 0,
        _initialized = false,
        _segment = "",
        _segmentVal = "",
        _segments = [],
        _domains = [],
        _name = "views",
        _period = null,
        _tableData = [],
        _selectedViews = [],
        _graphDataObj = {},
        _viewsCount = 0,
        _viewsNames = {};

    //graphData['appID'][]
    //Public Methods
    countlyViews.initialize = function() {
        if (_initialized && _period === countlyCommon.getPeriodForAjax() && _activeAppKey === countlyCommon.ACTIVE_APP_KEY) {
            return this.refresh();
        }

        _period = countlyCommon.getPeriodForAjax();
        this.reset();
        if (!countlyCommon.DEBUG) {
            _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
            _initialized = true;

            var selected = [];

            //load data
            for (var h = 0; h < _selectedViews.length; h++) {
                selected.push({'view': _selectedViews[h], "action": ""});
            }
            return $.when(
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "app_id": countlyCommon.ACTIVE_APP_ID,
                        "method": "get_view_segments",
                        "period": _period
                    },
                    dataType: "json",
                    success: function(json) {
                        if (json && json.segments) {
                            for (var i = 0; i < json.segments.length; i++) {
                                json.segments[i] = countlyCommon.decode(json.segments[i]);
                            }
                            _segments = json.segments;
                            _domains = json.domains;
                        }
                    }
                }),
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "app_id": countlyCommon.ACTIVE_APP_ID,
                        "method": "views",
                        "action": "get_view_count"
                    },
                    dataType: "json",
                    success: function(json) {
                        if (json && json.result) {
                            _viewsCount = json.result;
                        }
                    }
                })
            ).then(//on initialize load only after getting list of selected
                function() {
                    return $.when($.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.r,
                        data: {
                            "app_id": countlyCommon.ACTIVE_APP_ID,
                            "method": _name,
                            "period": _period,
                            "selectedViews": JSON.stringify(selected),
                            "segment": _segment,
                            "segmentVal": _segmentVal
                        },
                        dataType: "json",
                        success: function(json) {
                            if (json.data && json.appID === countlyCommon.ACTIVE_APP_ID) {
                                _graphDataObj = json.data;
                            }
                        }
                    })).then(function() {
                        return true;
                    });
                }
            );
        }
        else {
            return true;
        }
    };

    countlyViews.loadList = function(id) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": id,
                "action": "listNames",
                "method": "views",
                "list": 1,
                "preventRequestAbort": true
            },
            dataType: "json",
            success: function(json) {
                _viewsNames = {};
                if (json && json.length > 0) {
                    for (var i = 0; i < json.length; i++) {
                        _viewsNames[json[i].view] = json[i].display || json[i].view;
                    }
                }
            }
        });
    };

    if (countlyGlobal.member && countlyGlobal.member.api_key && countlyCommon.ACTIVE_APP_ID !== 0) {
        countlyViews.loadList(countlyCommon.ACTIVE_APP_ID);
    }


    /** Function gets view display name if it is set.
    * @param {string} id  - view
    * @returns {string}  - view name
    */
    countlyViews.getViewName = function(id) {
        if (_viewsNames[id]) {
            return _viewsNames[id];
        }
        return id;
    };

    /** Reverse function. Returns 'view' value from display name
    * @param {string} name  - display name
    * @returns {string}  - view value
    */
    countlyViews.getViewView = function(name) {
        for (var p in _viewsNames) {
            if (_viewsNames[p] === name) {
                return p;
            }
        }
        return name;
    };


    /** Function gets list of 'view' values from display names. Useful when searching in names
    * @param {string} name  - view display name
    * @returns {array} list if view values
    */
    countlyViews.getCodesFromName = function(name) {
        var list = [];
        for (var p in _viewsNames) {
            if (_viewsNames[p].startsWith(name)) {
                list.push(p);
            }
        }
        return list;
    };

    countlyViews.loadViewCount = function() {
        return $.when($.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "method": "views",
                "action": "get_view_count"
            },
            dataType: "json",
            success: function(json) {
                if (json && json.result) {
                    _viewsCount = json.result;
                }
            }
        })
        );
    };
    countlyViews.refresh = function() {
        if (!countlyCommon.DEBUG) {

            if (_activeAppKey !== countlyCommon.ACTIVE_APP_KEY || _period !== countlyCommon.getPeriodForAjax()) {
                _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
                this.reset();
                return this.initialize();
            }

            if (!_initialized) {
                return this.initialize();
            }

            _period = countlyCommon.getPeriodForAjax();

            var selected = [];

            //if refresh
            for (var i = 0; i < _selectedViews.length; i++) {
                if ((_segment === "" && _graphDataObj[_selectedViews[i]] && _graphDataObj[_selectedViews[i]]['_no-segment'] && _graphDataObj[_selectedViews[i]]['_no-segment'] !== {}) ||
                    (_segment !== "" && _graphDataObj[_selectedViews[i]] && _graphDataObj[_selectedViews[i]][_segment] && _graphDataObj[_selectedViews[i]][_segment] !== {})
                ) {
                    selected.push({'view': _selectedViews[i], "action": "refresh"});
                }
                else {
                    selected.push({'view': _selectedViews[i], "action": ""});
                }
            }
            return $.when(
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "app_id": countlyCommon.ACTIVE_APP_ID,
                        "method": "get_view_segments",
                        "period": _period,
                        "display_loader": false
                    },
                    dataType: "json",
                    success: function(json) {
                        if (json && json.segments) {
                            for (var z = 0; z < json.segments.length; z++) {
                                json.segments[z] = countlyCommon.decode(json.segments[z]);
                            }
                            _segments = json.segments;
                            _domains = json.domains;
                        }
                    }
                }),
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "app_id": countlyCommon.ACTIVE_APP_ID,
                        "method": _name,
                        "action": "",
                        "period": _period,
                        "selectedViews": JSON.stringify(selected),
                        "segment": _segment,
                        "segmentVal": _segmentVal
                    },
                    dataType: "json",
                    success: function(json) {
                        if (json.data && json.appID === countlyCommon.ACTIVE_APP_ID) {
                            json = json.data;
                            for (var k in json) {
                                if (_graphDataObj[k]) {
                                    for (var z in json[k]) {
                                        if (_graphDataObj[k][z]) {
                                            countlyCommon.extendDbObj(_graphDataObj[k][z], json[k][z]);
                                        }
                                        else {
                                            _graphDataObj[k][z] = json[k][z];
                                        }
                                    }

                                }
                                else {
                                    _graphDataObj[k] = json[k];
                                }
                            }
                        }
                    }
                })
            ).then(function() {
                return true;
            });
        }
        else {
            return true;
        }
    };

    countlyViews._reset = countlyViews.reset;
    countlyViews.reset = function() {
        _actionData = {};
        _segment = null;
        _segmentVal = "";
        _initialized = false;
        _segments = [];
        _domains = [];
        countlyViews._reset();
        _graphDataObj = {};
    };

    countlyViews.setSelectedViews = function(selected) {
        _selectedViews = selected;
    };
    countlyViews.setSegment = function(segment) {
        _segment = countlyCommon.decode(segment);
        _segmentVal = "";
    };

    countlyViews.setSegmentValue = function(segment) {
        _segmentVal = countlyCommon.decode(segment);
    };

    countlyViews.getSegments = function() {
        return _segments;
    };

    countlyViews.getViewsCount = function() {
        return _viewsCount;
    };

    countlyViews.getSegmentKeys = function() {
        var segments = [];
        for (var key in _segments) {
            segments.push(key);
        }
        return segments;
    };

    countlyViews.getDomains = function() {
        return _domains;
    };

    countlyViews.loadActionsData = function(view) {
        _period = countlyCommon.getPeriodForAjax();

        return $.when(
            $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "get_view_segments",
                    "period": _period
                },
                dataType: "json",
                success: function(json) {
                    if (json && json.segments) {
                        for (var i = 0; i < json.segments.length; i++) {
                            json.segments[i] = countlyCommon.decode(json.segments[i]);
                        }
                        _segments = json.segments;
                    }
                }
            }),
            $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + "/actions",
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "view": view,
                    "segment": _segment,
                    "period": _period
                },
                dataType: "json",
                success: function(json) {
                    _actionData = json;
                }
            })
        ).then(function() {
            return true;
        });
    };

    countlyViews.testUrl = function(url, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/urltest",
            data: {
                "url": url
            },
            dataType: "json",
            success: function(json) {
                if (callback) {
                    callback(json.result);
                }
            }
        });
    };

    countlyViews.getActionsData = function() {
        return _actionData;
    };

    countlyViews.getChartData = function(path, metric, name, segment, segmentVal) {
        var chartData = [
                { data: [], label: name, color: '#DDDDDD', mode: "ghost" },
                { data: [], label: name, color: '#333933' }
            ],
            dataProps = [
                {
                    name: "p" + metric,
                    func: function(dataObj) {
                        return dataObj[metric];
                    },
                    period: "previous"
                },
                { name: metric}
            ];
        if (segment === "") {
            segment = "no-segment";
        }
        var dbObj = {};
        if (_graphDataObj && _graphDataObj[path] && _graphDataObj[path][segment]) {
            dbObj = _graphDataObj[path][segment];
            if (Object.keys(dbObj).length === 0) {
                return false;
            }
        }
        return countlyCommon.extractChartData(dbObj, countlyViews.clearObject, chartData, dataProps, segmentVal);
    };

    countlyViews.getData = function() {

        var chartData = {};
        chartData.chartData = _tableData;

        var values = ["u", "t", "s", "b", "e", "d", "n", "scr"];
        for (var z = 0; z < chartData.chartData.length; z++) {
            for (var p = 0; p < values.length; p++) {
                chartData.chartData[z][values[p]] = chartData.chartData[z][values[p]] || 0;
            }

        }
        /*chartData.chartData={};
        var chartData = countlyCommon.extractTwoLevelData(countlyViews.getDb(), countlyViews.getMeta(), countlyViews.clearObject, [
            {
                name: _name,
                func: function(rangeArr) {
                    return countlyCommon.decode(rangeArr);
                }
            },
            { "name": "u" },
            { "name": "t" },
            { "name": "s" },
            { "name": "b" },
            { "name": "e" },
            { "name": "d" },
            { "name": "n" },
            { "name": "scr" }
        ]);

        chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, _name);*/

        return chartData;
    };

    countlyViews.setWidgetData = function(data) {
        countlyViews.setDb(data);
    };

    countlyViews.clearObject = function(obj) {
        if (obj) {
            if (!obj.u) {
                obj.u = 0;
            }
            if (!obj.t) {
                obj.t = 0;
            }
            if (!obj.n) {
                obj.n = 0;
            }
            if (!obj.s) {
                obj.s = 0;
            }
            if (!obj.e) {
                obj.e = 0;
            }
            if (!obj.b) {
                obj.b = 0;
            }
            if (!obj.d) {
                obj.d = 0;
            }
            if (!obj.scr) {
                obj.scr = 0;
            }
        }
        else {
            obj = {"u": 0, "t": 0, "n": 0, "s": 0, "e": 0, "b": 0, "d": 0, "scr": 0};
        }
        return obj;
    };

    countlyViews.renameViews = function(data, callback) {
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + '/views',
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "method": "rename_views",
                "data": JSON.stringify(data)
            },
            dataType: "json",
            success: function(json) {
                countlyViews.loadList(countlyCommon.ACTIVE_APP_ID); //reload views list
                if (typeof callback === "function") {
                    callback(json);
                }
            },
            error: function() {
                if (typeof callback === "function") {
                    callback(false);
                }
            }
        });
    };
    countlyViews.deleteView = function(view, callback) {
        return $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + '/views',
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "method": "delete_view",
                "view_id": view
            },
            dataType: "json",
            success: function(json) {
                countlyViews.loadList(countlyCommon.ACTIVE_APP_ID); //reload views list
                if (json && json.result) {
                    json = json.result;
                }
                if (typeof callback === "function") {
                    callback(json);
                }
            },
            error: function() {
                if (typeof callback === "function") {
                    callback(false);
                }
            }
        });
    };

})();

(function(countlyViewsPerSession) {
    countlyViewsPerSession.helpers = {
        getViewsPerSessionRange: function() {
            var visits = jQuery.i18n.map["views.visits"].toLowerCase();
            return [
                "1 - 2 " + visits,
                "3 - 5 " + visits,
                "6 - 10 " + visits,
                "11 - 15 " + visits,
                "16 - 30 " + visits,
                "31 - 50 " + visits,
                "51 - 100 " + visits,
                "> 100 " + visits
            ];
        },
        explainViewsPerSessionRange: function(index) {
            return countlyViewsPerSession.helpers.getViewsPerSessionRange()[index];
        }
    };

    countlyViewsPerSession.service = {
        mapViewsPerSessionDtoToModel: function(dto, period) {
            countlySession.setDb(dto);
            countlyCommon.setPeriod(period);
            var viewsPerSessionData = countlySession.getRangeData("vc", "v-ranges", countlyViewsPerSession.helpers.explainViewsPerSessionRange, countlyViewsPerSession.helpers.getViewsPerSessionRange());
            var viewsPerSessionModel = {
                series: [],
                rows: []
            };
            var viewsPerSessionSerieData = viewsPerSessionData.chartData.map(function(chartDataItem) {
                return chartDataItem.t;
            });
            viewsPerSessionModel.series.push({data: viewsPerSessionSerieData, label: CV.i18n("views-per-session.title")});
            viewsPerSessionData.chartData.forEach(function(chartDataItem, index) {
                viewsPerSessionModel.rows[index] = {
                    viewsBuckets: chartDataItem.vc,
                    numberOfSessions: chartDataItem.t,
                    percentage: chartDataItem.percentageNumber
                };
            });
            return viewsPerSessionModel;
        },

        fetchViewsPerSession: function(period) {
            var self = this;
            var data = {
                app_id: countlyCommon.ACTIVE_APP_ID,
                method: 'users',
            };
            if (period) {
                data.period = CountlyHelpers.getPeriodUrlQueryParameter(period);
            }
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: data,
                    dataType: "json",
                }).then(function(response) {
                    resolve(self.mapViewsPerSessionDtoToModel(response, period));
                }).catch(function(error) {
                    reject(error);
                });
            });
        }
    };

    countlyViewsPerSession.getVuexModule = function() {

        var getInitialState = function() {
            return {
                viewsPerSession: {
                    rows: [],
                    series: []
                },
                selectedDatePeriod: "day",
                viewsPerSessionDatePeriods: [],
                isLoading: false,
                hasError: false,
                error: null
            };
        };

        var viewsPerSessionActions = {
            fetchAll: function(context) {
                context.dispatch('onFetchInit');
                countlyViewsPerSession.service.fetchViewsPerSession(context.state.selectedDatePeriod)
                    .then(function(response) {
                        context.commit('setViewsPerSession', response);
                        context.dispatch('onFetchSuccess');
                    }).catch(function(error) {
                        context.dispatch('onFetchError', error);
                    });
            },
            onSetSelectedDatePeriod: function(context, period) {
                context.commit('setSelectedDatePeriod', period);
            },
            onFetchInit: function(context) {
                context.commit('setFetchInit');
            },
            onFetchError: function(context, error) {
                context.commit('setFetchError', error);
            },
            onFetchSuccess: function(context) {
                context.commit('setFetchSuccess');
            },
        };

        var viewsPerSessionMutations = {
            setViewsPerSession: function(state, value) {
                state.viewsPerSession = value;
            },
            setSelectedDatePeriod: function(state, value) {
                state.selectedDatePeriod = value;
            },
            setFetchInit: function(state) {
                state.isLoading = true;
                state.hasError = false;
                state.error = null;
            },
            setFetchError: function(state, error) {
                state.isLoading = false;
                state.hasError = true;
                state.error = error;
            },
            setFetchSuccess: function(state) {
                state.isLoading = false;
                state.hasError = false;
                state.error = null;
            }
        };

        return countlyVue.vuex.Module("countlyViewsPerSession", {
            state: getInitialState,
            actions: viewsPerSessionActions,
            mutations: viewsPerSessionMutations
        });
    };
}(window.countlyViewsPerSession = window.countlyViewsPerSession || {}));