const plugins = require('../../../../pluginManager.js');
const common = require('../../../../../api/utils/common.js');
const utils = require('../../utils.js');

class InternalEventTrigger {
    constructor(options) {
        this._rules = [];
        this.pipeline = () => {};
        if(options.pipeline) {
            this.pipeline = options.pipeline;
        }
        this.register();

    }
    syncRules(rules) {
        if (rules instanceof Array) {
            const newRules = rules.filter( r => {
                return r.trigger.type === 'InternalEventTrigger';
            });
            this._rules = newRules;
        }
    }

    async process(eventType, ob) {
        for(let i = 0; i < this._rules.length; i++){
            const rule = this._rules[i];
            // match
            if(rule.trigger.configuration.eventType === eventType) {
               switch(eventType) {
               case "/cohort/enter": 
                    const {cohort, uids} = ob;
                    if (rule.trigger.configuration.cohortID === cohort._id) {
                        common.db.collection('app_users' + cohort.app_id).find({"uid":{"$in": uids}}).toArray(
                            (uidErr, result) => {
                                console.log(uidErr, result);
                                if(uidErr) {
                                    console.log(uidErr);
                                    return;
                                }
                                try{
                                    utils.updateRuleTriggerTime(rule._id);
                                }catch(err){console.log(err,"??#3");}
                                rule.effects.forEach(e => {
                                    this.pipeline({
                                        params: {cohort, users: result},
                                        rule: rule,
                                        effect: e,
                                    });
                                });
                            }
                        )
                    }
               }
            }
        };
    }
                
    register(option) {
        InternalEvents.forEach((e) => {
            plugins.register(e, (ob) => {
                console.log(ob, e, "[InternalEventTrigger]");
                this.process(e, ob);
            });
        });
    }
}

module.exports = InternalEventTrigger;
const InternalEvents = [
    "/i/apps/create",
    "/i/apps/update",
    "/i/apps/delete",
    "/i/apps/reset",
    "/i/users/create",
    "/i/users/update",
    "/i/users/delete",
    "/systemlogs",
    "/master",
    "/crashes/new",
    "/cohort/enter",
    "/cohort/exit",
    "/userprofile/create",
    "/userprofile/update",
    "/userprofile/delete",
    "/hooks/trigger",
]
