var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";

describe('Complaince Hub', function() {
    describe('verify no result for user consent', function() {
        it('should have 0 records', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            request
                .post('/o/app_users/consents?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        done(err);
                    }
                    res.text.should.eql('{"iTotalRecords":0,"iTotalDisplayRecords":0,"aaData":[]}');
                    done();
                });
        });
        it('create the consent', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            var consent = {
            };
            request
                .post('/sdk/user_properties?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&consent' + JSON.stringify(consent))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                        done(err);
                    }
                    res.text.should.eql('{"iTotalRecords":0,"iTotalDisplayRecords":0,"aaData":[]}');
                    done();
                });

        })
    });
});