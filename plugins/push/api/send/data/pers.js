const { dot } = require('../../../../../api/utils/common');

/**
 * Personalize function. A factory to create a function which would apply personalization to a given string.
 * 
 * @param {String} string string to personalize
 * @param {Object} personalizations object of {5: {f: 'fallback', c: false, k: 'key'}, 10: {...}} kind
 * 
 * @returns {function} function with single obejct parameter which returns final string for a given data
 */
module.exports = function personalize(string, personalizations) {
    let parts = [];
    let def;
    let i = 0;
    let indexes = Object.keys(personalizations || {}).map(n => parseInt(n, 10));

    indexes.forEach(idx => {
        if (i < idx) {
            const subStringLength = idx - i;
            // push all the string that appears before the personalization index
            parts.push(string.substr(i, subStringLength));
        }

        // push the personalization function
        parts.push(function(data) {
            let personalization = personalizations[idx];

            data = dot(data, personalization.k);

            if (personalization.c && data) {
                if (typeof data !== 'string') {
                    data = data + '';
                }

                return data.substr(0, 1).toUpperCase() + data.substr(1);
            }

            // if data does not exist return fallback value
            return data === null || data === undefined ? personalization.f : (data + '');
        });

        i = idx;
    });

    if (i < string.length) {
        parts.push(string.substr(i));
    }

    /**
     * A personalization-applying function; to be called with `p` property of a notification object
     * 
     * @param {Object} data object to take data from
     * @returns {string} personalized message
     */
    const compile = function(data) {
        if (data) {
            for (let _k in data) {
                return parts.map(p => typeof p === 'string' ? p : p(data)).join('');
            }
        }

        return def;
    };

    // a message with all slots filled with default values
    def = compile({___dummy: true});

    return compile;
};
