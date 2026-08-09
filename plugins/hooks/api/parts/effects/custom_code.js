const utils = require("../../utils");
const common = require('../../../../../api/utils/common.js');
const log = common.log("hooks:api:api_custom_code_effect");
const ivm = require("isolated-vm");

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
        let runtimePassed = true;
        let logs = [];
        let isolate;

        try {
            const code = effect.configuration.code;

            // Create isolated VM instance
            isolate = new ivm.Isolate({ memoryLimit: 128 });
            const context = await isolate.createContext();
            const jail = context.global;

            // Set up global object
            await jail.set('global', jail.derefInto());

            // Set up params. JSON round-trip matches the previous v8-sandbox
            // transport (ObjectId/Date -> string, functions dropped) so existing
            // custom code sees the same param shapes it did before.
            const clonedParams = params === undefined ? undefined : JSON.parse(JSON.stringify(params));
            await jail.set('params', new ivm.ExternalCopy(clonedParams).copyInto());

            // Set up setResult function using JSON serialization for simplicity
            let resultValue = null;
            const setResultRef = new ivm.Reference(function(jsonString) {
                // Receive JSON string and parse it
                resultValue = JSON.parse(jsonString);
            });
            await jail.set('$setResult', setResultRef);

            // Create wrapper function in isolate that serializes and calls the reference
            const wrapperScript = await isolate.compileScript('globalThis.setResult = function(arg) { return $setResult.applySync(undefined, [JSON.stringify(arg)]); }');
            await wrapperScript.run(context);

            // Prepare code
            genCode = `
                ${code}
                setResult({ value: params });
            `;

            // Compile and run the script
            const script = await isolate.compileScript(genCode);
            await script.run(context, { timeout: 3000 });

            // Assign whenever a value key was set, so custom code that intentionally
            // blanks params (0, "", false, null) is honored, matching the previous
            // unconditional assignment.
            options.params = resultValue && Object.prototype.hasOwnProperty.call(resultValue, 'value') ? resultValue.value : undefined;
            log.d("Resolved value:", options.params);
        }
        catch (e) {
            runtimePassed = false;
            // the previous sandbox assigned its undefined result even on failure,
            // so a failed run must not leak the original params downstream
            options.params = undefined;
            log.e("got error when executing custom code", e, genCode, options);
            logs.push(`Error: ${e.message}`);
            utils.addErrorRecord(rule._id, e, params, effectStep, _originalInput);
        }
        finally {
            // Clean up isolate. dispose() throws if the isolate was already torn
            // down (e.g. after a memory-limit abort), which would mask the real error.
            if (isolate) {
                try {
                    isolate.dispose();
                }
                catch (disposeErr) {
                    log.d("isolate already disposed:", disposeErr.message);
                }
            }
        }

        return runtimePassed ? options : {...options, logs};
    }
}

module.exports = CustomCodeEffect;