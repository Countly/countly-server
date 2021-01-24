/*global $, countlyCommon, _, countlyVue */

(function(countlyVueExample) {

    countlyVueExample.factory = {
        getEmpty: function(fields) {
            fields = fields || {};
            var original = {
                _id: null,
                name: '',
                field1: '',
                field2: '',
                description: '',
                status: false,
                selectedProps: [],
                visibility: 'private'
            };
            return _.extend(original, fields);
        }
    };

    countlyVueExample.getVuexModule = function() {

        var getEmptyState = function() {
            return {
                graphPoints: [],
                pieData: {
                    "dp": [
                        {"data": [[0, 20]], "label": "Test1", "color": "#52A3EF"},
                        {"data": [[0, 10]], "label": "Test2", "color": "#FF8700"},
                        {"data": [[0, 50]], "label": "Test3", "color": "#0EC1B9"}
                    ]
                },
                lineData: {
                    "dp": [
                        {"data": [[-1, null], [0, 20], [1, 10], [2, 40], [3, null]], "label": "Value", "color": "#52A3EF"},
                    ],
                    "ticks": [[-1, ""], [0, "Test1"], [1, "Test2"], [2, "Test3"], [3, ""]]
                },
                barData: {
                    "dp": [
                        {"data": [[-1, null], [0, 20], [1, 10], [2, 40], [3, null]], "label": "Value", "color": "#52A3EF"},
                    ],
                    "ticks": [[-1, ""], [0, "Test1"], [1, "Test2"], [2, "Test3"], [3, ""]]
                }
            };
        };

        var getters = {
            pieData: function(state) {
                return state.pieData;
            },
            barData: function(state) {
                return state.barData;
            },
            lineData: function(state) {
                return state.lineData;
            },
            graphPoints: function(state) {
                return state.graphPoints;
            }
        };

        var actions = {
            initialize: function(context) {
                context.dispatch("refresh");
            },
            refresh: function(context) {
                context.dispatch("countlyVueExample/myRecords/fetchAll", null, {root: true});
                context.dispatch("fetchGraphPoints");
            },
            fetchGraphPoints: function(context) {
                return $.when($.ajax({
                    type: "GET",
                    url: countlyCommon.API_URL + "/o",
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        method: 'get-random-numbers'
                    }
                })).then(function(obj) {
                    context.commit("setGraphPoints", [obj, obj.map(function(x) {
                        return x / 2;
                    })]);
                });
            }
        };

        var mutations = {
            setGraphPoints: function(state, val) {
                state.graphPoints = val;
            }
        };

        // Paged Resource

        var tooManyRecordsResource = countlyVue.vuex.Module("tooManyRecords", {
            state: function() {
                return {
                    paged: {
                        rows: []
                    },
                    requestParams: {}
                };
            },
            getters: {
                paged: function(state) {
                    return state.paged;
                }
            },
            mutations: {
                setPaged: function(state, val) {
                    state.paged = val;
                },
                setRequestParams: function(state, val) {
                    state.requestParams = val;
                }
            },
            actions: {
                fetchPaged: function(context) {
                    return $.when($.ajax({
                        type: "GET",
                        url: countlyCommon.API_URL + "/o",
                        data: {
                            app_id: countlyCommon.ACTIVE_APP_ID,
                            method: 'large-col',
                            table_params: JSON.stringify(context.state.requestParams)
                        }
                    }))
                        .then(function(res) {
                            context.commit("setPaged", res);
                        })
                        .catch(function() {
                            context.commit("setPaged", {
                                rows: [],
                                totalRows: 0,
                                notFilteredTotalRows: 0
                            });
                        });
                }
            }
        });

        var recordsResource = countlyVue.vuex.Module("myRecords", {
            state: function() {
                return {
                    all: []
                };
            },
            getters: {
                all: function(state) {
                    return state.all;
                }
            },
            mutations: {
                setAll: function(state, val) {
                    state.all = val;
                }
            },
            actions: {
                save: function(context, record) {
                    return $.when($.ajax({
                        type: "POST",
                        url: countlyCommon.API_PARTS.data.w + "/vue_example/save",
                        data: {
                            "app_id": countlyCommon.ACTIVE_APP_ID,
                            "record": JSON.stringify(record)
                        },
                        dataType: "json"
                    }));
                },
                remove: function(context, id) {
                    return $.when($.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.w + "/vue_example/delete",
                        data: {
                            "app_id": countlyCommon.ACTIVE_APP_ID,
                            "id": id
                        },
                        dataType: "json"
                    }));
                },
                status: function(context, updates) {
                    return $.when($.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.w + "/vue_example/status",
                        data: {
                            "app_id": countlyCommon.ACTIVE_APP_ID,
                            "records": JSON.stringify(updates)
                        },
                        dataType: "json"
                    }));
                },
                fetchAll: function(context) {
                    return $.when($.ajax({
                        type: "GET",
                        url: countlyCommon.API_URL + "/o",
                        data: {
                            app_id: countlyCommon.ACTIVE_APP_ID,
                            method: 'vue-records'
                        }
                    })).then(function(res) {
                        context.commit("setAll", res);
                    });
                },
                fetchSingle: function(context, id) {
                    return $.when($.ajax({
                        type: "GET",
                        url: countlyCommon.API_URL + "/o",
                        data: {
                            app_id: countlyCommon.ACTIVE_APP_ID,
                            method: 'vue-records',
                            id: id
                        }
                    })).then(function(records) {
                        return records[0];
                    });
                }
            }
        });

        var table = countlyVue.vuex.MutableTable("table", {
            sourceRows: function(_state, _getters, _rootState, _rootGetters) {
                return _rootGetters["countlyVueExample/myRecords/all"] || [];
            },
            trackedFields: ["status"],
            keyFn: function(row) {
                return row._id;
            }
        });

        return countlyVue.vuex.Module("countlyVueExample", {
            state: getEmptyState,
            getters: getters,
            actions: actions,
            mutations: mutations,
            submodules: [recordsResource, tooManyRecordsResource, table]
        });
    };

})(window.countlyVueExample = window.countlyVueExample || {});