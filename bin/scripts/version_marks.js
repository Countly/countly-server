const fs = require('fs'),
    pluginManager = require('../../plugins/pluginManager.js'),
    countlyDb = pluginManager.dbConnection();

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
            writeMsg("info", "1");
        }
        catch (error) {
            writeMsg("error", error);
        }
    }
    else {
        writeMsg("info", "0");
    }
}

function doMarkDbVersion(targetVersion) {
    countlyDb.collection('plugins').find({'_id':'version'}).toArray(function(err, versionDocs) {
        if (err) {
            writeMsg("error", err);
            countlyDb.close();
            return;
        }
        var versionDoc = {};
        if (!versionDocs[0]) {
            versionDoc.history = [];
        }
        else {
            versionDoc = versionDocs[0];
        }
        var lastVersion = "",
            olderVersions = versionDoc.history;

        if (olderVersions.length > 0) {
            lastVersion = olderVersions[olderVersions.length - 1].version
        }

        if (lastVersion === "" || lastVersion !== targetVersion) {
            versionDoc.history.push({
                version: targetVersion,
                updated: Date.now()
            });
            countlyDb.collection('plugins').update({'_id': 'version'}, {
                $set: {
                    "history": versionDoc.history,
                    "current": targetVersion
                }
            }, {'upsert': true}, function() {
                writeMsg("info", "1");
                countlyDb.close();
            });
        }
        else {
            writeMsg("info", "0");
            countlyDb.close();
        }
    });
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
    else if (namespace === 'db') {
        doMarkDbVersion(targetVersion);
    }
}