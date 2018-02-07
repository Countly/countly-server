const Promise = require('bluebird');
const common = require('./common.js');
const {validateUser, validateUserForRead, validateUserForWrite, validateGlobalAdmin} = require('./rights.js');
const authorize = require('./authorizer.js');
const plugins = require('../../plugins/pluginManager.js');
const versionInfo = require('../../frontend/express/version.info');
const log = require('./log.js')('core:api');
const validateUserForWriteAPI = validateUser;
const validateUserForDataReadAPI = validateUserForRead;
const validateUserForDataWriteAPI = validateUserForWrite;
const validateUserForGlobalAdmin = validateGlobalAdmin;
const validateUserForMgmtReadAPI = validateUser;

const countlyApi = {
    data: {
        usage: require('../parts/data/usage.js'),
        fetch: require('../parts/data/fetch.js'),
        events: require('../parts/data/events.js'),
        exports: require('../parts/data/exports.js')
    },
    mgmt: {
        users: require('../parts/mgmt/users.js'),
        apps: require('../parts/mgmt/apps.js')
    }
};


/**
 * Merge User Data
 * @param newAppUser
 * @param oldAppUser
 */
const mergeUserData = (newAppUser, oldAppUser) => {
    //allow plugins to deal with user merging properties
    plugins.dispatch("/i/user_merge", {
        params: params,
        newAppUser: newAppUser,
        oldAppUser: oldAppUser
    });
    //merge user data
    for (const i in oldAppUser) {
        // sum up session count and total session duration
        if (i === "sc" || i === "tsd") {
            if (typeof newAppUser[i] === "undefined")
                newAppUser[i] = 0;
            newAppUser[i] += oldAppUser[i];
        }
        //check if old user has been seen before new one
        else if (i === "fs") {
            if (!newAppUser.fs || oldAppUser.fs < newAppUser.fs)
                newAppUser.fs = oldAppUser.fs;
        }
        //check if old user has been seen before new one
        else if (i === "fac") {
            if (!newAppUser.fac || oldAppUser.fac < newAppUser.fac)
                newAppUser.fac = oldAppUser.fac;
        }
        //check if old user has been the last to be seen
        else if (i === "ls") {
            if (!newAppUser.ls || oldAppUser.ls > newAppUser.ls) {
                newAppUser.ls = oldAppUser.ls;
                //then also overwrite last session data
                if (oldAppUser.lsid)
                    newAppUser.lsid = oldAppUser.lsid;
                if (oldAppUser.sd)
                    newAppUser.sd = oldAppUser.sd;
            }
        }
        //check if old user has been the last to be seen
        else if (i === "lac") {
            if (!newAppUser.lac || oldAppUser.lac > newAppUser.lac) {
                newAppUser.lac = oldAppUser.lac;
            }
        }
        else if (i === "lest") {
            if (!newAppUser.lest || oldAppUser.lest > newAppUser.lest) {
                newAppUser.lest = oldAppUser.lest;
            }
        }
        else if (i === "lbst") {
            if (!newAppUser.lbst || oldAppUser.lbst > newAppUser.lbst) {
                newAppUser.lbst = oldAppUser.lbst;
            }
        }
        //merge custom user data
        else if (typeof oldAppUser[i] === "object" && oldAppUser[i]) {
            if (typeof newAppUser[i] === "undefined")
                newAppUser[i] = {};
            for (const j in oldAppUser[i]) {
                //set properties that new user does not have
                if (typeof newAppUser[i][j] === "undefined")
                    newAppUser[i][j] = oldAppUser[i][j];
            }
        }
        //set other properties that new user does not have
        else if (i !== "_id" && i !== "did" && typeof newAppUser[i] === "undefined") {
            newAppUser[i] = oldAppUser[i];
        }
    }
    //update new user
    common.updateAppUser(params, {'$set': newAppUser}, () => {
        //delete old user
        common.db.collection('app_users' + params.app_id).remove({_id: old_id}, () => {
            //let plugins know they need to merge user data
            common.db.collection("metric_changes" + params.app_id).update(
                {uid: oldAppUser.uid},
                {'$set': {uid: newAppUser.uid}},
                {multi: true},
                (err, res) => {
                });
            plugins.dispatch("/i/device_id", {
                params: params,
                app: app,
                oldUser: oldAppUser,
                newUser: newAppUser
            });
            restartRequest(params);
        });
    });
};

/**
 * Restart Request
 * @param params
 */
const restartRequest = (params) => {
    //remove old device ID and retry request
    params.qstring.old_device_id = null;
    //retry request
    validateAppForWriteAPI(params, done);
};

