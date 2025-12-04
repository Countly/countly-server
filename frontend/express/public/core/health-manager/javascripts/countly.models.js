/*global $, countlyCommon, countlyVue, CV, CountlyHelpers*/
(function(countlyHealthManager) {
    var fetchMutationStatus = function(filters) {
        var data = {
            "preventRequestAbort": true
        };

        if (filters) {
            if (filters.status && filters.status !== 'all') {
                data.status = filters.status;
            }
            if (filters.db && filters.db !== 'all') {
                data.db = filters.db;
            }
            if (filters.collection && filters.collection !== 'all') {
                data.collection = filters.collection;
            }
            if (filters.type && filters.type !== 'all') {
                data.type = filters.type;
            }
        }

        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + '/system/observability',
            dataType: "json",
            data: data
        }).then(function(res) {
            return res;
        });
    };

    var fetchAggregatorStatus = function() {
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

    var fetchKafkaStatus = function() {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + '/system/kafka',
            dataType: "json",
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID,
                "preventRequestAbort": true
            },
            error: function(/*xhr, status, error*/) {
                // Kafka stats may not be available if Kafka is not enabled
            }
        });
    };

    countlyHealthManager.fetchMutationStatus = function(filters) {
        return fetchMutationStatus(filters);
    };

    countlyHealthManager.fetchAggregatorStatus = function() {
        return fetchAggregatorStatus();
    };

    countlyHealthManager.fetchKafkaStatus = function() {
        return fetchKafkaStatus();
    };

    countlyHealthManager.getAggregatorVuex = function() {
        var getInitialState = function() {
            return { };
        };

        var actions = {
            fetchData: function() {
                return fetchAggregatorStatus().then(function() {
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
        return countlyVue.vuex.Module("countlyHealthManager", {
            state: getInitialState,
            actions: actions,
            mutations: mutations,
        });
    };
}(window.countlyHealthManager = window.countlyHealthManager || {}));
