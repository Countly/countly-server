/*global countlyVue, $, countlyCommon, CV, CountlyHelpers*/
(function(countlyAggregationManager) {
    countlyAggregationManager.fetchData = function() {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + '/system/aggregator',
            dataType: "json",
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID,
                "preventRequestAbort": true
            },
            error: function(/*xhr, status, error*/) {
                // TODO: handle error
            }
        });
    };

    countlyAggregationManager.getVuexModule = function() {
        var getInitialState = function() {
            return { };
        };

        var fetchData = function() {
            return $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + '/system/aggregator',
                dataType: "json",
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    "preventRequestAbort": true
                },
                error: function(/*xhr, status, error*/) {
                    // TODO: handle error
                }
            });
        };

        var actions = {
            fetchData: function() {
                return fetchData.then(function() {
                    return true;
                }).catch(function() {
                    CountlyHelpers.notify({
                        message: CV.i18n('management.preset.created.error'),
                        type: "error"
                    });
                    return false;
                });
            },
        };

        var mutations = {

        };
        return countlyVue.vuex.Module("countlyAppManagement", {
            state: getInitialState,
            actions: actions,
            mutations: mutations,
        });
    };
}(window.countlyAggregationManager = window.countlyAggregationManager || {}));


