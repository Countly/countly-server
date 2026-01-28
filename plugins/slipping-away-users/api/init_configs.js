var plugins = require('../../pluginManager.ts');

plugins.setConfigs("slipping-away-users", {
    p1: 7,
    p2: 14,
    p3: 30,
    p4: 60,
    p5: 90,
});
const FEATURE_NAME = 'slipping_away_users';

plugins.register("/permissions/features", function(ob) {
    ob.features.push(FEATURE_NAME);
});