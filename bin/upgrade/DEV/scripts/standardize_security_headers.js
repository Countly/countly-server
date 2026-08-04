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
 *  - drops the `preload` token from Strict-Transport-Security. Preload is a one-way
 *    commitment that needs the domain submitted to the browser preload list and is
 *    painful to undo, so it should be an operator's choice rather than a default. The
 *    max-age and includeSubDomains parts are left alone.
 *  - appends Referrer-Policy, Permissions-Policy and X-Content-Type-Options if absent.
 *
 * Deliberately does not add Cross-Origin-Opener-Policy or Cross-Origin-Resource-Policy:
 * these headers are applied by global middleware that also covers the embeddable widget
 * routes (/feedback/rating and the widget asset routes), which customers embed from
 * their own origins, so setting them here would break those.
 */

const pluginManager = require('../../../../plugins/pluginManager.js');

const KEYS = ['dashboard_additional_headers', 'api_additional_headers'];

const REQUIRED = [
    {name: 'X-Content-Type-Options', line: 'X-Content-Type-Options: nosniff'},
    {name: 'Referrer-Policy', line: 'Referrer-Policy: strict-origin-when-cross-origin'},
    {name: 'Permissions-Policy', line: 'Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()'}
];

/**
 * Rewrite one configured header block.
 * @param {string} value - the stored newline separated header string
 * @returns {string|null} the new value, or null when nothing needed changing
 */
function rewrite(value) {
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
            // remove only the preload token, keep max-age and includeSubDomains
            kept.push(line.replace(/;\s*preload\b/i, ''));
            continue;
        }
        kept.push(line);
    }

    const present = kept.map((l) => l.split(':')[0].trim().toLowerCase());
    for (const req of REQUIRED) {
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
            const next = rewrite(security[key]);
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
        console.error('Error while standardizing security headers', err);
    }

    db.close();
});

module.exports = {rewrite};
