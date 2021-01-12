const fs = require('fs');
const locale = require("../../../api/utils/localization.js");
const reportUtils = {};
/**
 * load ReportTemplate file
 * @param {string} templatePath - template file path
 * @returns {Promise} - template promise object.
 */
reportUtils.readReportTemplate = (templatePath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(templatePath, 'utf8', function(err1, template) {
            if (err1) {
                return reject(err1);
            }
            return resolve(template);
        });
    }).catch((e) => console.log(e));
};

/**
 * load language value with key
 * @param {string} lang -language type code
 * @param {string} keyName - language key name
 * @returns {Promise} - promise object
 */
reportUtils.getLocaleLangString = (lang, keyName) => {
    return new Promise((resolve, reject) => {
        locale.getProperty(lang, keyName, (err, subject) => {
            if (err) {
                return reject(err);
            }
            return resolve(subject);
        });
    }).catch((e) => console.log(e));
};

module.exports = reportUtils;
