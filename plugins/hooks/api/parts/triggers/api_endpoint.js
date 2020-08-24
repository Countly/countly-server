const plugins = require('../../../../pluginManager.js');
const common = require('../../../../../api/utils/common.js');
const process = require('process');

class APIEndPointTrigger {
    constructor(options){
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
                return r.trigger.type === 'APIEndPointTrigger';
            });
            this._rules = newRules;
        }
    }

    async process(ob) {
        const {params} = ob; 
        const {paths}  = params; 
        const hookPath = paths.length >= 4 ? paths[3] : null;
        if(!hookPath) {
            return true;
        }
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
        plugins.register("/o/hooks", (ob) => {
            const {params} = ob;
            this.process(ob);
            common.returnOutput(params, "ok!" + 'pid:' + process.pid + "." + process.ppid);
            return true;
            //process sdk request here
        });
    }
}

module.exports = APIEndPointTrigger;
