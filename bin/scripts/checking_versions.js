const fs = require('fs');
const versionInfo = require('../../frontend/express/version.info');
var versions = [];
var marked_version = "";
var current_version = "";

var myArgs = process.argv.slice(2);

if (myArgs.length == 2) {
    marked_version = myArgs[0];
    current_version = myArgs[1];
}
else {
    //get current version
    if (versions && versionInfo.version) {
        current_version = versionInfo.version;
    }

    //load marked version
    if (fs.existsSync(__dirname + "/../../countly_marked_version.json")) { //read form file(if exist);
        var olderVersions = [];
        try {
            var data = fs.readFileSync(__dirname + "/../../countly_marked_version.json");
            try {
                olderVersions = JSON.parse(data);
            }
            catch (SyntaxError) { //unable to parse file
                process.stdout.write(SyntaxError);
            }
            if (Array.isArray(olderVersions)) {
                marked_version = olderVersions[olderVersions.length - 1].version;
            }
        }
        catch (error) {
            process.stdout.write(error);
        }
    }
}

//reading version numbers from upgrade folder
var pattern = new RegExp(/^\d{1,2}(\.\d{1,2}){0,3}$/);
try {
    var dir_items = fs.readdirSync(__dirname + "/../upgrade");
    for (var i = 0; i < dir_items.length; i++) {
        if (dir_items[i] != '.') {
            try {
                var stat = fs.statSync(__dirname + "/../upgrade/" + dir_items[i]);
                if (stat.isDirectory() && pattern.test(dir_items[i])) {
                    versions.push(dir_items[i]);
                }
            }
            catch (error) {
                process.stdout.write(error);
            }
        }
    }

}
catch (error) {
    process.stdout.write(error);
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

versions = versions.sort(compareVersions);

var from = 0;
var til = versions.length - 1;

if (current_version == "") {
    process.stdout.write("could not load current version.");
    process.exit(1);
}

if (marked_version == "") {
    process.stdout.write("Could not load marked version.");
    process.exit(1);
}
if (current_version == marked_version) {
    process.stdout.write("up to date");
    process.exit(1);
}
else {
    while (versions[from] <= marked_version && from < versions.length) {
        from++;
    }
    while (versions[til] > current_version && til >= 0) {
        til--;
    }

    if (til == -1 || from == versions.length) {
        process.stdout.write("version range not found");
        return;
    }
    else {
        versions = versions.slice(from, til + 1);
        process.stdout.write(versions.join(";"));
    }
}