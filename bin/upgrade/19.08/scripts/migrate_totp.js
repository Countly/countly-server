var pluginManager = require("../../../../plugins/pluginManager.js");

console.log("Migrating totp data to two-factor-auth");
pluginManager.dbConnection().then((db) => {
    db.collection("members").find({totp_toggle: 1, secret_token_b32: {$exists: true}}).toArray(function(memberSetupErr, members) {
        if (memberSetupErr) {
            console.log(memberSetupErr.message);
            db.close();
            return;
        }
    
        members.forEach(function(member) {
            member.two_factor_auth = {
                enabled: true,
                secret_token: member.secret_token_b32
            };
    
            console.log(`Setting up 2FA for ${member.username}`);
            db.collection("members").save(member); 
        });
    
        console.log("Cleaning up totp attributes in members");
        db.collection("members").updateMany({}, {$unset: {totp_toggle: "", secret_token_b32: ""}}, {}, function(memberCleanErr, result) {
            if (memberCleanErr) {
                console.log(memberCleanErr.message);
            }
            
            var totpConfig = pluginManager.getConfig("totp");
    
            console.log("Synchronizing global enforcement of 2FA");
            db.collection("plugins").updateOne(
                {_id: "plugins"},
                {
                    $set: {"two-factor-auth.globally_enabled": !!(totpConfig && totpConfig.global_enable)},
                    $unset: {"totp": ""}
                },
                function(pluginConfigErr) {
                    if (pluginConfigErr) {
                        console.log(pluginConfigErr.message);
                    }
    
                    db.close();
                }
            );
        });
    });
});