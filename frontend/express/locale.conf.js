var localeConf = [
    { "code": "tr", "name": "Türkçe" },
    { "code": "de", "name": "Deutsch" },
    { "code": "et", "name": "Eesti" },
    { "code": "en", "name": "English" },
    { "code": "es", "name": "Español" },
    { "code": "el", "name": "Ελληνικά" },
    { "code": "fr", "name": "Français" },
    { "code": "it", "name": "Italiano" },
    { "code": "lv", "name": "Latviski" },
    { "code": "hu", "name": "Magyar" },
    { "code": "nl", "name": "Nederlands" },
    { "code": "pt", "name": "Português" },
    { "code": "ru", "name": "Русский язык" },
    { "code": "vi", "name": "Tiếng Việt" },
    { "code": "zh", "name": "中文" },
    { "code": "ja", "name": "日本語" },
    { "code": "ko", "name": "한국어" }
];
try {
    var plugins = require('../../plugins/pluginManager.js');
    plugins.extendModule("locale.conf", localeConf);
}
catch (_) {
    //silent try
}
module.exports = localeConf;