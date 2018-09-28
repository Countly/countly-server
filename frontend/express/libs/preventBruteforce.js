/**
* This module is meant for handling bruteforce prevention
* @module frontend/express/libs/preventBruteforce
*/

/** @lends frontend/express/libs/preventBruteforce */
var prevent = {};

//countly database connection
prevent.db = null;
//mail service
prevent.mail = null;
//allowed fails
prevent.fails = 3;
//first wait time after reaching fail amount
prevent.wait = 5 * 60;
//paths to prevent
prevent.paths = [];

prevent.defaultPrevent = function(req, res, next) {
    if (req.method.toLowerCase() === 'post' && prevent.paths.indexOf(req.path) !== -1) {
        var username = req.body.username;
        if (username) {
            prevent.isBlocked(username, function(isBlocked, fails, err) {
                req.session.fails = fails;
                if (isBlocked) {
                    if (err) {
                        res.status(500).send('Server Error');
                    }
                    else {
                        //blocking user
                        prevent.db.collection("members").findOne({ username: username}, function(err2, member) {
                            if (member) {
                                prevent.mail.sendTimeBanWarning(member, prevent.db);
                            }
                        });
                        res.redirect(req.path + '?message=login.blocked');
                    }
                }
                else {
                    next();
                }
            });
        }
        else {
            next();
        }
    }
    else {
        next();
    }
};

prevent.isBlocked = function(id, callback) {
    prevent.db.collection("failed_logins").findOne({_id: id}, function(err, result) {
        result = result || {fails: 0};
        if (err) {
            callback(true, result.fails, err);
        }
        else if (result.fails > 0 && result.fails % prevent.fails === 0 && getTimestamp() < (((result.fails / prevent.fails) * prevent.wait) + result.lastFail)) {
            //blocking user
            callback(true, result.fails);
        }
        else {
            callback(false, result.fails);
        }
    });
};

prevent.reset = function(id, callback) {
    callback = callback || function() {};
    prevent.db.collection("failed_logins").remove({_id: id}, callback);
};

prevent.fail = function(id, callback) {
    callback = callback || function() {};
    prevent.db.collection("failed_logins").update({_id: id}, {$inc: {fails: 1}, $set: {lastFail: getTimestamp()}}, {upsert: true}, callback);
};

/**
* Get current unix timestamp in seconds
* @returns {number} current unix timestamp in seconds
**/
function getTimestamp() {
    return Math.floor(new Date().getTime() / 1000);
}

module.exports = prevent;