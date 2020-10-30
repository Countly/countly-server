const plugins = require('../../../../pluginManager.js');
const common = require('../../../../../api/utils/common.js');
const utils = require('../../utils.js');
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
                return r.trigger.type === 'APIEndPointTrigger';
            });
            this._rules = newRules;
        }
    }

    /**
     * process pipeline feed, pick out matched record with rule
     * @param {object} ob - trggered out from pipeline
     */
    async process(ob) {
        const {params} = ob;
        const {paths} = params;
        const hookPath = paths.length >= 4 ? paths[3] : null;
        if (!hookPath) {
            return true;
        }
        const {qstring} = params || {};

        this._rules.forEach(rule => {
            // match
            if (rule.trigger.configuration.path === hookPath) {
                try {
                    utils.updateRuleTriggerTime(rule._id);
                }
                catch (err) {
                    console.log(err, "[APIEndPointTrigger]");
                }
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
