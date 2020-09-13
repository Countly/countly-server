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
                randomNumbers: [],
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
                },
                id: 0
            };
        };

        var getters = {
            randomNumbers: function(state) {
                return state.randomNumbers;
            },
            pieData: function(state) {
                return state.pieData;
            },
            barData: function(state) {
                return state.barData;
            },
            lineData: function(state) {
                return state.lineData;
            }
        };

        var mutations = {
            setRandomNumbers: function(state, obj) {
                state.randomNumbers = [obj, obj.map(function(x) {
                    return x / 2;
                })];
            }
        };

        var actions = {
            initialize: function(context) {
                context.dispatch("refresh");
            },
            refresh: function(context) {
                context.dispatch("updateRandomArray");
            },
            updateRandomArray: function(context) {
                return $.when($.ajax({
                    type: "GET",
                    url: countlyCommon.API_URL + "/o",
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        method: 'get-random-numbers'
                    }
                })).then(function(json) {
                    context.commit("setRandomNumbers", json);
                }, function() {
                    /* handle error */
                });
            }
        };

        var crud = countlyVue.vuex.CRUD("myRecords", {
            writes: {
                create: function(record) {
                    return $.when($.ajax({
                        type: "POST",
                        url: countlyCommon.API_PARTS.data.w + "/vue_example/save",
                        data: {
                            "app_id": countlyCommon.ACTIVE_APP_ID,
                            "metric": JSON.stringify(record)
                        },
                        dataType: "json"
                    }));
                },
                update: function(record) {
                    return $.when($.ajax({
                        type: "POST",
                        url: countlyCommon.API_PARTS.data.w + "/vue_example/save",
                        data: {
                            "app_id": countlyCommon.ACTIVE_APP_ID,
                            "metric": JSON.stringify(record)
                        },
                        dataType: "json"
                    }));
                },
                delete: function(id) {
                    return $.when($.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.w + "/vue_example/delete",
                        data: {
                            "app_id": countlyCommon.ACTIVE_APP_ID,
                            "id": id
                        },
                        dataType: "json"
                    }));
                }
            },
            reads: {
                all: function() {
                    return $.when($.ajax({
                        type: "GET",
                        url: countlyCommon.API_URL + "/o",
                        data: {
                            app_id: countlyCommon.ACTIVE_APP_ID,
                            method: 'vue-records'
                        }
                    }));
                }
            }
        });

        var table = countlyVue.vuex.DataTable("table", {
            source: "countlyVueExample/myRecords/all",
            keyFn: function(row) {
                return row._id;
            }
        });

        return countlyVue.vuex.Module("countlyVueExample", {
            resetFn: getEmptyState,
            getters: getters,
            mutations: mutations,
            actions: actions,
            submodules: [crud, table]
        });
    };

})(window.countlyVueExample = window.countlyVueExample || {});