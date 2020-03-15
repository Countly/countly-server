const rateLimiter = {};

// database connection
rateLimiter.db = null;

// mail service
rateLimiter.mail = null;

// block after N fails
rateLimiter.fails = 3;

// wait for N seconds until removing the block
rateLimiter.wait = 5 * 60;

// map paths to mongo collection names
rateLimiter.collections = {};

// map paths to functions that extract identifiers from requests i.e. (req) => {ip: req.ip}
rateLimiter.identifiers = {};

// map paths to functions that are executed when users are blocked e.g. send a mail
rateLimiter.blockHooks = {};

rateLimiter.middleware = function(req, res, next) {
    const path = req.path;

    if (req.method.toLowerCase() === 'post' && path in rateLimiter.collections) {
        const id = path in rateLimiter.identifiers ? rateLimiter.identifiers[path](req) : {ip: req.ip};

        if (id) {
            rateLimiter.isBlocked(path, id, function(isBlocked, fails, err) {
                req.session.fails = fails;

                if (isBlocked) {
                    if (err) {
                        res.status(500).send("Server Error");
                    }
                    else {
                        if (path in rateLimiter.blockHooks) {
                            rateLimiter.blockHooks[path](id, req, res);
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

rateLimiter.isBlocked = function(path, id, callback) {
    rateLimiter.db.collection(rateLimiter.collections[path]).findOne(id, function(err, result) {
        result = result || {fails: 0};

        if (err) {
            callback(true, result.fails, err);
        }
        else if (result.fails > 0 &&
                 (result.fails % rateLimiter.fails) === 0 &&
                 getTimestamp() < (((result.fails / rateLimiter.fails) * rateLimiter.wait) + result.lastFail)) {
            callback(true, result.fails);
        } else {
            callback(false, result.fails);
        }
    });
};

rateLimiter.reset = function(path, id, callback) {
    callback = callback || function() {};

    if (path in rateLimiter.collections) {
        rateLimiter.db.collection(rateLimiter.collections[path]).remove(id, callback);
    }
};

rateLimiter.fail = function(path, id, callback) {
    callback = callback || function() {};

    if (path in rateLimiter.collections) {
        rateLimiter.db.collection(rateLimiter.collections[path]).update(id, {$inc: {fails: 1}, $set: {lastFail: getTimestamp()}}, {upsert: true}, callback);
    }
};

/**
* Get current unix timestamp in seconds
* @returns {number} current unix timestamp in seconds
**/
function getTimestamp() {
    return Math.floor(new Date().getTime() / 1000);
}

module.exports = rateLimiter;