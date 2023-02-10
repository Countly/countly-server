const utils = require("../../utils");
const common = require('../../../../../api/utils/common.js');
const log = common.log("hooks:api:api_custom_code_effect");
const request = require("countly-request");
const {NodeVM} = require('vm2');

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
        const {effect, params, rule, effectStep, _originalInput} = options;
        let genCode = "";
        let runtimePassed = true ;
        let logs = [];
        try {
            await new Promise(CUSTOM_CODE_RESOLVER => {
                const code = effect.configuration.code;
                /**
                 * function for rejection of effect
                 * @param {object} e - error object
                 */
                const CUSTOM_CODE_ERROR_CALLBACK = (e) => {
                    runtimePassed = false;
                    log.e("got error when executing custom code", e, genCode, options);
                    logs.push(`Error: ${e.message}`);
                    utils.addErrorRecord(rule._id, e, params, effectStep, _originalInput);
                };

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
                `;
                const vm = new NodeVM({
                    timeout: 30000,
                    console: 'inherit',
                    sandbox: {params, setTimeout, request, CUSTOM_CODE_RESOLVER, CUSTOM_CODE_ERROR_CALLBACK},
                    require: false,
                });
                vm.run(genCode, 'vm.js');
            });
        }
        catch (e) {
            runtimePassed = false;
            log.e("got error when executing custom code", e, genCode, options);
            logs.push(`Error: ${e.message}`);
            utils.addErrorRecord(rule._id, e, params, effectStep, _originalInput);
        }
        return runtimePassed ? options : {...options, logs};
    }
}

module.exports = CustomCodeEffect;