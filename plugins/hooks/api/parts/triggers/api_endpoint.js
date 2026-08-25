const plugins = require('../../../../pluginManager.js');
const common = require('../../../../../api/utils/common.js');
const utils = require('../../utils.js');
const log = common.log('hooks:api_endpoint_trigger');
/**
 * When a hook was created, in milliseconds.
 *
 * created_at is absent on hooks predating it, and an ObjectId's leading four bytes are
 * the creation time in seconds, so the id stands in. Both are reduced to the same unit
 * before anything is compared: a number against an id string coerces the string to NaN,
 * every comparison is then false, and the hook already held would keep winning - which is
 * the opposite of the oldest-wins rule, and only for the legacy hooks the fallback exists
 * to serve.
 *
 * An age that cannot be determined at all sorts last rather than first, so an unknown
 * does not displace a hook whose age is known.
 *
 * @param {object} rule - hook document
 * @returns {number} creation time in milliseconds
 */
function hookCreatedAt(rule) {
    const createdAt = Number(rule && rule.created_at);
    if (Number.isFinite(createdAt) && createdAt > 0) {
        return createdAt;
    }
    const id = String((rule && rule._id) || "");
    if (/^[a-f0-9]{24}$/i.test(id)) {
        return parseInt(id.substring(0, 8), 16) * 1000;
    }
    return Infinity;
}

/**
 * Index rules by their endpoint path, so dispatch is a lookup rather than a scan.
 *
 * The path is global while a hook belongs to apps, so two hooks can claim the same one.
 * Resolving that here rather than per request means the winner does not depend on the order
 * an unsorted find returned the hooks in, which is not stable across updates or compaction.
 *
 * The oldest hook wins. Whoever claimed the path first keeps serving it, so a hook added
 * later cannot take over a path already in use, and nothing that works today stops working.
 *
 * @param {Array} rules - api endpoint rules
 * @returns {Map} path to the single rule that serves it
 */
function indexRulesByPath(rules) {
    const byPath = new Map();
    (rules || []).forEach(rule => {
        const path = rule && rule.trigger && rule.trigger.configuration && rule.trigger.configuration.path;
        if (!path) {
            return;
        }
        const held = byPath.get(path);
        if (!held) {
            byPath.set(path, rule);
            return;
        }
        const winner = hookCreatedAt(rule) < hookCreatedAt(held) ? rule : held;
        const loser = winner === rule ? held : rule;
        log.e("Two hooks claim endpoint path %j: serving %j, ignoring %j. Give each hook its own path.",
            path, String(winner._id), String(loser._id));
        byPath.set(path, winner);
    });
    return byPath;
}

/**
 * API endpoint  trigger
 */
class APIEndPointTrigger {
    /**
     * Init variables
     * @param {object} options - config options
     * @param {object} options.pipeline -pipeline instance inited by Hooks class
     */
    constructor(options) {
        this._rules = options.rules || [];
        this._rulesByPath = indexRulesByPath(this._rules);
        this.pipeline = (() => {});
        if (options.pipeline) {
            this.pipeline = (data) => {
                try {
                    data.rule._originalInput = JSON.parse(JSON.stringify(data.params || {}));
                }
                catch (e) {
                    log.e("[hooks api endpoint] parsing originalInput", e);
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
                return r.trigger.type === 'APIEndPointTrigger';
            });
            this._rules = newRules;
            this._rulesByPath = indexRulesByPath(newRules);
        }
    }

    /**
     * process pipeline feed, pick out matched record with rule
     * @param {object} ob - trggered out from pipeline
     */
    async process(ob) {
        // log.d(JSON.stringify(ob), "[hook trigger api_endpoint]"); 
        const {params} = ob;
        const {paths} = params;
        const hookPath = paths.length >= 4 ? paths[3] : null;
        const {qstring} = params || {};

        //A lookup, not a scan: the map is built once per rule refresh, so a path collision
        //is resolved there rather than on every request. See indexRulesByPath.
        const rule = hookPath ? this._rulesByPath.get(hookPath) : null;
        if (!rule || !hookPath) {
            return false;
        }

        utils.updateRuleTriggerTime(rule._id);
        // send to pipeline
        const data = {
            params: qstring,
            rule: rule,
        };
        this.pipeline(data);
        return data;
    }

    /**
     * register trigger processor
     */
    register() {
        plugins.register("/o/hooks", (ob) => {
            const {params} = ob;
            this.process(ob);
            common.returnOutput(params, "ok");
            return true;
        });
    }
}

module.exports = APIEndPointTrigger;
