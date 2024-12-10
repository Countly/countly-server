/*
Script should be placed in ./bin/scripts/member-managament/disable_2fa.js

Script is used to disable user(s) 2FA by email.
*/

var pluginManager = require('../../../plugins/pluginManager.js');

const dry_run = false; //if set true, there will be only information outputted about users in the email list, but 2FA disable operation will not be triggered.
//const EMAILS = ["test@mail.com", "test2@mail.com"];
const EMAILS = [''];

if (dry_run) {
    console.log("This is a dry run");
    console.log("Members will only be listed, 2FA will not be disabled");
}

pluginManager.dbConnection().then(async(countlyDb) => {
    try {
        // Find the users by email
        let users = [];
        users = await getUsers(countlyDb, EMAILS);

        console.log(`The following ${users.length} user(s) 2FA will be disabled: `);
        console.log(JSON.stringify(users));
        if (!dry_run) {
            await Promise.all(users.map(async(user) => {
                let userId = user._id;
                await countlyDb.collection("members").findAndModify(
                    {_id: userId},
                    {},
                    {
                        $set: {"two_factor_auth.enabled": false},
                        $unset: {"two_factor_auth.secret_token": ""}
                    }
                );
                console.log("2FA removed: ", JSON.stringify(user));
            }));
            console.log("All done");
        }
    }
    catch (error) {
        console.log("ERROR: ");
        console.log(error);
    }
    finally {
        countlyDb.close();
    }
});

function getUsers(db, emails) {
    const query = {};
    if (emails?.length) {
        query.email = {
            $in: emails
        };
    }
    return db.collection('members').find(query, {
        projection: { _id: 1, email: 1 }
    }).toArray();
}