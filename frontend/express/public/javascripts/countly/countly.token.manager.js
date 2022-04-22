/* global countlyCommon, jQuery*/
(function(countlyTokenManager, $) {
    //we will store our data here

    /**
     * @api {get} /o/token/list
     * @apiName initialize
     * @apiGroup TokenManager
     *
     * @apiDescription Returns active tokens as an array that uses tokens in order to protect the API key
     * @apiQuery {String} app_id, App Id of related application or {String} auth_token
     * 
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     * {
     *    "result": [
     *        {
     *        "_id": "884803f9e9eda51f5dbbb45ba91fa7e2b1dbbf4b",
     *        "ttl": 0,
     *        "ends": 1650466609,
     *        "multi": false,
     *        "owner": "60e42efa5c23ee7ec6259af0",
     *        "app": "",
     *        "endpoint": [
     *            
     *        ],
     *        "purpose": "Test Token",
     *        "temporary": false
     *        },
     *        {
     *        "_id": "08976f4a2037d39a9e8a7ada8afe1707769b7878",
     *        "ttl": 1,
     *        "ends": 1650632001,
     *        "multi": true,
     *        "owner": "60e42efa5c23ee7ec6259af0",
     *        "app": "",
     *        "endpoint": "",
     *        "purpose": "LoggedInAuth",
     *        "temporary": false
     *        }
     *    ]
     * }
     * 
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 400 Bad Request
     * {
     *  "result": "Missing parameter "api_key" or "auth_token""
     * }
    */
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

    /**
     * @api {get} /i/token/create
     * @apiName createToken
     * @apiGroup TokenManager
     *
     * @apiDescription Creates spesific token
     * @apiQuery {String} purpose, Purpose is description of the created token
     * @apiQuery {Array} endpointquery, Includes "params" and  "endpoint" inside
     * {"params":{qString Key: qString Val}
     * "endpoint": "_endpointAdress"
     * @apiQuery {Boolean} multi, Defines availability multiple times
     * @apiQuery {Boolean} apps, App Id of selected application
     * @apiQuery {Boolean} ttl, expiration time for token
     * 
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     * {
     *    "result": "0e1c012f855e7065e779b57a616792fb5bd03834"
     * }
     * 
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 400 Bad Request
     * {
     *  "result": "Missing parameter "api_key" or "auth_token""
     * }
    */

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
     * @api {get} /i/token/create
     * @apiName createTokenWithQuery
     * @apiGroup TokenManager
     *
     * @apiDescription Creates spesific token
     * @apiQuery {String} purpose, Purpose is description of the created token
     * @apiQuery {Array} endpointquery, Includes "params" and  "endpoint" inside
     * {"params":{qString Key: qString Val}
     * "endpoint": "_endpointAdress"
     * @apiQuery {Boolean} multi, Defines availability multiple times
     * @apiQuery {Boolean} apps, App Id of selected application
     * @apiQuery {Boolean} ttl, expiration time for token
     * 
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     * {
     *    "result": "0e1c012f855e7065e779b57a616792fb5bd03834"
     * }
     * 
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 400 Bad Request
     * {
     *  "result": "Missing parameter "api_key" or "auth_token""
     * }
    */

    countlyTokenManager.createTokenWithQuery = function(purpose, endpoint, multi, apps, ttl, callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/token/create",
            data: {
                "purpose": purpose,
                "endpointquery": endpoint,
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
     * @api {get} /i/token/delete
     * @apiName deleteToken
     * @apiGroup TokenManager
     *
     * @apiDescription Deletes related token that given id
     * @apiQuery {String} tokenid, Token id to be deleted
     *
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     * {
     *    "result": {
     *      "result": {
     *       "n": 1,
     *       "ok": 1
     *       },
     *       "connection": {
     *       "_events": {},
     *       "_eventsCount": 4,
     *       "id": 4,
     *       "address": "127.0.0.1:27017",
     *       "bson": {},
     *       "socketTimeout": 999999999,
     *       "host": "localhost",
     *       "port": 27017,
     *       "monitorCommands": false,
     *       "closed": false,
     *       "destroyed": false,
     *       "lastIsMasterMS": 15
     *       },
     *       "deletedCount": 1,
     *       "n": 1,
     *       "ok": 1
     *     }
     * }
     * 
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 400 Bad Request
     * {
     *    "result": "Token id not provided"
     * }
    */

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