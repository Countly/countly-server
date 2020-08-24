const plugins = require('../../../../pluginManager.js');
class InternalEventTrigger {
    constructor(option) {
        this.register(option);
    }
    syncRules(rules) {
        if (rules instanceof Array) {
            const newRules = rules.filter( r => {
                return r.trigger.type === 'APIEndPointTrigger';
            });
            this._rules = newRules;
        }
    }

    async process(hookPath, ob) {
        const {params} = ob;
        const  {qstring} = params || {};
        this._rules.forEach(rule => {
            // match
            if(rule.trigger.configuration.path === hookPath) {
                // send to pipeline
                rule.effects.forEach(e => {
                    this.pipeline({
                        effect: e,
                        params: qstring,
                        rule: rule // optional
                    });
                });
            }
        });
    }
                
    register(option) {
        InternalEvents.forEach((e) => {
            plugins.register(e, (ob) => {
                console.log(ob, e, "[InternalEventTrigger]");
                process(e, ob);
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
