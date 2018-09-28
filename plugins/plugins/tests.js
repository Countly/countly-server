/*global describe,it */
var request = require('supertest');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

// var APP_KEY = "";
var API_KEY_ADMIN = "";
// var APP_ID = "";
// var DEVICE_ID = "1234567890";

describe('Testing Plugins', function() {
    it('should have plugin', function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        // APP_ID = testUtils.get("APP_ID");
        // APP_KEY = testUtils.get("APP_KEY");
        request
            .get('/o/plugins?api_key=' + API_KEY_ADMIN)
            .expect(200)
            .end(function(err, res) {
                //{"name":"countly-plugins","title":"Plugins manager","version":"1.0.0","description":"Plugin manager to view and enable/disable plugins","author":"Count.ly","homepage":"https://count.ly","support":"http://community.count.ly/","keywords":["countly","analytics","mobile","plugins"],"dependencies":{},"private":true,"enabled":true,"code":"plugins"}
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob.should.not.be.empty;
                ob.should.be.an.instanceOf(Array);
                for (var i = 0; i < ob.length; i++) {
                    ob[i].should.have.property("name");
                    if (ob[i].name === "countly-plugins") {
                        ob[i].should.have.property("title", "Plugins manager");
                        ob[i].should.have.property("description", "Plugin manager to view and enable/disable plugins");
                        ob[i].should.have.property("author", "Count.ly");
                        ob[i].should.have.property("homepage", "https://count.ly/plugins");
                        ob[i].should.have.property("enabled", true);
                        ob[i].should.have.property("code", "plugins");
                    }
                }
                done();
            });
    });
});