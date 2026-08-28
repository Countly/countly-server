/* global countlyCommon, jQuery*/
(function(countlyTokenManager, $) {
    //we will store our data here
    var _data = {};
    //Initializing model
    countlyTokenManager.initialize = function() {
        //returning promise
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/token/list",
            data: {},
            success: function(json) {
                //got our data, let's store it
                _data = json.result;
            },
            error: function() {
                //empty
            }
        });
    };
    //return data that we have
    countlyTokenManager.getData = function() {
        return _data;
    };

    countlyTokenManager.createToken = function(purpose, endpoint, multi, apps, ttl, callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/token/create",
            data: {
                "purpose": purpose,
                "endpoint": endpoint,
                "multi": multi,
                "apps": apps,
                "ttl": ttl
            },
            success: function(json) {
                //token created
                callback(null, json);
            },
            error: function(xhr, status, error) {
                callback(error);
            }
        });
    };

    /**
     * Create a token, optionally limited to a set of CRUD permissions.
     * @param {object} options - token options
     * @param {string} options.purpose - description of the token
     * @param {boolean} options.multi - can the token be used more than once
     * @param {number} options.ttl - seconds until the token expires, 0 never expires
     * @param {object=} options.permission - permission object limiting the token, omitted for a
     *   token that carries the creator's own permissions
     * @param {boolean=} options.canLogin - request permission to sign in to the dashboard. Granted
     *   only when the creating credential holds it and the token is not limited
     * @param {function} callback - called with (error, response)
     * @returns {object} jQuery ajax object
     */
    countlyTokenManager.createTokenWithPermissions = function(options, callback) {
        var data = {
            "purpose": options.purpose,
            "multi": options.multi,
            "ttl": options.ttl
        };
        if (options.permission) {
            data.permission = JSON.stringify(options.permission);
        }
        if (options.canLogin) {
            data.can_login = true;
        }
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/token/create",
            data: data,
            success: function(json) {
                //token created
                callback(null, json);
            },
            error: function(xhr, status, error) {
                callback(error);
            }
        });
    };

    countlyTokenManager.deleteToken = function(id, callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/token/delete",
            data: {
                "tokenid": id
            },
            success: function() {
                callback(null, true);
            },
            error: function(xhr, status, error) {
                callback(error);
            }
        });
    };

}(window.countlyTokenManager = window.countlyTokenManager || {}, jQuery));