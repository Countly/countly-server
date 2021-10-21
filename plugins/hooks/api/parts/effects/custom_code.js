const vm = require('vm');
const utils = require("../../utils");
const common = require('../../../../../api/utils/common.js');
const log = common.log("hooks:api:api_custom_code_effect");

const request = require("request");
/**
 * custom code effect
 */
class CustomCodeEffect {
    /**
     * Init function
     */
    constructor() {
    }

    /**
     * main function to run effect
     * @param {object} options - options for required variable
     * @return {object} - return processed options object.
     */
    async run(options) {
        const {effect, params, rule} = options;
        let genCode = "";
        let runtimePassed = true ;
        let logs = [];
        await  new Promise(CUSTOM_CODE_RESOLVER => {
            const code = effect.configuration.code;
            const CUSTOM_CODE_ERROR_CALLBACK = (e) => {
                console.log(e,"eee, exech333333!!")
                utils.addErrorRecord(rule._id, e);
            }

            genCode = `
                const CUSTOM_MAIN = async () => {
                   
                    try {
                        ${code}
                     }
                     catch(e) {
                        CUSTOM_CODE_ERROR_CALLBACK(e);                        
                        CUSTOM_CODE_RESOLVER();
                     }
                     CUSTOM_CODE_RESOLVER();
                }
                CUSTOM_MAIN();
            `
            vm.runInNewContext(genCode, {params, setTimeout, request, CUSTOM_CODE_RESOLVER, CUSTOM_CODE_ERROR_CALLBACK},{ timeout: 30000, microtaskMode: 'afterEvaluate' });
            options.params = params;
        }).catch(e => {
            runtimePassed = false;
            log.e("got error when executing custom code", e, genCode, options);
            logs.push(`message:${e.message}
                stack: ${JSON.stringify(e.stack)}
            `);
            utils.addErrorRecord(rule._id, e);
            console.log(e,"eee, exech!!")
        });
        return  runtimePassed ? options : {params: null, logs};
    }
}

module.exports = CustomCodeEffect;
