const fs = require('fs');
const fsMarkedVersionPath = __dirname + "/../../countly_marked_version.json";

function writeMsg(type, msg){
    process.stdout.write(msg);
}

function doMarkFsVersion(targetVersion) {

    var olderVersions = [];
    var lastVersion = "";
    //read form file(if exist);
    if (fs.existsSync(fsMarkedVersionPath)) {
        try {
            let data = fs.readFileSync(fsMarkedVersionPath);
            try {
                olderVersions = JSON.parse(data);
            }
            catch (SyntaxError) { //unable to parse file
                writeMsg("error", SyntaxError);
            }
            if (Array.isArray(olderVersions)) {
                lastVersion = olderVersions[olderVersions.length - 1].version;
            }
            else {
                olderVersions = [];
            }

        }
        catch (error) {
            writeMsg("error", error);
        }
    }
    if (lastVersion === "" || lastVersion !== targetVersion) {
        olderVersions.push({
            version: targetVersion,
            updated: Date.now()
        });
        try {
            fs.writeFileSync(fsMarkedVersionPath, JSON.stringify(olderVersions));
        }
        catch (error) {
            writeMsg("error", error);
        }
    }
}

var myArgs = process.argv.slice(2),
    namespace = '',
    targetVersion = '';
    
if (myArgs.length === 2) {
    namespace = myArgs[0];
    targetVersion = myArgs[1];
    if (namespace === 'fs') {
        doMarkFsVersion(targetVersion);
    }
}