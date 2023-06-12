/* 
This script automatically grants the dependency permissions (Data-Manager: Transformation & Data-Manager:Redacation) for data-manager, for eligible members.
Ex: If a user initally had read permission for Data-Manager, then without running this script after upgrade he will still have read permission for Data-Manager,
but now he won't be able to access certain things, for example Transformation. Running the script will grant him read permission for Data-Manager: Transformation & Data-Manager:Redacation automatically.
(inital read permission for Data-Manager will also be preserved).
*/

var pluginManager = require('../../../../plugins/pluginManager.js')
const OPERATION_BATCH_SIZE = 200;

console.log("Upgrading members/group permissions for data-manager");
pluginManager.dbConnection().then(async (countlyDb) => {
    const types = ['c', 'r', 'u', 'd']; 
    function upgradePermission(collectionName) {
        return new Promise((resolve, reject) => {
            try {
                let requests = [];
                let cursor = countlyDb.collection(collectionName).find({}, { projection: { _id: 1, permission: 1 } });
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
                            if (!appId) {
                                return;
                            }
                            if (!apps[appId].allowed) {
                                apps[appId].allowed = {};
                                update[`permission.${type}.${appId}.allowed`] = {};
                            }
                            else if (apps[appId].allowed.data_manager) {
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
                            await countlyDb.collection(collectionName).bulkWrite(requests, { ordered: false })
                            requests = [];
                        }
                        catch (ex) {
                            console.error(ex);
                        }
                    }
                }, async function () {
                    if(requests.length > 0) {
                        try {
                            await countlyDb.collection(collectionName).bulkWrite(requests, { ordered: false })
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
                reject(`Error while upgrading ${collectionName} permission, ${e}`);
            }
        })
    }

    async function run() {
        try {
            await upgradePermission('members');
            await upgradePermission('groups');
            countlyDb.close();
        } catch (error) {
            console.log(error)
            countlyDb.close();
        }
    }
    
    run();
        
});
