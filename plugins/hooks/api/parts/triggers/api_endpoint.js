const plugins = require('../../../../pluginManager.js');
const common = require('../../../../../api/utils/common.js');
const utils = require('../../utils.js');
const log = common.log('hooks:api_endpoint_trigger');
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

        let rule = null;
        this._rules.forEach(r => {
            if (r.trigger.configuration.path === hookPath) {
                rule = r;
            }
        });
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
