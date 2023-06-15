/*global store, jQuery, $, document, countlyGlobal, filterXSS */
/*exported showMessage, addLocalization */

/**
 * Javascript file loaded on pre login pages with some handy global functions
 * @name Pre Login
 * @global
 * @namespace Pre Login
 */


/**
* This method is called to show user a message, like error when loging in. By default this is taken from query parameter or passed to template directly as message variable
* @param {string} key - key from localization property file
* @memberof Pre Login
*/
function showMessage(key, prop) {
    key = encodeSomeHtml(key);
    $("#message").data("localize", key);
    if (jQuery.i18n.map[key]) {
        $("#message").html(jQuery.i18n.prop(key, prop));
    }
    else {
        $("#message").html("Error occurred without localized message");
    }
}

var htmlEncodeOptions = {
    "whiteList": {"a": ["href", "class", "target"], "b": [], "br": [], "strong": [], "p": [], "span": ["class"], "div": ["class"]},
    onTagAttr: function(tag, name, value/* isWhiteAttr*/) {
        if (tag === "a") {
            if (name === "target" && !(value === "_blank" || value === "_self" || value === "_top" || value === "_parent")) {
                return "target='_blank'"; //set _blank if incorrect value
            }

            if (name === "href" && !(value.substr(0, 1) === "#" || value.substr(0, 1) === "/" || value.substr(0, 4) === "http")) {
                return "href='#'"; //set # if incorrect value
            }
        }
    }
};

/**
* Encode some tags, leaving those set in whitelist as they are.
* @memberof Pre Login
* @param {string} html - value to encode
* @param {object} options for encoding. Optional. If not passed, using default in common.
* @returns {string} encode string
*/
function encodeSomeHtml(html, options) {
    if (options) {
        return filterXSS(html, options);
    }
    else {
        return filterXSS(html, htmlEncodeOptions);
    }
}

/**
* By default only pre-login property file localization is available on prelogin pages, but you can additionally load other localization files, like for example needed for your plugin, using this function
* @memberof Pre Login
* @param {string} name - base name of the property file without the locale/language. Should be the same name as your plugin
* @param {string} path - url path to where the localization file currently resides relative to the page you want to load it from
* @param {function} callback - callback executed when localization file is loaded
* @memberof Pre Login
* @example
* addLocalization('enterpriseinfo', countlyGlobal["cdn"]+'enterpriseinfo/localization/');
*/
function addLocalization(name, path, callback) {
    var langs = jQuery.i18n.map;
    var lang = store.get("countly_lang") || "en";
    jQuery.i18n.properties({
        name: name,
        path: [path],
        mode: 'map',
        language: lang,
        callback: function() {
            $.each(jQuery.i18n.map, function(key, value) {
                if (countlyGlobal.company) {
                    langs[key] = value.replace(new RegExp("Countly", 'ig'), countlyGlobal.company);
                }
                langs[key] = encodeSomeHtml(value);
            });

            jQuery.i18n.map = langs;

            $("[data-localize]").each(function() {
                var elem = $(this),
                    localizedValue = jQuery.i18n.map[elem.data("localize")];

                if (elem.is("input[type=text]") || elem.is("input[type=password]")) {
                    elem.attr("placeholder", localizedValue);
                }
                else if (elem.is("input[type=button]") || elem.is("input[type=submit]")) {
                    elem.attr("value", localizedValue);
                }
                else {
                    elem.html(jQuery.i18n.map[elem.data("localize")]);
                }
            });
            if (callback) {
                callback();
            }
        }
    });
    $(document).bind('clyLangChange', function() {
        addLocalization(name, path, callback);
    });
}

$(document).ready(function() {

    var lang = "en";
    if (store.get("countly_lang")) {
        lang = store.get("countly_lang");
        $("#active-lang").text(lang.toUpperCase());
        $("#form-lang").val(lang);
    }

    jQuery.i18n.properties({
        name: 'pre-login',
        path: [countlyGlobal["cdn"] + 'localization/pre-login/'],
        mode: 'map',
        language: lang,
        callback: function() {
            $.each(jQuery.i18n.map, function(key, value) {
                if (countlyGlobal.company) {
                    jQuery.i18n.map[key] = value.replace(new RegExp("Countly", 'ig'), countlyGlobal.company);
                }
                jQuery.i18n.map[key] = encodeSomeHtml(value);
            });

            $("[data-localize]").each(function() {
                var elem = $(this),
                    localizedValue = jQuery.i18n.map[elem.data("localize")];

                if (elem.is("input[type=text]") || elem.is("input[type=password]")) {
                    elem.attr("placeholder", localizedValue);
                }
                else if (elem.is("input[type=button]") || elem.is("input[type=submit]")) {
                    elem.attr("value", localizedValue);
                }
                else {
                    elem.html(jQuery.i18n.map[elem.data("localize")]);
                }
            });
        }
    });

    $("#reset-password-form").submit(function() {
        if ($("input[name=password]").val() != $("input[name=again]").val()) {
            return false;
        }
    });

    $("#select-lang").click(function() {
        $(this).toggleClass("active");
    });

    $("#langs .item").click(function() {
        var langCode = $(this).data("language-code"),
            langCodeUpper = langCode.toUpperCase();

        store.set("countly_lang", langCode);
        $("#active-lang").text(langCodeUpper);
        $("#form-lang").val(langCode);

        jQuery.i18n.properties({
            name: 'pre-login',
            path: [countlyGlobal["cdn"] + 'localization/pre-login/'],
            mode: 'map',
            language: langCode,
            callback: function() {
                // Localization test
                //$.each(jQuery.i18n.map, function(key, value) {
                //	jQuery.i18n.map[key] = key;
                //});

                $(document).trigger('clyLangChange');

                $("[data-localize]").each(function() {
                    var elem = $(this),
                        localizedValue = jQuery.i18n.map[elem.data("localize")];

                    if (elem.is("input[type=text]") || elem.is("input[type=password]")) {
                        elem.attr("placeholder", localizedValue);
                    }
                    else if (elem.is("input[type=button]") || elem.is("input[type=submit]")) {
                        elem.attr("value", localizedValue);
                    }
                    else {
                        elem.html(jQuery.i18n.map[elem.data("localize")]);
                    }
                });
            }
        });
    });
});
