const pluginManager = require('../../../../plugins/pluginManager.js');

console.log('Restoring dashboard');

pluginManager.dbConnection().then(async (countlyDb) => {
    const dashboardsToRestore = await countlyDb.collection('dashboards_bak')
        .find({ share_with: 'selected-users' })
        .toArray();

    for (let idx = 0; idx < dashboardsToRestore.length; idx += 1) {
        const dashboard = dashboardsToRestore[idx];

        await countlyDb.collection('dashboards').updateOne({ _id: dashboard._id }, {
            $set: {
                share_with: 'selected-users',
                shared_email_edit: dashboard.shared_email_edit,
                shared_email_view: dashboard.shared_email_view,
                shared_user_groups_edit: dashboard.shared_user_groups_edit,
                shared_user_groups_view: dashboard.shared_user_groups_view,
            }
        });
    }

    console.log('Restoring dashboard finished');
    countlyDb.close();
});
