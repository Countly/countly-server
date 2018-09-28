var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request.agent(testUtils.url);

var API_KEY_ADMIN = "";
var DEVICE_ID = "1234567890";

const resultCheck = (result) => {
    return new Promise((resolve, reject) => {
        result.should.have.property("overall");
        result.should.have.property("details");

        result.overall.usage.should.not.be.below(0);
        result.details.length.should.be.above(0);

        result.details[0].should.have.property('id');
        result.details[0].should.have.property('usage');
        result.details[0].should.have.property('total');
        result.details[0].should.have.property('used');
        result.details[0].should.have.property('free');
        result.details[0].should.have.property('units');

        result.details[0].id.should.be.ok;
        result.details[0].units.should.be.ok;
        result.details[0].usage.should.not.be.below(0);
        result.details[0].total.should.not.be.below(0);
        result.details[0].used.should.not.be.below(0);
        result.details[0].free.should.not.be.below(0);
        resolve();
    });
};

describe('Testing System Utility', () => {
    describe('Memory usage', () => {
        it('should success', (done) => {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN") || API_KEY_ADMIN;
            request
                .get('/o/system/memory?api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("result");
                    resultCheck(ob.result).then(done);
                });
        });
    });

    describe('CPU usage', () => {
        it('should success', (done) => {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN") || API_KEY_ADMIN;
            request
                .get('/o/system/cpu?api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("result");
                    resultCheck(ob.result).then(done);
                });
        });
    });

    describe('Disk usage', () => {
        it('should success', (done) => {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN") || API_KEY_ADMIN;
            request
                .get('/o/system/disks?api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("result");
                    resultCheck(ob.result).then(done);
                });
        });
    });

    describe('Database usage', () => {
        it('should success', (done) => {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN") || API_KEY_ADMIN;
            request
                .get('/o/system/database?api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("result");
                    resultCheck(ob.result).then(done);
                });
        });
    });

    describe('Overall system information', () => {
        it('should success', (done) => {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN") || API_KEY_ADMIN;
            request
                .get('/o/system/overall?api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("result");
                    ob.result.should.have.property("id");
                    ob.result.should.have.property("platform");
                    ob.result.should.have.property("cpu");
                    ob.result.should.have.property("memory");
                    ob.result.should.have.property("disks");
                    ob.result.should.have.property("database");

                    ob.result.id.should.be.ok;
                    ob.result.platform.should.be.ok;

                    Promise.all([
                        resultCheck(ob.result.cpu),
                        resultCheck(ob.result.memory),
                        resultCheck(ob.result.disks),
                        resultCheck(ob.result.database)
                    ]).then(() => done());
                });
        });
    });

    describe('Health check', () => {
        it('should success', (done) => {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN") || API_KEY_ADMIN;
            request
                .get('/o/system/healthcheck?api_key=' + API_KEY_ADMIN + '&test={"cpu.overall.usage":{"$gte":101}}')
                .expect(500) //expecting server 500 error
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("result");

                    //Cpu usage never be more than 100. so the result should be false
                    ob.result.should.not.be.ok;
                    done();
                });
        });
    });

    describe('Health check', () => {
        it('should success', (done) => {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN") || API_KEY_ADMIN;
            request
                .get('/o/system/dbCheck?api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property("result");
                    ob.result.should.be.ok;
                    done();
                });
        });
    });
});