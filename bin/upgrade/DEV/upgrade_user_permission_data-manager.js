var pluginManager = require('../../../../plugins/pluginManager.js')

const OPERATION_BATCH_SIZE = 200;

console.log("Upgrading members/group permissions for data-manager");
pluginManager.dbConnection().then(async (countlyDb) => {
    const types = ['c', 'r', 'u', 'd'];
    function upgradeMembers() {
        return new Promise((resolve, reject) => {
            try {
                let requests = [];
                let cursor = countlyDb.collection('members').find({}, { projection: { _id: 1, permission: 1 } });
                cursor.forEach(async function (member) {
                    let update = {};
                    if (!member.permission) {
                        return;
                    }
                    for (let type of types) {
                        if (!member.permission[type]) {
                            continue;
                        }
                        let apps = member.permission[type];
                        Object.keys(apps).forEach(function (appId) {
                            if (apps[appId].allowed.data_manager) {
                                update[`permission.${type}.${appId}.allowed.data_manager: Transformations`] = true;
                                if (type !== 'r') {//since c,u,d means the same thing for data_manager: Redaction
                                    for (let CrudType of ['c','u','d']) {
                                        update[`permission.${CrudType}.${appId}.allowed.data_manager: Redaction`] = true;
                                    }
                                }
                                else {
                                    update[`permission.${type}.${appId}.allowed.data_manager: Redaction`] = true;
                                }
                            }
                            
                        })
                    }
                    if (Object.keys(update).length) {
                        requests.push({
                            'updateOne': {
                                'filter': { '_id': member._id },
                                'update': { '$set': update },
                                'upsert':true
                            }
                        })
                    }
        
                    if (requests.length >= OPERATION_BATCH_SIZE) {
                        try {
                            await countlyDb.collection('members').bulkWrite(requests, { ordered: false })
                            requests = [];
                        }
                        catch (ex) {
                            console.error(ex);
                        }
                    }
                }, async function () {
                    if(requests.length > 0) {
                        try {
                            await countlyDb.collection('members').bulkWrite(requests, { ordered: false })
                        }
                        catch (ex) {
                            console.error(ex);
                        }
                    }
                    console.log("SUCCESS: Upgraded members permissions for data-manager");
                    resolve();
                })
                }
            catch (e) {
                console.log("Error while upgrading groups permission", e);
                reject();
                throw new Error(e)
            }
        })
    }
    function upgradeGroups() {
        return new Promise((resolve, reject) => {
            try {
                let requests = [];
                let cursor = countlyDb.collection('groups').find({}, { projection: { _id: 1, permission: 1 } });
                cursor.forEach(async function (group) {
                    let update = {};
                    if (!group.permission) {
                        return;
                    }
                    for (let type of types) {
                        if (!group.permission[type]) {
                            continue;
                        }
                        let apps = group.permission[type];
                        Object.keys(apps).forEach(function (appId) {
                            if (apps[appId].allowed.data_manager) {
                                update[`permission.${type}.${appId}.allowed.data_manager: Transformations`] = true;
                                if (type !== 'r') {//since c,u,d means the same thing for data_manager: Redaction
                                    for (let CrudType of ['c','u','d']) {
                                        update[`permission.${CrudType}.${appId}.allowed.data_manager: Redaction`] = true;
                                    }
                                }
                                else {
                                    update[`permission.${type}.${appId}.allowed.data_manager: Redaction`] = true;
                                }
                            }
                            
                        })
                    }
                    if (Object.keys(update).length) {
                        requests.push({
                            'updateOne': {
                                'filter': { '_id': group._id },
                                'update': { '$set': update },
                                'upsert':true
                            }
                        })
                    }
        
                    if (requests.length >= OPERATION_BATCH_SIZE) {
                        try {
                            await countlyDb.collection('groups').bulkWrite(requests, { ordered: false })
                            requests = [];
                        }
                        catch (ex) {
                            console.error(ex);
                        }
                    }
                }, async function () {
                    if(requests.length > 0) {
                        try {
                            await countlyDb.collection('groups').bulkWrite(requests, { ordered: false })
                        }
                        catch (ex) {
                            console.error(ex);
                        }
                    }
                    console.log("SUCCESS: Upgraded groups permissions for data-manager");
                    resolve();
                })
                }
            catch (e) {
                console.log("Error while upgrading groups permission", e);
                reject();
                throw new Error(e)
            }
        })
    }

    async function run() {
        try {
            await upgradeMembers();
            await upgradeGroups();
            countlyDb.close();
        } catch (error) {
            countlyDb.close();
        }
    }
    
    run();
        
});
