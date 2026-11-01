require("should");
var fs = require("fs");

// /o/feedback/multiple-widgets-by-id and /o/feedback/widget answer the sdk without a
// session and without an app_id to scope by, so they cannot be gated without breaking
// widget rendering. What they can do is stop returning the fields the app-scoped
// /feedback/widgets deliberately withholds: targeting, the audience segmentation
// query, and cohortID, which that handler deletes with "no need to return more data
// than needed".
//
// Asserted against the source because both handlers are registered on a plugin bus at
// load time and their bodies are not reachable as functions from a unit test.

describe("feedback widget by-id lookups", function() {
    var src = fs.readFileSync(__dirname + "/../../plugins/star-rating/api/api.js", "utf8");

    it("declares the internal fields as excluded", function() {
        src.should.match(/const WIDGET_INTERNAL_FIELDS = \{targeting: 0, cohortID: 0\}/);
    });

    it("applies the exclusion to the batch lookup", function() {
        var batch = src.slice(src.indexOf("'/o/feedback/multiple-widgets-by-id'"));
        batch = batch.slice(0, batch.indexOf("plugins.register", 10));
        batch.should.match(/\$in: widgetIdsArray[\s\S]{0,80}projection: WIDGET_INTERNAL_FIELDS/);
    });

    it("applies the exclusion to the single lookup", function() {
        var single = src.slice(src.indexOf("'/o/feedback/widget'"));
        single = single.slice(0, single.indexOf("plugins.register", 10));
        single.should.match(/"_id": widgetId[\s\S]{0,60}projection: WIDGET_INTERNAL_FIELDS/);
    });

    it("excludes rather than allow-lists, so widget types beyond rating still render", function() {
        // an inclusion projection here would drop the fields surveys and nps need, and
        // the caller is an sdk in the field that cannot be redeployed
        var decl = src.match(/const WIDGET_INTERNAL_FIELDS = \{[^}]*\}/)[0];
        decl.should.not.match(/: 1/);
    });
});
