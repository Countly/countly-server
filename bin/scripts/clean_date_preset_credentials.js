/**
 * Removes authentication values that earlier versions of the date preset handlers
 * stored inside the preset document.
 *
 * Both write handlers used to copy every unrecognised request parameter onto the
 * document. api_key and auth_token are accepted as request parameters, so a preset
 * created or updated through URL authentication kept the caller's credential, and the
 * read endpoint returned the whole document to everybody the preset was shared with.
 * The handlers no longer do this, but a value stored before the fix stays there.
 *
 * The dashboard sends its token as a header and posts a fixed field list, so most
 * installs will find nothing. Anything scripted against the API may have stored one.
 *
 * Safe to run more than once. Only the two credential fields are removed; any other
 * unexpected field is reported and left alone, so nothing an operator or a plugin put
 * there on purpose is lost.
 *
 * Usage: node bin/scripts/clean_date_preset_credentials.js
 */

var plugins = require('../../plugins/pluginManager.js');

var CREDENTIAL_FIELDS = ['api_key', 'auth_token'];

var KNOWN_FIELDS = [
    '_id', 'name', 'range', 'exclude_current_day', 'share_with', 'shared_email_edit',
    'shared_email_view', 'shared_user_groups_edit', 'shared_user_groups_view',
    'owner_id', 'fav', 'sort_order', 'created_at', 'edited_at'
];

plugins.dbConnection("countly").then(async function(countlyDb) {
    try {
        var presets = await countlyDb.collection('date_presets').find({}).toArray();
        console.log("Checking", presets.length, "date presets");

        var affected = presets.filter(function(preset) {
            return CREDENTIAL_FIELDS.some(function(field) {
                return typeof preset[field] !== "undefined";
            });
        });

        for (let i = 0; i < affected.length; i++) {
            var unset = {};
            CREDENTIAL_FIELDS.forEach(function(field) {
                if (typeof affected[i][field] !== "undefined") {
                    unset[field] = "";
                }
            });
            await countlyDb.collection('date_presets').updateOne(
                {_id: affected[i]._id},
                {$unset: unset}
            );
            console.log("Removed", Object.keys(unset).join(", "), "from preset", affected[i]._id + "", "owned by", affected[i].owner_id);
        }

        console.log(affected.length ? "Cleaned " + affected.length + " preset(s)." : "Nothing to clean.");

        if (affected.length) {
            console.log("The credentials that were stored should be treated as exposed to everybody those presets were shared with. Rotate them: change the api_key of each owner listed above, and have them sign in again to invalidate the auth token.");
        }

        //other stray fields are reported rather than removed, since only the owner of a
        //given deployment can say whether something was put there deliberately
        var stray = {};
        presets.forEach(function(preset) {
            Object.keys(preset).forEach(function(field) {
                if (!KNOWN_FIELDS.includes(field) && !CREDENTIAL_FIELDS.includes(field)) {
                    stray[field] = (stray[field] || 0) + 1;
                }
            });
        });
        if (Object.keys(stray).length) {
            console.log("Fields outside the preset's own set are also present, left untouched:", JSON.stringify(stray));
        }
    }
    catch (error) {
        console.log("Failed to clean date presets", error);
    }
    countlyDb.close();
});
