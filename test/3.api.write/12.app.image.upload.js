var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
var fs = require('fs');
var path = require('path');
request = request(testUtils.url);

var API_KEY_ADMIN = "";

var DEFAULT_ICON = fs.readFileSync(path.resolve(__dirname, './../../frontend/express/public/images/default_app_icon.png'));
var ICON_A = path.resolve(__dirname, './../../frontend/express/public/images/favicon.png');
var ICON_B = path.resolve(__dirname, './../../frontend/express/public/images/default_member_icon.png');

// Uploads are refused unless a plugin declares the request path, so a wrong
// declaration silently stops an endpoint from ever receiving its file.
//
// The apps endpoints cannot be checked on their response: iconUpload does
// nothing when params.files is empty, so they answer with the app either way.
// The icon is served by /appimages/<id>.png, which also always answers 200 -
// with the stored icon, or with default_app_icon.png when there is none. So the
// check is on what gets served, with a freshly created app to give a control.

/**
 * Fetch the served icon, retrying while it is still the default.
 *
 * iconUpload resolves once jimp has produced the buffer, but hands that buffer
 * to countlyFs.saveData without waiting for it, so the store completes after the
 * response has gone out. Polling is how the test observes the result without
 * production code having to change.
 * @param {string} appId - the app whose icon to fetch
 * @param {number} attempts - how many times to look before giving up
 * @param {function} callback - called with (err, body)
 * @returns {void}
 */
function fetchStoredIcon(appId, attempts, callback) {
    request
        .get('/appimages/' + appId + '.png')
        .expect(200)
        .end(function(err, res) {
            if (err) {
                return callback(err);
            }
            var body = res.body;
            var stored = Buffer.isBuffer(body) && Buffer.compare(body, DEFAULT_ICON) !== 0;
            if (stored || attempts <= 1) {
                // hand back whatever we have; the caller asserts on it, so a
                // genuinely refused upload still fails with a useful message
                return callback(null, body);
            }
            setTimeout(function() {
                fetchStoredIcon(appId, attempts - 1, callback);
            }, 300);
        });
}

describe('App icon upload on create', function() {
    var createdId = null;

    it('should create an app with an attached icon', function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        request
            .post('/i/apps/create?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({name: "Icon Upload Test App"}))
            .attach('app_image', ICON_A)
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
        fetchStoredIcon(createdId, 10, function(err, body) {
            if (err) {
                return done(err);
            }
            Buffer.isBuffer(body).should.equal(true);
            body.length.should.be.above(0);
            Buffer.compare(body, DEFAULT_ICON).should.not.equal(0,
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

// The update path needs its own cover, and creating the app without an icon
// first gives a control: the default must come back before the upload, so the
// change afterwards cannot be explained by whatever the app already held.
describe('App icon upload on update', function() {
    var createdId = null;

    it('should create an app with no icon', function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        request
            .get('/i/apps/create?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({name: "Icon Update Test App"}))
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

    it('should serve the default icon before any upload', function(done) {
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
                // the control that makes the assertion after the upload mean
                // something: with nothing stored the route falls back
                Buffer.compare(res.body, DEFAULT_ICON).should.equal(0);
                done();
            });
    });

    it('should accept an icon on update', function(done) {
        if (!createdId) {
            return done(new Error("app was not created"));
        }
        request
            .post('/i/apps/update?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({app_id: createdId, name: "Icon Update Test App renamed"}))
            .attach('app_image', ICON_B)
            .expect(200)
            .end(function(err) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('should serve the uploaded icon after the update', function(done) {
        if (!createdId) {
            return done(new Error("app was not created"));
        }
        fetchStoredIcon(createdId, 10, function(err, body) {
            if (err) {
                return done(err);
            }
            Buffer.isBuffer(body).should.equal(true);
            body.length.should.be.above(0);
            Buffer.compare(body, DEFAULT_ICON).should.not.equal(0,
                "the default icon still came back, so the uploaded file never reached the handler");
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
