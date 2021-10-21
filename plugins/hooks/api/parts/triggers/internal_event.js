const plugins = require('../../../../pluginManager.js');
const common = require('../../../../../api/utils/common.js');
const utils = require('../../utils.js');
/**
 * Internal event trigger
 */
class InternalEventTrigger {
    /**
     * Init variables
     * @param {object} options - config options
     * @param {object} options.pipeline -pipeline instance inited by Hooks class 
     */
    constructor(options) {
        this._rules = [];
        this.pipeline = () => {};
        if (options.pipeline) {
            this.pipeline = options.pipeline;
        }
        this.register();
    }

    /**
     * syncRules with hook module periodically, filter related hooks
     * @param {Array} rules - hook record objects array
     */
    syncRules(rules) {
        if (rules instanceof Array) {
            const newRules = rules.filter(r => {
                return r.trigger.type === 'InternalEventTrigger';
            });
            this._rules = newRules;
        }
    }

    /**
     * process pipeline feed, pick out matched record with rule
     * @param {string} eventType - internal event types
     * @param {object} ob - trggered out from pipeline
     */
    async process(ob, eventType) {
        let rule = null;
        if (ob.is_mock === true) {
            return ob;
        }
        this._rules.forEach((r) => {
            if (r.trigger.configuration.eventType === eventType) {
                rule = r;
            }
        });
        if (!rule) {
            return;
        }
        switch (eventType) {
            case "/cohort/enter":
            case "/cohort/exit": {
                const {cohort, uids} = ob;
                if (rule.trigger.configuration.cohortID === cohort._id) {
                    common.db.collection('app_users' + cohort.app_id).find({"uid": {"$in": uids}}).toArray(
                        (uidErr, result) => {
                            if (uidErr) {
                                console.log(uidErr);
                                return;
                            }
                            try {
                                utils.updateRuleTriggerTime(rule._id);
                            }
                            catch (err) {
                                console.log(err, "[InternalEventTrigger]");
                            }
                            result.forEach((u) => {
                                this.pipeline({
                                    params: {cohort, user: u},
                                    rule: rule,
                                });
                            });
                        }
                    );
                }
                break;
            }
            case "/i/app_users/create":
            case "/i/app_users/update":
            case "/i/app_users/delete": {
                const {app_id, user} = ob;

               if (rule.apps[0] === app_id + '') {
                    try {
                        utils.updateRuleTriggerTime(rule._id);
                    }
                    catch (err) {
                        console.log(err, "[InternalEventTrigger]");
                    }
                    const userData = {user: user || {}};
                    if (ob.update) {
                        userData.updateFields = ob.update;
                    }
                    if (eventType === '/i/app_users/delete') {
                        userData.user.uid = ob.uids;
                    }
                    this.pipeline({
                        params: userData,
                        rule: rule,
                    });
                }
                break;
            }
            case "/hooks/trigger": {
                if (ob.rule._id + "" === rule.trigger.configuration.hookID) {
                    try {
                        utils.updateRuleTriggerTime(rule._id);
                    }
                    catch (err) {
                        console.log(err, "[InternalEventTrigger]");
                    }
                    this.pipeline({
                        params: ob,
                        rule: rule,
                    });
                }
                break;
            }
        }
    }

    /**
     * register trigger processor
     */
    register() {
        InternalEvents.forEach((e) => {
            plugins.register(e, (ob) => {
                this.process(ob, e);
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
    "/i/app_users/create",
    "/i/app_users/update",
    "/i/app_users/delete",
    "/hooks/trigger",
];
