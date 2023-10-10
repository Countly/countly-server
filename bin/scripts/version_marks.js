const fs = require('fs'),
    mail = require('../../api/parts/mgmt/mail'),
    localize = require('../../api/utils/localization.js'),
    common = require('../../api/utils/common'),
    pluginManager = require('../../plugins/pluginManager.js'),
    Promise = require("bluebird");

const fsMarkedVersionPath = __dirname + "/../../countly_marked_version.json";

function sendEmailToGlobalAdmins(oldVersion, newVersion) {
    Promise.all([pluginManager.dbConnection("countly")]).spread(async function(countlyDb) {
        pluginManager.loadConfigs(countlyDb, async function() {
            let conf = pluginManager.getConfig('api'),
                serverLink = conf && conf.domain ? `<a href="${conf.domain}">${conf.domain}</a>` : 'Countly Server',
                admins = await countlyDb.collection('members').find({global_admin: true}).toArray();

            try {
                await Promise.all(
                    admins.map((admin) => {
                        localize.getProperties(admin.lang, function (err2, properties) {
                            var subject = localize.format(properties["mail.server-upgrade-to-global-admins-subject"], oldVersion, newVersion);
                            var message = localize.format(properties["mail.server-upgrade-to-global-admins"], oldVersion, newVersion, serverLink);
                            mail.sendMessage(admin.email, subject, message);
                        });
                    })
                );
            }
            catch (e) {
                common.log('core:mark_version').e('Error while sending update emails', e);
                return 0;
            }
            finally {
                countlyDb.close();
            }
        });
    });
}

function writeMsg(type, msg) {
    process.stdout.write(JSON.stringify(msg));
}

function compareVersions(a, b) {
    var aParts = a.split('.');
    var bParts = b.split('.');

    for (var i = 0; i < aParts.length && i < bParts.length; i++) {
        var aPartNum = parseInt(aParts[i], 10);
        var bPartNum = parseInt(bParts[i], 10);

        const cmp = Math.sign(aPartNum - bPartNum);

        if (cmp !== 0) {
            return cmp;
        }
    }

    if (aParts.length === bParts.length) {
        return 0;
    }

    let longestArray = aParts;
    if (bParts.length > longestArray.length) {
        longestArray = bParts;
    }

    const continueIndex = Math.min(aParts.length, bParts.length);

    for (let i = continueIndex; i < longestArray.length; i += 1) {
        if (parseInt(longestArray[i], 10) > 0) {
            return longestArray === bParts ? -1 : +1;
        }
    }

    return 0;
}

function readFsVersion() {
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
    return {
        olderVersions,
        lastVersion
    };
}

function compareFsVersion(targetVersion) {
    var fsVersion = readFsVersion();
    var lastVersion = fsVersion.lastVersion;

    if (lastVersion === "") {
        writeMsg("info", -1);
        return;
    }
    writeMsg("info", compareVersions(lastVersion, targetVersion));
}

function writeFsVersion(targetVersion) {

    var fsVersion = readFsVersion();

    var olderVersions = fsVersion.olderVersions;
    var lastVersion = fsVersion.lastVersion;

    if (lastVersion === "" || lastVersion !== targetVersion) {
        olderVersions.push({
            version: targetVersion,
            updated: Date.now()
        });
        try {
            fs.writeFileSync(fsMarkedVersionPath, JSON.stringify(olderVersions));
            writeMsg("info", 1);
            sendEmailToGlobalAdmins(olderVersions[olderVersions.length - 1].version, targetVersion);
        }
        catch (error) {
            writeMsg("error", error);
        }
    }
    else {
        writeMsg("info", 0);
        sendEmailToGlobalAdmins(olderVersions[olderVersions.length - 1].version, targetVersion);
    }
}

function readDbVersion(countlyDb, closeConn, projection, cb) {
    countlyDb.collection('plugins').find({'_id': 'version'}, projection).toArray(function(err, versionDocs) {
        if (err) {
            writeMsg("error", err);
            countlyDb.close();
            return;
        }
        var versionDoc = {};
        if (!versionDocs[0]) {
            versionDoc.version = "";
            versionDoc.history = [];
        }
        else {
            versionDoc = versionDocs[0];
        }
        if (closeConn) {
            countlyDb.close();
        }
        cb(versionDoc);
    });
}

function compareDbVersion(targetVersion) {
    pluginManager.dbConnection().then((countlyDb) => {
        readDbVersion(countlyDb, true, {"version": 1}, function(versionDoc) {
            if (versionDoc.version === "") {
                writeMsg("info", -1);
                return;
            }
            writeMsg("info", compareVersions(versionDoc.version, targetVersion));
        });
    });
}

function writeDbVersion(targetVersion) {
    pluginManager.dbConnection().then((countlyDb) => {
        readDbVersion(countlyDb, false, {"version": 1, 'history': 1, "_id": 1}, function(versionDoc) {
            if (versionDoc.version === "" || versionDoc.version !== targetVersion) {
                versionDoc.history.push({
                    version: targetVersion,
                    updated: Date.now()
                });
                countlyDb.collection('plugins').update({'_id': 'version'}, {
                    $set: {
                        "history": versionDoc.history,
                        "version": targetVersion
                    }
                }, {'upsert': true}, function() {
                    writeMsg("info", 1);
                    countlyDb.close();
                });
            }
            else {
                writeMsg("info", 0);
                countlyDb.close();
            }
        });
    });
}

var myArgs = process.argv.slice(2),
    command = '',
    targetVersion = '';

if (myArgs.length === 2) {
    command = myArgs[0];
    targetVersion = myArgs[1];
    switch (command) {
    case 'compare_db':
        compareDbVersion(targetVersion);
        break;
    case 'compare_fs':
        compareFsVersion(targetVersion);
        break;
    case 'write_db':
        writeDbVersion(targetVersion);
        break;
    case 'write_fs':
        writeFsVersion(targetVersion);
        break;
    }
}