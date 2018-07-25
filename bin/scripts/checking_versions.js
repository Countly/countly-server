const fs = require('fs');
const versionInfo = require('../../frontend/express/version.info');
var versions=[];
var marked_version="";
var current_version="";

//get current version
if(versions && versionInfo.version)
    current_version = versionInfo.version;
    
//load marked version
if (fs.existsSync(__dirname+"/../../countly_marked_version.json")){ //read form file(if exist);
    var olderVersions=[];
    try {
        var data =  fs.readFileSync(__dirname+"/../../countly_marked_version.json");
        try { olderVersions = JSON.parse(data);} 
        catch (SyntaxError) {//unable to parse file
            console.error(SyntaxError); 
        } 
        if(Array.isArray(olderVersions))
            marked_version = olderVersions[olderVersions.length-1].version;            
    }catch(error){console.error(error);}
}
//reading version numbers from upgrade folder
var pattern = new RegExp(/^(([0-9])*\.)*[0-9]*$/);
try {
    var dir_items = fs.readdirSync("../upgrade");
    for (var i=0; i<dir_items.length; i++) {
        if(dir_items[i] != '.') {
            try {
                stat = fs.statSync("../upgrade/"+dir_items[i]);
                if(stat.isDirectory() && pattern.test(dir_items[i])) {
                    var my_name = dir_items[i]
                    versions.push(dir_items[i]);
                }
            }catch(error) {   
                console.error(error);
            }
        }
    }

}catch(error) {
    console.error(error);
}
versions = versions.sort();

var from=0;
var til=versions.length-1;

if(current_version=="") {
    console.warn("could not load current version.");
    return;
}

if(marked_version=="") {
    console.warn("Could not load marked version.");
    return;
}
if(current_version==marked_version) {
    console.warn("up to date");
    return;
}
else {
    while(versions[from]<=marked_version && from<versions.length){ from++;}
    while(versions[til]>current_version && til>=0){ til--;}

    if(til==-1 || from ==versions.length) {
        console.warn("version range not found");
        return;
    }
    else{
        versions = versions.slice(from,til+1);
        console.log(versions.join(";"));
    }
}