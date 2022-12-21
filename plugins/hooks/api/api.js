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
    fetchRules() {
        const self = this;
        const db = common.db;
        db && db.collection("hooks").find({"enabled": true}, {error_logs: 0}).toArray(function(err, result) {
            log.d("Fetch rules:", result, err, process.pid);
            if (result) {
                self._cachedRules = result;
                self.syncRulesWithTrigger();
            }
        });
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
                    if (checkRateLimitReached(rule)) {
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
const checkRateLimitReached = function(rule) {

    if (plugins.getConfig("hooks").requestLimit === 0) {
        return false;
    }

    let requestCount = global.triggerRequestCount.find(item=> {
        return item.ruleId.toString() === rule._id.toString();
    });

    if (!requestCount) { //no record in time interval
        addInitialRequestCounter(rule); //add initial record for time window frame
        return false;
    }

    return incrementRequestCounter(rule);


};

const addInitialRequestCounter = function(rule) {
    let startTime = Date.now();
    let endTime = startTime + plugins.getConfig("hooks").timeWindowForRequestLimit;
    global.triggerRequestCount.push({ruleId: rule._id.toString(), startTime: startTime, endTime: endTime, counter: 1});
};

const incrementRequestCounter = function(rule) {
    //delete records which are not in time frame
    const currentTimestamp = Date.now();
    global.triggerRequestCount = global.triggerRequestCount.filter(item => {
        return currentTimestamp >= item.startTime && currentTimestamp <= item.endTime;
    }); //we don't need to check the rule id. if timeframe is passed counter is also not valid for other rules

    let counterIndex = global.triggerRequestCount.findIndex(item => {
        return item.ruleId.toString() === rule._id.toString();
    });
    global.triggerRequestCount[counterIndex].counter++;

    return global.triggerRequestCount[counterIndex].counter > plugins.getConfig("hooks").requestLimit;

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
        try {
            hookConfig = JSON.parse(hookConfig);
            hookConfig = sanitizeConfig(hookConfig);
            if (!(common.validateArgs(hookConfig, CheckHookProperties(hookConfig)))) {
                common.returnMessage(params, 200, 'Not enough args');
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
                            common.returnOutput(params, result && result.value);
                        }
                        else {
                            common.returnMessage(params, 500, "Failed to save an hook");
                        }
                    });
            }
            hookConfig.createdBy = params.member._id;
            hookConfig.created_at = new Date().getTime();
            return common.db.collection("hooks").insert(
                hookConfig,
                function(err, result) {
                    log.d("insert new hook:", err, result);
                    if (!err && result && result.insertedIds && result.insertedIds[0]) {
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
            log.e('get hook list failed');
            common.returnMessage(params, 500, "Failed to get hook list");
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
        const statusList = JSON.parse(params.qstring.status);
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
            common.returnOutput(params, true);
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
                        common.returnMessage(params, 200, "Deleted an hook");
                    }
                }
            );
        }
        catch (err) {
            log.e('delete hook failed', hookID);
            common.returnMessage(params, 500, "Failed to delete an hook");
        }
    }, paramsInstance);
    return true;
});

//  test hook with mock hook config data
plugins.register("/i/hook/test", function(ob) {
    const paramsInstance = ob.params;

    validateCreate(paramsInstance, FEATURE_NAME, async(params) => {
        let hookConfig = params.qstring.hook_config;
        try {
            hookConfig = JSON.parse(hookConfig);
            hookConfig = sanitizeConfig(hookConfig);
            const mockData = JSON.parse(params.qstring.mock_data);

            if (!(common.validateArgs(hookConfig, CheckHookProperties(hookConfig)))) {
                common.returnMessage(params, 403, "hook config invalid");
            }

            // trigger process            
            log.d(JSON.stringify(hookConfig), "[hook test config]");
            const results = [];

            // build mock data
            const trigger = hookConfig.trigger;
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

            // out put trigger result
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
            log.e("hook test error", e);
            common.returnMessage(params, 503, "Hook test failed.");
            return;
        }
    }, paramsInstance);
    return true;
});


// init instnace;
new Hooks();
