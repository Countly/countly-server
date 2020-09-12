/*global $, countlyCommon, Vue, _, countlyVue */

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
                visibility: 'private',
                isDetailRowShown: false
            };
            return _.extend(original, fields);
        }
    };

    countlyVueExample.getVuexModule = function() {

        var records = [];
        for (var i = 0; i < 20; i++) {
            records.push(countlyVueExample.factory.getEmpty({_id: i}));
        }

        var getEmptyState = function() {
            return {
                records: records,
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
            records: function(state) {
                return state.records;
            },
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
            saveRecord: function(state, obj) {
                if (obj._id !== null) {
                    state.records = state.records.filter(function(val) {
                        return val._id !== obj._id;
                    }).concat(obj);
                }
                else {
                    obj._id = state.id;
                    state.records.push(obj);
                    state.id++;
                }
            },
            delayedDeleteRecordById: function(state, _id) {
                var matchingRecords = state.records.filter(function(val) {
                    return val._id === _id;
                });
                if (matchingRecords.length > 0) {
                    var item = matchingRecords[0];
                    Vue.set(item, '_delayedDelete', new countlyVue.helpers.DelayedAction("You deleted a record.",
                        function() {
                            state.records = state.records.filter(function(val) {
                                return val._id !== item._id;
                            });
                        },
                        function() {
                            Vue.delete(item, '_delayedDelete');
                        }, 3000));
                }
            },
            deleteRecordById: function(state, _id) {
                state.records = state.records.filter(function(val) {
                    return val._id !== _id;
                });
            },
            toggleDetail: function(state, obj) {
                var target = state.records.filter(function(val) {
                    return val._id === obj._id;
                });
                if (target.length > 0) {
                    Vue.set(target[0], "isDetailRowShown", !target[0].isDetailRowShown);
                }
            },
            setStatus: function(state, obj) {
                var target = state.records.filter(function(val) {
                    return val._id === obj._id;
                });
                if (target.length > 0) {
                    Vue.set(target[0], "status", obj.value);
                }
            },
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

        return countlyVue.vuex.createModule("countlyVueExample", getEmptyState, {
            getters: getters,
            mutations: mutations,
            actions: actions
        });
    };

})(window.countlyVueExample = window.countlyVueExample || {});