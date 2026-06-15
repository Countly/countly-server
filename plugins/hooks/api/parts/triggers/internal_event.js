const plugins = require('../../../../pluginManager.js');
const common = require('../../../../../api/utils/common.js');
const utils = require('../../utils.js');
const log = common.log('hooks:internalEventTrigger');

// Event types that are global (not scoped to a single app): new-member events,
// the master tick, and the system-log stream. These carry instance-wide data
// and must only be delivered to hooks owned by a global admin.
const GLOBAL_EVENT_TYPES = {
    "/i/users/create": true,
    "/i/users/update": true,
    "/i/users/delete": true,
    "/master": true,
    "/systemlogs": true
};

/**
 * Whether the hook's owner (createdBy) is a global admin. Used to gate the
 * global, non app-scoped event types so an app-scoped hook created by a
 * non-global member cannot receive instance-wide data (e.g. new-member objects
 * or the system-log stream). A hook with no resolvable owner is treated as not
 * authorized.
 * @param {object} rule - hook rule
 * @returns {Promise<boolean>} true if the owner is a global admin
 */
async function isRuleOwnerGlobalAdmin(rule) {
    if (!rule || !rule.createdBy) {
        return false;
    }
    try {
        const owner = await common.db.collection("members").findOne({_id: common.db.ObjectID(rule.createdBy + "")}, {projection: {global_admin: 1}});
        return !!(owner && owner.global_admin);
    }
    catch (e) {
        log.e("Failed to resolve hook owner for global-event scope check", e);
        return false;
    }
}

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
        if (ob && ob.is_mock === true) {
            return ob;
        }
        if (eventType === '/master') {
            this._rules = await common.db.collection("hooks").find({"enabled": true}, {error_logs: 0}).toArray();
            for (var z = 0; z < this._rules.length; z++) {
                if (this._rules[z].trigger && this._rules[z].trigger.type === "InternalEventTrigger" && this._rules[z].trigger.configuration && this._rules[z].trigger.configuration.eventType) {
                    if (this._rules[z].trigger.configuration.eventType === "/profile-group/enter") {
                        this._rules[z].trigger.configuration.eventType = "/cohort/enter";
                    }
                    else if (this._rules[z].trigger.configuration.eventType === "/profile-group/exit") {
                        this._rules[z].trigger.configuration.eventType = "/cohort/exit";
                    }
                }
            }
        }
        rules = this._rules.filter((r) => {
            return r.trigger.configuration.eventType === eventType;
        });
        if (!rules.length) {
            return;
        }
        for (const rule of rules) {
            // global (non app-scoped) events must only reach hooks owned by a
            // global admin — an app-scoped hook from a non-global member must
            // not receive instance-wide member/system data.
            if (GLOBAL_EVENT_TYPES[eventType] && !await isRuleOwnerGlobalAdmin(rule)) {
                continue;
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
            case "/i/remote-config/add-parameter":
            case "/i/remote-config/update-parameter":
            case "/i/remote-config/remove-parameter":
            case "/i/remote-config/add-condition":
            case "/i/remote-config/update-condition":
            case "/i/remote-config/remove-condition":
                utils.updateRuleTriggerTime(rule._id);
                this.pipeline({
                    params: ob,
                    rule: rule,
                    eventType,
                });
                break;
            case "/alerts/trigger": {
                this.pipeline({
                    params: ob,
                    rule: rule,
                    eventType,
                });
                break;
            }
            }
        }
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
    "/i/remote-config/add-parameter",
    "/i/remote-config/update-parameter",
    "/i/remote-config/remove-parameter",
    "/i/remote-config/add-condition",
    "/i/remote-config/update-condition",
    "/i/remote-config/remove-condition",
];