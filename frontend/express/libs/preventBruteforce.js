/**
 * Module to record failed attempts and prevent brute force credential guessing
 * @module frontend/express/libs/preventBruteforce
 * @example
 * var username, pass;
 * preventBruteforce.isBlocked("login", username, function(isBlocked, fails, err) {
 *     if (isBlocked) {
 *         console.log("User is blocked");
 *         return;
 *     }
 *     else {
 *         if (login()) {
 *             //user logged in, reset any fails user had
 *             preventBruteforce.reset("login", username);
 *         }
 *         else {
 *             //user failed to login, increase fails
 *             preventBruteforce.fail("login", username);
 *         }
 *     }
 * });
 *
 */

/** @lends module:frontend/express/libs/preventBruteforce */
const preventBruteforce = {};

/**
 * @property {object} db - Data base connection. Needs to be set befoe callng any other function.
 */
preventBruteforce.db = null;

/**
 * @property {object} mail - Mail service to add mailing capabilities
 */
preventBruteforce.mail = null;

/**
 * @property {number} fails - How many times user is allowed to fail
 */
preventBruteforce.fails = 3;

/**
 * @property {number} wait - How long to wait in seconds until removing the block
 */
preventBruteforce.wait = 5 * 60;

/**
 * @property {object} pathIdentifiers - Scope or path of check
 */
preventBruteforce.pathIdentifiers = {};

/**
 * @property {object} userIdentifiers - map paths to functions that extract identifiers from requests i.e. (req) => {ip: req.ip}
 */
preventBruteforce.userIdentifiers = {};

/**
 * @property {object} blockHooks - map path identifiers to functions that are executed when users are blocked e.g. send a mail
 */
preventBruteforce.blockHooks = {};

/**
 * Middleware to listen to specific paths and check if user is blocked
 * @param {object} req - request object
 * @param {object} res - response object
 * @param {function} next - callback to call next middleware
 * @example
 * app.use(preventBruteforce.middleware);
 **/
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

/**
 * Check if user is blocked for provided namepsace and user idendtifier
 * @param {string} pid - namespace of the block
 * @param {string} uid - user identifier
 * @param {function} callback - callback to call with result
 * @example
 * var username, pass;
 * preventBruteforce.isBlocked("login", username, function(isBlocked, fails, err) {
 *     if (isBlocked) {
 *         console.log("User is blocked");
 *         return;
 *     }
 *     else {
 *         if (login()) {
 *             //user logged in, reset any fails user had
 *             preventBruteforce.reset("login", username);
 *         }
 *         else {
 *             //user failed to login, increase fails
 *             preventBruteforce.fail("login", username);
 *         }
 *     }
 * });
 **/
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

/**
 * Reset fails for provided namepsace and user
 * @param {string} pid - namespace of the block
 * @param {string} uid - user identifier
 * @param {function} callback - callback to call when done
 * @example
 * preventBruteforce.reset("login", username);
 **/
preventBruteforce.reset = function(pid, uid, callback) {
    callback = callback || function() {};

    preventBruteforce.db.collection("failed_logins").remove({_id: JSON.stringify([pid, uid])}, callback);
};

/**
 * Increase fails for provided namepsace and user
 * @param {string} pid - namespace of the block
 * @param {string} uid - user identifier
 * @param {function} callback - callback to call when done
 * @example
 * preventBruteforce.fail("login", username);
 **/
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