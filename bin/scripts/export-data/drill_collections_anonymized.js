/**
 *  Description: This script is used to anonymize drill collection
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/export-data
 *  Command: node drill_collections_anonymized.js
 */

var crypto = require('crypto');
const fs = require('fs');
const { ObjectId } = require('mongodb');

const pluginManager = require('../../../plugins/pluginManager.js');
const common = require('../../../api/utils/common.js');
const drillCommon = require("../../../plugins/drill/api/common.js");

const APPS = []; //leave array empty to process all apps;
const PATH = './'; //path to save anonymized data.
const FIELDS_TO_ANONYMIZE = {"did": 1, "up": {"name": 1, "username": 1, "email": 1, "organization": 1, "phone": 1, "picture": 1}, "custom": 1};

Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {
    console.log("Connected to databases...");

    //SET COMMON DBs
    common.db = countlyDb;
    common.drillDb = drillDb;

    var query = {};
    if (APPS.length > 0) {
        APPS.forEach(function(id, index) {
            APPS[index] = ObjectId(id);
        });
        query = {_id: {$in: APPS}};
    }
    try {
        //FETCH APPS
        var apps = await countlyDb.collection('apps').find(query, {_id: 1, name: 1}).toArray();
        //PROCESS COLLECTIONS FOR EACH APP
        for (let i = 0; i < apps.length; i++) {
            console.log("Processing app: " + apps[i].name);
            //CREATE DIR FOR APP
            if (!fs.existsSync(PATH + apps[i]._id)) {
                fs.mkdirSync(PATH + apps[i]._id);
            }
            //FETCH DRILL COLLECTIONS 
            var drillCollections = await getDrillCollections(apps[i]._id);
            //PROCESS EACH DRILL COLLECTION
            for (let j = 0; j < drillCollections.length; j++) {
                console.log("Processing collection: " + drillCollections[j].collectionName);
                //CREATE WRITE STREAM FOR DRILL COLLECTION
                var collectionWriteStream = fs.createWriteStream(PATH + apps[i]._id + '/' + drillCollections[j].collectionName + '.jsonl');
                //CREATE COLLECTION CURSOR
                const cursor = drillDb.collection(drillCollections[j].collectionName).find({});
                //FOR EACH DOCUMENT
                while (await cursor.hasNext()) {
                    var doc = await cursor.next();
                    //ANONYMIZE USER DATA
                    anonymizeRecursive(doc, FIELDS_TO_ANONYMIZE);
                    //WRITE USER DATA TO FILE
                    collectionWriteStream.write(JSON.stringify(doc) + '\n');
                }
            }
        }
    }
    catch (err) {
        console.log(err);
    }
    finally {
        countlyDb.close();
        drillDb.close();
        console.log("Done.");
    }

    async function getDrillCollections(appId) {
        var collections = [];
        try {
            var events = await countlyDb.collection("events").findOne({_id: common.db.ObjectID(appId)});
            var list = ["[CLY]_session", "[CLY]_crash", "[CLY]_view", "[CLY]_action", "[CLY]_push_action", "[CLY]_star_rating", "[CLY]_nps", "[CLY]_survey", "[CLY]_apm_network", "[CLY]_apm_device"];

            if (events && events.list) {
                for (var p = 0; p < events.list.length; p++) {
                    if (list.indexOf(events.list[p]) === -1) {
                        list.push(events.list[p]);
                    }
                }
            }
            for (let i = 0; i < list.length; i++) {
                var collectionName = drillCommon.getCollectionName(list[i], appId);
                collections.push({collectionName: collectionName});
            }
        }
        catch (err) {
            console.log("Error getting drill collections for app ", appId, "error: ", err);
        }
        return collections;
    }

    //RECURSIVE FUNCTION TO ANONYMIZE EMEDDED FIELDS
    function anonymizeRecursive(obj, fieldsToAnonymize) {
        for (let key in fieldsToAnonymize) {
            if (obj[key]) {
                if (fieldsToAnonymize[key] === 1) {
                    obj[key] = sha1Hash(obj[key]);
                }
                else if (typeof fieldsToAnonymize[key] === 'object') {
                    anonymizeRecursive(obj[key], fieldsToAnonymize[key]);
                }
            }
        }
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