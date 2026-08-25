/**
 * Bring an existing install's configured security headers in line with the current
 * defaults.
 *
 * Config defaults only seed keys that are absent: pluginManager.checkConfigs uses
 * getObjectDiff, which copies a default across only when the stored value is undefined.
 * So an install that already has security.dashboard_additional_headers keeps whatever it
 * was first seeded with, forever, and a change to the shipped default reaches new
 * installs only. That is why this script exists.
 *
 * It edits rather than overwrites, so anything an operator added by hand survives:
 *
 *  - drops X-XSS-Protection. Deprecated, removed from every current browser, and usable
 *    as an attack primitive: it could be steered into disabling a page's own scripts,
 *    and with mode=block the aborted load is observable cross-origin, which makes it an
 *    oracle for reading page contents.
 *  - drops the `preload` token from Strict-Transport-Security, but only from the line
 *    this product used to seed. Preload is a one-way commitment that needs the domain
 *    submitted to the browser preload list and is painful to undo, so it should not have
 *    been a default - but an operator who set it deliberately has a domain on that list,
 *    and quietly stopping serving the token does not undo the commitment while it can
 *    cost them their place on the list. Any other HSTS line is left exactly as found.
 *  - appends Referrer-Policy, Permissions-Policy and X-Content-Type-Options if absent.
 *
 *  - appends Cross-Origin-Opener-Policy to the dashboard block, and only that block.
 *    It is in the shipped dashboard default now, and config defaults never reach an
 *    install that already has the key, so without this an upgraded dashboard would go
 *    without opener isolation indefinitely while a fresh one gets it. The widget routes
 *    take it back off for their own responses.
 *
 * Deliberately does not add Cross-Origin-Resource-Policy: it is applied by global
 * middleware that also covers the embeddable widget routes (/feedback/rating and the
 * widget asset routes), which customers embed from their own origins.
 */

const pluginManager = require('../../../../plugins/pluginManager.js');

const KEYS = ['dashboard_additional_headers', 'api_additional_headers'];

const REQUIRED = [
    {name: 'X-Content-Type-Options', line: 'X-Content-Type-Options: nosniff'},
    {name: 'Referrer-Policy', line: 'Referrer-Policy: strict-origin-when-cross-origin'},
    {name: 'Permissions-Policy', line: 'Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()'}
];

//dashboard only: the api block is not a browsing context, and the widget responses
//remove it for themselves
const REQUIRED_DASHBOARD = [
    {name: 'Cross-Origin-Opener-Policy', line: 'Cross-Origin-Opener-Policy: same-origin-allow-popups'}
];

//The line this product seeded, and the only Strict-Transport-Security value the preload
//token is removed from. Compared with whitespace collapsed, since the stored value has
//been through a text field.
const SEEDED_HSTS = 'strict-transport-security:max-age=31536000; includesubdomains; preload';

/**
 * Whether an HSTS line is the one this product used to ship, rather than an operator's.
 * @param {string} line - the stored header line
 * @returns {boolean} true when it matches the seeded value
 */
function isSeededHsts(line) {
    return String(line).replace(/\s+/g, ' ').replace(/\s*:\s*/, ':').trim().toLowerCase() === SEEDED_HSTS;
}

/**
 * Rewrite one configured header block.
 * @param {string} value - the stored newline separated header string
 * @param {string} [key] - which block this is, so the dashboard gets its extra headers
 * @returns {string|null} the new value, or null when nothing needed changing
 */
function rewrite(value, key) {
    if (typeof value !== 'string') {
        return null;
    }
    const lines = value.replace(/\r\n|\r/g, '\n').split('\n');
    const kept = [];

    for (const line of lines) {
        const name = line.split(':')[0].trim().toLowerCase();
        if (name === 'x-xss-protection') {
            continue;
        }
        if (name === 'strict-transport-security') {
            // only from the line this product seeded: an operator who added preload
            // themselves has a domain on the browser preload list, and dropping the
            // token neither undoes that nor keeps them eligible
            kept.push(isSeededHsts(line) ? line.replace(/;\s*preload\b/i, '') : line);
            continue;
        }
        kept.push(line);
    }

    const present = kept.map((l) => l.split(':')[0].trim().toLowerCase());
    const required = REQUIRED.concat(key === 'dashboard_additional_headers' ? REQUIRED_DASHBOARD : []);
    for (const req of required) {
        if (present.indexOf(req.name.toLowerCase()) === -1) {
            kept.push(req.line);
        }
    }

    const next = kept.filter((l) => l.trim().length).join('\n');
    return next === value ? null : next;
}

pluginManager.dbConnection().then(async(db) => {
    try {
        const doc = await db.collection('plugins').findOne({_id: 'plugins'});
        const security = (doc && doc.security) || {};
        const update = {};

        for (const key of KEYS) {
            if (typeof security[key] === 'undefined') {
                // never configured, so the shipped default applies already
                console.log('security.' + key + ': not set, leaving to the default');
                continue;
            }
            const next = rewrite(security[key], key);
            if (next === null) {
                console.log('security.' + key + ': already current');
                continue;
            }
            update['security.' + key] = next;
            console.log('security.' + key + ': updating');
            console.log('  from: ' + JSON.stringify(security[key]));
            console.log('  to:   ' + JSON.stringify(next));
        }

        if (Object.keys(update).length) {
            await db.collection('plugins').updateOne({_id: 'plugins'}, {$set: update});
            console.log('Security headers updated');
        }
        else {
            console.log('Nothing to update');
        }
    }
    catch (err) {
        //exit non-zero: the runner treats a clean exit as "this step is done" and
        //advances the database version, and nothing rewrites these headers later, so a
        //transient database error here would otherwise mean the migration is recorded as
        //applied and never runs again
        console.error('Error while standardizing security headers', err);
        db.close();
        process.exit(1);
        return;
    }

    db.close();
});

module.exports = {rewrite};
