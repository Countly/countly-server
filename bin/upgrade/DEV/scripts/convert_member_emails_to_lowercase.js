/**
 *  Modifies all member emails and where these emails are used to lowercase
 *  Server: countly
 *  Path: countly dir/bin/scripts/convert_member_emails_to_lowercase.js
 *  Command: convert_member_emails_to_lowercase.js
 */

var pluginManager = require('../../../../plugins/pluginManager');
var Promise = require("bluebird");

function updateCohortSharedEmails(db) {
    return new Promise((resolve, reject) => {
        db.collection("cohorts").update(
            { shared_email_edit: { $ne: null } },
            [
                {
                    $set: {
                        shared_email_edit: {
                            $map: {
                                input: "$shared_email_edit",
                                in: { $toLower: "$$this" }
                            }
                        }
                    }
                }
            ],
            { multi: true },
            (err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
    });
}

function updateNotesSharedEmails(db) {
    return new Promise((resolve, reject) => {
        db.collection("notes").update(
            { emails: { $ne: null } },
            [
                {
                    $set: {
                        emails: {
                            $map: {
                                input: "$emails",
                                in: { $toLower: "$$this" }
                            }
                        }
                    }
                }
            ],
            { multi: true },
            (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            }
        );
    });
}

function updateDashboardSharedEmails(db) {
    return new Promise((resolve, reject) => {
        db.collection("dashboards").update(
            {},
            [
                {
                    $set: {
                        shared_email_edit: {
                            $map: {
                                input: "$shared_email_edit",
                                in: { $toLower: "$$this" }
                            }
                        },
                        shared_email_view: {
                            $map: {
                                input: "$shared_email_view",
                                in: { $toLower: "$$this" }
                            }
                        }
                    }
                }
            ],
            { multi: true },
            (err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
    });
}

function updateMemberEmails(db) {
    return new Promise((resolve, reject) => {
        db.collection("members").update(
            { email: { $ne: null } },
            [
                {
                    $set: {
                        email: {
                            $map: {
                                input: "$email",
                                in: { $toLower: "$$this" }
                            }
                        }
                    }
                }
            ],
            { multi: true },
            (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
    });
}

async function context() {
    const countlyDb = await pluginManager.dbConnection("countly");

    try {
        await updateCohortSharedEmails(countlyDb);
        console.log("Cohorts update successful.");
    }
    catch (err) {
        console.error("Error updating cohorts:", err);
    }

    try {
        await updateNotesSharedEmails(countlyDb);
        console.log("Notes update successful.");
    }
    catch (err) {
        console.error("Error updating notes:", err);
    }

    try {
        await updateDashboardSharedEmails(countlyDb);
        console.log("Dashboards update successful.");
    }
    catch (err) {
        console.error("Error updating dashboards:", err);
    }

    try {
        await updateMemberEmails(countlyDb);
        console.log("Members update successful.");
    }
    catch (err) {
        console.error("Error updating dashboards:", err);
    }

    countlyDb.close();
    console.log("All done!");
}


context();