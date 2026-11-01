/**
* Declarations of which core configuration a member who is not a global admin may
* read, and which core values are credentials that must never be returned.
*
* These live in a module rather than in an entry point because the metadata is
* process local. The API and the dashboard are separate processes, each with its own
* pluginManager instance, and a declaration made in one is invisible to the other.
* The dashboard serializes the security namespace into every page it renders, so a
* registration that ran only in api/api.js left omitSecretConfigs() with nothing to
* omit there, and the stored proxy credentials stayed in the page source of every
* logged in user.
*
* Both entry points call register() so the two processes agree.
* @module api/utils/configMetadata
*/

/**
* Declare the readable and secret core configuration on a pluginManager instance.
* Safe to call more than once: both setters merge into the existing declaration.
* @param {object} plugins - the pluginManager instance to declare on
* @returns {void}
*/
exports.register = function(plugins) {
    //What a non global admin may read from the api namespace. The first group is what
    //App Management renders: the dashboard infers each input's widget from the type of
    //the value here, so a key missing from this list means that setting disappears from
    //the screen. Keep it in step with showInAppManagment in the plugins frontend.
    //
    //domain is separate: crash symbolication builds its return URL from it, and falls
    //back to the browser's origin when it is absent, which is wrong behind a custom
    //domain rather than merely cosmetic.
    plugins.setReadableConfigs("api", {
        safe: true,
        session_duration_limit: true,
        country_data: true,
        city_data: true,
        event_limit: true,
        event_segmentation_limit: true,
        event_segmentation_value_limit: true,
        metric_limit: true,
        session_cooldown: true,
        total_users: true,
        prevent_duplicate_requests: true,
        metric_changes: true,
        trim_trailing_ending_spaces: true,
        domain: true
    });

    //the dashboard reads the password policy to validate a new password before sending
    //it. Nothing else from this namespace is readable, which is what keeps the proxy
    //credentials out of the response.
    plugins.setReadableConfigs("security", {
        password_min: true,
        password_char: true,
        password_number: true,
        password_symbol: true,
        password_expiration: true,
        password_autocomplete: true
    });

    //the outbound proxy credentials. The whole security namespace used to be
    //serialized into the dashboard page and returned to any app admin, so these were
    //readable well below the operator who set them. The dashboard only uses the
    //password policy keys from this namespace, so nothing needs them.
    plugins.setSecretConfigs("security", {
        proxy_username: true,
        proxy_password: true
    });
};
