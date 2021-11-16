/*global
    jQuery, $,
 */

(function(hooksPlugin, jQuery) {
    var _hookList = [];
    var countlyCommon = window.countlyCommon;

    hooksPlugin.getHookList = function getHookList() {
        return _hookList;
    };

    hooksPlugin.getHook = function getHook(hookID) {
        for (var i = 0; i < _hookList.length; i++) {
            if (_hookList[i]._id === hookID) {
                return _hookList[i];
            }
        }
    };

    /**
	* Save hook settings
    * @param {object} hookConfig - hookConfig record
    * @param {function} callback - callback function
	*/
    hooksPlugin.saveHook = function saveHook(hookConfig, callback) {
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/hook/save",
            data: {
                "hook_config": JSON.stringify(hookConfig)
            },
            dataType: "json",
            success: function(res) {
                if (callback) {
                    callback(res);
                }
            }
        });
    };


    /**
	* request hook list
    * @param {function} callback - callback function
    * @returns {function} promise
	*/
    hooksPlugin.requestHookList = function requestHookList(callback) {
        var dfd = jQuery.Deferred();
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + '/hook/list',
            data: {},
            dataType: "json",
            success: function(data) {
                _hookList = data.hooksList;
                if (callback) {
                    callback();
                }
                dfd.resolve();
            }
        });

        return dfd.promise();
    };

    hooksPlugin.updateHookStatus = function updateHookStatus(status, callback) {
        $.ajax({
            type: "post",
            url: countlyCommon.API_PARTS.data.w + "/hook/status",
            data: {
                "status": JSON.stringify(status)
            },
            dataType: "json",
            success: function(res) {
                if (callback) {
                    callback(res);
                }
            }
        });
    };

    hooksPlugin.deleteHook = function deleteHook(hookID, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/hook/delete",
            data: {
                "hookID": hookID,
            },
            dataType: "json",
            success: function(res) {
                if (callback) {
                    callback(res);
                }
            }
        });

    };


    /**
	* load hook settings
    * @param {object} hookConfig - hookConfig record
    * @param {function} callback - callback function
	*/
    hooksPlugin.load = function load(hookConfig, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/hook/save",
            data: {
                "hook_config": JSON.stringify(hookConfig)
            },
            dataType: "json",
            success: function(res) {
                if (callback) {
                    callback(res);
                }
            }
        });
    };

    /**
     * hook mock data generator
     * @param {object} hookConfig - hookConfig record
     * @return {object} mockData - trigger related mock data
     */
    hooksPlugin.mockDataGenerator = function mockDataGenerator(hookConfig) {
        var triggerType = hookConfig && hookConfig.trigger && hookConfig.trigger.type;
        var data;

        var mockUser = {
            _id: "*****",
            name: "foobar",
            did: "****",
        };
        switch (triggerType) {
        case 'APIEndPointTrigger':
            data = {
                qstring: {"paramA": "abc", "paramB": 123, "paramC": [1, 2, 3]},
                paths: ("localhost/o/hooks/" + hookConfig.trigger.configuration.path).split("/")
            };
            break;
        case 'IncomingDataTrigger':
            data = {
                events: [
                    {
                        key: "eventA",
                        count: 1,
                        segmentation: {
                            "a": "1",
                            "b": "2",
                        }
                    },
                    {
                        key: "eventB",
                        count: 1,
                        segmentation: {
                            "a": "1",
                            "b": "2",
                        }
                    },
                ],
                user: mockUser,
            };
            break;
        case 'InternalEventTrigger':
            var eventType = hookConfig.trigger.configuration.eventType;
            data = {
                user: mockUser,
            };
            if (eventType.indexOf('cohort') >= 0) {
                data.corhort = {
                    _id: "****",
                    name: "corhort A",
                };
            }
            break;
        }
        return data;
    };

    /**
	* test hook settings
    * @param {object} hookConfig - hookConfig record
    * @param {function} callback - callback function
	*/
    hooksPlugin.testHook = function load(hookConfig, callback) {
        var mockData = hooksPlugin.mockDataGenerator(hookConfig);
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/hook/test",
            data: {
                "hook_config": JSON.stringify(hookConfig),
                "mock_data": JSON.stringify(mockData),
            },
            dataType: "json",
            success: function(res) {
                if (callback) {
                    callback(res);
                }
            }
        });
    };

}(window.hooksPlugin = window.hooksPlugin || {}, jQuery));
