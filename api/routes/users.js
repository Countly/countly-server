/**
 * User management routes (/i/users, /o/users).
 * Migrated from the legacy switch/case in requestProcessor.js.
 * @module api/routes/users
 */

const express = require('express');
const router = express.Router();
const common = require('../utils/common.js');
const { validateUser, validateRead, validateUserForWrite, validateGlobalAdmin } = require('../utils/rights.js');
const plugins = require('../../plugins/pluginManager.ts');

const validateUserForWriteAPI = validateUser;
const validateUserForDataReadAPI = validateRead;
const validateUserForMgmtReadAPI = validateUser;
const validateUserForDataWriteAPI = validateUserForWrite;
const validateUserForGlobalAdmin = validateGlobalAdmin;

const countlyApi = {
    mgmt: {
        users: require('../parts/mgmt/users.js'),
    }
};

// Helper: parse JSON args for /i/users endpoints
function parseArgs(params) {
    if (params.qstring.args) {
        try {
            params.qstring.args = JSON.parse(params.qstring.args);
        }
        catch (SyntaxError) {
            console.log('Parse /i/users JSON failed. URL: %s, Body: %s', params.req.url, JSON.stringify(params.req.body));
        }
    }
}

// --- Write endpoints: /i/users ---

/**
 * @api {get} /i/users/create Create new user
 * @apiName Create User
 * @apiGroup User Management
 *
 * @apiDescription Access database, get collections, indexes and data
 * @apiQuery {Object} args User data object
 * @apiQuery {String} args.full_name Full name
 * @apiQuery {String} args.username Username
 * @apiQuery {String} args.password Password
 * @apiQuery {String} args.email Email
 * @apiQuery {Object} args.permission Permission object
 * @apiQuery {Boolean} args.global_admin Global admin flag
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * {
 *  "full_name":"fn",
 *  "username":"un",
 *  "email":"e@ms.cd",
 *  "permission": {
 *    "c":{},
 *    "r":{},
 *    "u":{},
 *    "d":{},
 *    "_":{
 *      "u":[[]],
 *      "a":[]
 *    }
 *  },
 *  "global_admin":true,
 *  "password_changed":0,
 *  "created_at":1651240780,
 *  "locked":false,
 *  "api_key":"1c5e93c6657d76ae8903f14c32cb3796",
 *  "_id":"626bef4cb00db29a02f8f7a0"
 * }
 *
 * @apiErrorExample {json} Error-Response:
 * HTTP/1.1 400 Bad Request
 * {
 *  "result": "Missing parameter \"app_key\" or \"device_id\""
 * }
 */
router.all('/i/users/create', (req, res) => {
    const params = req.countlyParams;
    parseArgs(params);
    validateUserForGlobalAdmin(params, countlyApi.mgmt.users.createUser);
});

/**
 * @api {get} /i/users/update Update user
 * @apiName Update User
 * @apiGroup User Management
 *
 * @apiDescription Access database, get collections, indexes and data
 * @apiQuery {Object} args User data object
 * @apiQuery {String} args.full_name Full name
 * @apiQuery {String} args.username Username
 * @apiQuery {String} args.password Password
 * @apiQuery {String} args.email Email
 * @apiQuery {Object} args.permission Permission object
 * @apiQuery {Boolean} args.global_admin Global admin flag
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * {
 *  "result":"Success"
 * }
 *
 * @apiErrorExample {json} Error-Response:
 * HTTP/1.1 400 Bad Request
 * {
 *  "result": "Missing parameter \"app_key\" or \"device_id\""
 * }
 */
router.all('/i/users/update', (req, res) => {
    const params = req.countlyParams;
    parseArgs(params);
    validateUserForGlobalAdmin(params, countlyApi.mgmt.users.updateUser);
});

/**
 * @api {get} /i/users/delete Delete user
 * @apiName Delete User
 * @apiGroup User Management
 *
 * @apiDescription Access database, get collections, indexes and data
 * @apiQuery {Object} args User data object
 * @apiQuery {String} args.user_ids IDs array for users which will be deleted
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * {
 *  "result":"Success"
 * }
 *
 * @apiErrorExample {json} Error-Response:
 * HTTP/1.1 400 Bad Request
 * {
 *  "result": "Missing parameter \"app_key\" or \"device_id\""
 * }
 */
router.all('/i/users/delete', (req, res) => {
    const params = req.countlyParams;
    parseArgs(params);
    validateUserForGlobalAdmin(params, countlyApi.mgmt.users.deleteUser);
});

router.all('/i/users/deleteOwnAccount', (req, res) => {
    const params = req.countlyParams;
    parseArgs(params);
    validateUserForGlobalAdmin(params, countlyApi.mgmt.users.deleteOwnAccount);
});

router.all('/i/users/updateHomeSettings', (req, res) => {
    const params = req.countlyParams;
    parseArgs(params);
    validateUserForGlobalAdmin(params, countlyApi.mgmt.users.updateHomeSettings);
});

router.all('/i/users/ack', (req, res) => {
    const params = req.countlyParams;
    parseArgs(params);
    validateUserForWriteAPI(countlyApi.mgmt.users.ackNotification, params);
});

// Catch-all for /i/users/* - dispatches to plugins or returns error
router.all('/i/users/:action', (req, res) => {
    const params = req.countlyParams;
    const apiPath = '/i/users';
    const paths = params.paths;
    parseArgs(params);
    if (!plugins.dispatch(apiPath, {
        params: params,
        validateUserForDataReadAPI: validateUserForDataReadAPI,
        validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
        paths: paths,
        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
        validateUserForGlobalAdmin: validateUserForGlobalAdmin
    })) {
        common.returnMessage(params, 400, 'Invalid path, must be one of /create, /update, /deleteOwnAccount or /delete');
    }
});

// --- Read endpoints: /o/users ---

router.all('/o/users/all', (req, res) => {
    const params = req.countlyParams;
    validateUserForGlobalAdmin(params, countlyApi.mgmt.users.getAllUsers);
});

router.all('/o/users/me', (req, res) => {
    const params = req.countlyParams;
    validateUserForMgmtReadAPI(countlyApi.mgmt.users.getCurrentUser, params);
});

router.all('/o/users/id', (req, res) => {
    const params = req.countlyParams;
    validateUserForGlobalAdmin(params, countlyApi.mgmt.users.getUserById);
});

router.all('/o/users/reset_timeban', (req, res) => {
    const params = req.countlyParams;
    validateUserForGlobalAdmin(params, countlyApi.mgmt.users.resetTimeBan);
});

router.all('/o/users/permissions', (req, res) => {
    const params = req.countlyParams;
    validateRead(params, 'core', function() {
        var features = ["core", "events" /* , "global_configurations", "global_applications", "global_users", "global_jobs", "global_upload" */];
        /*
            Example structure for featuresPermissionDependency Object
            {
                [FEATURE name which need other permissions]:{
                    [CRUD permission of FEATURE]: {
                        [DEPENDENT_FEATURE name]:[DEPENDENT_FEATURE required CRUD permissions array]
                    },
                    .... other CRUD permission if necessary
                }
            },
            {
                data_manager: Transformations:{
                    c:{
                        data_manager:['r','u']
                    },
                    r:{
                        data_manager:['r']
                    },
                    u:{
                        data_manager:['r','u']
                    },
                    d:{
                        data_manager:['r','u']
                    },
                }
            }
        */
        var featuresPermissionDependency = {};
        plugins.dispatch("/permissions/features", { params: params, features: features, featuresPermissionDependency: featuresPermissionDependency }, function() {
            common.returnOutput(params, {features, featuresPermissionDependency});
        });
    });
});

// Catch-all for /o/users/* - dispatches to plugins or returns error
router.all('/o/users/:action', (req, res) => {
    const params = req.countlyParams;
    const apiPath = '/o/users';
    const paths = params.paths;
    if (!plugins.dispatch(apiPath, {
        params: params,
        validateUserForDataReadAPI: validateUserForDataReadAPI,
        validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
        paths: paths,
        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
        validateUserForGlobalAdmin: validateUserForGlobalAdmin
    })) {
        common.returnMessage(params, 400, 'Invalid path, must be one of /all or /me');
    }
});

module.exports = router;
