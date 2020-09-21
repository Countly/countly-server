
/*global
    jQuery
 */

(function(hooksPlugin, jQuery) {
    var _hookList = [];
    var countlyCommon = window.countlyCommon;

    var _hookTriggers = {
        "APIEndPointTrigger": {
            name: jQuery.i18n.map["hooks.APIEndPointTrigger"],
            init: function() {
                app.localize();
                function uuidv4() {
                    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
                    );
                }
                $("#api-endpoint-trigger-uri").val(uuidv4());
                this.renderIntro();
            },
            renderConfig: function(trigger) {
                var configuration = trigger.configuration;
                $("#api-endpoint-trigger-uri").val(configuration.path);
                this.renderIntro();
            },
            getValidConfig: function() {
                var uri = $("#api-endpoint-trigger-uri").val();
                if(!uri) {
                    return null 
                }
                return {path: uri, method: 'get'};
            },
            renderIntro: function() {
                var url = window.location.protocol + "//" + window.location.host + "/o/hooks/" +  $("#api-endpoint-trigger-uri").val()
                $(".api-endpoint-intro").html(jQuery.i18n.prop("hooks.trigger-api-endpoint-intro-content", url));
            }
        },
        "InternalEventTrigger":{
            name: jQuery.i18n.map["hooks.InternalEventTrigger"],
            init: function() {
            },
            getValidConfig: function() {
            },
        }
    }

    var _hookEffects = {
        "EmailEffect": {
            name: jQuery.i18n.map["hooks.EmailEffect"],
            init: function() {
            },
            renderConfig: function(data, dom) {
                var configuration =  data.configuration;
                $(dom).find(".emaileffect-email-address").val(configuration.address);
            },
            getValidConfig: function(dom) {
                var email = $(dom).find(".emaileffect-email-address").val();
                if (!email) {
                    return null;
                }
                return {address: email}
            }
        },
        "SDKEventEffect": {
            name: jQuery.i18n.map["hooks.SDKEventEffect"],
            init: function() {
            },
        }
    }

    /**
     * get default hook triggers dictionary
     * @return {objecT} hook triggers dictionary 
     */
    hooksPlugin.getHookTriggers = function () {
        return _hookTriggers;
    }


    /**
     * get default hook effects dictionary
     * @return {objecT} hook effects dictionary
     */
    hooksPlugin.getHookEffects = function () {
        return _hookEffects;
    }

    hooksPlugin.getHookList= function getHookList() {
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

}(window.hooksPlugin = window.hooksPlugin || {}, jQuery));
