var request = require("supertest");
var should = require("should");
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var APP_ID = "";

describe("Testing Jobs", function() {
    it("Fetching jobs table data", function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        APP_ID = testUtils.get("APP_ID");
        request
            .get("/o?app_id=" + APP_ID + "&api_key=" + API_KEY_ADMIN + "&method=jobs")
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                var iTotalRecords = ob.iTotalRecords;
                var iTotalDisplayRecords = ob.iTotalDisplayRecords;
                if (iTotalDisplayRecords > 0 && iTotalRecords > 0) {
                    ob.should.have.property("aaData");
                    done();
                }
                else {
                    done("There are no records to show");
                }
            });
    });

    it("Fetching jobs table data filtered by api:task", function(done) {
        request
            .get("/o?app_id=" + APP_ID + "&api_key=" + API_KEY_ADMIN + "&method=jobs&name=api:task")
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                var iTotalRecords = ob.iTotalRecords;
                var iTotalDisplayRecords = ob.iTotalDisplayRecords;
                if (iTotalDisplayRecords > 0 && iTotalRecords > 0) {
                    ob.should.have.property("aaData");
                    for (var z = 0; z < ob.aaData.length; z++) {
                        if (ob.aaData[z].name !== "api:task") {
                            done("Invalid task name. All should be api:task");
                            return;
                        }
                    }
                    done();
                }
                else {
                    done("There are no records to show");
                }
            });
    });
});

// 'use strict';

// const should = require('should'),
// 	M = require('../../api/parts/jobs/manager.js'),
// 	J = require('../../api/parts/jobs/job.js'),
// 	R = require('../../api/parts/jobs/resource.js'),
// 	RET = require('../../api/parts/jobs/retry.js'),
// 	pluginManager = require('../../plugins/pluginManager.js'),
// 	db = pluginManager.singleDefaultConnection(),

// 	HORROR = 'Horrible error',
// 	wait = (ms) => new Promise(res => setTimeout(res, ms))

// async function sequence (arr, f, def=0) {
// 	return await arr.reduce(async (promise, item) => {
// 		let total = await promise,
// 			next = await f(item);
// 		if (typeof next === 'object') {
// 			Object.keys(next).forEach(k => {
// 				total[k] = (total[k] || 0) + next[k];
// 			});
// 			return total;
// 		} else {
// 			return total + next;
// 		}
// 	}, Promise.resolve(def));
// }

// class NoRetryJob extends J.Job {
// 	retryPolicy () {
// 		return new RET.NoRetryPolicy();
// 	}
// }

// class TimeoutJob extends NoRetryJob {
// 	run (db, done) {
// 		setTimeout(done, 1000);
// 	}
// }

// class TimeoutErrorJob extends NoRetryJob {
// 	run (db, done) {
// 		setTimeout(done.bind(null, new Error(HORROR)), 1000);
// 	}
// }

// class TimeoutErrorStringJob extends NoRetryJob {
// 	run (db, done) {
// 		setTimeout(done.bind(null, HORROR), 1000);
// 	}
// }

// class ThrowsJob extends NoRetryJob {
// 	run () {
// 		throw new Error(HORROR)
// 	}
// }

// class AsyncTimeoutJob extends NoRetryJob {
// 	async run () {
// 		await wait(1000);
// 	}
// }

// class AsyncTimeoutErrorJob extends NoRetryJob {
// 	async run () {
// 		await wait(1000);
// 		throw new Error(HORROR);
// 	}
// }

// class AsyncAndTimeoutJob extends NoRetryJob {
// 	async run (db, done) {
// 		await wait(1000);
// 		done();
// 	}
// }

// describe('Jobs tests', () => {
// 	it('should register test jobs', async () => {
// 		// await wait(1000);
// 		[TimeoutJob, TimeoutErrorJob, TimeoutErrorStringJob, ThrowsJob, AsyncTimeoutJob, AsyncTimeoutErrorJob, AsyncAndTimeoutJob].forEach(c => {
// 			M.classes['test:' + c.name] = c;
// 			M.types.push('test:' + c.name);
// 		});
// 	}).timeout(20000);
// 	describe('error handling with db', () => {
// 		it('successes', async () => {
// 			await sequence([TimeoutJob, AsyncTimeoutJob, AsyncAndTimeoutJob], async C => {
// 				console.log('Testing ' + C.name);
// 				let job = await M.job('test:' + C.name).now();
// 				should.exist(job);
// 				should.exist(job._id);
// 				should.exist(job.status);
// 				should.exist(job.next);
// 				job.status.should.equal(J.STATUS.SCHEDULED);
// 				(Date.now() > job.next).should.be.true();
// 				(Date.now() - job.next < 1000).should.be.true();

// 				await wait(3000);

// 				let json = await J.Job.load(db, job._id);
// 				should.exist(json);
// 				should.exist(json._id);
// 				should.exist(json.status);
// 				should.exist(json.next);
// 				should.exist(json.started);
// 				should.exist(json.modified);
// 				should.exist(json.finished);
// 				should.exist(json.duration);
// 				should.not.exist(json.error);
// 				(json.error === null).should.be.true();
// 				json.status.should.equal(J.STATUS.DONE);
// 			});
// 		}).timeout(3 * 5000);

// 		it('errors', async () => {
// 			await sequence([TimeoutErrorJob, TimeoutErrorStringJob, ThrowsJob, AsyncTimeoutErrorJob], async C => {
// 				console.log('Testing ' + C.name);
// 				let job = await M.job('test:' + C.name).now();
// 				console.log('Testing ' + C.name + ': ' + job._id);
// 				should.exist(job);
// 				should.exist(job._id);
// 				should.exist(job.status);
// 				should.exist(job.next);
// 				job.status.should.equal(J.STATUS.SCHEDULED);
// 				(Date.now() > job.next).should.be.true();
// 				(Date.now() - job.next < 1000).should.be.true();

// 				await wait(3000);

// 				let json = await J.Job.load(db, job._id);
// 				console.log('Job ' + C.name + ' json: %j', json);
// 				should.exist(json);
// 				should.exist(json._id);
// 				should.exist(json.status);
// 				should.exist(json.next);
// 				should.exist(json.started);
// 				should.exist(json.modified);
// 				should.exist(json.finished);
// 				should.exist(json.duration);
// 				should.exist(json.error);
// 				json.error.should.equal(HORROR);
// 				json.status.should.equal(J.STATUS.DONE);
// 			});
// 		}).timeout(4 * 5000);
// 	});

// 	describe('IPC tests', () => {
// 		it('should run IPC job successfully', async () => {
// 			console.log('Testing IPCTestJob success');
// 			let job = await M.job('test').now();
// 			should.exist(job);
// 			should.exist(job._id);
// 			should.exist(job.status);
// 			should.exist(job.next);
// 			job.status.should.equal(J.STATUS.SCHEDULED);
// 			(Date.now() > job.next).should.be.true();
// 			(Date.now() - job.next < 1000).should.be.true();

// 			await wait(5000);

// 			should.exist(M.resources['resource:test']);
// 			M.resources['resource:test'].pool.length.should.equal(1);

// 			await wait(10000);

// 			let json = await J.Job.load(db, job._id);
// 			should.exist(json);
// 			should.exist(json._id);
// 			should.exist(json.status);
// 			should.exist(json.next);
// 			should.exist(json.started);
// 			should.exist(json.modified);
// 			should.exist(json.finished);
// 			should.exist(json.duration);
// 			should.exist(json.data);
// 			should.exist(json.data.run);
// 			should.exist(json.data.prepared);
// 			should.not.exist(json.error);
// 			(json.error === null).should.be.true();
// 			json.status.should.equal(J.STATUS.DONE);

// 			await wait(15000);

// 			should.not.exist(M.resources['resource:test']);
// 		}).timeout(40000);

// 		// it('should run 2 IPC jobs simultaniously at most as per concurrency limit', async () => {
// 		// 	console.log('Testing IPCTestJob success');
// 		// 	let jobs = []
// 		// 	for (let i = 0; i < 20; i++) {
// 		// 		let job = await M.job('test', {concurrency: 2}).now();
// 		// 		should.exist(job);
// 		// 		should.exist(job._id);
// 		// 		should.exist(job.status);
// 		// 		should.exist(job.next);
// 		// 		job.status.should.equal(J.STATUS.SCHEDULED);
// 		// 		(Date.now() > job.next).should.be.true();
// 		// 		(Date.now() - job.next < 1000).should.be.true();
// 		// 		jobs.push(job._id);
// 		// 	}

// 		// 	while (true) {
// 		// 		console.log('>>>>>>>>>>>>>>>>>>> left %d to run', jobs.length);

// 		// 		let current = await new Promise(res => db.collection('jobs').find({_id: {$in: jobs}}).toArray((err, jobs) => err ? rej(err) : res(jobs))),
// 		// 			done = current.filter(j => j.status === J.STATUS.DONE),
// 		// 			left = current.filter(j => j.status === J.STATUS.SCHEDULED),
// 		// 			running = current.filter(j => j.status === J.STATUS.RUNNING);

// 		// 		console.log('>>>>>>>>>>>>>>>>>>> total %d done %d running %d left %d', current.length, done.length, running.length, left.length);

// 		// 		if (left.length === 0 && running.length === 0) {
// 		// 			break;
// 		// 		}

// 		// 		await wait(2000);
// 		// 	}
// 		// }).timeout(200000);
// 	});
// });
