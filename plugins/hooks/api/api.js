const Triggers = require('./parts/triggers/index.js');
const Effects = require('./parts/effects/index.js');
const asyncLib = require('async');
const EventEmitter = require('events');
const common = require('../../../api/utils/common.js');
const { validateRead, validateCreate, validateDelete, validateUpdate } = require('../../../api/utils/rights.js');
const plugins = require('../../pluginManager.js');
const log = common.log('hooks:api');
const _ = require('lodash');
const utils = require('./utils');
const rights = require('../../../api/utils/rights');

const FEATURE_NAME = 'hooks';

plugins.setConfigs("hooks", {
    batchActionSize: 0, // size for processing actions each time
    refreshRulesPeriod: 3000, // miliseconds to fetch hook records
    pipelineInterval: 1000, // milliseconds to batch process pipeline
    requestLimit: 0, //maximum request that can be handled in given time frame. 0 means no rate limit applied
    timeWindowForRequestLimit: 60000, //time window for request limits in milliseconds
});

global.triggerRequestCount = [];

/**
* Hooks Class definition 
*/
class Hooks {
    /**
     *  Init Hooks Configuration
     */
    constructor() {
        this._cachedRules = [];
        this._triggers = {};
        this._effects = {};
        this._queue = [];

        this.fetchRules();
        setInterval(() => {
            this.fetchRules();
        }, plugins.getConfig("hooks").refreshRulesPeriod);
        this.registerEffects();
        this.registerTriggers();

        this._queueEventEmitter = new EventEmitter();
        this._queueEventEmitter.on('push', (data) => {
            this._queue.push(data);
        });
        this._queueEventEmitter.on('pipe', () => {
            this.pipeEffects();
        });
        this._queueEventEmitter.emit("pipe");
    }

    /**
    *  Regist triggers 
    */
    registerTriggers() {
        for (let type in Triggers) {

            if (type === 'IncomingDataTrigger') {
                log.d("Skipping IncomingDataTrigger - handled in aggregator");
                continue;
            }

            const t = new Triggers[type]({
                pipeline: (data) => {
                    this._queueEventEmitter.emit('push', data);
                    plugins.dispatch("/hooks/trigger", data);
                }
            });
            this._triggers[type] = t;
        }
    }

    /**
    *  Regist effects 
    */
    registerEffects() {
        for (let type in Effects) {
            const t = new Effects[type]();
            this._effects[type] = t;
        }
    }

    /**
    *  fetch hook records from db 
    */
    async fetchRules() {

        try {
            log.d("Fetching hook rules...", process.pid);
            const self = this;
            const db = common.db;

            // Add check for database connection
            if (!db) {
                log.e("Database not available yet, will retry on next interval", process.pid);
                return;
            }

            log.d("Database connection exists, querying hooks collection", process.pid);

            let res = await db.collection("hooks").find({"enabled": true}, {error_logs: 0}).toArray();
            log.d("Fetch rules - found", res ? res.length : 0, "rules", process.pid);
            db.collection("hooks").find({"enabled": true}, {error_logs: 0}).toArray(function(err, result) {
                if (err) {
                    log.e("Fetch hook rules error:", err, process.pid);
                    return;
                }
                log.d("Fetch rules - found", result ? result.length : 0, "rules", process.pid);
                if (result) {
                //change profile group triggers to cohorts triggers. There are no events which starts with /profile-group, in reality it is just cohort events 
                    for (var z = 0; z < result.length; z++) {
                        if (result[z].trigger && result[z].trigger.type === "InternalEventTrigger" && result[z].trigger.configuration && result[z].trigger.configuration.eventType) {
                            if (result[z].trigger.configuration.eventType === "/profile-group/enter") {
                                result[z].trigger.configuration.eventType = "/cohort/enter";
                            }
                            else if (result[z].trigger.configuration.eventType === "/profile-group/exit") {
                                result[z].trigger.configuration.eventType = "/cohort/exit";
                            }
                        }
                    }
                    self._cachedRules = result;
                    log.d("Cached rules updated, calling syncRulesWithTrigger", process.pid);
                    self.syncRulesWithTrigger();
                }
                else {
                    log.d("No rules found in database", process.pid);
                }
            });
        }
        catch (e) {
            log.e("Fetch hook rules error:", e, process.pid);
        }

    }

    /**
     * sync hook record intervally
     */
    syncRulesWithTrigger() {
        for (let type in this._triggers) {
            const t = this._triggers[type];
            if (typeof t.syncRules === "function") {
                t.syncRules(this._cachedRules);
            }
        }
    }

    /**
     * process pipeline data
     */
    async pipeEffects() {
        log.d("Process::", process.pid, ":::", this._queue.length);
        try {

            let batchActionSize = plugins.getConfig("hooks").batchActionSize;
            if (batchActionSize === 0) {
                batchActionSize = 100;
            }
            log.d("chunk size:", batchActionSize);

            const chunk = this._queue.splice(0, batchActionSize);
            await asyncLib.mapLimit(chunk, batchActionSize, async(item, callback) => {
                log.d("get chunked item:", item);
                // old trigger effects logic
                if (item.effect) {
                    if (this._effects[item.effect.type]) {
                        //this._effects[item.effect.type].run(item);
                    }
                }
                else {
                    const rule = item.rule;

                    //rate limiter
                    if (utils.checkRateLimitReached(rule)) {
                        log.e("[call limit reached]", `call limit reached for ${rule._id}`);
                        utils.addErrorRecord(rule._id, `call limit reached for ${rule._id}`);
                        if (callback) {
                            callback();
                        }
                        return;
                    }

                    for (let i = 0; i < rule.effects.length; i++) {

                        item.effect = rule.effects[i];
                        item.effectStep = i;
                        item._originalInput = rule._originalInput;
                        try {
                            const result = await this._effects[item.effect.type].run(item);
                            log.d("[test trigger result]", result);
                        }
                        catch (e) {
                            log.e("[test hook trigger]", e);
                            utils.addErrorRecord(rule._id, e);
                        }
                    }
                }

                if (callback) {
                    callback();
                }
            });
        }
        catch (e) {
            log.e("[hook test error]", e);
        }

        //check periodically
        setTimeout(()=> {
            this._queueEventEmitter.emit("pipe");
        }, plugins.getConfig("hooks").pipelineInterval);
    }
}


const CheckEffectProperties = function(effect) {
    var rules = {};
    //todo: add more validation for effect types
    if (effect) {
        if (effect.type === "HTTPEffect") {
            rules.url = { 'required': true, 'type': 'URL', 'regex': '^(?!.*(?:localhost|127\\.0\\.0\\.1|\\[::1\\])).*(?:https?|ftp):\\/\\/(?:[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)+|\\[(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}\\])(?::\\d{1,5})?(?:\\/\\S*)?$' };
            rules.headers = { 'required': false, 'type': 'Object' };
        }
    }
    return rules;
};

const CheckHookProperties = function(hookConfig) {
    const rules = {
        'name': { 'required': hookConfig._id ? false : true, 'type': 'String', 'min-length': 1 },
        'description': { 'required': false, 'type': 'String', 'min-length': 0 },
        'apps': { 'required': hookConfig._id ? false : true, 'type': 'Array', 'min-length': 1 },
        'trigger': { 'required': hookConfig._id ? false : true, 'type': 'Object'},
        'effects': { 'required': hookConfig._id ? false : true, 'type': 'Array', 'min-length': 1},
        'enabled': { 'required': hookConfig._id ? false : true, 'type': 'Boolean'}
    };
    return rules;
};

plugins.register("/permissions/features", function(ob) {
    ob.features.push(FEATURE_NAME);
});

/**
* @api {post} /i/hook/save create or update hook 
* @apiName saveHook 
* @apiGroup hooks 
*
* @apiDescription create or update hook data. 
* @apiQuery {hook_config} JSON string of hook object.
* @apiQuery {String} app_id target app id of the alert.  
*
* @apiSuccessExample {text} Success-Response:
* HTTP/1.1 200 OK
*
* "6262779e46bd55a8c555cfb9"
*
*/
plugins.register("/i/hook/save", function(ob) {
    let paramsInstance = ob.params;

    validateCreate(ob.params, FEATURE_NAME, function(params) {
        let hookConfig = params.qstring.hook_config;
        if (!hookConfig) {
            common.returnMessage(params, 400, 'Invalid hookConfig');
            return true;
        }

        try {
            hookConfig = JSON.parse(hookConfig);
            hookConfig = sanitizeConfig(hookConfig);
            if (hookConfig) {
                // Null check for hookConfig
                if (!(common.validateArgs(hookConfig, CheckHookProperties(hookConfig)))) {
                    common.returnMessage(params, 400, 'Not enough args');
                    return true;
                }

                if (hookConfig.effects && !validateEffects(hookConfig.effects)) {
                    common.returnMessage(params, 400, 'Invalid configuration for effects');
                    return true;
                }

                if (hookConfig._id) {
                    const id = hookConfig._id;
                    delete hookConfig._id;
                    return common.db.collection("hooks").findAndModify(
                        { _id: common.db.ObjectID(id) },
                        {},
                        {$set: hookConfig},
                        {new: true},
                        function(err, result) {
                            if (!err) {
                                // Audit log: Hook updated
                                if (result && result.value) {
                                    common.returnOutput(params, result && result.value);
                                    plugins.dispatch("/systemlogs", {
                                        params: params,
                                        action: "hook_updated",
                                        data: {
                                            updatedHookID: result.value._id,
                                            updatedBy: params.member._id,
                                            updatedHookName: result.value.name
                                        }
                                    });
                                }
                                else {
                                    common.returnMessage(params, 500, "No result found");
                                }
                            }
                            else {
                                common.returnMessage(params, 500, "Failed to save an hook");
                            }
                        }
                    );
                }

            }
            if (hookConfig) {
                hookConfig.createdBy = params.member._id; // Accessing property now with proper check
                hookConfig.created_at = new Date().getTime();
            }
            return common.db.collection("hooks").insert(
                hookConfig,
                function(err, result) {
                    log.d("insert new hook:", err, result);
                    if (!err && result && result.insertedIds && result.insertedIds[0]) {
                        // Audit log: Hook created
                        plugins.dispatch("/systemlogs", {
                            params: params,
                            action: "hook_created",
                            data: {
                                createdHookID: hookConfig._id,
                                createdBy: params.member._id,
                                createdHookName: hookConfig.name
                            }
                        });
                        common.returnOutput(params, result.insertedIds[0]);
                    }
                    else {
                        common.returnMessage(params, 500, "Failed to create an hook");
                    }
                }
            );
        }
        catch (err) {
            log.e('Parse hook failed', hookConfig);
            common.returnMessage(params, 500, "Failed to create an hook");
        }
    }, paramsInstance);
    return true;
});

/***
 * @param {array} effects - array of effects
 * @returns {boolean} isValid - true if all effects are valid
 */
function validateEffects(effects) {
    let isValid = true;
    if (effects) {
        for (let i = 0; i < effects.length; i++) {
            if (!(common.validateArgs(effects[i].configuration, CheckEffectProperties(effects[i])))) {
                isValid = false;
                break;
            }
        }
    }

    return isValid;

}



/**
 * build mongodb query for app level permission control
 * @param {objext} query - init mongodb query object
 * @param {object} params - countly params from requested upstream
 * @returns  {object} newQuery - new query object
 */
function getVisibilityQuery(query, params) {
    let member = params.member;
    rights.getUserAppsForFeaturePermission(member, FEATURE_NAME, 'r');

    if (member.global_admin) {
        return query;
    }
    let newQuery = _.extend({}, query);

    newQuery.$or = [
        {apps: {$in: rights.getAdminApps(member) || []}},
        {apps: {$in: rights.getUserAppsForFeaturePermission(member, FEATURE_NAME, 'r') || []}}
    ];
    return newQuery;
}
/**
 * 
 * @param {hookConfig} hookConfig - hook config
 * @returns {sanitizedHookConfig} - sanitized hook config
 */
function sanitizeConfig(hookConfig) {
    if (hookConfig && hookConfig.effects) {
        let emailEffectIndex = hookConfig.effects.findIndex(item => item.type === "EmailEffect");
        if (emailEffectIndex > -1) {
            let emailEffect = hookConfig.effects[emailEffectIndex];
            let sanitizedTemplate = common.sanitizeHTML(emailEffect.configuration.emailTemplate);
            emailEffect.configuration.emailTemplate = sanitizedTemplate;
        }
    }
    return hookConfig;

}


/**
* @api {post} /i/hook/list list hooks
* @apiName getHooks 
* @apiGroup hooks 
*
* @apiDescription get hook list. 
* @apiQuery {String} app_id for permission checking  
*
* @apiSuccessExample {json} Success-Response:
* HTTP/1.1 200 OK
*
* {
      "hooksList": [
        {
          "_id": "6262779e46bd55a8c555cfb9",
          "name": "test",
          "description": "test",
          "apps": [
            "610cea5f6229f9e738d30d0a"
          ],
          "trigger": {
            "type": "APIEndPointTrigger",
            "configuration": {
              "path": "ede612bd-f82f-452b-bae0-efde0b7a7caa",
              "method": "get"
            }
          },
          "createdBy": "60afbaa84723f369db477fee",
          "createdByUser": "foobar",
          "effects": [
            {
              "type": "EmailEffect",
              "configuration": {
                "address": [
                  "test@test.com"
                ],
                "emailTemplate": "test"
              }
            }
          ],
          "enabled": true,
          "created_at": 1650620318327
        }
      ]
    }
*
*/
plugins.register("/o/hook/list", function(ob) {
    const paramsInstance = ob.params;

    validateRead(paramsInstance, FEATURE_NAME, function(params) {
        try {

            let query = { $query: getVisibilityQuery({}, paramsInstance), $orderby: { created_at: -1 } };

            if (paramsInstance.qstring && paramsInstance.qstring.id) {
                query.$query._id = common.db.ObjectID(paramsInstance.qstring.id);
            }
            common.db.collection("hooks").find(query.$query).sort(query.$orderby).toArray(function(err, hooksList) {
                if (err) {
                    common.returnOutput(params, []);
                    return log.e('got error in listing hooks: %j', err);
                }
                common.db.collection('members').find({}).toArray(function(err2, members) {
                    if (err2) {
                        common.returnOutput(params, []);
                        return log.e('got error in finding members: %j', err2);
                    }
                    hooksList.forEach((a) => {
                        const member = _.find(members, {_id: a.createdBy});
                        a.createdByUser = member && member.full_name;
                    });
                    common.returnOutput(params, { hooksList } || []);
                });
            });
        }
        catch (err) {
            log.e('get hook list failed', err);
            common.returnMessage(params, 500, "Failed to get hook list" + err.message);
        }
    }, paramsInstance);
    return true;
});


/**
 * @api {post} /i/hook/status change hook status
 * @apiName changeHookStatus 
 * @apiGroup hooks 
 *
 * @apiDescription change hooks status by boolean flag.
 * @apiQuery {string} JSON string of status object for alerts record want to update.
 *  for example: {"626270afbf7392a8bfd8c1f3":false, "42dafbf7392a8bfd8c1e1": true}
 * @apiQuery {String} app_id target app id of the alert.  
 *
 * @apiSuccessExample {text} Success-Response:
 * HTTP/1.1 200 OK
 *
 * true
 *
*/
plugins.register("/i/hook/status", function(ob) {
    let paramsInstance = ob.params;

    validateUpdate(paramsInstance, FEATURE_NAME, function(params) {
        let statusList;
        try {
            statusList = JSON.parse(params.qstring.status);
        }
        catch (err) {
            log.e('Parse status list failed', params.qstring.status);
            common.returnMessage(params, 400, "Invalid status list");
            return;
        }
        const batch = [];
        for (const appID in statusList) {
            batch.push(
                common.db.collection("hooks").findAndModify(
                    { _id: common.db.ObjectID(appID) },
                    {},
                    { $set: { enabled: statusList[appID] } },
                    { new: false, upsert: false }
                )
            );
        }
        Promise.all(batch).then(function() {
            log.d("hooks all updated.");
            // Audit log: Hook status updated
            plugins.dispatch("/systemlogs", {
                params: params,
                action: "hook_status_updated",
                data: { updatedHooksCount: Object.keys(statusList).length, requestedBy: params.member._id }
            });
            common.returnOutput(params, true);
        }).catch(function(err) {
            log.e('Failed to update hook statuses: ', err);
            common.returnMessage(params, 500, "Failed to update hook statuses: " + err.message);
        });
    }, paramsInstance);
    return true;
});



/**
 * @api {post} /i/hook/delete delete hook by alert ID 
 * @apiName deleteHook
 * @apiGroup hooks 
 *
 * @apiDescription delete hook by id.
 * @apiQuery {string} hookID target hook id from db.
 * @apiQuery {String} app_id target app id of the alert.  
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 *
 * {"result":"Deleted an hook"}
 *
*/
plugins.register("/i/hook/delete", function(ob) {
    let paramsInstance = ob.params;

    validateDelete(paramsInstance, FEATURE_NAME, function(params) {
        let hookID = params.qstring.hookID;
        try {
            common.db.collection("hooks").remove(
                { "_id": common.db.ObjectID(hookID) },
                function(err, result) {
                    log.d(err, result, "delete an hook");
                    if (!err) {
                        // Audit log: Hook deleted
                        plugins.dispatch("/systemlogs", {
                            params: params,
                            action: "hook_deleted",
                            data: {
                                deletedHookID: hookID,
                                requestedBy: params.member._id
                            }
                        });
                        common.returnMessage(params, 200, "Deleted an hook");
                    }
                }
            );
        }
        catch (err) {
            log.e('delete hook failed', hookID, err);
            common.returnMessage(params, 500, "Failed to delete an hook" + err.message);
        }
    }, paramsInstance);
    return true;
});

//  test hook with mock hook config data
plugins.register("/i/hook/test", function(ob) {
    const paramsInstance = ob.params;

    validateCreate(paramsInstance, FEATURE_NAME, async(params) => {
        let hookConfig = params.qstring.hook_config;
        if (!hookConfig) {
            common.returnMessage(params, 400, 'Invalid hookConfig');
            return;
        }

        try {
            hookConfig = JSON.parse(hookConfig);
            if (!hookConfig) {
                common.returnMessage(params, 400, 'Parsed hookConfig is invalid');
                return;
            }
            hookConfig = sanitizeConfig(hookConfig);
            const mockData = JSON.parse(params.qstring.mock_data);

            if (!(common.validateArgs(hookConfig, CheckHookProperties(hookConfig)))) {
                common.returnMessage(params, 403, "hook config invalid" + JSON.stringify(hookConfig));
                return; // Add return to exit early
            }

            // Null check for effects
            if (hookConfig.effects && !validateEffects(hookConfig.effects)) {
                common.returnMessage(params, 400, 'Config invalid');
                return; // Add return to exit early
            }


            // trigger process            
            log.d(JSON.stringify(hookConfig), "[hook test config]");
            const results = [];

            // build mock data
            const trigger = hookConfig.trigger;
            if (!trigger) {
                common.returnMessage(params, 400, 'Trigger is missing');
                return;
            }
            hookConfig._id = null;

            log.d("[hook test mock data]", mockData);
            const obj = {
                is_mock: true,
                params: mockData,
                rule: hookConfig
            };
            log.d("[hook test config data]", obj);
            const t = new Triggers[trigger.type]({
                rules: [hookConfig],
            });

            // output trigger result
            const triggerResult = await t.process(obj);
            log.d("[hook trigger test result]", triggerResult);
            results.push(JSON.parse(JSON.stringify(triggerResult)));

            // call effect loop
            const effects = hookConfig.effects;
            for (let i = 0; i < effects.length; i++) {
                let effectResult = {};
                const effect = new Effects[effects[i].type]();
                let lastStep = JSON.parse(JSON.stringify(results[results.length - 1]));
                lastStep.effect = effects[i];
                try {
                    effectResult = await effect.run(lastStep);
                    results.push(JSON.parse(JSON.stringify(effectResult)));
                    if (!effectResult || !effectResult.params) {
                        common.returnMessage(params, 200, results);
                        return;
                    }
                    log.d("[hook effect[i] test result]", effectResult, effects[i], i);
                }
                catch (e) {
                    log.e("[hook effect[i] teste error]", e);
                    effectResult.error = e;
                }
            }
            log.d("[hook test results]", results);
            common.returnMessage(params, 200, results);
            return false;
        }
        catch (e) {
            log.e("hook test error", e, hookConfig);
            common.returnMessage(params, 503, "Hook test failed." + e.message);
            return;
        }
    }, paramsInstance);
    return true;
});

module.exports = Hooks;


// init instance;
new Hooks();
