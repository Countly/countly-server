var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
var statInternalEvents = require('../server-stats/api/parts/stats.js').internalEventsEnum;
request = request.agent(testUtils.url);
const dataPointTimeout = 10000;

var APP_KEY = '';
var API_KEY_ADMIN = '';
var APP_ID = '';
const date = new Date();
var currentTime = date.getTime();

// event variables
let lastEventCounts = {e: 0};
const internalEvents = [];
const customEvents = {
    single: [{ key: 'event_1', count: 1 }],
    multi: [{ key: 'event_2', count: 2 }, { key: 'event_3', count: 3 }]
};
let randomInternalEvents = {};

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

function sendEventRequest(events) {
    request
        .get('/o/data_ingestion?app_key=' + APP_KEY + '&begin_session=1&device_id=1&events=' + JSON.stringify(events) + '&app_id=' + APP_ID)
        .expect(200)
        .end(function(err, res) {
            if (err) {
                return {error: err};
            }
            const ob = JSON.parse(res.text);
            ob.should.have.property('result', true);
        });
}

function verifyAddedEvents(addedEvents) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const query = {"_id": APP_ID + "_" + year + ":" + month};

    return testUtils.db.collection("server_stats_data_points").find(query).toArray()
        .then((res, err) => {
            if (err) {
                throw ({err: err});
            }
            if (!res.length) {
                throw ({err: "Invalid length"});
            }

            addedEvents.forEach(event => {
                const key = event.key;
                const internalEventKey = statInternalEvents[key] || 'ce';

                lastEventCounts[internalEventKey] = lastEventCounts[internalEventKey] || 0;
                lastEventCounts[internalEventKey] += event.count;
                lastEventCounts.e += event.count;
            });

            for (const key in lastEventCounts) {
                if (Object.hasOwnProperty.call(lastEventCounts, key)) {
                    if (res[0][key] !== lastEventCounts[key]) {
                        throw (`${key}: Expected Count=${lastEventCounts[key]}, Actual Count=${res[0][key]}`);
                    }
                }
            }
        });
}

function generateRandomEvents(key) {
    const n = Math.floor(Math.random() * 6) + 1;
    const eventList = [];

    for (let i = 0; i < n; i++) {
        const randomEventType = Math.random();
        if (randomEventType < 0.5) {
            eventList.push(internalEvents[Math.floor(Math.random() * internalEvents.length)]);
        }
        else {
            eventList.push({
                key: `event_name_${Math.floor(Math.random() * 10) + 1}`,
                count: Math.floor(Math.random() * 10) + 1,
            });
        }
    }

    randomInternalEvents[key] = randomInternalEvents[key] || {};
    randomInternalEvents[key] = eventList;

    return randomInternalEvents;
}

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

    describe('Test event types', function() {
        for (const internalKey in statInternalEvents) {
            internalEvents.push({key: internalKey, count: 1});
            const value = statInternalEvents[internalKey];
            if (lastEventCounts[value] === undefined) {
                lastEventCounts[value] = 0;
            }
        }

        it('should add all sytem events correctly', function(done) {
            const result = sendEventRequest(internalEvents);
            if (result && result.error) {
                done(result.error);
            }
            else {
                setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
            }
        });
        it('should confirm that all system events are added to data points correctly', function(done) {
            verifyAddedEvents(internalEvents).then(() => {
                done();
            }).catch(err => {
                done(err);
            });
        });
        it('should add single custom event correctly', function(done) {
            const result = sendEventRequest(customEvents.single);
            if (result && result.error) {
                done(result.error);
            }
            else {
                setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
            }
        });
        it('should confirm that single custom event are added to data points correctly', function(done) {
            verifyAddedEvents(customEvents.single).then(() => {
                done();
            }).catch(err => {
                done(err);
            });
        });
        it('should add multiple custom event correctly', function(done) {
            const result = sendEventRequest(customEvents.multi);
            if (result && result.error) {
                done(result.error);
            }
            else {
                setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
            }
        });
        it('should confirm that multiple custom event are added to data points correctly', function(done) {
            verifyAddedEvents(customEvents.multi).then(() => {
                done();
            }).catch(err => {
                done(err);
            });
        });
        it('should add random events correctly [1.0]', function(done) {
            generateRandomEvents('e1');
            const result = sendEventRequest(randomInternalEvents.e1);
            if (result && result.error) {
                done(result.error);
            }
            else {
                setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
            }
        });
        it('should confirm that random events are added to data points correctly [1.0]', function(done) {
            verifyAddedEvents(randomInternalEvents.e1).then(() => {
                done();
            }).catch(err => {
                done(err);
            });
        });
        it('should add random events correctly [2.0]', function(done) {
            generateRandomEvents('e2');
            const result = sendEventRequest(randomInternalEvents.e2);
            if (result && result.error) {
                done(result.error);
            }
            else {
                setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
            }
        });
        it('should confirm that random events are added to data points correctly [2.0]', function(done) {
            verifyAddedEvents(randomInternalEvents.e2).then(() => {
                done();
            }).catch(err => {
                done(err);
            });
        });
        it('should add random events correctly [3.0]', function(done) {
            generateRandomEvents('e3');
            const result = sendEventRequest(randomInternalEvents.e3);
            if (result && result.error) {
                done(result.error);
            }
            else {
                setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
            }
        });
        it('should confirm that random events are added to data points correctly [3.0]', function(done) {
            verifyAddedEvents(randomInternalEvents.e3).then(() => {
                done();
            }).catch(err => {
                done(err);
            });
        });
    });
});