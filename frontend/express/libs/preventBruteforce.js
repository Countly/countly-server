const preventBruteforce = {};

// database connection
preventBruteforce.db = null;

// mail service
preventBruteforce.mail = null;

// block after N fails
preventBruteforce.fails = 3;

// wait for N seconds until removing the block
preventBruteforce.wait = 5 * 60;

// map paths to names that can span multiple paths
preventBruteforce.pathIdentifiers = {};

// map paths to functions that extract identifiers from requests i.e. (req) => {ip: req.ip}
preventBruteforce.userIdentifiers = {};

// map path identifiers to functions that are executed when users are blocked e.g. send a mail
preventBruteforce.blockHooks = {};

preventBruteforce.middleware = function(req, res, next) {
    const path = req.path;

    if (req.method.toLowerCase() === "post" && path in preventBruteforce.pathIdentifiers) {
        const uid = path in preventBruteforce.userIdentifiers ? preventBruteforce.userIdentifiers[path](req) : req.ip;
        const pid = preventBruteforce.pathIdentifiers[path];

        if (pid) {
            preventBruteforce.isBlocked(pid, uid, function(isBlocked, fails, err) {
                req.session.fails = fails;

                if (isBlocked) {
                    if (err) {
                        res.status(500).send("Server Error");
                    }
                    else {
                        if (path in preventBruteforce.blockHooks) {
                            preventBruteforce.blockHooks[pid](uid, req, res);
                        }

                        res.redirect(path + "?message=login.blocked");
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

preventBruteforce.isBlocked = function(pid, uid, callback) {
    preventBruteforce.db.collection("failed_logins").findOne({_id: JSON.stringify([pid, uid])}, function(err, result) {
        result = result || {fails: 0};

        if (err) {
            callback(true, result.fails, err);
        }
        else if (result.fails > 0 && (result.fails % preventBruteforce.fails) === 0 && getTimestamp() < (((result.fails / preventBruteforce.fails) * preventBruteforce.wait) + result.lastFail)) {
            callback(true, result.fails);
        }
        else {
            callback(false, result.fails);
        }
    });
};

preventBruteforce.reset = function(pid, uid, callback) {
    callback = callback || function() {};

    preventBruteforce.db.collection("failed_logins").remove({_id: JSON.stringify([pid, uid])}, callback);
};

preventBruteforce.fail = function(pid, uid, callback) {
    callback = callback || function() {};

    preventBruteforce.db.collection("failed_logins").update({_id: JSON.stringify([pid, uid])}, {$inc: {fails: 1}, $set: {lastFail: getTimestamp()}}, {upsert: true}, callback);
};

/**
* Get current unix timestamp in seconds
* @returns {number} current unix timestamp in seconds
**/
function getTimestamp() {
    return Math.floor(new Date().getTime() / 1000);
}

module.exports = preventBruteforce;