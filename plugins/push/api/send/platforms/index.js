const fs = require('fs'),
    path = require('path');

let PLATFORM = {}, // i: {...}, a: {...}, h: {...}
    extractors = [], // {i: qstring => [field, token]}
    guesses = [],
    FIELDS = {}, // {i0: 'ip', i1: 'id', i2: 'ia', 'a0': 'ap', 'a2': 'at', ...}
    FIELDS_TITLES = {}, // {'tkip': 'iOS Production Token', ...}
    PLATFORMS_TITLES = {}, // {'i': 'iOS', ...}
    CREDS = {}, // '{ios_token: class TokenCreds}
    TK = 'tk';

fs.readdirSync(__dirname).filter(f => f !== 'index.js' && f.endsWith('.js')).forEach(f => {
    PLATFORM[f.substr(0, f.lastIndexOf('.'))] = require(path.join(__dirname, f));
});

const platforms = Object.keys(PLATFORM);

for (let p in PLATFORM) {
    extractors.push(PLATFORM[p].extractor);
    if (PLATFORM[p].guess) {
        guesses.push(PLATFORM[p].guess);
    }
    PLATFORMS_TITLES[p] = PLATFORM[p].title;
    for (let num in PLATFORM[p].FIELDS) {
        FIELDS[p + num] = p + PLATFORM[p].FIELDS[num];
    }
    for (let num in PLATFORM[p].FIELDS_TITLES) {
        FIELDS_TITLES[TK + p + PLATFORM[p].FIELDS[num]] = PLATFORM[p].FIELDS_TITLES[num];
    }
    for (let name in PLATFORM[p].CREDS) {
        CREDS[name] = PLATFORM[p].CREDS[name];
    }
}

/**
 * Get field name for given platform/field
 * 
 * @param {string} p platform key
 * @param {string} f field ken
 * @param {boolean} appUsers true if return field name in app_usersAPPID collection, false if we need field name for push_APPID collection
 * @returns {string[]} field name
 */
function field(p, f, appUsers = false) {
    if (appUsers) {
        return TK + p + f;
    }
    else {
        return TK + '.' + p + f;
    }
}

/**
 * Get all fields for given platforms
 * 
 * @param {string[]} plfms platform keys
 * @param {boolean} appUsers true if return field names in app_usersAPPID collection, false if we need field names for push_APPID collection
 * @returns {string[]} array of field names
 */
function fields(plfms, appUsers = false) {
    return plfms.map(p => Object.values(PLATFORM[p].FIELDS).map(f => field(p, f, appUsers))).flat();
}

/**
 * Extract token & field from token_session request by running an extractor for each platform
 * 
 * @param {object} qstring request params
 * @returns {string[]|undefined} [platform, field, token] if info is found in request, undefined otherwise
 */
function extract(qstring) {
    for (let i = 0; i < extractors.length; i++) {
        let res = extractors[i](qstring);
        if (res) {
            return res;
        }
    }
}

/**
 * Make an estimated guess about request platform
 * 
 * @param {string} userAgent user-agent header
 * @returns {string} platform key if guessed successfully
 */
function guess(userAgent) {
    for (let i = guesses.length - 1; i >= 0; i--) {
        let res = guesses[i](userAgent);
        if (res) {
            return res;
        }
    }
}


module.exports = {
    platforms,
    PLATFORM,
    extract,
    guess,
    FIELDS,
    FIELDS_TITLES,
    PLATFORMS_TITLES,
    CREDS,
    TK,
    field,
    fields,
    allAppUserFields: fields(platforms, true)
};