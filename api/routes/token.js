/**
 * Token management routes (/i/token, /o/token).
 * Migrated from the legacy switch/case in requestProcessor.js.
 * @module api/routes/token
 */

const express = require('express');
const router = express.Router();
const common = require('../utils/common.js');
const { validateUser } = require('../utils/rights.js');
const authorize = require('../utils/authorizer.js');

// --- Write endpoints: /i/token ---

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
router.all('/i/token/delete', (req, res) => {
    const params = req.countlyParams;
    validateUser(() => {
        if (params.qstring.tokenid) {
            common.db.collection("auth_tokens").remove({
                "_id": params.qstring.tokenid,
                "owner": params.member._id + ""
            }, function(err, result) {
                if (err) {
                    common.returnMessage(params, 404, err.message);
                }
                else {
                    common.returnMessage(params, 200, result);
                }
            });
        }
        else {
            common.returnMessage(params, 404, "Token id not provided");
        }
    }, params);
});

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
 *  "result": "Missing parameter \"api_key\" or \"auth_token\""
 * }
*/
router.all('/i/token/create', (req, res) => {
    const params = req.countlyParams;
    validateUser(params, () => {
        let ttl, multi, endpoint, purpose, apps;
        if (params.qstring.ttl) {
            ttl = parseInt(params.qstring.ttl);
        }
        else {
            ttl = 1800;
        }
        multi = true;
        if (params.qstring.multi === false || params.qstring.multi === 'false') {
            multi = false;
        }
        apps = params.qstring.apps || "";
        if (params.qstring.apps) {
            apps = params.qstring.apps.split(',');
        }

        if (params.qstring.endpointquery && params.qstring.endpointquery !== "") {
            try {
                endpoint = JSON.parse(params.qstring.endpointquery); //structure with also info for qstring params.
            }
            catch (ex) {
                if (params.qstring.endpoint) {
                    endpoint = params.qstring.endpoint.split(',');
                }
                else {
                    endpoint = "";
                }
            }
        }
        else if (params.qstring.endpoint) {
            endpoint = params.qstring.endpoint.split(',');
        }

        if (params.qstring.purpose) {
            purpose = params.qstring.purpose;
        }
        authorize.save({
            db: common.db,
            ttl: ttl,
            multi: multi,
            owner: params.member._id + "",
            app: apps,
            endpoint: endpoint,
            purpose: purpose,
            callback: (err, token) => {
                if (err) {
                    common.returnMessage(params, 404, err);
                }
                else {
                    common.returnMessage(params, 200, token);
                }
            }
        });
    });
});

// Default for /i/token
router.all('/i/token', (req, res) => {
    const params = req.countlyParams;
    common.returnMessage(params, 400, 'Invalid path, must be one of /delete or /create');
});

// --- Read endpoints: /o/token ---

router.all('/o/token/check', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.token) {
        common.returnMessage(params, 400, 'Missing parameter "token"');
        return false;
    }

    validateUser(params, function() {
        authorize.check_if_expired({
            token: params.qstring.token,
            db: common.db,
            callback: (err, valid, time_left) => {
                if (err) {
                    common.returnMessage(params, 404, err.message);
                }
                else {
                    common.returnMessage(params, 200, {
                        valid: valid,
                        time: time_left
                    });
                }
            }
        });
    });
});

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
 *        }
 *    ]
 * }
 *
 * @apiErrorExample {json} Error-Response:
 * HTTP/1.1 400 Bad Request
 * {
 *  "result": "Missing parameter \"api_key\" or \"auth_token\""
 * }
*/
router.all('/o/token/list', (req, res) => {
    const params = req.countlyParams;
    validateUser(params, function() {
        common.db.collection("auth_tokens").find({"owner": params.member._id + ""}).toArray(function(err, result) {
            if (err) {
                common.returnMessage(params, 404, err.message);
            }
            else {
                common.returnMessage(params, 200, result);
            }
        });
    });
});

// Default for /o/token
router.all('/o/token', (req, res) => {
    const params = req.countlyParams;
    common.returnMessage(params, 400, 'Invalid path, must be one of /list');
});

module.exports = router;
