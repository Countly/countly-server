/* globals countlyCommon, jQuery, app */
(function(countlyRemoteConfig, $) {

    var _parameters = [],
        _conditions = [];

    countlyRemoteConfig.initialize = function() {
        return $.when(
            $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "remote-config",
                },
                dataType: "json",
                success: function(data) {
                    _parameters = data ? data.parameters || [] : [];
                    _conditions = data ? data.conditions || [] : [];
                }
            })
        );
    };

    countlyRemoteConfig.createParameter = function(settings, callback) {
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/remote-config/add-parameter",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "parameter": JSON.stringify(settings)
            },
            dataType: "json",
            success: function() {
                var hasConditions = settings && settings.conditions && Array.isArray(settings.conditions) && settings.conditions.length > 0;
                app.recordEvent({
                    "key": "remote-config-create",
                    "count": 1,
                    "segmentation": {has_conditions: hasConditions}
                });
                return callback();
            }
        });
    };

    countlyRemoteConfig.addCompleteConfig = function(settings, callback) {
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/remote-config/add-complete-config",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "config": JSON.stringify(settings)
            },
            dataType: "json",
            success: function() {
                return callback();
            }
        });
    };

    countlyRemoteConfig.removeParameter = function(parameterId, callback) {
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/remote-config/remove-parameter",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "parameter_id": parameterId
            },
            dataType: "json",
            success: function(res) {
                callback(res);
            }
        });
    };

    countlyRemoteConfig.updateParameter = function(parameterId, settings, callback) {
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/remote-config/update-parameter",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "parameter_id": parameterId,
                "parameter": JSON.stringify(settings)
            },
            dataType: "json",
            success: function(res) {
                callback(res);
            }
        });
    };

    countlyRemoteConfig.returnParameters = function() {
        return _parameters;
    };

    countlyRemoteConfig.getParameter = function(parameterId) {
        var parameter = {};
        for (var i = 0; i < _parameters.length; i++) {
            if (_parameters[i]._id === parameterId) {
                parameter = _parameters[i];
                break;
            }
        }

        return parameter;
    };

    countlyRemoteConfig.createCondition = function(settings, callback) {
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/remote-config/add-condition",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "condition": JSON.stringify(settings)
            },
            dataType: "json",
            success: function(res) {
                return callback(res);
            }
        });
    };

    countlyRemoteConfig.removeCondition = function(conditionId, callback) {
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/remote-config/remove-condition",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "condition_id": conditionId
            },
            dataType: "json",
            success: function(res) {
                callback(res);
            }
        });
    };

    countlyRemoteConfig.updateCondition = function(conditionId, settings, callback) {
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/remote-config/update-condition",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "condition_id": conditionId,
                "condition": JSON.stringify(settings)
            },
            dataType: "json",
            success: function(res) {
                callback(res);
            }
        });
    };

    countlyRemoteConfig.getConditions = function() {
        return _conditions;
    };

    countlyRemoteConfig.getCondition = function(conditionId) {
        var condition = {};
        for (var i = 0; i < _conditions.length; i++) {
            if (_conditions[i]._id === conditionId) {
                condition = _conditions[i];
                break;
            }
        }

        return condition;
    };

}(window.countlyRemoteConfig = window.countlyRemoteConfig || {}, jQuery));