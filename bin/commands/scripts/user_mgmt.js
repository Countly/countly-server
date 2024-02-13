var manager = require('../../../plugins/pluginManager.js'),
    countlyConfig = require('../../../frontend/express/config.js'),
    crypto = require('crypto'),
    argon2 = require('argon2');

var myArgs = process.argv.slice(2);

function argon2Hash(str) {
    return argon2.hash(str);
}

function argon2Verify(hashedStr, str) {
    return argon2.verify(hashedStr, str);
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
                var secret = countlyConfig.passwordSecret || "";
                argon2Hash(myArgs[2] + secret).then(password_ARGON2 => {
                    var doc = { "full_name": myArgs[1], "username": myArgs[1], "password": password_ARGON2, "email": myArgs[1], "global_admin": true };
                    crypto.randomBytes(48, function(errorBuff, buffer) {
                        doc.api_key = md5Hash(buffer.toString('hex') + Math.random());
                        db.collection('members').insert(doc, { safe: true }, function(err, member) {
                            if (err) {
                                console.log(err);
                            }
                            else {
                                member = member.ops;
                                console.log(member[0]);
                            }
                            db.close();
                        });
                    });
                });
            }
        });
    }
    else if (myArgs[0] == "delete" && myArgs[1] && myArgs[2]) {
        var secret = countlyConfig.passwordSecret || "";
        db.collection('members').findOne({ username: { $eq: myArgs[1] } }, function(err, member) {
            if (err) {
                console.log(err);
            }
            else {
                argon2Verify(member.password, myArgs[2] + secret).then(isPasswordMatched => {
                    if (isPasswordMatched) {
                        db.collection('members').remove({ username: { $eq: myArgs[1] } }, function(err, member) {
                            if (err) {
                                console.log(err);
                            }
                            else {
                                console.log(member);
                            }
                            db.close();
                        });
                    }
                    else {
                        console.log("Password is wrong!");
                        db.close();
                    }
                });
            }
        });
    }
});