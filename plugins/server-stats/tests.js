var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request.agent(testUtils.url);

var APP_KEY = '';
var API_KEY_ADMIN = '';
var APP_ID = '';
var currentTime = Date.now();

const verifyDataPointsProperty = (obj) => {
    return new Promise((resolve, reject) => {
        try {
            Object.values(obj).forEach(item => {
                item.should.have.property('events');
                item.should.have.property('sessions');
                item.should.have.property('push');
                item.should.have.property('dp');
                item.should.have.property('change');
            });
            resolve();
        }
        catch (err) {
            reject(err);
        }
    });
};

describe('Testing data points plugin', function() {
    describe('Get server stats data', function() {
        it('should list track of the data point consumption in (30 days)', function(done) {
            APP_KEY = testUtils.get("APP_KEY");
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            request
                .get('/o/server-stats/data-points?period=30days' + '&api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('all-apps');
                    verifyDataPointsProperty(ob)
                        .then(done)
                        .catch(function(err) {
                            return done(err.message);
                        });
                });
        });
        it('should list track of the data point consumption in (90 days)', function(done) {
            request
                .get('/o/server-stats/data-points?period=' + (currentTime - (90 * 24 * 60 * 60 * 1000)) + '&api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('all-apps');
                    verifyDataPointsProperty(ob)
                        .then(done)
                        .catch(function(err) {
                            return done(err.message);
                        });
                });
        });
    });

    describe('Get server stats top 3 data', function() {
        it('should list top 3 data', function(done) {
            request
                .get('/o/server-stats/top?api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    Object.values(ob).forEach(item => {
                        item.should.have.property('a');
                        item.should.have.property('v');
                    });
                    done();
                });
        });
    });

    describe('Get server stats chart data', function() {
        it('should list values for chart data in (30 days)', function(done) {
            request
                .get('/o/server-stats/punch-card?period=30days&api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('data');
                    ob.should.have.property('dayCount', 30);
                    ob.should.have.property('labels');
                    done();
                });
        });

        it('should list values for chart data in (10 days)', function(done) {
            request
                .get('/o/server-stats/punch-card?period=[' + (currentTime - (10 * 24 * 60 * 60 * 1000)) + ',' + currentTime + ']' + '&api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('data');
                    ob.should.have.property('dayCount', 11);
                    ob.should.have.property('labels');
                    done();
                });
        });
    });
});