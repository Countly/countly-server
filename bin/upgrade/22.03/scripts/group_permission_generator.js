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
    countlyDb.collection('groups').find({}).toArray(function(err, groups) {
        if (!groups && err) {
            console.log(err);
            countlyDb.close();
            return;
        }

        function upgrade(group, done) {
            
            //check if group has permission
            if (group.permission) {
                done();
                return;
            }
            
            var groupPermission = {
                "c": {},
                "r": {},
                "u": {},
                "d": {},
                "_": {
                    "a": [],
                    "u": [[]]
                }
            };

            // we need to check global admin flag
            // because if groups is global admin, we don't need to prepare permissions 
            // but we still need empty permission object for ui to work
            // also we still need to check that group has admin_of and user_of properties 
            // because some groups may dooesn't have those properties
            if (!group.global_admin) {
                var writeAccess = group.admin_of || [];
                var readAccess = group.user_of || [];
    
                writeAccess.forEach(app => {
                    if (!app.length) {
                        return;
                    }
                    var restricted = false;
                    var i = 0;
                    groupPermission.c[app] = {all: false, allowed: {}};
                    groupPermission.r[app] = {all: false, allowed: {}};
                    groupPermission.u[app] = {all: false, allowed: {}};
                    groupPermission.d[app] = {all: false, allowed: {}};
                    
                    //check global restrict permissions
                    if (group.restrict && group.restrict.length) {
                        for (i = 0; i < group.restrict.length; i++) {
                            if (restrictMap[group.restrict[i]]) {
                                restricted = true;
                                groupPermission.c[app].allowed[restrictMap[group.restrict[i]]] = false;
                                groupPermission.r[app].allowed[restrictMap[group.restrict[i]]] = false;
                                groupPermission.u[app].allowed[restrictMap[group.restrict[i]]] = false;
                                groupPermission.d[app].allowed[restrictMap[group.restrict[i]]] = false;
                            }
                        }
                    }
                    
                    //check app level restrict permissions
                    if (group.app_restrict && group.app_restrict[app] && group.app_restrict[app].length) {
                        var specificRestrictions = false;
                        for (i = 0; i < group.app_restrict[app].length; i++) {
                            if (restrictMap[group.app_restrict[app][i]]) {
                                restricted = true;
                                specificRestrictions = true;
                                groupPermission.c[app].allowed[restrictMap[group.app_restrict[app][i]]] = false;
                                groupPermission.r[app].allowed[restrictMap[group.app_restrict[app][i]]] = false;
                                groupPermission.u[app].allowed[restrictMap[group.app_restrict[app][i]]] = false;
                                groupPermission.d[app].allowed[restrictMap[group.app_restrict[app][i]]] = false;
                            }
                        }
                        if (specificRestrictions) {
                            //app has specific restrictions, adding it to separate set
                             groupPermission._.u.push([app]);
                        }
                    }
                    else if (restricted){
                        //app did not have any specific restrictions, so adding it to first set
                        groupPermission._.u[0].push(app);
                    }
                    
                    //fill other permissions
                    if (restricted) {
                        for (i = 0; i < permissions.length; i++) {
                            if (typeof groupPermission.c[app].allowed[permissions[i]] === "undefined") {
                                groupPermission.c[app].allowed[permissions[i]] = true;
                                groupPermission.r[app].allowed[permissions[i]] = true;
                                groupPermission.u[app].allowed[permissions[i]] = true;
                                groupPermission.d[app].allowed[permissions[i]] = true;
                            }
                        }
                    }
                    //user was not restricted
                    else {
                        groupPermission.c[app] = {all: true};
                        groupPermission.r[app] = {all: true};
                        groupPermission.u[app] = {all: true};
                        groupPermission.d[app] = {all: true};
                        groupPermission._.a.push(app);
                    }
                });
    
                readAccess.forEach(app => {
                    //only if permission was not filled by write
                    if (!groupPermission.r[app]) {
                        var restricted = false;
                        var i = 0;
                        groupPermission.r[app] = {all: false, allowed: {}};
                        
                        //check global restrict permissions
                        if (group.restrict && group.restrict.length) {
                            for (i = 0; i < group.restrict.length; i++) {
                                if (restrictMap[group.restrict[i]]) {
                                    restricted = true;
                                    groupPermission.r[app].allowed[restrictMap[group.restrict[i]]] = false;
                                }
                            }
                        }
                        
                        //check app level restrict permissions
                        if (group.app_restrict && group.app_restrict[app] && group.app_restrict[app].length) {
                            var specificRestrictions = false;
                            for (i = 0; i < group.app_restrict[app].length; i++) {
                                if (restrictMap[group.app_restrict[app][i]]) {
                                    restricted = true;
                                    specificRestrictions = true;
                                    groupPermission.r[app].allowed[restrictMap[group.app_restrict[app][i]]] = false;
                                }
                            }
                            if (specificRestrictions) {
                                //app has specific restrictions, adding it to separate set
                                groupPermission._.u.push([app]);
                            }
                        }
                        else if (restricted){
                            //app did not have any specific restrictions, so adding it to first set
                            groupPermission._.u[0].push(app);
                        }
                        
                        //fill other permissions
                        if (restricted) {
                            for (i = 0; i < permissions.length; i++) {
                                if (typeof groupPermission.r[app].allowed[permissions[i]] === "undefined") {
                                    groupPermission.r[app].allowed[permissions[i]] = true;
                                }
                            }
                        }
                        //user was not restricted
                        else {
                            groupPermission.r[app] = {all: true};
                            groupPermission._.u[0].push(app);
                        }
                    }
                });
                
                //sanity check for _ if first set is empty and has multiple sets
                if (groupPermission._.u.length > 1 && !groupPermission._.u[0].length) {
                    groupPermission._.u.shift();
                }
            }

            countlyDb.collection('groups').findAndModify({"_id": group._id}, {}, {$set: {permission: groupPermission, migrated:"22.02"}}, function(err, group) {
                if (err || !group) {
                    console.log("group not found.");
                }
                done();
                return;
            });
        }

        async.forEach(groups, upgrade, function() {
            console.log("Finished upgrading group permissions.");
            countlyDb.close();
        });
    });
});