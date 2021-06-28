var manager = require('../../../plugins/pluginManager.js'),
    crypto = require('crypto');

var myArgs = process.argv.slice(2);

function sha1Hash(str, addSalt) {
    var salt = (addSalt) ? new Date().getTime() : "";
    return crypto.createHmac('sha1', salt + "").update(str + "").digest('hex');
}

function sha512Hash(str, addSalt) {
    var salt = (addSalt) ? new Date().getTime() : "";
    return crypto.createHmac('sha512', salt + "").update(str + "").digest('hex');
}

function md5Hash(str) {
    return crypto.createHash('md5').update(str + "").digest('hex');
}

manager.dbConnection().then((db) => {
    if (myArgs[0] == "register" && myArgs[1] && myArgs[2]) {
        db.collection('members').findOne({$or: [{username: myArgs[1], email: myArgs[1]}]}, function(err, member) {
            if (member) {
                console.log("User " + myArgs[1] + " already exists");
                db.close();
            }
            else {
                var doc = {"full_name": myArgs[1], "username": myArgs[1], "password": sha512Hash(myArgs[2]), "email": myArgs[1], "global_admin": true};
                db.collection('members').insert(doc, {safe: true}, function(err, member) {
                    if (err) {
                        console.log(err);
                        db.close();
                    }
                    else {
                        member = member.ops;
                        var a = {};
                        a.api_key = md5Hash(member[0]._id + (new Date).getTime());
                        member[0].api_key = a.api_key;
                        db.collection("members").update({_id: member[0]._id}, {$set: a}, function() {
                            console.log(member[0]);
                            db.close();
                        });
                    }
                });
            }
        });
    }
    else if (myArgs[0] == "delete" && myArgs[1] && myArgs[2]) {
        db.collection('members').remove({$and: [{username: myArgs[1]}, {$or: [{"password": sha512Hash(myArgs[2])}, {"password": sha1Hash(myArgs[2])}]}]}, function(err, member) {
            if (err) {
                console.log(err);
            }
            else {
                console.log(member.result);
            }
            db.close();
        });
    }
});