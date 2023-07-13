/**
* Module for server side localization. Uses minimized localization files at frontend/express/public/localization/min/
* @module api/utils/localization
*/

/** @lends module:api/utils/localization */
var locale = {},
    fs = require('fs'),
    path = require('path'),
    parser = require('properties-parser'),
    log = require('./log')('api:localization'),
    common = require('./common');

var dir = path.resolve(__dirname, '../../frontend/express/public/localization/min');
var file = "locale";
var default_lang = "en";
var orig = {};
var localized = {};

try {
    var data = fs.readFileSync(dir + '/' + file + '.properties', "utf8");
    orig = parser.parse(data);
}
catch (ex) {
    orig = {};
}
/**
* Replaces placeholders in localized string with provided values
* @param {string} value - localized value with placeholders to be replaced
* @param {...*} var_args - other arguments to be inserted in localized string's placeholder places {}
* @returns {string} localized string with placeholders replaced by provided var_args values
* @example
* localize.getProperties(member.lang, function(err, properties){
*     var message = localize.format(properties["mail.new-member"], mail.getUserFirstName(member), host, member.username, memberPassword);
*     mail.sendMessage(member.email, properties["mail.new-member-subject"], message);
* });
*/
locale.format = function(value /* Add parameters as function arguments as necessary  */) {
    var re, list;
    try {
        if (arguments[1] && Array.isArray(arguments[1])) {
            list = arguments[1];
        }
        else {
            list = Array.prototype.slice.call(arguments).slice(1, arguments.length);
        }

        for (var i = 0; i < list.length; i++) {
            re = new RegExp('\\{' + i + '\\}', "g");
            value = value.replace(re, list[i]);
        }
        return value;
    }
    catch (e) {
        log.e('format() error for value "%s" list %j:', value, list, e);
        return '';
    }
};

/**
* Fetches single localized string by property name for provided language
* @param {string} lang - 2 symbol code for localization file to be fetched, for example, "en"
* @param {string} name - name of the localized proeprty to fetch
* @param {function} callback - function to be called when localized proeprty files was fetched, receiving first param as error and second as localized string
* @example
* localize.getProperty(member.lang, "mail.new-member-subject", function(err, subject){
*     mail.sendMessage(member.email, subject);
* });
*/
locale.getProperty = function(lang, name, callback) {
    if (lang === default_lang) {
        callback(null, orig[name] || "[" + name + "]");
    }
    else if (!localized[lang]) {
        localized[lang] = JSON.parse(JSON.stringify(orig));
        fs.readFile(dir + '/' + common.sanitizeFilename(file) + '_' + common.sanitizeFilename(lang) + '.properties', 'utf8', function(err, local_properties) {
            if (!err && local_properties) {
                local_properties = parser.parse(local_properties);
                for (var i in local_properties) {
                    localized[lang][i] = local_properties[i];
                }
            }
            callback(null, localized[lang][name] || "[" + name + "]");
        });
    }
    else {
        callback(null, localized[lang][name] || "[" + name + "]");
    }
};

/**
* Fetches whole localized object with property names as key and localized strings as values for provided language
* @param {string} lang - 2 symbol code for localization file to be fetched, for example, "en"
* @param {function} callback - function to be called when localized proeprty files was fetched, receiving first param as error and second as properties object
* @example
* localize.getProperties(member.lang, function(err, properties){
*     var message = localize.format(properties["mail.new-member"], mail.getUserFirstName(member), host, member.username, memberPassword);
*     mail.sendMessage(member.email, properties["mail.new-member-subject"], message);
* });
*/
locale.getProperties = function(lang, callback) {
    if (lang === default_lang) {
        callback(null, JSON.parse(JSON.stringify(orig || {})));
    }
    else if (!localized[lang]) {
        localized[lang] = JSON.parse(JSON.stringify(orig));
        fs.readFile(dir + '/' + common.sanitizeFilename(file) + '_' + common.sanitizeFilename(lang) + '.properties', 'utf8', function(err, local_properties) {
            if (!err && local_properties) {
                local_properties = parser.parse(local_properties);
                for (var i in local_properties) {
                    localized[lang][i] = local_properties[i];
                }
            }
            callback(null, JSON.parse(JSON.stringify(localized[lang] || {})));
        });
    }
    else {
        callback(null, JSON.parse(JSON.stringify(localized[lang] || {})));
    }
};

module.exports = locale;