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
            }
        };

        var actions = {
            initialize: function(context) {
                context.dispatch("refresh");
            },
            refresh: function(context) {
                context.dispatch("countlyVueExample/myRecords/fetchAll", null, {root: true});
                context.dispatch("countlyVueExample/timeGraph/fetchPoints", null, {root: true});
            }
        };

        var recordsCRUD = countlyVue.vuex.CRUD("myRecords", {
            writes: {
                save: {
                    refresh: ["all"],
                    handler: function(context, record) {
                        return $.when($.ajax({
                            type: "POST",
                            url: countlyCommon.API_PARTS.data.w + "/vue_example/save",
                            data: {
                                "app_id": countlyCommon.ACTIVE_APP_ID,
                                "record": JSON.stringify(record)
                            },
                            dataType: "json"
                        }));
                    }
                },
                delete: {
                    refresh: ["all"],
                    handler: function(context, id) {
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
                },
                single: {
                    noState: true, // no state and getters will be created for this
                    handler: function(context, id) {
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
            }
        });

        var timeGraphCRUD = countlyVue.vuex.CRUD("timeGraph", {
            reads: {
                points: function() {
                    return $.when($.ajax({
                        type: "GET",
                        url: countlyCommon.API_URL + "/o",
                        data: {
                            app_id: countlyCommon.ACTIVE_APP_ID,
                            method: 'get-random-numbers'
                        }
                    })).then(function(obj) {
                        return [obj, obj.map(function(x) {
                            return x / 2;
                        })];
                    });
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
            actions: actions,
            submodules: [recordsCRUD, timeGraphCRUD, table]
        });
    };

})(window.countlyVueExample = window.countlyVueExample || {});