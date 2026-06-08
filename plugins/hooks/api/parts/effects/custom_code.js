const utils = require("../../utils");
const common = require('../../../../../api/utils/common.js');
const log = common.log("hooks:api:api_custom_code_effect");
const {Sandbox} = require("v8-sandbox");

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
                    ${code}
                    setResult({ value: params });
                `;
                // Disable the sandbox's built-in httpRequest helper. v8-sandbox
                // enables it by default, which would let custom code make
                // arbitrary server-side requests (to loopback, link-local,
                // cloud-metadata and other internal targets) completely
                // bypassing the SSRF validation applied to the HTTPEffect path.
                // Hooks that need outbound HTTP must use the HTTPEffect, whose
                // URL is checked with ssrfProtection.isUrlSafe().
                const sandbox = new Sandbox({ httpEnabled: false });

                (async() => {
                    const { error, value } = await sandbox.execute({ code: genCode, timeout: 3000, globals: { params } });

                    await sandbox.shutdown();

                    if (error) {
                        CUSTOM_CODE_ERROR_CALLBACK(error);
                    }
                    options.params = value;
                    log.d("Resolved value:", value);
                    CUSTOM_CODE_RESOLVER();
                })();
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