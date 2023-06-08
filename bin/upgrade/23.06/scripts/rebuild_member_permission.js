// This script will rebuild member permission based on the groups that the member belongs to

const pluginManager = require('../../../../plugins/pluginManager.js');
const { mergePermissions } = require('../../../../frontend/express/libs/members.js');

console.log('Rebuilding member permission');

pluginManager.dbConnection().then(async (countlyDb) => {
    const BATCH_SIZE = 200;
    // Get all members that belong to one or more group
    const membersToUpdate = await countlyDb.collection('members')
        .find({ group_id: { $exists: true, $type: 'array', $ne: [] } }) // find member that has 'group_id' property that is an array and not empty
        .project({ _id: 1, group_id: 1 })
        .toArray();
    let memberUpdates = [];

    for (let idx = 0; idx < membersToUpdate.length; idx += 1) {
        // Get object ids of the groups that this member belongs to
        const userGroupObjectIds = membersToUpdate[idx].group_id.reduce((groupIds, g_id) => {
            groupIds.push(countlyDb.ObjectID(g_id));

            return groupIds;
        }, []);
        // Get all the groups that this member belongs to
        const userGroups = await countlyDb.collection('groups')
            .find({ _id: { $in: userGroupObjectIds } })
            .toArray();

        const defaultPermission = { _: { u: [[]], a: [] }, c: {}, r: {}, u: {}, d: {} };

        // Construct member data related to permission from the groups that this member belongs to
        const newUserData = userGroups.reduce((acc, userGroup) => {
            mergePermissions(acc.permission, userGroup.permission);

            if (userGroup.global_admin) {
                acc.global_admin = userGroup.global_admin;
            }

            if (userGroup.restrict && userGroup.restrict.length) {
                acc.restrict.push(...userGroup.restrict);
            }

            return acc;
        }, { permission: defaultPermission, restrict: [], global_admin: false });

        // Collect the updates for each member in an array
        memberUpdates.push({
            updateOne: {
                filter: { _id: countlyDb.ObjectID(membersToUpdate[idx]._id) },
                update: {
                    $set: {
                        global_admin: newUserData.global_admin,
                        restrict: newUserData.restrict,
                        permission: newUserData.permission,
                    },
                },
            },
        });

        // Update member permissions in bulk
        if (memberUpdates.length === BATCH_SIZE || idx === membersToUpdate.length - 1) {
            try {
                await countlyDb.collection('members').bulkWrite(memberUpdates, { ordered: false });
            }
            catch (err) {
                console.error('Failed updating members collection', err);
            }
            finally {
                memberUpdates = [];
            }
        }
    }

    countlyDb.close();
    console.log('Member permission rebuild done');
});
