const plugins = require('../../../../pluginManager.js');
const common = require('../../../../../api/utils/common.js');
const utils = require('../../utils.js');
const log = common.log('hooks:internalEventTrigger');
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
            this.pipeline = (data) => {
                try {
                    data.rule._originalInput = JSON.parse(JSON.stringify(data.params || {}));
                }
                catch (e) {
                    log.e("[hooks internal_events] parsing originalInput", e);
                    // Rethrow error if event is delete
                    // This error will then be caught by app users api dispatch so that it can cancel app user deletion
                    if (data.eventType && data.eventType === '/i/app_users/delete') {
                        throw e;
                    }
                }
                return options.pipeline(data);
            };
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
     * @param {object} ob - trggered out from pipeline
     * @param {string} eventType - internal event types
     */
    async process(ob, eventType) {
        let rules = [];
        if (ob.is_mock === true) {
            return ob;
        }
        if (eventType === '/master') {
            this._rules = await common.db.collection("hooks").find({"enabled": true}, {error_logs: 0}).toArray();
        }
        rules = this._rules.filter((r) => {
            return r.trigger.configuration.eventType === eventType;
        });
        if (!rules.length) {
            return;
        }
        rules.forEach((rule) => {
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
                                    eventType,
                                });
                            });
                        }
                    );
                }
                break;
            }
            case "/i/users/create":
            case "/i/users/update":
            case "/i/users/delete":
            case "/master":
                utils.updateRuleTriggerTime(rule._id);
                this.pipeline({
                    params: {data: ob.data, eventType},
                    rule: rule,
                    eventType,
                });
                break;
            case "/crashes/new":
                if (rule.apps.indexOf(ob.data.app._id + '') > -1) {
                    utils.updateRuleTriggerTime(rule._id);
                    this.pipeline({
                        params: {data: ob.data, eventType},
                        rule: rule,
                        eventType,
                    });
                }
                break;
            case "/systemlogs":
                utils.updateRuleTriggerTime(rule._id);
                this.pipeline({
                    params: {data: ob.data, action: ob.action},
                    rule: rule,
                    eventType,
                });
                break;
            case '/i/apps/create':
            case '/i/apps/update':
            case '/i/apps/delete':
            case '/i/apps/reset': {
                const {appId, data} = ob;
                try {
                    if (eventType === '/i/apps/create') {
                        utils.updateRuleTriggerTime(rule._id);
                        this.pipeline({
                            params: {data, appId, eventType},
                            rule: rule,
                            eventType,
                        });
                    }
                    else if (rule.apps[0] === appId + '') {
                        utils.updateRuleTriggerTime(rule._id);
                        this.pipeline({
                            params: {data, appId, eventType},
                            rule: rule,
                            eventType,
                        });
                    }
                }
                catch (err) {
                    console.log(err, "[InternalEventTrigger]");
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
                        // Rethrow error if event is delete
                        // This error will then be caught by app users api dispatch so that it can cancel app user deletion
                        if (eventType === '/i/app_users/delete') {
                            throw err;
                        }
                    }
                    const userData = {user: user || {}};
                    if (ob.update) {
                        userData.updateFields = ob.update;
                    }
                    if (eventType === '/i/app_users/delete') {
                        userData.user.uid = ob.uids;
                    }
                    userData.eventType = eventType;
                    this.pipeline({
                        params: userData,
                        rule: rule,
                        eventType,
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
                        eventType,
                    });
                }
                break;
            }
            case "/alerts/trigger": {
                console.log("Alert trigger internal");
                this.pipeline({
                    params: ob,
                    rule: rule,
                    eventType,
                });
                break;
            }
            }
        });
    }

    /**
     * register trigger processor
     */
    register() {
        InternalEvents.forEach((e) => {
            plugins.register(e, async(ob) => {
                await this.process(ob, e);
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
    "/alerts/trigger",
];
