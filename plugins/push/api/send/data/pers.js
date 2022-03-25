const { dot } = require('../../../../../api/utils/common');

/**
 * Personalize function. A factory to create a function which would apply personalization to a given string.
 * 
 * @param {String} string string to personalize
 * @param {Object} personaliztion object of {5: {f: 'fallback', c: false, k: 'key'}, 10: {...}} kind
 * 
 * @returns {function} function with single obejct parameter which returns final string for a given data
 */
module.exports = function personalize(string, personaliztion) {
    let parts = [],
        indicies = personaliztion ? Object.keys(personaliztion).map(n => parseInt(n, 10)) : [],
        i = 0,
        def;

    indicies.forEach(idx => {
        if (i < idx) {
            parts.push(string.substr(i, idx));
        }
        parts.push(function(data) {
            let pers = personaliztion[idx];
            data = dot(data, pers.k);
            if (pers.c && data) {
                if (typeof data !== 'string') {
                    data = data + '';
                }
                return data.substr(0, 1).toUpperCase() + data.substr(1);
            }
            return data === null || data === undefined ? pers.f : (data + '');
        });
        i = idx + 1;
    });

    if (i < string.length) {
        parts.push(string.substr(i, string.length));
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