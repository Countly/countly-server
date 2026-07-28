var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
var fs = require('fs');
var path = require('path');
request = request(testUtils.url);

var API_KEY_ADMIN = "";

// Uploads are refused unless a plugin declares the request path, so a wrong
// declaration silently stops an endpoint from ever receiving its file.
//
// /i/apps/create cannot be checked on its response: it answers with the created
// app whether an icon was attached or not, because iconUpload simply does
// nothing when params.files is empty. The icon is served by /appimages/<id>.png,
// which also always answers 200 - with the stored icon, or with
// default_app_icon.png when there is none.
//
// A freshly created app has no icon, so "what is served is not the default" is
// decisive: had the upload been refused, nothing would be stored and the route
// would fall back to the default.
describe('App icon upload', function() {
    var createdId = null;
    var defaultIcon = fs.readFileSync(path.resolve(__dirname, './../../frontend/express/public/images/default_app_icon.png'));
    var icon = path.resolve(__dirname, './../../frontend/express/public/images/favicon.png');

    it('should create an app with an attached icon', function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        request
            .post('/i/apps/create?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({name: "Icon Upload Test App"}))
            .attach('app_image', icon)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob.should.have.property('_id');
                createdId = ob._id;
                done();
            });
    });

    it('should serve the uploaded icon rather than the default', function(done) {
        if (!createdId) {
            return done(new Error("app was not created"));
        }
        request
            .get('/appimages/' + createdId + '.png')
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                // an image response is not parsed, so superagent hands it back raw
                Buffer.isBuffer(res.body).should.equal(true);
                res.body.length.should.be.above(0);
                Buffer.compare(res.body, defaultIcon).should.not.equal(0,
                    "the default icon came back, so the uploaded file never reached the handler");
                done();
            });
    });

    it('should remove the test app', function(done) {
        if (!createdId) {
            return done(new Error("app was not created"));
        }
        request
            .get('/i/apps/delete?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({app_id: createdId}))
            .expect(200)
            .end(function(err) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });
});
