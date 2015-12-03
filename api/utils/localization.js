var locale = {},
    fs = require('fs'),
    path = require('path'),
    parser = require('properties-parser');
    
(function (locale) {
    var dir = path.resolve(__dirname, '../../frontend/express/public/localization/min');
    var file = "locale";
    var default_lang = "en";
    var orig = {};
    var localized = {};
    
    try{
        var data = fs.readFileSync(dir+'/'+file+'.properties', "utf8");
        orig = parser.parse(data);
    }
    catch(ex){
        orig = {};
    }
    
    locale.format = function (value /* Add parameters as function arguments as necessary  */) {
        var re, list;
        if(arguments[1] && Array.isArray(arguments[1]))
            list = arguments[1];
        else
            list = Array.prototype.slice.call(arguments).slice(1, arguments.length);
        
        for(var i = 0; i < list.length; i++){
            re = new RegExp('\\{'+i+'\\}', "g");
            value = value.replace(re, list[i]);
        }
        return value;
    };
    
    locale.getProperty = function(lang, name, callback){
        if(lang == default_lang){
            callback(null, orig[name] || "["+name+"]");
        }
        else if(!localized[lang]){
            localized[lang] = orig;
            fs.readFile(dir+'/'+file+'_'+lang+'.properties', 'utf8', function (err,local_properties) {
                if(!err && local_properties){
                    local_properties = parser.parse(local_properties);
                    for(var i in local_properties)
                        localized[lang][i] = local_properties[i];
                }
                callback(null, localized[lang][name] || "["+name+"]");
            });
        }
        else
            callback(null, localized[lang][name] || "["+name+"]");
    };
    
    locale.getProperties = function(lang, callback){
        if(lang == default_lang){
            callback(null, orig || []);
        }
        else if(!localized[lang]){
            localized[lang] = orig;
            fs.readFile(dir+'/'+file+'_'+lang+'.properties', 'utf8', function (err,local_properties) {
                if(!err && local_properties){
                    local_properties = parser.parse(local_properties);
                    for(var i in local_properties)
                        localized[lang][i] = local_properties[i];
                }
                callback(null, localized[lang] || []);
            });
        }
        else
            callback(null, localized[lang] || []);
    };
    
}(locale));

module.exports = locale;