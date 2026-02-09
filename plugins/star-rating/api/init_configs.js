var plugins = require('../../pluginManager.ts');
const FEATURE_NAME = 'star_rating';
var surveysEnabled = plugins.getPlugins().indexOf('surveys') > -1;
plugins.internalEvents.push('[CLY]_star_rating');
plugins.internalDrillEvents.push("[CLY]_star_rating");
plugins.internalOmitSegments["[CLY]_star_rating"] = ["email", "comment", "widget_id", "contactMe"];
if (!surveysEnabled) {
    plugins.setConfigs("feedback", {
        main_color: "#0166D6",
        font_color: "#FFFFFF",
        feedback_logo: ""

    });
}
plugins.register("/permissions/features", function(ob) {
    ob.features.push(FEATURE_NAME);
});