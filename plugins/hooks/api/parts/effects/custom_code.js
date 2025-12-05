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

            // Set up params
            await jail.set('params', new ivm.ExternalCopy(params).copyInto());

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

            // Get the result
            if (resultValue && resultValue.value) {
                options.params = resultValue.value;
                log.d("Resolved value:", resultValue.value);
            }

        }
        catch (e) {
            runtimePassed = false;
            log.e("got error when executing custom code", e, genCode, options);
            logs.push(`Error: ${e.message}`);
            utils.addErrorRecord(rule._id, e, params, effectStep, _originalInput);
        }
        finally {
            // Clean up isolate
            if (isolate) {
                isolate.dispose();
            }
        }

        return runtimePassed ? options : {...options, logs};
    }
}

module.exports = CustomCodeEffect;