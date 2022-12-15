var pluginManager = require('../../../../plugins/pluginManager.js'),
    async = require('async');

//mapping from restrict plugin to CRUD permissions
var restrictMap = {
    "#/": "core",
    "#/ab-testing": "ab_testing",
    "#/analytics/activity-map": "activity_map",
    "#/analytics/browser": "browser",
    "#/analytics/concurrent": "concurrent_users",
    "#/analytics/density": "density",
    "#/analytics/events": "events",
    "#/analytics/events/overview": "events",
    "#/analytics/formulas": "formulas",
    "#/analytics/keywords": "sources",
    "#/analytics/languages": "locale",
    "#/analytics/manage-events": "events",
    "#/analytics/retention": "retention_segments",
    "#/analytics/slipping-away": "slipping_away_users",
    "#/analytics/sources": "sources",
    "#/analytics/star-rating": "star_rating",
    "#/analytics/times-of-day": "times_of_day",
    "#/analytics/view-frequency": "views",
    "#/analytics/views": "views",
    "#/attribution": "attribution",
    "#/cohorts": "cohorts",
    "#/crash/symbol_jobs": "crashes",
    "#/crash/symbols": "crashes",
    "#/crashes": "crashes",
    "#/drill": "drill",
    "#/flows": "flows",
    "#/funnels": "funnels",
    "#/ias": "surveys",
    "#/manage/alerts": "alerts",
    "#/manage/blocks": "block",
    "#/manage/compliance": "compliance_hub",
    "#/manage/data-manager": "data_manager",
    "#/manage/db": "dbviewer",
    "#/manage/export/export-features": "config_transfer",
    "#/manage/hooks": "hooks",
    "#/manage/logger": "logger",
    "#/manage/populate": "populator",
    "#/manage/reports": "reports",
    "#/nps": "surveys",
    "#/performance-monitoring": "performance_monitoring",
    "#/remote-config": "remote_config",
    "#/revenue": "revenue",
    "#/messaging": "push",
    "#/messaging/geolocations": "geo",
    "#/users": "users"
};

//list of permissions
var permissions = ["core","events","web","density","locale","sources","views","drill","funnels","retention_segments","flows","formulas","activity_map","cohorts","surveys","remote_config","ab_testing","revenue","logger","systemlogs","populator","reports","crashes","push","geo","block","users","star_rating","alerts","slipping_away_users","compare","assistant","dbviewer","times_of_day","compliance_hub","active_users","performance_monitoring","config_transfer","data_manager","vue_example","attribution","data_migration","groups","concurrent_users","browser","heatmaps","monetization","two_factor_auth","dashboards"];

pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('members').find({}).toArray(function(err, members) {
        if (!members && err) {
            console.log(err);
            countlyDb.close();
            return;
        }

        function upgrade(member, done) {
            
            //check if member has permission
            if (member.permission) {
                done();
                return;
            }
            var memberPermission = {
                "c": {},
                "r": {},
                "u": {},
                "d": {},
                "_": {
                    "a": [],
                    "u": [[]]
                }
            };

            if (!member.global_admin) {
                var writeAccess = member.admin_of || [];
                var readAccess = member.user_of || [];

                writeAccess.forEach(app => {
                    if (!app.length) {
                        return;
                    }
                    var restricted = false;
                    var i = 0;
                    memberPermission.c[app] = {all: false, allowed: {}};
                    memberPermission.r[app] = {all: false, allowed: {}};
                    memberPermission.u[app] = {all: false, allowed: {}};
                    memberPermission.d[app] = {all: false, allowed: {}};
                    
                    //check global restrict permissions
                    if (member.restrict && member.restrict.length) {
                        for (i = 0; i < member.restrict.length; i++) {
                            if (restrictMap[member.restrict[i]]) {
                                restricted = true;
                                memberPermission.c[app].allowed[restrictMap[member.restrict[i]]] = false;
                                memberPermission.r[app].allowed[restrictMap[member.restrict[i]]] = false;
                                memberPermission.u[app].allowed[restrictMap[member.restrict[i]]] = false;
                                memberPermission.d[app].allowed[restrictMap[member.restrict[i]]] = false;
                            }
                        }
                    }
                    
                    //check app level restrict permissions
                    if (member.app_restrict && member.app_restrict[app] && member.app_restrict[app].length) {
                        var specificRestrictions = false;
                        for (i = 0; i < member.app_restrict[app].length; i++) {
                            if (restrictMap[member.app_restrict[app][i]]) {
                                restricted = true;
                                specificRestrictions = true;
                                memberPermission.c[app].allowed[restrictMap[member.app_restrict[app][i]]] = false;
                                memberPermission.r[app].allowed[restrictMap[member.app_restrict[app][i]]] = false;
                                memberPermission.u[app].allowed[restrictMap[member.app_restrict[app][i]]] = false;
                                memberPermission.d[app].allowed[restrictMap[member.app_restrict[app][i]]] = false;
                            }
                        }
                        if (specificRestrictions) {
                            //app has specific restrictions, adding it to separate set
                             memberPermission._.u.push([app]);
                        }
                    }
                    else if (restricted){
                        //app did not have any specific restrictions, so adding it to first set
                        memberPermission._.u[0].push(app);
                    }
                    
                    //fill other permissions
                    if (restricted) {
                        for (i = 0; i < permissions.length; i++) {
                            if (typeof memberPermission.c[app].allowed[permissions[i]] === "undefined") {
                                memberPermission.c[app].allowed[permissions[i]] = true;
                                memberPermission.r[app].allowed[permissions[i]] = true;
                                memberPermission.u[app].allowed[permissions[i]] = true;
                                memberPermission.d[app].allowed[permissions[i]] = true;
                            }
                        }
                    }
                    //user was not restricted
                    else {
                        memberPermission.c[app] = {all: true};
                        memberPermission.r[app] = {all: true};
                        memberPermission.u[app] = {all: true};
                        memberPermission.d[app] = {all: true};
                        memberPermission._.a.push(app);
                    }
                });
    
                readAccess.forEach(app => {
                    //only if permission was not filled by write
                    if (!memberPermission.r[app]) {
                        var restricted = false;
                        var i = 0;
                        memberPermission.r[app] = {all: false, allowed: {}};
                        
                        //check global restrict permissions
                        if (member.restrict && member.restrict.length) {
                            for (i = 0; i < member.restrict.length; i++) {
                                if (restrictMap[member.restrict[i]]) {
                                    restricted = true;
                                    memberPermission.r[app].allowed[restrictMap[member.restrict[i]]] = false;
                                }
                            }
                        }
                        
                        //check app level restrict permissions
                        if (member.app_restrict && member.app_restrict[app] && member.app_restrict[app].length) {
                            var specificRestrictions = false;
                            for (i = 0; i < member.app_restrict[app].length; i++) {
                                if (restrictMap[member.app_restrict[app][i]]) {
                                    restricted = true;
                                    specificRestrictions = true;
                                    memberPermission.r[app].allowed[restrictMap[member.app_restrict[app][i]]] = false;
                                }
                            }
                            if (specificRestrictions) {
                                //app has specific restrictions, adding it to separate set
                                memberPermission._.u.push([app]);
                            }
                        }
                        else if (restricted){
                            //app did not have any specific restrictions, so adding it to first set
                            memberPermission._.u[0].push(app);
                        }
                        
                        //fill other permissions
                        if (restricted) {
                            for (i = 0; i < permissions.length; i++) {
                                if (typeof memberPermission.r[app].allowed[permissions[i]] === "undefined") {
                                    memberPermission.r[app].allowed[permissions[i]] = true;
                                }
                            }
                        }
                        //user was not restricted
                        else {
                            memberPermission.r[app] = {all: true};
                            memberPermission._.u[0].push(app);
                        }
                    }
                });
                
                //sanity check for _ if first set is empty and has multiple sets
                if (memberPermission._.u.length > 1 && !memberPermission._.u[0].length) {
                    memberPermission._.u.shift();
                }
            }

            countlyDb.collection('members').findAndModify({"_id": member._id}, {}, {$set: {permission: memberPermission, migrated:"22.02"}}, function(err, member) {
                if (err || !member) {
                    console.log("Member not found.");
                }
                done();
                return;
            });
        }

        async.forEach(members, upgrade, function() {
            console.log("Finished upgrading member permissions.");
            countlyDb.close();
        });
    });
});