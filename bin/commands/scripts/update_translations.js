var request = require("request");
var fs = require('fs');
var path = require("path");
var dir = path.resolve(__dirname, '../../../');

var default_langs = [{"language_code": "ar"},{"language_code": "bs_BA"},{"language_code": "my"},{"language_code": "ca"},{"language_code": "zh_CN"},{"language_code": "nl_NL"},{"language_code": "et"},{"language_code": "fr"},{"language_code": "de"},{"language_code": "el"},{"language_code": "hi"},{"language_code": "it"},{"language_code": "ja"},{"language_code": "ko"},{"language_code": "lv_LV"},{"language_code": "nb_NO"},{"language_code": "fa"},{"language_code": "pl_PL"},{"language_code": "pt_BR"},{"language_code": "ro"},{"language_code": "ru"},{"language_code": "sl_SI"},{"language_code": "es"},{"language_code": "sv"},{"language_code": "tr"},{"language_code": "uk"},{"language_code": "vi"},{"language_code": "vi_VN"}];

function makeRequest(url, callback){
    var auth = "Basic " + new Buffer("countly:countly").toString("base64");
    var options = {
        uri: url,
        method: 'GET',
        headers : {
            "Authorization" : auth
        }
    };
    
    request(options, function (error, response, body) {
        var data;
        if(!error){
            try{
                data = JSON.parse(body);
            }
            catch(ex){}
        }
        callback(error, data);
    });
};

function getFile(resource, language){
    makeRequest("https://www.transifex.com/api/2/project/countly/resource/"+resource.slug+"/stats/"+language.language_code+"/", function(err, stats){
        if(err){
            return false;
        }
        if(stats.completed != "0%"){
            console.log("Updating "+resource.name+" for "+language.language_code);
            makeRequest("https://www.transifex.com/api/2/project/countly/resource/"+resource.slug+"/translation/"+language.language_code+"/", function(err, file){
                if(err){
                    console.log("ignoring "+resource.slug+": " + err);
                    return false;
                }
                var parts = resource.name.split(".");
                var location = dir;
                if(resource.slug == "dashboardproperties"){
                    location += "/frontend/express/public/localization/dashboard/";
                }
                else if(resource.slug == "pre-loginproperties"){
                    location += "/frontend/express/public/localization/pre-login/";
                }
                else if(resource.slug == "mailproperties"){
                    location += "/frontend/express/public/localization/mail/";
                }
                else if(resource.slug == "helpproperties_1"){
                    location += "/frontend/express/public/localization/help/";
                }
                else{
                    location += "/plugins/"+parts[0]+"/frontend/public/localization/";
                }
                if (fs.existsSync(location)) {
                    if(resource.source_language_code == language.language_code){
                        fs.writeFile(location+resource.name, file.content, function (err) {
                            if (err) return console.log(err);
                        });
                    }
                    else{
                        var code = language.language_code.split("_")[0];
                        fs.writeFile(location+parts[0]+"_"+code+"."+parts[1], file.content, function (err) {
                            if (err) return console.log(err);
                        });
                    }
                }
            });
        }
    });
}

//get resources
makeRequest("https://www.transifex.com/api/2/project/countly/resources/", function(err, resources){
    if(err || !resources){
        console.log("Can't update translations: " + err);
        return false;
    }
    console.log("Connected to transifex");
    //get languages
    makeRequest("http://www.transifex.com/api/2/project/countly/languages/", function(err, languages){
        if(err){
            console.log("Can't update translations: " + err);
            return false;
        }
        console.log("Got list of translations");
        languages = languages || default_langs;
        //get translation files
        for(var i = 0; i < resources.length; i++){
            for(var j = 0; j <  languages.length; j++){
                getFile(resources[i], languages[j]);
            }
        }
    });
});