var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var API_KEY_USER = "";
var APP_ID = "";

describe('Empty app data reading', function() {
    describe('Empty locations', function() {
        it('should display locations', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            API_KEY_USER = testUtils.get("API_KEY_USER");
            APP_ID = testUtils.get("APP_ID");
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=locations')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    for (var key in ob) {
                        ob.should.have.property(key).and.eql({
                            limits: {
                                event_limit: 500,
                                event_segmentation_limit: 100,
                                event_segmentation_value_limit: 1000
                            }
                        });
                    }
                    done();
                });
        });
    });
    describe('Empty sessions', function() {
        it('should display sessions', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=sessions')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    for (var key in ob) {
                        ob.should.have.property(key).and.eql({});
                    }
                    done();
                });
        });
    });
    describe('Empty users', function() {
        it('should display users', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=users')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    for (var key in ob) {
                        ob.should.have.property(key).and.eql({});
                    }
                    done();
                });
        });
    });
    describe('Empty devices', function() {
        it('should display devices', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=devices')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    for (var key in ob) {
                        ob.should.have.property(key).and.eql({});
                    }
                    done();
                });
        });
    });
    describe('Empty device_details', function() {
        it('should display device_details', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=device_details')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    for (var key in ob) {
                        ob.should.have.property(key).and.eql({});
                    }
                    done();
                });
        });
    });
    describe('Empty carriers', function() {
        it('should display carriers', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=carriers')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    for (var key in ob) {
                        ob.should.have.property(key).and.eql({});
                    }
                    done();
                });
        });
    });
    describe('Empty app_versions', function() {
        it('should display app_versions', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=app_versions')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    for (var key in ob) {
                        ob.should.have.property(key).and.eql({});
                    }
                    done();
                });
        });
    });
    describe('Empty cities', function() {
        it('should display cities', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=cities')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    for (var key in ob) {
                        ob.should.have.property(key).and.eql({});
                    }
                    done();
                });
        });
    });
    describe('Empty events', function() {
        it('should display events', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.eql({});
                    done();
                });
        });
    });
    describe('Empty get_events', function() {
        it('should display get_events', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.eql({
                        limits: {
                            event_limit: 500,
                            event_segmentation_limit: 100,
                            event_segmentation_value_limit: 1000
                        }
                    });
                    done();
                });
        });
    });
});
