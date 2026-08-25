const plugins = require('../../../../pluginManager.js');
const common = require('../../../../../api/utils/common.js');
const utils = require('../../utils.js');
const log = common.log('hooks:internalEventTrigger');

// Event types that are global (not scoped to a single app): new-member events,
// the master tick, the system-log stream, and app creation. These carry
// instance-wide data and must only be delivered to hooks owned by a global
// admin.
//
// /i/apps/create belongs here rather than being app-scoped like the other
// /i/apps/* events: the app does not exist when the hook is configured, so no
// hook can legitimately name it in its apps list, and the event payload is the
// newly created app document including its SDK key, id_key, accepted keys[] and
// checksum salt. Every case in process() below must either appear in this map or
// check the event's app id against rule.apps.
const GLOBAL_EVENT_TYPES = {
    "/i/users/create": true,
    "/i/users/update": true,
    "/i/users/delete": true,
    "/master": true,
    "/systemlogs": true,
    "/i/apps/create": true
};

/**
 * Whether the hook's owner (createdBy) is a global admin. Used to gate the
 * global, non app-scoped event types so an app-scoped hook created by a
 * non-global member cannot receive instance-wide data (e.g. new-member objects
 * or the system-log stream). A hook with no resolvable owner is treated as not
 * authorized.
 * @param {object} rule - hook rule
 * @param {Map} [cache] - optional owner-id -> boolean cache, scoped to one
 *        event dispatch, so each distinct owner is resolved only once
 * @returns {Promise<boolean>} true if the owner is a global admin
 */
async function isRuleOwnerGlobalAdmin(rule, cache) {
    if (!rule || !rule.createdBy) {
        return false;
    }
    const ownerId = rule.createdBy + "";
    // memoize per process() call so each distinct owner is resolved once per
    // event dispatch (avoids an N+1 lookup when many hooks share owners)
    if (cache && cache.has(ownerId)) {
        return cache.get(ownerId);
    }
    let result = false;
    try {
        const owner = await common.db.collection("members").findOne({_id: common.db.ObjectID(ownerId)}, {projection: {global_admin: 1}});
        result = !!(owner && owner.global_admin);
    }
    catch (e) {
        log.e("Failed to resolve hook owner for global-event scope check (hook " + (rule._id || "?") + ", createdBy " + ownerId + ")", e);
        result = false;
    }
    if (cache) {
        cache.set(ownerId, result);
    }
    return result;
}

//An app document carries credentials: the sdk key, every rotated key, the immutable
//id_key, and the checksum salt. Effects can emit the payload verbatim, since the http
//effect's body is a template and {{payload_json}} stringifies the whole thing to a url the
//hook's author chose, so none of these belong in what hooks hands to an effect.
//
//This is done here rather than at the dispatch sites on purpose: systemlogs stores those
//payloads whole so that a deleted or reset app can be recovered afterwards, and stripping
//at the source would take the recoverable fields away with it. Everything below therefore
//works on copies and never touches the object the other subscribers of the same dispatch
//see.
const APP_SECRET_FIELDS = ["key", "keys", "id_key", "salt", "checksum_salt"];

/**
 * Copy an app document without the fields that authenticate writes to it
 * @param {object} app - app document from a dispatch payload
 * @returns {object} copy without the credential fields
 */
function withoutAppSecrets(app) {
    const copy = Object.assign({}, app);
    APP_SECRET_FIELDS.forEach(function(field) {
        delete copy[field];
    });
    return copy;
}

//Fields of a dispatch payload that hold an app document. /i/apps/update sends two of
//them: data.app is the document before the change, and data.update is what was written.
//data.update is not the smaller of the two for this purpose - the accepted key list is
//rebuilt on EVERY update, so data.update.keys carries every key the app has ever had,
//data.update.key appears whenever the key is rotated, and data.update.id_key is filled in
//the first time an app that predates it is touched.
const APP_SHAPED_FIELDS = ["app", "update"];

/**
 * Copy trigger params with any app document's credentials removed. Keyed off field names
 * that are known to hold an app document, and off the event type for the payloads that
 * are an app document, rather than by looking for a field called "key" anywhere: "key" is
 * an ordinary field elsewhere - events have one - and scrubbing those would break hooks
 * that reference it.
 * @param {object} params - params about to be handed to the effect pipeline
 * @param {string} eventType - internal event being processed
 * @returns {object} params safe to hand onwards
 */
function withoutSecrets(params, eventType) {
    if (!params || typeof params !== "object") {
        return params;
    }
    const out = Object.assign({}, params);
    if (out.data && typeof out.data === "object") {
        let data = out.data;
        let replaced = false;
        //crashes/new and /i/apps/update nest app documents under named fields
        APP_SHAPED_FIELDS.forEach(function(field) {
            if (data[field] && typeof data[field] === "object") {
                if (!replaced) {
                    data = Object.assign({}, data);
                    replaced = true;
                }
                data[field] = withoutAppSecrets(data[field]);
            }
        });
        //while /i/apps/create, /i/apps/delete and /i/apps/reset pass the app document as
        //data itself. A payload carrying one of the fields above is not itself an app.
        if (!replaced && typeof eventType === "string" && eventType.indexOf("/i/apps/") === 0) {
            data = withoutAppSecrets(data);
            replaced = true;
        }
        if (replaced) {
            out.data = data;
        }
    }
    if (out.app && typeof out.app === "object") {
        out.app = withoutAppSecrets(out.app);
    }
    return out;
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
                //before anything copies or forwards it, including the _originalInput
                //snapshot kept for error records
                data.params = withoutSecrets(data.params, data.eventType);
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
        // cache of owner-id -> isGlobalAdmin, scoped to this dispatch, so a
        // global event reaching many hooks resolves each owner only once
        const ownerGlobalAdminCache = new Map();

        // App scoping drops events, and a silent drop is hard to tell apart from
        // "nothing was configured". Two different things can happen and they get
        // different levels:
        //
        //  - the dispatch carried no app id at all. Nothing can be scoped, so every
        //    subscribing hook stops firing. That is a bug in the producer, not a
        //    configuration choice, and it is how a dispatch that forgot its payload
        //    silently disabled a working alert hook. Warned, once per dispatch.
        //  - the dispatch named an app this hook is not scoped to. That is ordinary
        //    filtering and happens constantly, so it is debug only.
        let missingAppIdWarned = false;
        /**
         * Report a dispatch that cannot be scoped because it carries no app id.
         * @param {string} where - the field the app id was expected in
         */
        const warnMissingAppId = (where) => {
            if (missingAppIdWarned) {
                return;
            }
            missingAppIdWarned = true;
            log.w("Dropping " + eventType + ": no app id in " + where + ", so it cannot be scoped to an app. "
                + rules.length + " hook(s) subscribe to this event and none of them will fire. "
                + "Whatever dispatched this event needs to include the app id.");
        };
        /**
         * Note a hook skipped because the event belongs to an app it is not scoped to.
         * @param {object} rule - the hook rule being skipped
         * @param {*} appId - app the event belongs to
         */
        const noteOutOfScope = (rule, appId) => {
            log.d("Not delivering " + eventType + " for app " + appId + " to hook " + (rule._id || "?")
                + ": outside the hook's apps [" + (Array.isArray(rule.apps) ? rule.apps.join(", ") : "") + "]");
        };
        for (const rule of rules) {
            // global (non app-scoped) events must only reach hooks owned by a
            // global admin: an app-scoped hook from a non-global member must
            // not receive instance-wide member/system data.
            if (GLOBAL_EVENT_TYPES[eventType] && !await isRuleOwnerGlobalAdmin(rule, ownerGlobalAdminCache)) {
                log.d("Not delivering global event " + eventType + " to hook " + (rule._id || "?")
                    + ": its owner is not a global admin");
                continue;
            }
            switch (eventType) {
            case "/cohort/enter":
            case "/cohort/exit": {
                const {cohort, uids} = ob;
                //cohortID comes from the hook's own configuration and is not
                //validated on save, so matching on it alone would let a hook
                //scoped to one app receive another app's cohort definition and
                //app_users documents (the lookup below reads
                //app_users<cohort.app_id>). Require the cohort's app to be one
                //the hook is scoped to.
                const cohortMatches = rule.trigger.configuration.cohortID === cohort._id;
                if (cohortMatches && !(Array.isArray(rule.apps) && rule.apps.indexOf(cohort.app_id + '') > -1)) {
                    // the hook names this cohort but is not scoped to the cohort's
                    // app, so it is asking for another app's data. Rare, and worth
                    // seeing rather than dropping quietly.
                    log.w("Not delivering " + eventType + " to hook " + (rule._id || "?")
                        + ": it subscribes to cohort " + cohort._id + " which belongs to app " + cohort.app_id
                        + ", outside the hook's apps [" + (Array.isArray(rule.apps) ? rule.apps.join(", ") : "") + "]");
                }
                if (cohortMatches
                    && Array.isArray(rule.apps) && rule.apps.indexOf(cohort.app_id + '') > -1) {
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
                    else if (!appId) {
                        warnMissingAppId("ob.appId");
                    }
                    else if (Array.isArray(rule.apps) && rule.apps.indexOf(appId + '') > -1) {
                        utils.updateRuleTriggerTime(rule._id);
                        this.pipeline({
                            params: {data, appId, eventType},
                            rule: rule,
                            eventType,
                        });
                    }
                    else {
                        noteOutOfScope(rule, appId);
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

                if (!app_id) {
                    warnMissingAppId("ob.app_id");
                }
                else if (!(Array.isArray(rule.apps) && rule.apps.indexOf(app_id + '') > -1)) {
                    noteOutOfScope(rule, app_id);
                }
                if (Array.isArray(rule.apps) && rule.apps.indexOf(app_id + '') > -1) {
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
                //hookID comes from the hook's own configuration and is not
                //validated on save. Matching on it alone would let a hook scoped
                //to one app subscribe to a hook belonging to another app and
                //receive that hook's entire document - fetchRules loads hooks
                //with only error_logs excluded, so ob.rule carries every effect
                //configuration (HTTP url and headers, custom code, email
                //recipients) plus the data that fired it. Require the source
                //hook to be scoped within this hook's own apps.
                const sourceApps = (ob.rule && Array.isArray(ob.rule.apps)) ? ob.rule.apps : null;
                const sourceInScope = sourceApps
                    && Array.isArray(rule.apps)
                    && sourceApps.length > 0
                    && sourceApps.every((a) => rule.apps.indexOf(a + '') > -1);
                const hookMatches = ob.rule._id + "" === rule.trigger.configuration.hookID;
                if (hookMatches && !sourceInScope) {
                    // the hook names this source hook but is not scoped to all of the
                    // source's apps, so it is asking for another app's hook document
                    log.w("Not delivering " + eventType + " to hook " + (rule._id || "?")
                        + ": it subscribes to hook " + ob.rule._id + " whose apps ["
                        + (sourceApps ? sourceApps.join(", ") : "") + "] are not all within the hook's apps ["
                        + (Array.isArray(rule.apps) ? rule.apps.join(", ") : "") + "]");
                }
                if (hookMatches && sourceInScope) {
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
            case "/i/remote-config/remove-condition": {
                //remote-config changes are app-scoped: the parameter key, default
                //value and the serialized condition query all describe one app's
                //configuration. The dispatch carries the app id in params.appId.
                //A dispatch without an app id cannot be scoped, so it is dropped
                //rather than delivered to every subscriber.
                const rcAppId = ob && ob.params && ob.params.appId;
                if (!rcAppId) {
                    warnMissingAppId("ob.params.appId");
                }
                else if (Array.isArray(rule.apps) && rule.apps.indexOf(rcAppId + '') > -1) {
                    utils.updateRuleTriggerTime(rule._id);
                    this.pipeline({
                        params: ob,
                        rule: rule,
                        eventType,
                    });
                }
                else {
                    noteOutOfScope(rule, rcAppId);
                }
                break;
            }
            case "/alerts/trigger": {
                //An alert belongs to one app, so only hooks scoped to that app may
                //be triggered by it. The payload stays empty, as before; appId is
                //used for scoping only and is not forwarded.
                const alertAppId = ob && ob.appId;
                if (!alertAppId) {
                    warnMissingAppId("ob.appId");
                }
                else if (Array.isArray(rule.apps) && rule.apps.indexOf(alertAppId + '') > -1) {
                    this.pipeline({
                        params: {},
                        rule: rule,
                        eventType,
                    });
                }
                else {
                    noteOutOfScope(rule, alertAppId);
                }
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

// exposed so the save handler can reject non-global-admins creating/updating
// hooks that subscribe to these global event types
InternalEventTrigger.GLOBAL_EVENT_TYPES = GLOBAL_EVENT_TYPES;

// exposed so the save handler can reject an eventType that is not a real
// internal event, and can tell which events carry a target id to validate
InternalEventTrigger.getInternalEvents = function() {
    return InternalEvents.slice();
};

module.exports = InternalEventTrigger;
//exported so the payload scrub can be unit tested without a live dispatch
module.exports.withoutSecrets = withoutSecrets;

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