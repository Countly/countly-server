var request = require("request");
var fs = require('fs');
var path = require("path");
var dir = path.resolve(__dirname, '../../../');

function makeRequest(url, callback){
    var auth = "Basic " + new Buffer("username:password").toString("base64");
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
                else if(resource.slug == "helpproperties_1"){
                    location += "/frontend/express/public/localization/help/";
                }
                else{
                    location += "/plugins/"+parts[0]+"/frontend/public/localization/";
                }
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
            });
        }
    });
}

//get resources
makeRequest("https://www.transifex.com/api/2/project/countly/resources/", function(err, resources){
    if(err){
        console.log("Can't update translations: " + err);
        return false;
    }
    //get languages
    makeRequest("http://www.transifex.com/api/2/project/countly/languages/", function(err, languages){
        if(err){
            console.log("Can't update translations: " + err);
            return false;
        }
        languages.push({"language_code": "en"});
        //get translation files
        for(var i = 0; i < resources.length; i++){
            for(var j = 0; j <  languages.length; j++){
                getFile(resources[i], languages[j]);
            }
        }
    });
});