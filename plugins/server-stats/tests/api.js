var request = require('supertest');
var should = require('should');
var testUtils = require('../../../test/testUtils');
const pluginManager = require('../../pluginManager.js');
var statInternalEvents = require('../../server-stats/api/parts/stats.js').internalEventsEnum;
request = request.agent(testUtils.url);
const dataPointTimeout = 1100;

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
    console.log(JSON.stringify(events));
    request
        .get('/i?app_key=' + APP_KEY + '&begin_session=1&device_id=1&events=' + JSON.stringify(events) + '&app_id=' + APP_ID)
        .expect(200)
        .end(function(err, res) {
            if (err) {
                return {error: err};
            }
            const ob = JSON.parse(res.text);
            ob.should.have.property('result', "Success");
        });
}

function verifyAddedEvents(addedEvents, initialRequest) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const query = {"_id": APP_ID + "_" + year + ":" + month};

    return testUtils.db.collection("server_stats_data_points").find(query).toArray()
        .then((res, err) => {
            if (err) {
                throw ({err: err});
            }
            if (!res || (!res.length && !initialRequest)) {
                throw ({err: "Invalid length"});
            }
            if (initialRequest) {
                lastEventCounts.e = res && res[0] && res[0].e ? res[0].e : 0;
                lastEventCounts.ce = res && res[0] && res[0].ce ? res[0].ce : 0;
                for (let key in statInternalEvents) {
                    let internalEventKey = statInternalEvents[key] || 'ce';
                    lastEventCounts[internalEventKey] = res && res[0] && res[0][internalEventKey] ? res[0][internalEventKey] : 0;
                }
                return;
            }
            addedEvents.forEach(event => {
                const key = event.key;
                const internalEventKey = statInternalEvents[key] || 'ce';

                lastEventCounts[internalEventKey] = lastEventCounts[internalEventKey] || 0;
                lastEventCounts[internalEventKey] += Math.min(event.count, 1);
                lastEventCounts.e += Math.min(event.count, 1);

            });
            if (!addedEvents.filter(item => item.key === '[CLY]_session').length) { // then session included with begin_session=1 and count it also.
                lastEventCounts.s++;
            }

            for (const key in lastEventCounts) {
                if (Object.hasOwnProperty.call(lastEventCounts, key)) {
                    if (res[0][key] && res[0][key] !== lastEventCounts[key]) {
                        console.log(JSON.stringify(res[0]));
                        console.log(JSON.stringify(lastEventCounts));
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
            var ee = JSON.parse(JSON.stringify(internalEvents[Math.floor(Math.random() * internalEvents.length)]));
            ee.count = 1;
            eventList.push(ee);
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

function verifyDPCount() {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const query = {"_id": APP_ID + "_" + year + ":" + month};
    return testUtils.db.collection("server_stats_data_points").find(query).toArray()
        .then((res, err) => {
            res = res[0];
            if (err) {
                throw ({err: err});
            }
            else {
                var d = res.d[Object.keys(res.d)[0]][Object.keys(res.d[Object.keys(res.d)[0]])[0]];
                if (!d.e) {
                    d.e = 0;
                }
                if (d.s + d.e !== d.dp) {
                    throw ({err: 'Session and event count is not equal to data point count'});
                }
            }
        });
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

    describe('Test the accuracy of event breakdowns', function() {
        it('reset current DP values', function(done) {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const query = {"_id": APP_ID + "_" + year + ":" + month};
            testUtils.db.collection("server_stats_data_points").deleteOne(query, function(err, res) {
                if (err) {
                    return done(err);
                }
                setTimeout(done, 10 * 1000);
            });
        });
        it('setInitial Values', function(done) {
            var plugins = pluginManager.getPlugins();
            console.log("List of plugins: " + JSON.stringify(plugins));
            delete statInternalEvents["[CLY]_session"];
            if (plugins.indexOf("surveys") === -1) {
                delete statInternalEvents["[CLY]_survey"];
                delete statInternalEvents["[CLY]_nps"];
            }
            if (plugins.indexOf("views") === -1) {
                delete statInternalEvents["[CLY]_view"];
                delete statInternalEvents["[CLY]_action"];
            }
            if (plugins.indexOf("performance-monitoring") === -1) {
                delete statInternalEvents["[CLY]_apm_device"];
                delete statInternalEvents["[CLY]_apm_network"];
            }
            if (plugins.indexOf("push") === -1) {
                delete statInternalEvents["[CLY]_push_sent"];
                delete statInternalEvents["[CLY]_push_action"];
            }


            console.log(JSON.stringify(statInternalEvents));
            for (const internalKey in statInternalEvents) {
                if (internalKey === "[CLY]_view") {
                    internalEvents.push({key: internalKey, count: 1, segmentation: {'name': 'test', 'visit': 1}});
                }
                else if (internalKey === "[CLY]_star_rating") {
                    internalEvents.push({key: internalKey, count: 1, segmentation: {'platform': 'iOS', 'rating': 5}});
                }
                else if (internalKey === "[CLY]_survey" || internalKey === "[CLY]_nps") {
                    internalEvents.push({key: internalKey, count: 0});
                }
                else {
                    internalEvents.push({key: internalKey, count: 1});
                }
                const value = statInternalEvents[internalKey];
                if (lastEventCounts[value] === undefined) {
                    lastEventCounts[value] = 0;
                }

            }
            lastEventCounts["s"] = 0;

            done();
        });
        it('should initialize event counts successfully', function(done) {
            verifyAddedEvents(internalEvents, true).then(() => {
                setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
            }).catch(err => {
                done(err);
            });
        });
        it('should add all sytem events correctly', function(done) {
            const result = sendEventRequest(internalEvents.filter(item => item.count > 0));
            if (result && result.error) {
                done(result.error);
            }
            else {
                setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
            }
        });
        it('should verify session request included to data points', function(done) {
            verifyDPCount().then(() => {
                setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
            }).catch(err => {
                done(err);
            });
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
        it('verify total data points', function(done) {
            verifyDPCount().then(() => {
                setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
            }).catch(err => {
                done(err);
            });
        });
        it('should confirm that multiple custom event are added to data points correctly', function(done) {
            verifyAddedEvents(customEvents.multi).then(() => {
                done();
            }).catch(err => {
                done(err);
            });
        });
        it('verify total data points', function(done) {
            verifyDPCount().then(() => {
                setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
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
        it('verify total data points', function(done) {
            verifyDPCount().then(() => {
                setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
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
        it('verify total data points', function(done) {
            verifyDPCount().then(() => {
                setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
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
        it('should delete data point record for the test app', function(done) {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const query = {"_id": APP_ID + "_" + year + ":" + month};
            testUtils.db.collection("server_stats_data_points").deleteOne(query, function(err, res) {
                if (err) {
                    return done(err);
                }
                done();
            });
        });
    });

    describe('Verify data point number always equals to session + event count', function() {
        it('should send session request', function(done) {
            request
                .get('/i?app_key=' + APP_KEY + '&begin_session=1&device_id=ABC&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return {error: err};
                    }
                    const ob = JSON.parse(res.text);
                    ob.should.have.property('result', "Success");
                    setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
                });
        });
        it('should verify session request included to data points', function(done) {
            verifyDPCount().then(() => {
                setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
            }).catch(err => {
                done(err);
            });
        });
        it('should send session + event request', function(done) {
            request
                .get('/i?app_key=' + APP_KEY + '&begin_session=1&device_id=ABCD&app_id=' + APP_ID + '&events=' + JSON.stringify(customEvents.single))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return {error: err};
                    }
                    const ob = JSON.parse(res.text);
                    ob.should.have.property('result', "Success");
                    setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
                });
        });
        it('should verify session + event request included to data points', function(done) {
            verifyDPCount().then(() => {
                setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
            }).catch(err => {
                done(err);
            });
        });
        it('should send session + view request', function(done) {
            request
                .get('/i?app_key=' + APP_KEY + '&begin_session=1&device_id=ABCD&app_id=' + APP_ID + '&events=' + JSON.stringify([{key: '[CLY]_view', count: 1}]))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return {error: err};
                    }
                    const ob = JSON.parse(res.text);
                    ob.should.have.property('result', "Success");
                    setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
                });
        });
        it('should verify session + view request included to data points', function(done) {
            verifyDPCount().then(() => {
                setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
            }).catch(err => {
                done(err);
            });
        });
        it('should send session + view + custom event request', function(done) {
            request
                .get('/i?app_key=' + APP_KEY + '&begin_session=1&device_id=ABCD&app_id=' + APP_ID + '&events=' + JSON.stringify([{key: '[CLY]_view', count: 1}, {key: 'event_1', count: 1}]))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return {error: err};
                    }
                    const ob = JSON.parse(res.text);
                    ob.should.have.property('result', "Success");
                    setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
                });
        });
        it('should verify session + view + custom event request included to data points', function(done) {
            verifyDPCount().then(() => {
                setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
            }).catch(err => {
                done(err);
            });
        });
        it('should send view + view request', function(done) {
            request
                .get('/i?app_key=' + APP_KEY + '&begin_session=1&device_id=1&app_id=' + APP_ID + '&events=' + JSON.stringify([{key: '[CLY]_view', count: 1, segmentation: {"visit": 1, "name": "test"}}, {key: '[CLY]_view', count: 1, segmentation: {"visit": 1, "name": "test2"}}]))
                .expect(200)
                .end(function(err, res) {
                    const ob = JSON.parse(res.text);
                    ob.should.have.property('result', "Success");
                    setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
                });
        });
        it('should verify view + view request NOT included to data points', function(done) {
            verifyDPCount().then(() => {
                setTimeout(done, dataPointTimeout * testUtils.testScalingFactor);
            }).catch(err => {
                done(err);
            });
        });
        it('should delete data point record for the test app', function(done) {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const query = {"_id": APP_ID + "_" + year + ":" + month};
            testUtils.db.collection("server_stats_data_points").deleteOne(query, function(err, res) {
                if (err) {
                    return done(err);
                }
                done();
            });
        });
    });

    describe('Test sending system events that should not be counted as data points', function() {
        it('Reset counter ', function(done) {
            lastEventCounts.s = 0;
            verifyAddedEvents([], true).then(() => {
                done();
            }).catch(err => {
                done(err);
            });
        });
        it(' sending [CLY]_orientation event  and session event', function() {
            return request
                .get('/i?app_key=' + APP_KEY + '&begin_session=1&device_id=ABC&events=' + JSON.stringify([{key: '[CLY]_orientation', count: 1}]) + '&app_id=' + APP_ID)
                .expect(200)
                .then(function(res) {
                    const ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                });
        });
        it('make sure nothing is added', function(done) {
            verifyAddedEvents([]).then(() => {
                done();
            }).catch(err => {
                done(err);
            });
        });
        it(' sending some fake and valid events event  and session event', function() {
            return request
                .get('/i?app_key=' + APP_KEY + '&begin_session=1&device_id=ABC&events=' + JSON.stringify([{key: '[CLY]_special', count: 1}, {key: 'customevent', count: 1}]) + '&app_id=' + APP_ID)
                .expect(200)
                .then(function(res) {
                    const ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                });
        });
        it('make sure only custom one is added', function(done) {
            verifyAddedEvents([{key: 'customevent', count: 1}]).then(() => {
                done();
            }).catch(err => {
                done(err);
            });
        });
        it('should delete data point record for the test app', function(done) {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const query = {"_id": APP_ID + "_" + year + ":" + month};
            testUtils.db.collection("server_stats_data_points").deleteOne(query, function(err, res) {
                if (err) {
                    return done(err);
                }
                done();
            });
        });
    });
});
