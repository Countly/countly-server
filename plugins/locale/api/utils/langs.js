'use strict';

var exported = {},
    langmap = require('langmap');

(function(langs) {

    var regexp = /[-_]+/;
    langs.languageFromLocale = function(locale) {
        var comps = (locale + "").toLowerCase().split(regexp), lang = comps[0];
        if (lang === 'zh') {
            if (comps.length !== 2) {
                return '';
            }
            else {
                if (['hans', 'cn'].indexOf(comps[1]) !== -1) {
                    return 'zh_hans';
                }
                else if (['hant', 'tw', 'hk'].indexOf(comps[1]) !== -1) {
                    return 'zh_hant';
                }
            }
        }
        else {
            return lang;
        }
    };

    var languages = {};
    for (var k in langmap) {
        var lang = langs.languageFromLocale(k);
        if (!languages[lang]) {
            languages[lang] = langmap[k];
        }
    }

    langs.languages = languages;

}(exported));

module.exports = exported;