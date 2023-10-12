/**
 *  Description: This script is used to anonymize app_users collection
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/export-data
 *  Command: node app_users_anonymized_data.js
 */

var crypto = require('crypto');
const fs = require('fs');
const { ObjectId } = require('mongodb');

const pluginManager = require('../../../plugins/pluginManager.js');
const common = require('../../../api/utils/common.js');

const APPS = []; //leave array empty to get all apps;
const PATH = './'; //path to save anonymized data
const FIELDS_TO_ANONYMIZE = ['did', 'name', 'username', 'email', 'organization', 'phone', 'picture', 'custom'];

pluginManager.dbConnection("countly").then(async function(countlyDb) {
    console.log("Connected to database...");

    //SET COMMON DB
    common.db = countlyDb;

    var query = {};
    if (APPS.length > 0) {
        APPS.forEach(function(id, index) {
            APPS[index] = ObjectId(id);
        });
        query = {_id: {$in: APPS}};
    }
    try {
        //FETCH APPS
        var apps = await common.db.collection('apps').find(query, {_id: 1, name: 1}).toArray();
        //CREATE FILE
        const appUsersWriteStream = fs.createWriteStream(PATH + `/app_users_anonymized.jsonl`);
        //FETCH USERS FOR EACH APP
        for (let i = 0; i < apps.length; i++) {
            console.log("Processing app: " + apps[i].name);
            const cursor = common.db.collection('app_users' + apps[i]._id).find({});
            //FOR EACH USER
            while (await cursor.hasNext()) {
                var user = await cursor.next();
                //ANONYMIZE USER DATA
                for (let field in FIELDS_TO_ANONYMIZE) {
                    if (user[FIELDS_TO_ANONYMIZE[field]]) {
                        user[FIELDS_TO_ANONYMIZE[field]] = sha1Hash(user[FIELDS_TO_ANONYMIZE[field]]);
                    }
                }
                //WRITE USER DATA TO FILE
                appUsersWriteStream.write(JSON.stringify(user) + '\n');
            }
        }
    }
    catch (err) {
        console.log(err);
    }
    finally {
        countlyDb.close();
        console.log("Done.");
    }

    //SHA1 HASH FUNCTION
    function sha1Hash(field) {
        if (typeof field === 'object') {
            if (Array.isArray(field)) {
                field.forEach(function(element, index) {
                    field[index] = sha1Hash(element);
                });
            }
            else {
                for (let key in field) {
                    field[key] = sha1Hash(field[key]);
                }
            }
            return field;
        }
        if (isNaN(field)) {
            var salt = crypto.randomBytes(16).toString('hex');
            var hashedField = crypto.createHmac('sha1', salt).update(field).digest('hex');
            return hashedField.substring(0, field.length);
        }
        return field;
    }
});