var testData = require('./testData.js');
const process = require('process');
const Triggers = require('./parts/triggers/index.js');
const Effects = require('./parts/effects/index.js');
const asyncLib = require('async');
const EventEmitter = require('events');

const common = require('../../../api/utils/common.js');
const plugins = require('../../pluginManager.js');
const log = require('../../../api/utils/log.js')('hook:api');
const _ = require('lodash');

class Hooks {
    constructor(options) {
        this._cachedRules = [];
        this._triggers = {};
        this._effects = {};
        this._queue = [];

        this.fetchRules();
        setInterval(() => {
            this.fetchRules();
        }, 5000);
        this.registerEffects();
        this.registerTriggers();

        this._queueEventEmitter = new EventEmitter();
        this._queueEventEmitter.on('push', (data) => {
            this._queue.push(data);
        });
        this._queueEventEmitter.on('pipe', () => {this.pipeEffects()})
        this._queueEventEmitter.emit("pipe");
    }

    registerTriggers() {
        for(let type in Triggers) {
            const t = new Triggers[type]({
                pipeline: (data) => {
                    this._queueEventEmitter.emit('push', data);
                }
            });
            this._triggers[type] = t;
        }
    }

    registerEffects() {
        for(let type in Effects) {
            const t = new Effects[type]();
            this._effects[type] = t;
        }
    }

    fetchRules() {
        const self = this;
        const db = common.db; 
        db && db.collection("hooks").find({"enabled": true}).toArray(function(err, result) {
            self._cachedRules = result;
            self.syncRulesWithTrigger();
            console.log("fetch rules !!");
            console.log(err, result,"!!!", process.pid);
        });
    }

    syncRulesWithTrigger() {
        for(let type in this._triggers) {
            const t = this._triggers[type];
            if ( typeof t.syncRules == "function") {
                t.syncRules(this._cachedRules);
            }
         }
    }

    async pipeEffects() {
        console.log("pro::", process.pid, ":::",this._queue.length);
        try {
            const chunk = this._queue.splice(0, 20);
            await asyncLib.mapLimit(chunk,2, async (item, callback) => {
                console.log(item,"chunk limit");
                // trigger effects logic
                if(this._effects[item.effect.type]) {
                    this._effects[item.effect.type].run(item);
                }
            })
            console.log("finish this round pipeEffect");
        } catch(e){console.log(e);}

        //check periodically
        setTimeout(()=> {
            this._queueEventEmitter.emit("pipe");
        },500);
     }
}

//hook rules CRUD apis
class HookManager {
    
}

plugins.register("/i/hook/save", function(ob) {
    let paramsInstance = ob.params;
    let validateUserForWriteAPI = ob.validateUserForWriteAPI;

    validateUserForWriteAPI(function(params) {
        let hookConfig = params.qstring.hook_config;
        try {
            hookConfig = JSON.parse(hookConfig);
            var checkProps = {
                'name': { 'required': hookConfig._id ? false : true, 'type': 'String', 'min-length': 1 },
                'has_description': { 'required': hookConfig._id ? false : true, 'type': 'Boolean', 'min-length': 1 },
                'description': { 'required': !hookConfig._id & hookConfig.has_description === true ? true : false, 'type': 'String', 'min-length': 1 },
                'apps': { 'required': hookConfig._id ? false : true, 'type': 'Array', 'min-length': 1 },
                'trigger': { 'required': hookConfig._id ? false : true, 'type': 'Object'},
                'effects': { 'required': hookConfig._id ? false : true, 'type': 'Array', 'min-length': 1},
                'enabled': { 'required': hookConfig._id ? false : true, 'type': 'Boolean'}
            };

            if (!(common.validateArgs(hookConfig, checkProps))) {
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

plugins.register("/o/hook/list", function(ob) {
    const paramsInstance = ob.params;
    let validateUserForWriteAPI = ob.validateUserForWriteAPI;
    validateUserForWriteAPI(function(params) {
        try {
            let query = {};
            common.db.collection("hooks").find(query).toArray(function(err, hooksList) {
                if (err) {
                    return log.e('got error in listing hooks: %j', err);
                }
                common.db.collection('members').find({}).toArray(function(err2, members) {
                    if (err2) {
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

plugins.register("/i/hook/status", function(ob) {
    let paramsInstance = ob.params;
    let validateUserForWriteAPI = ob.validateUserForWriteAPI;
    validateUserForWriteAPI(function(params) {
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


plugins.register("/i/hook/delete", function(ob) {
    let paramsInstance = ob.params;
    let validateUserForWriteAPI = ob.validateUserForWriteAPI;

    validateUserForWriteAPI(function(params) {
        let hookID = params.qstring.hookID;
        try {
            common.db.collection("hooks").remove(
                { "_id": common.db.ObjectID(hookID) },
                function(err, result) {
                    log.d(err, result, "delete an hook");
                    if (!err) {
                        deleteJob(hookID);
                        common.returnMessage(params, 200, "Deleted an hook");
                    }
                }
            );
        }
        catch (err) {
            log.e('delete hook failed', alertID);
            common.returnMessage(params, 500, "Failed to delete an hook");
        }
    }, paramsInstance);
    return true;
});

// init instnace;
const hooks = new Hooks();
